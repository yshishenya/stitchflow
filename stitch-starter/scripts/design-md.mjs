import path from "node:path";
import {
  closeToolClient,
  createRunDirForName,
  createToolClient,
  extractToolResult,
  normalizeDeviceType,
  parseArgs,
  readText,
  writeJson
} from "./_common.mjs";

const args = parseArgs(process.argv.slice(2));
const projectId = args["project-id"];
const file = args.file || "DESIGN.md";

if (!projectId) {
  console.error(
    'Usage: npm run design-md -- --project-id 123 --file ./DESIGN.md [--device DESKTOP] [--upload-only]'
  );
  process.exit(1);
}

const deviceType = normalizeDeviceType(args.device, "DESKTOP");
const designMd = await readText(file);
const designMdBase64 = Buffer.from(designMd, "utf8").toString("base64");
const client = createToolClient();

function pickSelectedScreenInstance(upload) {
  const candidate =
    upload?.selectedScreenInstance ||
    upload?.selected_screen_instance ||
    upload?.screenInstance ||
    upload?.screen_instance;

  if (candidate && typeof candidate === "object" && candidate.id && candidate.sourceScreen) {
    return {
      id: candidate.id,
      sourceScreen: candidate.sourceScreen
    };
  }

  const id =
    candidate?.id ||
    upload?.id ||
    upload?.screenInstanceId ||
    upload?.screen_instance_id;
  const sourceScreen =
    candidate?.sourceScreen ||
    candidate?.source_screen ||
    upload?.sourceScreen ||
    upload?.source_screen ||
    (id ? `projects/${projectId}/screens/${id}` : undefined);

  if (!id || !sourceScreen) return null;

  return { id, sourceScreen };
}

try {
  const uploadRaw = await client.callTool("upload_design_md", {
    projectId,
    designMdBase64
  });
  const upload = extractToolResult(uploadRaw);
  const selectedScreenInstance = pickSelectedScreenInstance(upload);

  if (!selectedScreenInstance) {
    throw new Error(
      `DESIGN.md upload did not return a selected screen instance: ${JSON.stringify(upload)}`
    );
  }

  let created = null;

  if (!args["upload-only"]) {
    const createRaw = await client.callTool("create_design_system_from_design_md", {
      projectId,
      selectedScreenInstance,
      deviceType
    });
    created = extractToolResult(createRaw);
  }

  const outDir = await createRunDirForName("design-md", path.basename(file));
  const metadata = {
    operation: "design-md",
    createdAt: new Date().toISOString(),
    projectId,
    file: path.resolve(file),
    deviceType,
    selectedScreenInstance,
    upload,
    uploadOnly: Boolean(args["upload-only"]),
    designSystem: created,
    outDir
  };

  await writeJson(path.join(outDir, "result.json"), metadata);

  console.log(`Project: ${projectId}`);
  console.log(`Uploaded DESIGN.md: ${path.resolve(file)}`);
  console.log(`Selected screen instance: ${selectedScreenInstance.id}`);
  if (created) console.log("Created design system from DESIGN.md.");
  console.log(`Saved to: ${outDir}`);
} finally {
  await closeToolClient(client);
}

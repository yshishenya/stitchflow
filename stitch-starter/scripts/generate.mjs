import path from "node:path";
import {
  closeToolClient,
  createRunDir,
  createStitch,
  ensureApiKey,
  normalizeDeviceType,
  parseArgs,
  saveArtifacts,
  saveLatestScreen,
  withRetry,
  writeJson
} from "./_common.mjs";

ensureApiKey();

const args = parseArgs(process.argv.slice(2));
const prompt = args.prompt;

if (!prompt) {
  console.error('Usage: npm run generate -- --prompt "A modern SaaS dashboard" [--title "My App"] [--project-id 123] [--device DESKTOP] [--timeout-ms 900000] [--retries 2]');
  process.exit(1);
}

const deviceType = normalizeDeviceType(args.device, "DESKTOP");
const projectTitle = args.title || "Stitch Starter";
const { stitch, client } = createStitch({ timeoutMs: args["timeout-ms"] });

try {
  const project = args["project-id"]
    ? stitch.project(args["project-id"])
    : await stitch.createProject(projectTitle);

  console.log(`Project: ${project.id}`);
  console.log(`Generating screen for ${deviceType}...`);

  const screen = await withRetry(
    () => project.generate(prompt, deviceType),
    {
      label: "generate_screen_from_text",
      retries: args.retries,
      retryDelayMs: args["retry-delay-ms"]
    }
  );
  const htmlUrl = await screen.getHtml();
  const imageUrl = await screen.getImage();

  const outDir = await createRunDir("generate", prompt);
  const metadata = {
    operation: "generate",
    createdAt: new Date().toISOString(),
    projectId: project.id,
    projectTitle,
    screenId: screen.id,
    prompt,
    deviceType,
    htmlUrl,
    imageUrl,
    outDir
  };

  await writeJson(path.join(outDir, "result.json"), metadata);
  await saveArtifacts({ outDir, htmlUrl, imageUrl });
  await saveLatestScreen(metadata);

  console.log(`Screen: ${screen.id}`);
  console.log(`Saved to: ${outDir}`);
  console.log(`HTML URL: ${htmlUrl || "n/a"}`);
  console.log(`Image URL: ${imageUrl || "n/a"}`);
} finally {
  await closeToolClient(client);
}

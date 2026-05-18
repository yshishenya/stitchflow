import path from "node:path";
import { stitch } from "@google/stitch-sdk";
import {
  createRunDirForName,
  ensureApiKey,
  parseArgs,
  parseCsv,
  saveLatestScreen,
  saveScreenArtifacts,
  writeJson
} from "./_common.mjs";

ensureApiKey();

const args = parseArgs(process.argv.slice(2));
const projectId = args["project-id"];
const screenIds = parseCsv(args["screen-ids"]);

if (!projectId || !screenIds.length) {
  console.error("Usage: npm run export-screens -- --project-id 123456789 --screen-ids abc,def");
  process.exit(1);
}

const outDir = args["output-dir"]
  ? path.resolve(args["output-dir"])
  : await createRunDirForName("export-screens", projectId);
const project = stitch.project(projectId);
const screens = [];

for (let i = 0; i < screenIds.length; i += 1) {
  const screenId = screenIds[i];
  const screen = await project.getScreen(screenId);
  const screenDir = path.join(outDir, `screen-${String(i + 1).padStart(2, "0")}-${screenId}`);
  const metadata = await saveScreenArtifacts({
    outDir: screenDir,
    screen,
    metadata: {
      operation: "export-screens-screen",
      createdAt: new Date().toISOString(),
      projectId,
      screenId,
      index: i + 1
    }
  });
  screens.push(metadata);
  console.log(`Exported ${i + 1}/${screenIds.length}: ${screenId}`);
}

const manifest = {
  operation: "export-screens",
  createdAt: new Date().toISOString(),
  projectId,
  requestedScreenIds: screenIds,
  screenCount: screens.length,
  screens,
  outDir
};

await writeJson(path.join(outDir, "export-screens.json"), manifest);
if (screens.at(-1)) await saveLatestScreen(screens.at(-1));

console.log(`Project: ${projectId}`);
console.log(`Screens: ${screens.length}`);
console.log(`Saved to: ${outDir}`);

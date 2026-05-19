import path from "node:path";
import { stitch } from "@google/stitch-sdk";
import {
  createRunDirForName,
  ensureApiKey,
  parseArgs,
  saveScreenArtifacts,
  writeJson
} from "./_common.mjs";

ensureApiKey();

const args = parseArgs(process.argv.slice(2));
const projectId = args["project-id"];

if (!projectId) {
  console.error("Usage: npm run export-project -- --project-id 123456789");
  process.exit(1);
}

const project = stitch.project(projectId);
const screens = await project.screens();
const outDir = await createRunDirForName("export-project", projectId);
const exportedScreens = [];

for (let i = 0; i < screens.length; i += 1) {
  const screen = screens[i];
  const screenDir = path.join(outDir, `screen-${String(i + 1).padStart(2, "0")}-${screen.id}`);
  const metadata = await saveScreenArtifacts({
    outDir: screenDir,
    screen,
    metadata: {
      operation: "export-project-screen",
      createdAt: new Date().toISOString(),
      projectId,
      screenId: screen.id,
      index: i + 1
    }
  });
  exportedScreens.push(metadata);
  console.log(`Exported ${i + 1}/${screens.length}: ${screen.id}`);
}

const manifest = {
  operation: "export-project",
  createdAt: new Date().toISOString(),
  projectId,
  screenCount: screens.length,
  screens: exportedScreens,
  outDir
};

await writeJson(path.join(outDir, "project.json"), manifest);

console.log(`Project: ${projectId}`);
console.log(`Screens: ${screens.length}`);
console.log(`Saved to: ${outDir}`);

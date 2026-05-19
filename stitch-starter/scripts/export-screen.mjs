import path from "node:path";
import {
  createRunDirForName,
  parseArgs,
  resolveTarget,
  saveLatestScreen,
  saveScreenArtifacts
} from "./_common.mjs";

const args = parseArgs(process.argv.slice(2));
const { project, screen } = await resolveTarget(args);
const outDir = await createRunDirForName("export-screen", `${project.id}-${screen.id}`);

const metadata = await saveScreenArtifacts({
  outDir,
  screen,
  metadata: {
    operation: "export-screen",
    createdAt: new Date().toISOString(),
    projectId: project.id,
    screenId: screen.id
  }
});

await saveLatestScreen(metadata);

console.log(`Project: ${project.id}`);
console.log(`Screen: ${screen.id}`);
console.log(`Saved to: ${outDir}`);
console.log(`HTML URL: ${metadata.htmlUrl || "n/a"}`);
console.log(`Image URL: ${metadata.imageUrl || "n/a"}`);

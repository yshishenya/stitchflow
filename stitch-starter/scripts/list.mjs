import { stitch } from "@google/stitch-sdk";
import { ensureApiKey, parseArgs } from "./_common.mjs";

ensureApiKey();

const args = parseArgs(process.argv.slice(2));

if (args["project-id"]) {
  const project = stitch.project(args["project-id"]);
  const screens = await project.screens();
  console.log(`Project ${project.id}`);
  if (screens.length === 0) {
    console.log("  (no screens)");
    process.exit(0);
  }
  for (const screen of screens) {
    console.log(`  Screen ${screen.id}`);
  }
  process.exit(0);
}

const projects = await stitch.projects();

if (projects.length === 0) {
  console.log("No Stitch projects found.");
  process.exit(0);
}

for (const project of projects) {
  console.log(`Project ${project.id}`);
  const screens = await project.screens();
  if (screens.length === 0) {
    console.log("  (no screens)");
    continue;
  }
  for (const screen of screens) {
    console.log(`  Screen ${screen.id}`);
  }
}

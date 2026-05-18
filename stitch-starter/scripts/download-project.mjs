import path from "node:path";
import { stitch } from "@google/stitch-sdk";
import {
  createRunDirForName,
  ensureApiKey,
  parseArgs,
  writeJson
} from "./_common.mjs";

ensureApiKey();

const args = parseArgs(process.argv.slice(2));
const projectId = args["project-id"];

if (!projectId) {
  console.error("Usage: npm run download-project -- --project-id 123456789 [--assets-subdir assets]");
  process.exit(1);
}

const assetsSubdir = args["assets-subdir"] || "assets";
const outDir = args["output-dir"]
  ? path.resolve(args["output-dir"])
  : await createRunDirForName("download-project", projectId);

const project = stitch.project(projectId);
const result = await project.downloadAssets(outDir, { assetsSubdir });

const metadata = {
  operation: "download-project",
  createdAt: new Date().toISOString(),
  projectId,
  assetsSubdir,
  screens: result.screens,
  warnings: result.warnings,
  outDir
};

await writeJson(path.join(outDir, "download-project.json"), metadata);

console.log(`Project: ${projectId}`);
console.log(`Downloaded screens: ${result.screens.length}`);
console.log(`Saved to: ${outDir}`);
if (result.warnings.length) {
  console.log("Warnings:");
  for (const warning of result.warnings) console.log(`- ${warning}`);
}

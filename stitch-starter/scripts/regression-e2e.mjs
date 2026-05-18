import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  ensureApiKey,
  ensureDir,
  parseArgs,
  ROOT,
  RUNS_DIR,
  timestamp,
  writeJson,
  writeText
} from "./_common.mjs";

ensureApiKey();

const args = parseArgs(process.argv.slice(2));
const keepArtifacts = Boolean(args["keep-artifacts"] ?? true);
const timeoutMs = args["timeout-ms"] || "900000";
const retries = args.retries || "1";
const retryDelayMs = args["retry-delay-ms"] || "3000";
const device = args.device || "DESKTOP";
const runId = timestamp();
const outDir = path.join(RUNS_DIR, `${runId}-regression-e2e`);
const report = {
  operation: "regression-e2e",
  createdAt: new Date().toISOString(),
  outDir,
  device,
  steps: [],
  assertions: []
};

await ensureDir(outDir);

function recordAssertion(name, ok, details = {}) {
  const assertion = { name, ok, ...details };
  report.assertions.push(assertion);
  if (!ok) throw new Error(`Assertion failed: ${name}`);
}

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function runStep(name, npmScript, scriptArgs = []) {
  const startedAt = new Date().toISOString();
  const command = ["npm", "run", npmScript, "--", ...scriptArgs];
  console.log(`\n[${name}] ${command.join(" ")}`);

  const result = await new Promise((resolve) => {
    const child = spawn("npm", ["run", npmScript, "--", ...scriptArgs], {
      cwd: ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });

  const finishedAt = new Date().toISOString();
  const step = {
    name,
    npmScript,
    args: scriptArgs,
    startedAt,
    finishedAt,
    exitCode: result.code,
    stdout: result.stdout,
    stderr: result.stderr
  };
  report.steps.push(step);

  if (result.code !== 0) {
    await writeJson(path.join(outDir, "regression-e2e.json"), report);
    throw new Error(`${name} failed with exit code ${result.code}`);
  }

  return step;
}

async function validateScreenResult(label, metadata) {
  recordAssertion(`${label}: project id present`, Boolean(metadata.projectId), {
    projectId: metadata.projectId
  });
  recordAssertion(`${label}: screen id present`, Boolean(metadata.screenId), {
    screenId: metadata.screenId
  });
  recordAssertion(`${label}: output dir present`, Boolean(metadata.outDir), {
    outDir: metadata.outDir
  });

  if (metadata.htmlUrl) {
    recordAssertion(`${label}: screen.html saved`, await fileExists(path.join(metadata.outDir, "screen.html")), {
      file: path.join(metadata.outDir, "screen.html")
    });
  }

  if (metadata.imageUrl) {
    const files = await fs.readdir(metadata.outDir);
    recordAssertion(`${label}: screen image saved`, files.some((file) => /^screen\.(png|jpe?g|webp)$/.test(file)), {
      outDir: metadata.outDir
    });
  }
}

try {
  await runStep("tools", "tools");
  const toolsPath = path.join(RUNS_DIR, "latest-tools.json");
  const tools = await readJson(toolsPath);
  const toolNames = new Set((tools.tools || []).map((tool) => tool.name));
  for (const name of ["create_project", "generate_screen_from_text", "get_screen", "list_screens"]) {
    recordAssertion(`tools: ${name} exposed`, toolNames.has(name));
  }

  await runStep("generate", "generate", [
    "--title",
    `StitchFlow E2E ${runId}`,
    "--device",
    device,
    "--timeout-ms",
    timeoutMs,
    "--retries",
    retries,
    "--retry-delay-ms",
    retryDelayMs,
    "--prompt",
    "Compact dark SaaS landing page for a regression test. Include a hero, two cards, a primary button, and one AI generated sports-style image placeholder. Keep copy short."
  ]);
  const generated = await readJson(path.join(RUNS_DIR, "latest-screen.json"));
  report.projectId = generated.projectId;
  report.generatedScreenId = generated.screenId;
  await validateScreenResult("generate", generated);

  const designMdPath = path.join(outDir, "DESIGN.md");
  await writeText(
    designMdPath,
    `# StitchFlow Regression Design System

Use a dark but airy interface, high contrast text, emerald action color, precise 8px radius components, and clear hierarchy.
`
  );
  await runStep("design-md", "design-md", [
    "--project-id",
    generated.projectId,
    "--file",
    designMdPath,
    "--device",
    device
  ]);

  await runStep("edit", "edit", [
    "--project-id",
    generated.projectId,
    "--screen-id",
    generated.screenId,
    "--device",
    device,
    "--timeout-ms",
    timeoutMs,
    "--retries",
    retries,
    "--retry-delay-ms",
    retryDelayMs,
    "--prompt",
    "Refine the screen: make spacing calmer, make the primary button more obvious, and add a small trust/status strip under the hero."
  ]);
  const edited = await readJson(path.join(RUNS_DIR, "latest-screen.json"));
  report.editedScreenId = edited.screenId;
  await validateScreenResult("edit", edited);
  recordAssertion("edit: produced a new screen", edited.screenId !== generated.screenId, {
    generatedScreenId: generated.screenId,
    editedScreenId: edited.screenId
  });

  await runStep("variants", "variants", [
    "--project-id",
    generated.projectId,
    "--screen-id",
    edited.screenId,
    "--device",
    device,
    "--variant-count",
    "1",
    "--creative-range",
    "REFINE",
    "--aspects",
    "LAYOUT,COLOR_SCHEME",
    "--timeout-ms",
    timeoutMs,
    "--retries",
    retries,
    "--retry-delay-ms",
    retryDelayMs,
    "--prompt",
    "Create one refined alternate direction while preserving the same information architecture."
  ]);
  const variantLatest = await readJson(path.join(RUNS_DIR, "latest-screen.json"));
  report.variantScreenId = variantLatest.screenId;
  await validateScreenResult("variants latest", variantLatest);

  await runStep("export-screen", "export-screen", [
    "--project-id",
    generated.projectId,
    "--screen-id",
    variantLatest.screenId
  ]);
  const exportedScreen = await readJson(path.join(RUNS_DIR, "latest-screen.json"));
  await validateScreenResult("export-screen", exportedScreen);

  await runStep("export-project", "export-project", ["--project-id", generated.projectId]);
  const exportProjectStep = report.steps.at(-1);
  const exportProjectDir = exportProjectStep.stdout.match(/Saved to: (.+)/)?.[1]?.trim();
  recordAssertion("export-project: output dir printed", Boolean(exportProjectDir), { exportProjectDir });
  const exportProjectManifest = await readJson(path.join(exportProjectDir, "project.json"));
  recordAssertion("export-project: project-listed screens exported", exportProjectManifest.screenCount >= 1, {
    screenCount: exportProjectManifest.screenCount
  });
  report.exportProjectDir = exportProjectDir;

  const approvedScreenIds = [generated.screenId, edited.screenId, variantLatest.screenId];
  await runStep("export-screens", "export-screens", [
    "--project-id",
    generated.projectId,
    "--screen-ids",
    approvedScreenIds.join(","),
    "--output-dir",
    path.join(outDir, "approved-screen-export")
  ]);
  const approvedExportManifest = await readJson(path.join(outDir, "approved-screen-export", "export-screens.json"));
  recordAssertion("export-screens: approved screens exported", approvedExportManifest.screenCount === approvedScreenIds.length, {
    expected: approvedScreenIds.length,
    actual: approvedExportManifest.screenCount
  });
  for (const screen of approvedExportManifest.screens) {
    await validateScreenResult(`export-screens ${screen.screenId}`, screen);
  }
  report.approvedExportDir = approvedExportManifest.outDir;

  const downloadDir = path.join(outDir, "download-project");
  await runStep("download-project", "download-project", [
    "--project-id",
    generated.projectId,
    "--output-dir",
    downloadDir
  ]);
  const downloadManifest = await readJson(path.join(downloadDir, "download-project.json"));
  recordAssertion("download-project: manifest saved", await fileExists(path.join(downloadDir, "download-project.json")), {
    file: path.join(downloadDir, "download-project.json")
  });
  recordAssertion("download-project: screens downloaded", downloadManifest.screens.length >= 1, {
    screenCount: downloadManifest.screens.length
  });
  recordAssertion("download-project: warnings array present", Array.isArray(downloadManifest.warnings), {
    warnings: downloadManifest.warnings
  });
  const downloadedScreenIds = new Set(downloadManifest.screens.map((screen) => screen.screenId));
  const missingApprovedScreens = approvedScreenIds.filter((screenId) => !downloadedScreenIds.has(screenId));
  report.downloadProjectMissingApprovedScreens = missingApprovedScreens;
  for (const screen of downloadManifest.screens) {
    recordAssertion(`download-project: code exists for ${screen.screenId}`, await fileExists(path.join(downloadDir, screen.filePath)), {
      file: path.join(downloadDir, screen.filePath)
    });
  }
  report.downloadProjectDir = downloadDir;

  await runStep("list", "list", ["--project-id", generated.projectId]);
  const listStep = report.steps.at(-1);
  recordAssertion("list: regression project appears", listStep.stdout.includes(`Project ${generated.projectId}`), {
    projectId: generated.projectId
  });

  report.keepArtifacts = keepArtifacts;
  const failedAssertions = report.assertions.filter((assertion) => !assertion.ok);
  report.summary = {
    total: report.assertions.length,
    passed: report.assertions.length - failedAssertions.length,
    failed: failedAssertions.length
  };
  report.status = failedAssertions.length ? "failed" : "passed";
  report.completedAt = new Date().toISOString();
  await writeJson(path.join(outDir, "regression-e2e.json"), report);
  console.log(`\nRegression E2E passed. Report: ${path.join(outDir, "regression-e2e.json")}`);
} catch (error) {
  report.failedAt = new Date().toISOString();
  const failedAssertions = report.assertions.filter((assertion) => !assertion.ok);
  report.summary = {
    total: report.assertions.length,
    passed: report.assertions.length - failedAssertions.length,
    failed: failedAssertions.length
  };
  report.status = "failed";
  report.error = {
    message: error?.message || String(error)
  };
  await writeJson(path.join(outDir, "regression-e2e.json"), report);
  console.error(`\nRegression E2E failed. Report: ${path.join(outDir, "regression-e2e.json")}`);
  throw error;
}

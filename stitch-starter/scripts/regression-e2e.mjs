import fs from "node:fs/promises";
import path from "node:path";
import {
  ensureApiKey,
  ensureDir,
  inspectArtifact,
  inspectHtmlArtifact,
  isFlagEnabled,
  normalizeIntegerOption,
  parseArgs,
  ROOT,
  RUNS_DIR,
  runCommand,
  timestamp,
  writeJson,
  writeText
} from "./_common.mjs";

ensureApiKey();

const args = parseArgs(process.argv.slice(2));
const keepArtifacts = isFlagEnabled(args["keep-artifacts"], true);
const timeoutMs = args["timeout-ms"] || "900000";
const stepTimeoutMs = normalizeIntegerOption(
  args["step-timeout-ms"],
  Number(timeoutMs) + 120000,
  { name: "step timeout", min: 10000 }
);
const retries = args.retries || "1";
const childRetries = normalizeIntegerOption(args["child-retries"], retries, {
  name: "child retries",
  min: 0,
  max: 5
});
const retryDelayMs = args["retry-delay-ms"] || "3000";
const device = args.device || "DESKTOP";
const modelId = args["model-id"];
const modelArgs = modelId ? ["--model-id", modelId] : [];
const requireDownloadApprovedScreens = isFlagEnabled(args["require-download-approved-screens"]);
const runId = timestamp();
const outDir = path.join(RUNS_DIR, `${runId}-regression-e2e`);
const report = {
  operation: "regression-e2e",
  createdAt: new Date().toISOString(),
  outDir,
  device,
  modelId: modelId || null,
  stepTimeoutMs,
  steps: [],
  assertions: [],
  warnings: []
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
  const command = ["npm", "run", npmScript, "--", ...scriptArgs];
  console.log(`\n[${name}] ${command.join(" ")}`);

  let result = null;
  for (let attempt = 0; attempt <= childRetries; attempt += 1) {
    result = await runCommand("npm", ["run", npmScript, "--", ...scriptArgs], {
      cwd: ROOT,
      env: process.env,
      timeoutMs: stepTimeoutMs
    });
    if (result.code === 0) break;
    if (attempt < childRetries) {
      const delay = Number(retryDelayMs);
      console.warn(`${name} failed with exit code ${result.code ?? "spawn-error"}. Retry ${attempt + 1}/${childRetries}...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  const step = {
    name,
    npmScript,
    args: scriptArgs,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    durationMs: result.durationMs,
    timedOut: result.timedOut,
    exitCode: result.code,
    signal: result.signal || null,
    error: result.error || null,
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

function extractSavedDir(step) {
  const matches = [...step.stdout.matchAll(/^Saved to:\s*(.+)$/gm)];
  return matches.at(-1)?.[1]?.trim() || null;
}

async function readStepJson(step, fileName = "result.json") {
  const savedDir = extractSavedDir(step);
  recordAssertion(`${step.name}: output dir printed`, Boolean(savedDir), { savedDir });
  const filePath = path.join(savedDir, fileName);
  recordAssertion(`${step.name}: ${fileName} exists`, await fileExists(filePath), { file: filePath });
  return readJson(filePath);
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
    const htmlPath = path.join(metadata.outDir, "screen.html");
    const html = await inspectHtmlArtifact(htmlPath);
    recordAssertion(`${label}: screen.html saved`, html.exists, { file: htmlPath });
    recordAssertion(`${label}: screen.html is non-empty HTML`, html.exists && html.fileType === "html" && html.sizeBytes > 200, {
      file: htmlPath,
      fileType: html.fileType,
      sizeBytes: html.sizeBytes
    });
    recordAssertion(`${label}: screen.html has meaningful text`, html.exists && html.textLength >= 40, {
      file: htmlPath,
      textLength: html.textLength
    });
  }

  if (metadata.imageUrl) {
    const files = await fs.readdir(metadata.outDir);
    const imageFile = files.find((file) => /^screen\.(png|jpe?g|webp)$/.test(file));
    const image = imageFile ? await inspectArtifact(path.join(metadata.outDir, imageFile)) : { exists: false };
    recordAssertion(`${label}: screen image saved`, Boolean(imageFile), {
      outDir: metadata.outDir
    });
    recordAssertion(`${label}: screen image is valid`, image.exists && ["png", "jpeg", "webp"].includes(image.fileType) && image.sizeBytes > 1024 && Boolean(image.dimensions?.width && image.dimensions?.height), {
      file: imageFile ? path.join(metadata.outDir, imageFile) : null,
      fileType: image.fileType,
      sizeBytes: image.sizeBytes,
      dimensions: image.dimensions || null
    });
  }
}

try {
  await runStep("tools", "tools");
  const toolsPath = path.join(RUNS_DIR, "latest-tools.json");
  const tools = await readJson(toolsPath);
  const toolNames = new Set((tools.tools || []).map((tool) => tool.name));
  for (const name of [
    "create_project",
    "get_project",
    "list_projects",
    "list_screens",
    "get_screen",
    "generate_screen_from_text",
    "edit_screens",
    "generate_variants",
    "upload_design_md",
    "create_design_system",
    "create_design_system_from_design_md",
    "update_design_system",
    "list_design_systems",
    "apply_design_system"
  ]) {
    recordAssertion(`tools: ${name} exposed`, toolNames.has(name));
  }

  const generateStep = await runStep("generate", "generate", [
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
    ...modelArgs,
    "--prompt",
    "Compact dark SaaS landing page for a regression test. Include a hero, two cards, a primary button, and one AI generated sports-style image placeholder. Keep copy short."
  ]);
  const generated = await readStepJson(generateStep);
  report.projectId = generated.projectId;
  report.generatedScreenId = generated.screenId;
  await validateScreenResult("generate", generated);

  const designSystemPath = path.join(outDir, "design-system.json");
  await writeJson(designSystemPath, {
    displayName: `StitchFlow E2E ${runId}`,
    theme: {
      colorMode: "DARK",
      headlineFont: "INTER",
      bodyFont: "INTER",
      roundness: "ROUND_EIGHT",
      customColor: "#10b981"
    }
  });
  await runStep("design-system create", "design-system", [
    "--action",
    "create",
    "--project-id",
    generated.projectId,
    "--file",
    designSystemPath,
    "--output-dir",
    path.join(outDir, "design-system-create")
  ]);
  const createdDesignSystem = await readJson(path.join(outDir, "design-system-create", "result.json"));
  const createdAssetId = createdDesignSystem.assetId || createdDesignSystem.result?.name?.replace(/^assets\//, "");
  report.designSystemAssetId = createdAssetId;
  recordAssertion("design-system create: asset id present", Boolean(createdAssetId), {
    assetId: createdAssetId || null
  });

  await runStep("design-system list", "design-system", [
    "--action",
    "list",
    "--project-id",
    generated.projectId,
    "--output-dir",
    path.join(outDir, "design-system-list")
  ]);
  const listedDesignSystems = await readJson(path.join(outDir, "design-system-list", "result.json"));
  recordAssertion("design-system list: includes at least one design system", listedDesignSystems.designSystemCount >= 1, {
    designSystemCount: listedDesignSystems.designSystemCount
  });

  const updatedDesignSystemPath = path.join(outDir, "design-system-updated.json");
  await writeJson(updatedDesignSystemPath, {
    displayName: `StitchFlow E2E Updated ${runId}`,
    theme: {
      colorMode: "DARK",
      headlineFont: "INTER",
      bodyFont: "INTER",
      roundness: "ROUND_EIGHT",
      customColor: "#14b8a6"
    }
  });
  await runStep("design-system update", "design-system", [
    "--action",
    "update",
    "--project-id",
    generated.projectId,
    "--asset-id",
    createdAssetId,
    "--file",
    updatedDesignSystemPath,
    "--output-dir",
    path.join(outDir, "design-system-update")
  ]);

  await runStep("design-system apply", "design-system", [
    "--action",
    "apply",
    "--project-id",
    generated.projectId,
    "--asset-id",
    createdAssetId,
    "--screen-ids",
    generated.screenId,
    "--allow-screen-id-fallback",
    "--output-dir",
    path.join(outDir, "design-system-apply")
  ]);
  const appliedDesignSystem = await readJson(path.join(outDir, "design-system-apply", "result.json"));
  recordAssertion("design-system apply: selected screen instances recorded", appliedDesignSystem.selectedScreenInstances.length === 1, {
    selectedScreenInstances: appliedDesignSystem.selectedScreenInstances
  });
  recordAssertion("design-system apply: instance resolution recorded", Boolean(appliedDesignSystem.screenInstanceResolution), {
    screenInstanceResolution: appliedDesignSystem.screenInstanceResolution || null
  });

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

  const editStep = await runStep("edit", "edit", [
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
    ...modelArgs,
    "--prompt",
    "Refine the screen: make spacing calmer, make the primary button more obvious, and add a small trust/status strip under the hero."
  ]);
  const edited = await readStepJson(editStep);
  report.editedScreenId = edited.screenId;
  await validateScreenResult("edit", edited);
  recordAssertion("edit: produced a new screen", edited.screenId !== generated.screenId, {
    generatedScreenId: generated.screenId,
    editedScreenId: edited.screenId
  });

  const variantsStep = await runStep("variants", "variants", [
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
    ...modelArgs,
    "--prompt",
    "Create one refined alternate direction while preserving the same information architecture."
  ]);
  const variantsManifest = await readStepJson(variantsStep, "variants.json");
  const variantLatest = variantsManifest.variants?.[0];
  recordAssertion("variants: first variant recorded", Boolean(variantLatest?.screenId), {
    variantScreenId: variantLatest?.screenId || null
  });
  report.variantScreenId = variantLatest.screenId;
  await validateScreenResult("variants latest", variantLatest);

  const exportScreenStep = await runStep("export-screen", "export-screen", [
    "--project-id",
    generated.projectId,
    "--screen-id",
    variantLatest.screenId
  ]);
  const exportedScreen = await readStepJson(exportScreenStep);
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
  if (missingApprovedScreens.length) {
    const coveredByExportScreens = missingApprovedScreens.every((screenId) =>
      approvedExportManifest.screens.some((screen) => screen.screenId === screenId)
    );
    const warning = {
      name: "download-project missing approved screens",
      missingApprovedScreens,
      fallback: "export-screens",
      coveredByExportScreens
    };
    report.warnings.push(warning);
    console.warn(`download-project omitted approved screens; export-screens fallback covers them: ${missingApprovedScreens.join(", ")}`);
    recordAssertion("download-project: missing approved screens covered by export-screens fallback", coveredByExportScreens, warning);
    if (requireDownloadApprovedScreens) {
      recordAssertion("download-project: all approved screens downloaded", false, warning);
    }
  }
  for (const screen of downloadManifest.screens) {
    const codePath = path.join(downloadDir, screen.filePath);
    const html = await inspectHtmlArtifact(codePath);
    recordAssertion(`download-project: code exists for ${screen.screenId}`, html.exists, {
      file: codePath
    });
    recordAssertion(`download-project: code is valid HTML for ${screen.screenId}`, html.exists && html.fileType === "html" && html.sizeBytes > 200 && html.textLength >= 40, {
      file: codePath,
      fileType: html.fileType,
      sizeBytes: html.sizeBytes,
      textLength: html.textLength
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

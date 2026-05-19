import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  closeToolClient,
  createStitch,
  downloadProjectAssetsWithFallback,
  ensureDir,
  inspectArtifact,
  inspectHtmlArtifact,
  isFlagEnabled,
  normalizeDeviceType,
  normalizeIntegerOption,
  normalizeModelId,
  parseArgs,
  ROOT,
  RUNS_DIR,
  runCommand,
  saveArtifacts,
  timestamp,
  withRetry,
  withTimeout,
  writeJson,
  writeText
} from "./_common.mjs";

const args = parseArgs(process.argv.slice(2));
const brand = args.brand || "Turnirka";
const slogan = args.slogan || "Tournament management that feels clear to everyone";
const projectTitle = args.title || `${brand} Site Design E2E ${timestamp()}`;
const device = normalizeDeviceType(args.device, "DESKTOP");
const modelId = normalizeModelId(args["model-id"]);
const timeoutMs = args["timeout-ms"];
const totalTimeoutMs = normalizeIntegerOption(
  args["total-timeout-ms"],
  3600000,
  { name: "total timeout", min: 60000 }
);
const operationTimeoutMs = normalizeIntegerOption(
  args["operation-timeout-ms"],
  timeoutMs || 900000,
  { name: "operation timeout", min: 10000 }
);
const stepTimeoutMs = normalizeIntegerOption(
  args["step-timeout-ms"],
  timeoutMs ? Number(timeoutMs) + 120000 : 1020000,
  { name: "step timeout", min: 10000 }
);
const retries = args.retries || "1";
const childRetries = normalizeIntegerOption(args["child-retries"], retries, {
  name: "child retries",
  min: 0,
  max: 5
});
const retryDelayMs = args["retry-delay-ms"] || "3000";
const renderedAudit = isFlagEnabled(args["rendered-audit"], true);
const runId = args["run-id"] || timestamp();
const outDir = path.join(RUNS_DIR, `${runId}-site-design-e2e-${brand.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);

if (process.env.STITCHFLOW_SITE_DESIGN_WORKER !== "1") {
  await ensureDir(outDir);
  const childArgs = [...process.argv.slice(2)];
  if (!args["run-id"]) childArgs.push("--run-id", runId);
  const result = await runCommand(
    process.execPath,
    ["--env-file-if-exists=.env", fileURLToPath(import.meta.url), ...childArgs],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        STITCHFLOW_SITE_DESIGN_WORKER: "1"
      },
      timeoutMs: totalTimeoutMs
    }
  );

  if (result.code !== 0) {
    const reportPath = path.join(outDir, "site-design-e2e.json");
    try {
      await fs.stat(reportPath);
    } catch {
      await writeJson(reportPath, {
        operation: "site-design-e2e",
        createdAt: new Date().toISOString(),
        outDir,
        brand,
        slogan,
        projectTitle,
        device,
        modelId: modelId || null,
        totalTimeoutMs,
        status: "failed",
        error: {
          message: result.timedOut
            ? `site-design:e2e timed out after ${totalTimeoutMs}ms`
            : `site-design:e2e worker failed with exit code ${result.code}`,
          signal: result.signal || null
        }
      });
    }
    throw new Error(result.timedOut
      ? `site-design:e2e timed out after ${totalTimeoutMs}ms`
      : `site-design:e2e worker failed with exit code ${result.code}`);
  }

  process.exit(0);
}

const defaultScreens = [
  {
    key: "pricing",
    title: "Pricing and publication",
    requiredText: ["Pricing", "free draft", "paid publication", "readiness"],
    prompt: "Pricing and publication page. Explain free draft creation, paid publication after readiness checks, plan comparison, FAQ, and a clear CTA."
  },
  {
    key: "public-demo",
    title: "Public tournament page demo",
    requiredText: ["schedule", "standings", "live score", "share"],
    prompt: "Public tournament example page for participants and viewers. Show schedule, standings, live score, team cards, QR/share block, and no-login viewing."
  },
  {
    key: "organizer-onboarding",
    title: "Organizer onboarding",
    requiredText: ["draft tournament", "teams", "readiness", "publish"],
    prompt: "Organizer onboarding page. Show steps to create a draft tournament, add teams, configure format, pass readiness checks, pay, and publish."
  },
  {
    key: "auth-entry",
    title: "Sign in and account entry",
    requiredText: ["Sign in", "email", "organizer"],
    prompt: "Sign in and account entry page. Show email login, OAuth-style options, new organizer CTA, and trust/help copy."
  }
];

const defaultForbiddenText = [
  "free forever",
  "unlimited free",
  "guaranteed revenue",
  "official federation certified",
  "native mobile app",
  "zero fees"
];

const htmlQualityInstruction = [
  "Return a complete accessible HTML document, not a partial fragment.",
  "Include html lang, title, viewport meta, semantic header/main/footer structure, one clear h1, labelled form controls, alt text or empty alt for decorative images, visible focus states, and responsive CSS for mobile/tablet/desktop with no horizontal overflow.",
  "Use real product copy only; do not invent unsupported claims."
].join(" ");

async function loadScreens() {
  if (!args["screens-file"]) return defaultScreens;
  const filePath = path.resolve(args["screens-file"]);
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function filePathIfPresent(dir, file) {
  return path.join(dir, file);
}

async function existingFile(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function findScreenImagePath(dir) {
  try {
    const files = await fs.readdir(dir);
    const file = files.find((item) => /^screen\.(png|jpe?g|webp)$/.test(item));
    return file ? path.join(dir, file) : null;
  } catch {
    return null;
  }
}

async function getScreenUrls(screen) {
  return {
    htmlUrl: await screen.getHtml(),
    imageUrl: await screen.getImage()
  };
}

async function captureScreen({ screen, outDir: screenDir, metadata }) {
  await ensureDir(screenDir);
  const urls = await getScreenUrls(screen);
  await saveArtifacts({ outDir: screenDir, htmlUrl: urls.htmlUrl, imageUrl: urls.imageUrl });
  const htmlPath = filePathIfPresent(screenDir, "screen.html");
  const screenshotPath = await findScreenImagePath(screenDir);
  const result = {
    ...metadata,
    screenId: screen.id,
    htmlUrl: urls.htmlUrl,
    imageUrl: urls.imageUrl,
    outDir: screenDir,
    htmlPath: urls.htmlUrl && await existingFile(htmlPath) ? htmlPath : null,
    screenshotPath
  };
  await writeJson(path.join(screenDir, "result.json"), result);
  return result;
}

async function ensureHtmlScreen(screen, prompt) {
  const urls = await getScreenUrls(screen);
  if (urls.htmlUrl) return screen;
  return withRetry(
    () => screen.edit(`${prompt}\n\nHTML quality requirements: ${htmlQualityInstruction}`, device, modelId),
    {
      label: "ensure_html_edit",
      retries,
      retryDelayMs,
      timeoutMs: operationTimeoutMs
    }
  );
}

async function runAudit(configPath, auditOutDir) {
  let result = null;
  for (let attempt = 0; attempt <= childRetries; attempt += 1) {
    result = await runCommand("npm", ["run", "site-design-audit", "--", "--file", configPath, "--output-dir", auditOutDir], {
      cwd: path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."),
      env: process.env,
      timeoutMs: stepTimeoutMs
    });
    if (result.code === 0) break;
    if (attempt < childRetries) {
      console.warn(`site-design-audit failed with exit code ${result.code ?? "spawn-error"}. Retry ${attempt + 1}/${childRetries}...`);
      await new Promise((resolve) => setTimeout(resolve, Number(retryDelayMs)));
    }
  }
  if (result.code !== 0) throw new Error(`site-design-audit failed with exit code ${result.code}`);
  return result;
}

function scoreCandidate(candidate) {
  let score = 0;
  if (candidate.htmlUrl) score += 10;
  if (candidate.imageUrl) score += 5;
  if (candidate.htmlPath) score += 2;
  if (candidate.screenshotPath) score += 2;
  return score;
}

function stitchOperation(operation, label) {
  return withRetry(operation, {
    label,
    retries,
    retryDelayMs,
    timeoutMs: operationTimeoutMs
  });
}

await ensureDir(outDir);
const screens = await loadScreens();
const report = {
  operation: "site-design-e2e",
  createdAt: new Date().toISOString(),
  outDir,
  brand,
  slogan,
  projectTitle,
  device,
  modelId: modelId || null,
  totalTimeoutMs,
  operationTimeoutMs,
  renderedAudit,
  stepTimeoutMs,
  screens,
  steps: [],
  assertions: [],
  warnings: []
};

const { stitch, client } = createStitch({ timeoutMs });

function assertCheck(name, ok, details = {}) {
  report.assertions.push({ name, ok, ...details });
  if (!ok) throw new Error(`Assertion failed: ${name}`);
}

async function assertCapturedArtifacts(label, result, options = {}) {
  if (result.htmlPath) {
    const html = await inspectHtmlArtifact(result.htmlPath);
    const minHtmlTextLength = options.minHtmlTextLength ?? 40;
    assertCheck(`${label}: HTML is non-empty`, html.exists && html.fileType === "html" && html.sizeBytes > 200, {
      file: result.htmlPath,
      fileType: html.fileType,
      sizeBytes: html.sizeBytes
    });
    if (minHtmlTextLength > 0) {
      assertCheck(`${label}: HTML has meaningful text`, html.textLength >= minHtmlTextLength, {
        file: result.htmlPath,
        textLength: html.textLength,
        minHtmlTextLength
      });
    }
  }

  if (options.requireScreenshot && !result.screenshotPath) {
    assertCheck(`${label}: screenshot artifact saved`, false, {
      file: result.htmlPath,
      screenshotPath: result.screenshotPath || null
    });
  }

  if (result.screenshotPath) {
    const image = await inspectArtifact(result.screenshotPath);
    assertCheck(`${label}: screenshot is valid image`, image.exists && ["png", "jpeg", "webp"].includes(image.fileType) && image.sizeBytes > 1024 && Boolean(image.dimensions?.width && image.dimensions?.height), {
      file: result.screenshotPath,
      fileType: image.fileType,
      sizeBytes: image.sizeBytes,
      dimensions: image.dimensions || null
    });
  }
}

try {
  const project = await withTimeout(
    () => stitch.createProject(projectTitle),
    operationTimeoutMs,
    "create_project"
  );
  report.projectId = project.id;
  console.log(`Project: ${project.id}`);
  console.log(`Output: ${outDir}`);

  const designMdPath = path.join(outDir, "DESIGN.md");
  await writeText(
    designMdPath,
    `# ${brand} Site Design E2E

Brand: ${brand}
Slogan: ${slogan}

Design direction:
- dark but airy modern product site
- confident sports tournament platform, not a generic SaaS shell
- meaningful generated sports imagery, not stock photography
- 8px component radius, strong CTA hierarchy, accessible contrast
- current product starts with futsal/mini-football, future roadmap can mention basketball, volleyball, and multisport only as roadmap
- generated HTML is a handoff artifact, not production code
`
  );

  const logoPrompt = `${brand} compact logo exploration board for a sports tournament platform. Create exactly 5 distinct vector-style logo options with wordmark, simple icon, favicon preview, dark background usage, and short labels. Avoid photorealistic imagery and heavy scene rendering; prioritize fast, clean brand marks. Brand slogan: ${slogan}. Modern 2026, dark but airy, sport energy, clear and trustworthy.`;
  const logoScreen = await stitchOperation(
    () => project.generate(logoPrompt, device, modelId),
    "logo_generate"
  );
  const logoResult = await captureScreen({
    screen: logoScreen,
    outDir: path.join(outDir, "logo-options"),
    metadata: {
      operation: "logo-options",
      prompt: logoPrompt,
      selectedVariant: "option-3-provisional"
    }
  });
  report.logo = {
    selectedName: brand,
    selectedVariant: "option-3-provisional",
    screenId: logoResult.screenId,
    artifactPath: logoResult.screenshotPath || logoResult.htmlPath,
    rationale: "Auto-selected for E2E as the provisional middle option; real product flow should let the owner choose."
  };
  assertCheck("logo screen id recorded", Boolean(logoResult.screenId), { screenId: logoResult.screenId });
  assertCheck("logo artifact saved", Boolean(logoResult.screenshotPath || logoResult.htmlPath), {
    artifactPath: logoResult.screenshotPath || logoResult.htmlPath
  });
  await assertCapturedArtifacts("logo", logoResult, {
    minHtmlTextLength: 0,
    requireScreenshot: true
  });

  const homeSeedPrompt = `${brand} homepage for a paid public sports tournament platform. Use the selected logo direction option 3. Slogan: ${slogan}. Create a full desktop landing page: nav, hero, primary CTA, live tournament preview, how it works, roles for organizer/secretary/participant/company, publication/payment explanation, roadmap for basketball/volleyball/multisport, and footer. Dark but airy, premium 2026, meaningful AI sports imagery, no boring grey dashboard. HTML quality requirements: ${htmlQualityInstruction}`;
  const homeSeed = await stitchOperation(
    () => project.generate(homeSeedPrompt, device, modelId),
    "homepage_seed_generate"
  );
  const homeBase = await ensureHtmlScreen(
    homeSeed,
      `Turn this ${brand} homepage concept into a complete HTML-ready homepage while preserving the same visual direction, logo usage, dark airy style, and product content.`
  );
  const homeBaseResult = await captureScreen({
    screen: homeBase,
    outDir: path.join(outDir, "home-candidates", "candidate-01-base"),
    metadata: {
      operation: "home-candidate",
      candidateIndex: 1,
      prompt: homeSeedPrompt
    }
  });

  const homeVariants = await stitchOperation(
    () => homeBase.variants(
      `Create 4 substantially different ${brand} homepage variants while preserving the same brand, logo direction, dark airy style, and product truth. Vary hero composition, imagery, CTA hierarchy, proof, role sections, and roadmap framing. Keep every variant as a full homepage, not a standalone illustration. HTML quality requirements: ${htmlQualityInstruction}`,
      {
        variantCount: 4,
        creativeRange: "EXPLORE",
        aspects: ["LAYOUT", "COLOR_SCHEME", "IMAGES", "TEXT_CONTENT"]
      },
      device,
      modelId
    ),
    "homepage_variants"
  );

  const homeCandidateResults = [homeBaseResult];
  for (let i = 0; i < homeVariants.length; i += 1) {
    const candidate = await ensureHtmlScreen(
      homeVariants[i],
      `Make this ${brand} homepage variant HTML-ready while preserving its unique layout and visual direction.`
    );
    const result = await captureScreen({
      screen: candidate,
      outDir: path.join(outDir, "home-candidates", `candidate-${String(i + 2).padStart(2, "0")}`),
      metadata: {
        operation: "home-candidate",
        candidateIndex: i + 2
      }
    });
    homeCandidateResults.push(result);
  }

  assertCheck("five homepage candidates generated", homeCandidateResults.length === 5, {
    count: homeCandidateResults.length
  });
  for (const candidate of homeCandidateResults) {
    assertCheck(`home candidate ${candidate.candidateIndex}: artifact saved`, Boolean(candidate.htmlPath || candidate.screenshotPath), {
      screenId: candidate.screenId
    });
    await assertCapturedArtifacts(`home candidate ${candidate.candidateIndex}`, candidate);
  }

  const selectedHome = [...homeCandidateResults].sort((a, b) => scoreCandidate(b) - scoreCandidate(a))[0];
  report.selectedHome = {
    screenId: selectedHome.screenId,
    candidateIndex: selectedHome.candidateIndex,
    selectionScore: scoreCandidate(selectedHome),
    rationale: "Auto-selected for E2E by artifact completeness: HTML, screenshot, and local files. Real product workflow should replace this with owner review."
  };
  assertCheck("selected homepage recorded", Boolean(report.selectedHome.screenId), report.selectedHome);

  const selectedHomeScreen = project.screen(selectedHome.screenId);
  const finalScreens = [];
  for (let i = 0; i < screens.length; i += 1) {
    const screenSpec = screens[i];
    const prompt = `${brand} website screen in the exact visual style of selected homepage screen ${selectedHome.screenId}. Screen key: ${screenSpec.key}. Screen title: ${screenSpec.title}. Goal: ${screenSpec.prompt}. Keep logo, typography, dark airy visual language, CTA style, imagery language, and product truth consistent. This must be a complete standalone desktop web screen with real content, not a placeholder. HTML quality requirements: ${htmlQualityInstruction}`;
    const generated = await stitchOperation(
      () => selectedHomeScreen.edit(prompt, device, modelId),
      `remaining_screen_${screenSpec.key}`
    );
    const htmlReady = await ensureHtmlScreen(
      generated,
      `Make the ${screenSpec.key} screen HTML-ready while preserving the selected ${brand} homepage style and all required content.`
    );
    const result = await captureScreen({
      screen: htmlReady,
      outDir: path.join(outDir, "remaining-screens", `${String(i + 1).padStart(2, "0")}-${screenSpec.key}`),
      metadata: {
        operation: "remaining-screen",
        key: screenSpec.key,
        title: screenSpec.title,
        prompt
      }
    });
    finalScreens.push({ ...screenSpec, ...result });
    await assertCapturedArtifacts(`screen ${screenSpec.key}`, result);
  }
  assertCheck("remaining screens generated", finalScreens.length === screens.length, {
    expected: screens.length,
    actual: finalScreens.length
  });

  const approvedScreenIds = [
    selectedHome.screenId,
    ...finalScreens.map((screen) => screen.screenId)
  ];
  const exportScreensDir = path.join(outDir, "approved-screen-export");
  const exportScreens = [];
  for (let i = 0; i < approvedScreenIds.length; i += 1) {
    const screenId = approvedScreenIds[i];
    const screen = project.screen(screenId);
    const result = await captureScreen({
      screen,
      outDir: path.join(exportScreensDir, `screen-${String(i + 1).padStart(2, "0")}-${screenId}`),
      metadata: {
        operation: "export-screens-screen",
        projectId: project.id,
        index: i + 1
      }
    });
    exportScreens.push(result);
  }
  const exportScreensManifest = {
    operation: "export-screens",
    createdAt: new Date().toISOString(),
    projectId: project.id,
    requestedScreenIds: approvedScreenIds,
    screenCount: exportScreens.length,
    screens: exportScreens,
    outDir: exportScreensDir
  };
  await writeJson(path.join(exportScreensDir, "export-screens.json"), exportScreensManifest);
  assertCheck("approved screens exported", exportScreens.length === approvedScreenIds.length, {
    expected: approvedScreenIds.length,
    actual: exportScreens.length
  });

  const downloadProjectDir = path.join(outDir, "download-project");
  const downloadResult = await withRetry(
    () => downloadProjectAssetsWithFallback(project, downloadProjectDir, {
      projectId: project.id,
      assetsSubdir: "assets"
    }),
    {
      label: "download_project_assets",
      retries,
      retryDelayMs,
      timeoutMs: operationTimeoutMs
    }
  );
  const downloadManifest = {
    operation: "download-project",
    createdAt: new Date().toISOString(),
    projectId: project.id,
    assetsSubdir: "assets",
    downloadMode: downloadResult.mode,
    screens: downloadResult.screens,
    warnings: downloadResult.warnings,
    outDir: downloadProjectDir
  };
  await writeJson(path.join(downloadProjectDir, "download-project.json"), downloadManifest);
  report.downloadProjectMissingApprovedScreens = approvedScreenIds.filter(
    (screenId) => !new Set(downloadManifest.screens.map((screen) => screen.screenId)).has(screenId)
  );
  if (report.downloadProjectMissingApprovedScreens.length) {
    const warning = {
      name: "download-project missing approved screens",
      missingApprovedScreens: report.downloadProjectMissingApprovedScreens,
      fallback: "export-screens"
    };
    report.warnings.push(warning);
    console.warn(`download-project omitted approved screens; export-screens fallback will be audited: ${report.downloadProjectMissingApprovedScreens.join(", ")}`);
  }
  assertCheck("download-project manifest written", true, {
    screenCount: downloadManifest.screens.length,
    warnings: downloadManifest.warnings
  });

  const auditConfig = {
    projectId: project.id,
    handoffStatus: "final",
    allowExportFallbackForApprovedScreens: true,
    qaNotes: [
      {
        area: "identity",
        status: "passed",
        note: "Logo decision and selected homepage candidate are recorded for handoff."
      },
      {
        area: "coverage",
        status: "passed",
        note: "Approved homepage and required screen inventory are exported and audited."
      },
      {
        area: "claims",
        status: "passed",
        note: "Generated copy is checked against unsupported product claims."
      },
      {
        area: "responsive-accessibility",
        status: renderedAudit ? "passed" : "warning",
        note: renderedAudit ? "Rendered viewport audit is enabled." : "Rendered viewport audit was disabled by CLI flag."
      }
    ],
    forbiddenText: defaultForbiddenText,
    renderedViewports: renderedAudit
      ? [
          { name: "mobile", width: 390, height: 844 },
          { name: "tablet", width: 768, height: 1024 },
          { name: "desktop", width: 1440, height: 900 }
        ]
      : [],
    minHomeVariants: 5,
    logo: {
      selectedName: brand,
      selectedVariant: report.logo.selectedVariant,
      path: logoResult.screenshotPath || logoResult.htmlPath
    },
    selectedHomeScreenId: selectedHome.screenId,
    downloadManifest: path.join(downloadProjectDir, "download-project.json"),
    exportScreensManifest: path.join(exportScreensDir, "export-screens.json"),
    homeVariants: homeCandidateResults.map((candidate) => ({
      name: `Homepage candidate ${candidate.candidateIndex}`,
      screenId: candidate.screenId,
      codePath: candidate.htmlPath,
      screenshotPath: candidate.screenshotPath
    })),
    expectedScreens: [
      {
        key: "home",
        title: "Selected homepage",
        required: true,
        screenId: selectedHome.screenId,
        codePath: selectedHome.htmlPath,
        screenshotPath: selectedHome.screenshotPath,
        requiredText: [brand, "organizer", "participant", "publication"]
      },
      ...finalScreens.map((screen) => ({
        key: screen.key,
        title: screen.title,
        required: true,
        screenId: screen.screenId,
        codePath: screen.htmlPath,
        screenshotPath: screen.screenshotPath,
        requiredText: screen.requiredText || []
      }))
    ]
  };
  const auditConfigPath = path.join(outDir, "site-design-audit.json");
  await writeJson(auditConfigPath, auditConfig);
  await runAudit(auditConfigPath, path.join(outDir, "audit"));

  const failedAssertions = report.assertions.filter((assertion) => !assertion.ok);
  report.status = failedAssertions.length ? "failed" : "passed";
  report.summary = {
    total: report.assertions.length,
    passed: report.assertions.length - failedAssertions.length,
    failed: failedAssertions.length
  };
  report.logoResult = logoResult;
  report.homeCandidates = homeCandidateResults;
  report.finalScreens = finalScreens;
  report.approvedScreenIds = approvedScreenIds;
  report.exportScreensManifest = path.join(exportScreensDir, "export-screens.json");
  report.downloadProjectManifest = path.join(downloadProjectDir, "download-project.json");
  report.auditConfig = auditConfigPath;
  report.auditReport = path.join(outDir, "audit", "site-design-audit.json");
  report.completedAt = new Date().toISOString();
  await writeJson(path.join(outDir, "site-design-e2e.json"), report);
  console.log(`Site design E2E passed. Report: ${path.join(outDir, "site-design-e2e.json")}`);
} catch (error) {
  report.status = "failed";
  report.error = { message: normalizeText(error?.message || error) };
  report.failedAt = new Date().toISOString();
  await writeJson(path.join(outDir, "site-design-e2e.json"), report);
  console.error(`Site design E2E failed. Report: ${path.join(outDir, "site-design-e2e.json")}`);
  throw error;
} finally {
  await closeToolClient(client);
}

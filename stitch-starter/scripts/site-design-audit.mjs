import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { stitch } from "@google/stitch-sdk";
import {
  createRunDirForName,
  ensureApiKey,
  inspectArtifact,
  inspectHtmlArtifact,
  isFlagEnabled,
  normalizeIntegerOption,
  parseArgs,
  withRetry,
  writeJson
} from "./_common.mjs";

const args = parseArgs(process.argv.slice(2));
const file = args.file || "site-design-audit.json";
const shouldCheckProject = isFlagEnabled(args["check-project"], true);
const retries = args.retries || "1";
const retryDelayMs = args["retry-delay-ms"] || "3000";
const configPath = path.resolve(file);
const baseDir = path.dirname(configPath);
const config = JSON.parse(await fs.readFile(configPath, "utf8"));
const minHtmlBytes = normalizeIntegerOption(args["min-html-bytes"], config.minHtmlBytes || 200, {
  name: "minimum HTML bytes",
  min: 1
});
const minImageBytes = normalizeIntegerOption(args["min-image-bytes"], config.minImageBytes || 1024, {
  name: "minimum image bytes",
  min: 1
});
const report = {
  operation: "site-design-audit",
  createdAt: new Date().toISOString(),
  configPath,
  projectId: config.projectId || null,
  checks: [],
  warnings: []
};

function resolveLocalPath(value) {
  if (!value) return null;
  return path.isAbsolute(value) ? value : path.resolve(baseDir, value);
}

function addCheck(name, ok, details = {}) {
  report.checks.push({ name, ok, ...details });
}

function addWarning(name, details = {}) {
  report.warnings.push({ name, ...details });
}

async function exists(filePath) {
  if (!filePath) return false;
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function readMaybe(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function normalizeSearchText(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

async function addHtmlArtifactChecks(label, filePath, options = {}) {
  const info = await inspectHtmlArtifact(filePath);
  const required = options.required !== false;

  addCheck(`${label}: HTML artifact exists`, info.exists || !required, { file: filePath });
  if (!info.exists) return info;

  addCheck(`${label}: artifact type is HTML`, info.fileType === "html", {
    file: filePath,
    fileType: info.fileType
  });
  addCheck(`${label}: HTML artifact is non-empty`, info.sizeBytes >= minHtmlBytes, {
    file: filePath,
    sizeBytes: info.sizeBytes,
    minHtmlBytes
  });
  addCheck(`${label}: HTML has meaningful text`, info.textLength >= Number(options.minTextLength || 80), {
    file: filePath,
    textLength: info.textLength
  });
  addCheck(`${label}: has heading structure`, info.headingCount > 0, {
    file: filePath,
    headingCount: info.headingCount,
    h1Count: info.h1Count
  });
  if (info.hasHtmlElement) {
    addCheck(`${label}: document language recorded`, Boolean(info.htmlLang), {
      file: filePath,
      htmlLang: info.htmlLang || null
    });
    addCheck(`${label}: document title recorded`, Boolean(info.titleText), {
      file: filePath,
      titleText: info.titleText || null
    });
    addCheck(`${label}: viewport meta recorded`, info.hasViewportMeta && /width\s*=\s*device-width/i.test(info.viewport), {
      file: filePath,
      viewport: info.viewport || null
    });
  }
  addCheck(`${label}: images have alt attributes`, info.imagesWithoutAlt === 0, {
    file: filePath,
    imagesWithoutAlt: info.imagesWithoutAlt
  });
  addCheck(`${label}: interactive controls have names`, info.unnamedInteractive === 0, {
    file: filePath,
    unnamedInteractive: info.unnamedInteractive
  });
  addCheck(`${label}: form controls have labels`, info.inputsWithoutLabel === 0, {
    file: filePath,
    inputsWithoutLabel: info.inputsWithoutLabel
  });
  addCheck(`${label}: no static accessibility anti-patterns`, info.antiPatterns.length === 0, {
    file: filePath,
    antiPatterns: info.antiPatterns
  });
  addCheck(`${label}: responsive CSS signals present`, info.responsiveSignals > 0, {
    file: filePath,
    responsiveSignals: info.responsiveSignals
  });
  addCheck(`${label}: no fixed wide widths`, info.fixedWideWidths.length === 0, {
    file: filePath,
    fixedWideWidths: info.fixedWideWidths
  });

  return info;
}

async function addImageArtifactChecks(label, filePath, options = {}) {
  const info = await inspectArtifact(filePath);
  const required = options.required !== false;

  addCheck(`${label}: image artifact exists`, info.exists || !required, { file: filePath });
  if (!info.exists) return info;

  addCheck(`${label}: artifact type is image`, ["png", "jpeg", "webp"].includes(info.fileType), {
    file: filePath,
    fileType: info.fileType
  });
  addCheck(`${label}: image artifact is non-empty`, info.sizeBytes >= minImageBytes, {
    file: filePath,
    sizeBytes: info.sizeBytes,
    minImageBytes
  });
  addCheck(`${label}: image dimensions detected`, Boolean(info.dimensions?.width && info.dimensions?.height), {
    file: filePath,
    dimensions: info.dimensions || null
  });

  return info;
}

async function addTextChecks(label, filePath, requiredText = [], forbiddenText = []) {
  const sourceText = normalizeSearchText(await readMaybe(filePath));

  for (const text of requiredText) {
    const expected = normalizeSearchText(text);
    addCheck(`${label}: required text "${text}"`, sourceText.includes(expected), {
      file: filePath
    });
  }

  for (const text of forbiddenText) {
    const forbidden = normalizeSearchText(text);
    addCheck(`${label}: unsupported claim absent "${text}"`, !sourceText.includes(forbidden), {
      file: filePath
    });
  }
}

async function runRenderedViewportAudit(screenEntries, viewports) {
  if (!viewports.length) return;

  let chromium = null;
  let AxeBuilder = null;
  try {
    ({ chromium } = await import("playwright"));
    const axeModule = await import("@axe-core/playwright");
    AxeBuilder = axeModule.default || axeModule.AxeBuilder;
  } catch (error) {
    addCheck("rendered audit dependencies available", false, {
      message: error?.message || String(error)
    });
    return;
  }

  const browser = await chromium.launch({ headless: true });
  try {
    for (const entry of screenEntries) {
      if (!entry.codePath) continue;
      for (const viewport of viewports) {
        const label = `${entry.label}: ${viewport.name || `${viewport.width}x${viewport.height}`}`;
        const context = await browser.newContext({
          viewport: {
            width: Number(viewport.width),
            height: Number(viewport.height)
          }
        });
        const page = await context.newPage();
        const pageErrors = [];
        page.on("pageerror", (error) => pageErrors.push(error?.message || String(error)));
        page.on("console", (message) => {
          if (message.type() === "error") pageErrors.push(message.text());
        });

        try {
          await page.goto(pathToFileURL(entry.codePath).href, {
            waitUntil: "load",
            timeout: Number(viewport.timeoutMs || 30000)
          });

          const metrics = await page.evaluate(() => {
            const doc = document.documentElement;
            const body = document.body;
            const horizontalOverflow = Math.max(doc.scrollWidth, body?.scrollWidth || 0) - window.innerWidth;
            const wideElements = Array.from(document.body.querySelectorAll("*"))
              .map((element) => {
                const rect = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                return {
                  tag: element.tagName.toLowerCase(),
                  className: String(element.className || "").slice(0, 80),
                  width: Math.round(rect.width),
                  position: style.position
                };
              })
              .filter((item) => item.width > window.innerWidth + 2 && item.position !== "fixed")
              .slice(0, 5);
            const clippedText = Array.from(document.body.querySelectorAll("*"))
              .filter((element) => {
                const text = (element.textContent || "").replace(/\s+/g, " ").trim();
                if (text.length < 12) return false;
                const style = window.getComputedStyle(element);
                if (style.overflow === "visible" && style.textOverflow !== "ellipsis") return false;
                return element.scrollWidth > element.clientWidth + 2 || element.scrollHeight > element.clientHeight + 2;
              })
              .map((element) => ({
                tag: element.tagName.toLowerCase(),
                className: String(element.className || "").slice(0, 80),
                text: (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80)
              }))
              .slice(0, 5);
            return { horizontalOverflow, wideElements, clippedText };
          });

          addCheck(`${label}: no rendered horizontal overflow`, metrics.horizontalOverflow <= 2 && metrics.wideElements.length === 0, {
            file: entry.codePath,
            viewport,
            horizontalOverflow: metrics.horizontalOverflow,
            wideElements: metrics.wideElements
          });
          addCheck(`${label}: no clipped rendered text`, metrics.clippedText.length === 0, {
            file: entry.codePath,
            viewport,
            clippedText: metrics.clippedText
          });
          addCheck(`${label}: no browser page errors`, pageErrors.length === 0, {
            file: entry.codePath,
            viewport,
            pageErrors: pageErrors.slice(0, 10)
          });

          if (AxeBuilder) {
            const axe = await new AxeBuilder({ page }).analyze();
            const blockingViolations = axe.violations.filter((violation) =>
              ["critical", "serious"].includes(violation.impact)
            );
            addCheck(`${label}: no serious axe violations`, blockingViolations.length === 0, {
              file: entry.codePath,
              viewport,
              violations: blockingViolations.map((violation) => ({
                id: violation.id,
                impact: violation.impact,
                nodes: violation.nodes.length
              }))
            });
            const moderateViolations = axe.violations.filter((violation) => violation.impact === "moderate");
            if (moderateViolations.length) {
              addWarning(`${label}: moderate axe violations`, {
                file: entry.codePath,
                viewport,
                violations: moderateViolations.map((violation) => ({
                  id: violation.id,
                  nodes: violation.nodes.length
                }))
              });
            }
          }
        } catch (error) {
          addCheck(`${label}: rendered audit completed`, false, {
            file: entry.codePath,
            viewport,
            message: error?.message || String(error)
          });
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}

async function hasScreenImage(dirPath) {
  if (!dirPath) return false;
  try {
    const files = await fs.readdir(dirPath);
    return files.some((file) => /^screen\.(png|jpe?g|webp)$/.test(file));
  } catch {
    return false;
  }
}

async function findScreenImagePath(dirPath) {
  if (!dirPath) return null;
  try {
    const files = await fs.readdir(dirPath);
    const file = files.find((item) => /^screen\.(png|jpe?g|webp)$/.test(item));
    return file ? path.join(dirPath, file) : null;
  } catch {
    return null;
  }
}

function countByKey(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key];
    if (!value) return acc;
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

let project = null;
if (shouldCheckProject && config.projectId) {
  ensureApiKey();
  project = stitch.project(config.projectId);
  const screens = await withRetry(
    () => project.screens(),
    {
      label: "project_screens",
      retries,
      retryDelayMs
    }
  );
  report.projectListedScreenCount = screens.length;
  addCheck("project is accessible", true, {
    listedScreenCount: screens.length
  });
}

async function canGetScreen(screenId) {
  if (!project || !screenId) return null;
  try {
    await withRetry(
      () => project.getScreen(screenId),
      {
        label: `get_screen_${screenId}`,
        retries,
        retryDelayMs
      }
    );
    return true;
  } catch {
    return false;
  }
}

const handoffStatus = config.handoffStatus || config.status;
addCheck("handoff status is recorded", ["draft", "final", "blocked"].includes(handoffStatus), {
  handoffStatus: handoffStatus || null
});
addCheck("QA notes are recorded", Array.isArray(config.qaNotes) && config.qaNotes.length > 0, {
  qaNotesCount: Array.isArray(config.qaNotes) ? config.qaNotes.length : 0
});
for (const [index, note] of (config.qaNotes || []).entries()) {
  addCheck(`QA note ${index + 1}: status valid`, ["passed", "warning", "blocked"].includes(note.status), {
    status: note.status || null,
    area: note.area || null
  });
  addCheck(`QA note ${index + 1}: note present`, Boolean(note.note), {
    area: note.area || null
  });
}

if (config.logo) {
  const logoPath = resolveLocalPath(config.logo.path);
  addCheck("logo decision is recorded", Boolean(config.logo.selectedName || config.logo.selectedVariant), {
    selectedName: config.logo.selectedName || null,
    selectedVariant: config.logo.selectedVariant || null
  });
  if (logoPath && /\.(png|jpe?g|webp)$/i.test(logoPath)) {
    await addImageArtifactChecks("logo", logoPath);
  } else {
    await addHtmlArtifactChecks("logo", logoPath);
  }
}

const homeVariants = config.homeVariants || [];
const minHomeVariants = Number(config.minHomeVariants || 5);
addCheck("minimum home variants created", homeVariants.length >= minHomeVariants, {
  expectedAtLeast: minHomeVariants,
  actual: homeVariants.length
});

const selectedHomeScreenId = config.selectedHomeScreenId || config.selectedHome?.screenId;
addCheck("selected home screen is recorded", Boolean(selectedHomeScreenId), {
  selectedHomeScreenId: selectedHomeScreenId || null
});
if (selectedHomeScreenId && homeVariants.length) {
  addCheck("selected home is one of variants", homeVariants.some((variant) => variant.screenId === selectedHomeScreenId), {
    selectedHomeScreenId
  });
}

for (const [index, variant] of homeVariants.entries()) {
  const label = variant.name || `home variant ${index + 1}`;
  addCheck(`${label}: screen id recorded`, Boolean(variant.screenId), {
    screenId: variant.screenId || null
  });
  const screenAccessible = await canGetScreen(variant.screenId);
  if (screenAccessible !== null) {
    addCheck(`${label}: screen is accessible by id`, screenAccessible, {
      screenId: variant.screenId
    });
  }
  for (const field of ["codePath", "htmlPath", "screenshotPath", "imagePath"]) {
    if (!variant[field]) continue;
    const artifactPath = resolveLocalPath(variant[field]);
    if (field === "codePath" || field === "htmlPath") {
      await addHtmlArtifactChecks(`${label}: ${field}`, artifactPath);
    } else {
      await addImageArtifactChecks(`${label}: ${field}`, artifactPath);
    }
  }
}

const expectedScreens = config.expectedScreens || config.screens || [];
addCheck("screen inventory is not empty", expectedScreens.length > 0, {
  screenCount: expectedScreens.length
});

const keyCounts = countByKey(expectedScreens, "key");
for (const [key, count] of Object.entries(keyCounts)) {
  addCheck(`screen key unique: ${key}`, count === 1, { count });
}

const forbiddenText = config.forbiddenText || config.unsupportedClaims || [];
const renderedEntries = [];
for (const screen of expectedScreens) {
  const label = screen.key || screen.name || screen.title || screen.screenId || "unnamed screen";
  const required = screen.required !== false;

  addCheck(`${label}: screen id recorded`, Boolean(screen.screenId) || !required, {
    screenId: screen.screenId || null,
    required
  });

  const screenAccessible = await canGetScreen(screen.screenId);
  if (screenAccessible !== null) {
    addCheck(`${label}: screen is accessible by id`, screenAccessible, {
      screenId: screen.screenId
    });
  }

  const codePath = resolveLocalPath(screen.codePath || screen.htmlPath);
  if (required || codePath) {
    await addHtmlArtifactChecks(`${label}: code`, codePath, {
      required,
      minTextLength: screen.minTextLength
    });
    if (codePath) renderedEntries.push({ label, codePath });
  }

  const screenshotPath = resolveLocalPath(screen.screenshotPath || screen.imagePath);
  if (required || screenshotPath) {
    await addImageArtifactChecks(`${label}: screenshot`, screenshotPath, { required });
  }

  const requiredText = screen.requiredText || [];
  if (requiredText.length || forbiddenText.length) await addTextChecks(label, codePath, requiredText, forbiddenText);
}

let exportScreensIds = new Set();
if (config.exportScreensManifest) {
  const manifestPath = resolveLocalPath(config.exportScreensManifest);
  const manifestExists = await exists(manifestPath);
  addCheck("export-screens manifest exists", manifestExists, { file: manifestPath });
  if (manifestExists) {
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    exportScreensIds = new Set((manifest.screens || []).map((screen) => screen.screenId));
    for (const screen of manifest.screens || []) {
      const screenDir = screen.outDir || path.join(path.dirname(manifestPath), `screen-${screen.index}-${screen.screenId}`);
      const htmlPath = path.join(screenDir, "screen.html");
      if (screen.htmlUrl) await addHtmlArtifactChecks(`export-screens artifact for ${screen.screenId}`, htmlPath);
      else {
        const imagePath = await findScreenImagePath(screenDir);
        addCheck(`export-screens image artifact exists for ${screen.screenId}`, Boolean(imagePath) || await hasScreenImage(screenDir), {
          screenId: screen.screenId,
          screenDir
        });
        if (imagePath) await addImageArtifactChecks(`export-screens image for ${screen.screenId}`, imagePath);
      }
    }
  }
}

if (config.downloadManifest) {
  const manifestPath = resolveLocalPath(config.downloadManifest);
  const manifestExists = await exists(manifestPath);
  addCheck("download-project manifest exists", manifestExists, { file: manifestPath });
  if (manifestExists) {
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    addCheck("download-project warnings are empty", (manifest.warnings || []).length === 0, {
      warnings: manifest.warnings || []
    });
    const downloadedScreenIds = new Set((manifest.screens || []).map((screen) => screen.screenId));
    const missingApprovedScreens = [];
    for (const screen of expectedScreens.filter((item) => item.screenId)) {
      const inDownloadProject = downloadedScreenIds.has(screen.screenId);
      const inExportScreens = exportScreensIds.has(screen.screenId);
      if (!inDownloadProject) missingApprovedScreens.push(screen.screenId);
      const ok = inDownloadProject || (config.allowExportFallbackForApprovedScreens === true && inExportScreens);
      addCheck(`handoff contains ${screen.key || screen.screenId}`, ok, {
        screenId: screen.screenId,
        inDownloadProject,
        inExportScreens,
        allowExportFallbackForApprovedScreens: config.allowExportFallbackForApprovedScreens === true
      });
    }
    if (missingApprovedScreens.length) {
      addWarning("download-project omitted approved screens", {
        missingApprovedScreens,
        fallbackAllowed: config.allowExportFallbackForApprovedScreens === true
      });
    }
    for (const screen of manifest.screens || []) {
      if (!screen.filePath) continue;
      const codePath = path.isAbsolute(screen.filePath)
        ? screen.filePath
        : path.join(path.dirname(manifestPath), screen.filePath);
      await addHtmlArtifactChecks(`download-project code for ${screen.screenId}`, codePath);
    }
  }
}

const renderedViewports = Array.isArray(config.renderedViewports) ? config.renderedViewports : [];
await runRenderedViewportAudit(renderedEntries, renderedViewports);

const failed = report.checks.filter((check) => !check.ok);
report.summary = {
  total: report.checks.length,
  passed: report.checks.length - failed.length,
  failed: failed.length,
  warnings: report.warnings.length
};
report.status = failed.length ? "failed" : "passed";

const outDir = args["output-dir"]
  ? path.resolve(args["output-dir"])
  : await createRunDirForName("site-design-audit", path.basename(configPath));
await writeJson(path.join(outDir, "site-design-audit.json"), report);

console.log(`Site design audit: ${report.status}`);
console.log(`Checks: ${report.summary.passed}/${report.summary.total} passed`);
console.log(`Report: ${path.join(outDir, "site-design-audit.json")}`);

if (failed.length) {
  console.log("Failed checks:");
  for (const check of failed) console.log(`- ${check.name}`);
  process.exit(1);
}

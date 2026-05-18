import fs from "node:fs/promises";
import path from "node:path";
import { stitch } from "@google/stitch-sdk";
import {
  createRunDirForName,
  ensureApiKey,
  parseArgs,
  writeJson
} from "./_common.mjs";

const args = parseArgs(process.argv.slice(2));
const file = args.file || "site-design-audit.json";
const shouldCheckProject = args["check-project"] !== false && args["check-project"] !== "false";
const configPath = path.resolve(file);
const baseDir = path.dirname(configPath);
const config = JSON.parse(await fs.readFile(configPath, "utf8"));
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

async function hasScreenImage(dirPath) {
  if (!dirPath) return false;
  try {
    const files = await fs.readdir(dirPath);
    return files.some((file) => /^screen\.(png|jpe?g|webp)$/.test(file));
  } catch {
    return false;
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
  const screens = await project.screens();
  report.projectListedScreenCount = screens.length;
  addCheck("project is accessible", true, {
    listedScreenCount: screens.length
  });
}

async function canGetScreen(screenId) {
  if (!project || !screenId) return null;
  try {
    await project.getScreen(screenId);
    return true;
  } catch {
    return false;
  }
}

if (config.logo) {
  const logoPath = resolveLocalPath(config.logo.path);
  addCheck("logo decision is recorded", Boolean(config.logo.selectedName || config.logo.selectedVariant), {
    selectedName: config.logo.selectedName || null,
    selectedVariant: config.logo.selectedVariant || null
  });
  addCheck("logo artifact exists", await exists(logoPath), { file: logoPath });
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
    addCheck(`${label}: ${field} exists`, await exists(artifactPath), { file: artifactPath });
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
    addCheck(`${label}: code artifact exists`, await exists(codePath), { file: codePath });
  }

  const screenshotPath = resolveLocalPath(screen.screenshotPath || screen.imagePath);
  if (required || screenshotPath) {
    addCheck(`${label}: screenshot artifact exists`, await exists(screenshotPath), {
      file: screenshotPath
    });
  }

  const requiredText = screen.requiredText || [];
  if (requiredText.length) {
    const sourceText = await readMaybe(codePath);
    for (const text of requiredText) {
      addCheck(`${label}: required text "${text}"`, sourceText.includes(text), {
        file: codePath
      });
    }
  }
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
      addCheck(`export-screens artifact exists for ${screen.screenId}`, screen.htmlUrl ? await exists(htmlPath) : await hasScreenImage(screenDir), {
        screenId: screen.screenId,
        screenDir,
        htmlPath
      });
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
    for (const screen of expectedScreens.filter((item) => item.screenId)) {
      const inDownloadProject = downloadedScreenIds.has(screen.screenId);
      const inExportScreens = exportScreensIds.has(screen.screenId);
      addCheck(`handoff contains ${screen.key || screen.screenId}`, inDownloadProject || inExportScreens, {
        screenId: screen.screenId,
        inDownloadProject,
        inExportScreens
      });
    }
  }
}

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

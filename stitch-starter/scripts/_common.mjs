import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { load as loadHtml } from "cheerio";
import { stitch, Stitch, StitchToolClient } from "@google/stitch-sdk";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ASSET_DOWNLOAD_CONCURRENCY = 5;

export const ROOT = path.resolve(SCRIPT_DIR, "..");
export const RUNS_DIR = path.join(ROOT, "runs");
export const LATEST_SCREEN_PATH = path.join(RUNS_DIR, "latest-screen.json");

export function parseArgs(argv) {
  const out = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;

    const key = token.slice(2);
    const next = argv[i + 1];

    if (!next || next.startsWith("--")) {
      out[key] = true;
      continue;
    }

    out[key] = next;
    i += 1;
  }

  return out;
}

export function isFlagEnabled(value, fallback = false) {
  if (value === undefined) return fallback;
  if (value === true) return true;
  if (value === false) return false;
  const raw = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return Boolean(value);
}

export function ensureApiKey() {
  if (process.env.STITCH_API_KEY) return;
  console.error("STITCH_API_KEY is not set.");
  console.error(`Copy ${path.join(ROOT, ".env.example")} to .env and add your key.`);
  process.exit(1);
}

export function slugify(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "run";
}

export function timestamp() {
  return new Date().toISOString().replaceAll(":", "-");
}

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(value, null, 2) + "\n");
}

export async function writeText(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, value.endsWith("\n") ? value : value + "\n");
}

export async function readText(filePath) {
  return fs.readFile(filePath, "utf8");
}

export function normalizeIntegerOption(value, fallback, options = {}) {
  const name = options.name || "value";
  const min = options.min ?? Number.MIN_SAFE_INTEGER;
  const max = options.max ?? Number.MAX_SAFE_INTEGER;
  const raw = value ?? fallback;
  const number = Number(raw);

  if (!Number.isInteger(number) || number < min || number > max) {
    console.error(`${name} must be an integer from ${min} to ${max}.`);
    process.exit(1);
  }

  return number;
}

export function parseCsv(value, fallback = []) {
  if (!value) return fallback;
  return String(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function normalizeDeviceType(value, fallback = "DESKTOP") {
  const raw = String(value || fallback).toUpperCase();
  const allowed = new Set(["MOBILE", "DESKTOP", "TABLET", "AGNOSTIC"]);
  if (!allowed.has(raw)) {
    console.error(`Invalid device type: ${value}`);
    console.error("Use one of: MOBILE, DESKTOP, TABLET, AGNOSTIC");
    process.exit(1);
  }
  return raw;
}

export function normalizeCreativeRange(value, fallback = "EXPLORE") {
  const raw = String(value || fallback).toUpperCase();
  const allowed = new Set(["REFINE", "EXPLORE", "REIMAGINE"]);
  if (!allowed.has(raw)) {
    console.error(`Invalid creative range: ${value}`);
    console.error("Use one of: REFINE, EXPLORE, REIMAGINE");
    process.exit(1);
  }
  return raw;
}

export function normalizeModelId(value) {
  if (!value) return undefined;

  const raw = String(value).toUpperCase();
  const allowed = new Set([
    "MODEL_ID_UNSPECIFIED",
    "GEMINI_3_PRO",
    "GEMINI_3_FLASH",
    "GEMINI_3_1_PRO"
  ]);

  if (!allowed.has(raw)) {
    console.error(`Invalid model id: ${value}`);
    console.error("Use one of: MODEL_ID_UNSPECIFIED, GEMINI_3_PRO, GEMINI_3_FLASH, GEMINI_3_1_PRO");
    process.exit(1);
  }

  if (raw === "GEMINI_3_PRO") {
    console.warn("GEMINI_3_PRO is deprecated by the live Stitch MCP schema; prefer GEMINI_3_1_PRO or GEMINI_3_FLASH.");
  }

  return raw;
}

export function normalizeVariantCount(value, fallback = 3) {
  const count = Number(value || fallback);
  if (!Number.isInteger(count) || count < 1 || count > 5) {
    console.error("Variant count must be an integer from 1 to 5.");
    process.exit(1);
  }
  return count;
}

export function normalizeTimeoutMs(value) {
  const raw = value || process.env.STITCH_TIMEOUT_MS;
  if (!raw) return undefined;

  const timeoutMs = Number(raw);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 10_000) {
    console.error("Timeout must be an integer number of milliseconds, minimum 10000.");
    process.exit(1);
  }

  return timeoutMs;
}

export function normalizeRetryCount(value, fallback = 2) {
  const raw = value ?? process.env.STITCH_RETRIES ?? fallback;
  const retries = Number(raw);
  if (!Number.isInteger(retries) || retries < 0 || retries > 5) {
    console.error("Retry count must be an integer from 0 to 5.");
    process.exit(1);
  }
  return retries;
}

export function normalizeRetryDelayMs(value, fallback = 5000) {
  const raw = value ?? process.env.STITCH_RETRY_DELAY_MS ?? fallback;
  const retryDelayMs = Number(raw);
  if (!Number.isInteger(retryDelayMs) || retryDelayMs < 0) {
    console.error("Retry delay must be an integer number of milliseconds.");
    process.exit(1);
  }
  return retryDelayMs;
}

export function isTransientStitchError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  return (
    code.includes("rate") ||
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("service is currently unavailable") ||
    message.includes("503") ||
    message.includes("temporarily unavailable")
  );
}

export async function sleep(ms) {
  if (!ms) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withTimeout(operation, timeoutMs, label = "operation") {
  const normalizedTimeout = timeoutMs ? normalizeIntegerOption(timeoutMs, timeoutMs, {
    name: `${label} timeout`,
    min: 1000
  }) : null;

  if (!normalizedTimeout) return operation();

  let timeoutHandle = null;
  try {
    return await Promise.race([
      operation(),
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`${label} timed out after ${normalizedTimeout}ms`));
        }, normalizedTimeout);
      })
    ]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export async function withRetry(operation, options = {}) {
  const retries = normalizeRetryCount(options.retries);
  const retryDelayMs = normalizeRetryDelayMs(options.retryDelayMs);
  const label = options.label || "Stitch operation";
  const timeoutMs = options.timeoutMs;
  let attempt = 0;

  while (true) {
    try {
      return await withTimeout(operation, timeoutMs, label);
    } catch (error) {
      if (attempt >= retries || !isTransientStitchError(error)) throw error;
      attempt += 1;
      console.warn(`${label} failed with a transient Stitch error. Retry ${attempt}/${retries}...`);
      await sleep(retryDelayMs);
    }
  }
}

export async function runCommand(command, commandArgs = [], options = {}) {
  const cwd = options.cwd || ROOT;
  const env = options.env || process.env;
  const timeoutMs = options.timeoutMs ? normalizeIntegerOption(options.timeoutMs, options.timeoutMs, {
    name: "command timeout",
    min: 1000
  }) : null;
  const startedAt = new Date().toISOString();
  const startedAtMs = Date.now();

  return await new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    let killTimer = null;

    const settle = (result) => {
      if (settled) return;
      settled = true;
      if (killTimer) clearTimeout(killTimer);
      resolve({
        command,
        args: commandArgs,
        cwd,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAtMs,
        timedOut,
        stdout,
        stderr,
        ...result
      });
    };

    const child = spawn(command, commandArgs, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    if (timeoutMs) {
      killTimer = setTimeout(() => {
        timedOut = true;
        stderr += `\nCommand timed out after ${timeoutMs}ms.\n`;
        child.kill("SIGTERM");
        setTimeout(() => {
          if (!settled) child.kill("SIGKILL");
        }, 5000).unref?.();
      }, timeoutMs);
    }

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      if (options.log !== false) process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (options.log !== false) process.stderr.write(text);
    });

    child.on("error", (error) => {
      settle({
        code: null,
        signal: null,
        error: {
          name: error?.name || "Error",
          message: error?.message || String(error)
        }
      });
    });

    child.on("close", (code, signal) => {
      settle({ code, signal });
    });
  });
}

export function detectArtifactType(buffer, filePath = "") {
  const ext = path.extname(filePath).toLowerCase();
  const prefix = buffer.subarray(0, 32).toString("utf8").trimStart().toLowerCase();

  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  if (prefix.startsWith("<!doctype html") || prefix.startsWith("<html") || ext === ".html") return "html";
  if (ext === ".css") return "css";
  if (ext === ".json") return "json";
  return "unknown";
}

export function detectImageDimensions(buffer, fileType) {
  if (fileType === "png" && buffer.length >= 24) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20)
    };
  }

  if (fileType === "jpeg" && buffer.length >= 4) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      const size = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return {
          width: buffer.readUInt16BE(offset + 7),
          height: buffer.readUInt16BE(offset + 5)
        };
      }
      offset += 2 + size;
    }
  }

  if (fileType === "webp" && buffer.length >= 30) {
    const format = buffer.subarray(12, 16).toString("ascii");
    if (format === "VP8X") {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3)
      };
    }
    if (format === "VP8 " && buffer.length >= 30) {
      return {
        width: buffer.readUInt16LE(26) & 0x3fff,
        height: buffer.readUInt16LE(28) & 0x3fff
      };
    }
    if (format === "VP8L" && buffer.length >= 25) {
      const bits = buffer.readUInt32LE(21);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1
      };
    }
  }

  return null;
}

export async function inspectArtifact(filePath) {
  if (!filePath) {
    return { exists: false, filePath: null };
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return { exists: false, filePath, reason: "not-file" };
    const buffer = await fs.readFile(filePath);
    const fileType = detectArtifactType(buffer, filePath);
    return {
      exists: true,
      filePath,
      sizeBytes: buffer.length,
      fileType,
      dimensions: detectImageDimensions(buffer, fileType)
    };
  } catch (error) {
    return {
      exists: false,
      filePath,
      reason: error?.code || error?.message || String(error)
    };
  }
}

function visibleText($, element) {
  return $(element).text().replace(/\s+/g, " ").trim();
}

export async function inspectHtmlArtifact(filePath) {
  const base = await inspectArtifact(filePath);
  if (!base.exists) return base;

  const html = await fs.readFile(filePath, "utf8");
  const $ = loadHtml(html);
  const bodyText = ($("body").length ? $("body").text() : $.root().text()).replace(/\s+/g, " ").trim();
  const styleText = $("style").map((_, element) => $(element).text()).get().join("\n");
  const fullText = `${html}\n${styleText}`;
  const viewport = $('meta[name="viewport"]').attr("content") || "";
  const responsiveSignals = [
    /@media\b/i,
    /@container\b/i,
    /minmax\(/i,
    /clamp\(/i,
    /flex-wrap/i,
    /grid-template-columns/i,
    /width:\s*100%/i,
    /max-width:\s*100%/i,
    /\b(min-w-0|break-words|text-wrap|container|sm:|md:|lg:|xl:)\b/
  ].filter((pattern) => pattern.test(fullText)).length;
  const fixedWideWidths = [...fullText.matchAll(/(?<!max-)width\s*:\s*(\d{4,})px/gi)]
    .map((match) => Number(match[1]))
    .filter((value) => value > 1024);
  const antiPatterns = [];

  if (/user-scalable\s*=\s*no/i.test(fullText) || /maximum-scale\s*=\s*1/i.test(fullText)) antiPatterns.push("zoom-disabled");
  if (/transition\s*:\s*all\b/i.test(fullText)) antiPatterns.push("transition-all");
  if (/outline\s*:\s*none/i.test(fullText) && !/focus-visible/i.test(fullText)) antiPatterns.push("outline-none-without-focus-visible");
  if (/lorem ipsum/i.test(bodyText) || /\bplaceholder\b/i.test(bodyText)) antiPatterns.push("placeholder-copy");

  const inputsWithoutLabel = $("input, textarea, select").filter((_, element) => {
    const id = $(element).attr("id");
    const ariaLabel = $(element).attr("aria-label") || $(element).attr("aria-labelledby");
    const wrapped = $(element).closest("label").length > 0;
    const external = id ? $(`label[for="${id}"]`).length > 0 : false;
    return !ariaLabel && !wrapped && !external;
  }).length;

  const unnamedInteractive = $("button, a[href]").filter((_, element) => {
    const label = visibleText($, element) || $(element).attr("aria-label") || $(element).attr("title");
    return !label;
  }).length;

  return {
    ...base,
    parsed: true,
    hasHtmlElement: $("html").length > 0,
    hasBodyElement: $("body").length > 0,
    htmlLang: $("html").attr("lang") || "",
    titleText: $("title").first().text().replace(/\s+/g, " ").trim(),
    hasViewportMeta: Boolean(viewport),
    viewport,
    h1Count: $("h1").length,
    headingCount: $("h1,h2,h3,h4,h5,h6").length,
    textLength: bodyText.length,
    imagesWithoutAlt: $("img").filter((_, element) => $(element).attr("alt") === undefined).length,
    inputsWithoutLabel,
    unnamedInteractive,
    responsiveSignals,
    fixedWideWidths,
    antiPatterns
  };
}

async function runWithConcurrency(tasks, limit = ASSET_DOWNLOAD_CONCURRENCY) {
  const executing = new Set();
  for (const task of tasks) {
    const promise = task().finally(() => executing.delete(promise));
    executing.add(promise);
    if (executing.size >= limit) await Promise.race(executing);
  }
  await Promise.all(executing);
}

function extensionFromContentType(contentType) {
  const value = String(contentType || "").toLowerCase();
  if (value.includes("png")) return ".png";
  if (value.includes("webp")) return ".webp";
  if (value.includes("svg")) return ".svg";
  if (value.includes("css")) return ".css";
  if (value.includes("html")) return ".html";
  if (value.includes("jpeg") || value.includes("jpg")) return ".jpg";
  return ".bin";
}

function sanitizePathPart(value, fallback = "item", maxLength = 56) {
  const cleaned = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return cleaned || fallback;
}

function makeSafeScreenSlug(screen, index, seen) {
  const screenId = screen.id || screen.name?.split("/").pop() || `screen-${index + 1}`;
  const titlePart = sanitizePathPart(screen.title || screen.displayName, "screen", 40);
  const idPart = sanitizePathPart(screenId, `screen-${index + 1}`, 18);
  const base = `${String(index + 1).padStart(2, "0")}-${titlePart}-${idPart}`.slice(0, 80).replace(/-+$/g, "");
  let slug = base;
  let counter = 1;
  while (seen.has(slug)) {
    slug = `${base.slice(0, 74)}-${counter}`;
    counter += 1;
  }
  seen.add(slug);
  return slug;
}

async function writeFileAtomically(filePath, buffer, options = {}) {
  await ensureDir(path.dirname(filePath));
  const tempPath = path.join(path.dirname(filePath), `.tmp-${crypto.randomBytes(8).toString("hex")}`);
  await fs.writeFile(tempPath, buffer, options);
  await fs.rename(tempPath, filePath);
}

async function downloadAndRewriteAsset($, element, attr, url, assetsDir, relativePrefix, warnings) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const urlPath = decodeURIComponent(new URL(url).pathname);
    const rawExt = path.extname(urlPath) || extensionFromContentType(response.headers.get("content-type"));
    const ext = rawExt.slice(0, 12) || ".bin";
    const rawName = path.basename(urlPath, rawExt);
    const base = sanitizePathPart(rawName, "asset", 44);
    const hash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 12);
    const filename = `${base}-${hash}${ext}`;
    await writeFileAtomically(path.join(assetsDir, filename), buffer);
    $(element).attr(attr, `${relativePrefix}/${filename}`);
  } catch (error) {
    warnings.push(`Asset download failed for ${url}: ${error?.message || String(error)}`);
  }
}

export async function downloadProjectAssetsSafely(project, outputDir, options = {}) {
  const projectId = options.projectId || project.projectId || project.id;
  const assetsSubdir = path.basename(options.assetsSubdir || "assets") || "assets";
  const warnings = [];
  const downloadedScreens = [];
  const seenSlugs = new Set();

  await ensureDir(outputDir);
  const screens = await project.screens();

  for (let index = 0; index < screens.length; index += 1) {
    const screen = screens[index];
    const screenId = screen.id || screen.name?.split("/").pop();
    if (!screenId) {
      warnings.push(`Skipped screen at index ${index}: missing screen id`);
      continue;
    }

    const screenSlug = makeSafeScreenSlug(screen, index, seenSlugs);
    const screenDir = path.join(outputDir, screenSlug);
    const screenAssetsDir = path.join(screenDir, assetsSubdir);
    await ensureDir(screenAssetsDir);

    let htmlUrl = null;
    try {
      htmlUrl = await screen.getHtml();
    } catch (error) {
      warnings.push(`HTML URL lookup failed for ${screenId}: ${error?.message || String(error)}`);
    }

    if (!htmlUrl) {
      warnings.push(`Skipped screen ${screenId}: no HTML download URL`);
      continue;
    }

    try {
      const response = await fetch(htmlUrl);
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const html = await response.text();
      const $ = loadHtml(html);
      const assetTasks = [];

      $("img").each((_, element) => {
        const src = $(element).attr("src");
        if (src?.startsWith("http")) {
          assetTasks.push(() => downloadAndRewriteAsset($, element, "src", src, screenAssetsDir, assetsSubdir, warnings));
        }
      });

      $('link[rel="stylesheet"]').each((_, element) => {
        const href = $(element).attr("href");
        if (href?.startsWith("http")) {
          assetTasks.push(() => downloadAndRewriteAsset($, element, "href", href, screenAssetsDir, assetsSubdir, warnings));
        }
      });

      await runWithConcurrency(assetTasks);
      await writeFileAtomically(path.join(screenDir, "code.html"), Buffer.from($.html(), "utf8"));
    } catch (error) {
      warnings.push(`HTML download failed for ${screenId}: ${error?.message || String(error)}`);
      continue;
    }

    let screenshotPath = null;
    try {
      const imageUrl = await screen.getImage();
      if (imageUrl) {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        const imageType = detectArtifactType(buffer);
        const ext = imageType === "png" ? "png" : imageType === "webp" ? "webp" : "jpg";
        const fileName = `screen.${ext}`;
        await writeFileAtomically(path.join(screenDir, fileName), buffer);
        screenshotPath = path.join(screenSlug, fileName);
      }
    } catch (error) {
      warnings.push(`Screenshot download failed for ${screenId}: ${error?.message || String(error)}`);
    }

    downloadedScreens.push({
      screenId,
      screenSlug,
      filePath: path.join(screenSlug, "code.html"),
      ...(screenshotPath ? { screenshotPath } : {})
    });
  }

  try {
    const response = await project.client?.callTool?.("list_design_systems", { projectId });
    const designSystem = response?.designSystems?.[0];
    const designMd = designSystem?.designSystem?.theme?.designMd;
    if (designMd) {
      const designSystemName = sanitizePathPart(designSystem.designSystem.displayName || designSystem.name?.split("/").pop(), "design-system", 48);
      await writeFileAtomically(path.join(outputDir, designSystemName, "DESIGN.md"), Buffer.from(designMd, "utf8"));
    }
  } catch (error) {
    warnings.push(`Design system export failed: ${error?.message || String(error)}`);
  }

  return {
    screens: downloadedScreens,
    warnings,
    mode: "safe"
  };
}

export async function downloadProjectAssetsWithFallback(project, outputDir, options = {}) {
  if (options.forceSafe) {
    return downloadProjectAssetsSafely(project, outputDir, options);
  }

  try {
    const result = await project.downloadAssets(outputDir, {
      assetsSubdir: options.assetsSubdir || "assets"
    });
    return {
      ...result,
      warnings: result.warnings || [],
      mode: "sdk"
    };
  } catch (error) {
    const safeResult = await downloadProjectAssetsSafely(project, outputDir, options);
    return {
      ...safeResult,
      mode: "safe-fallback",
      warnings: [
        `SDK downloadAssets failed (${error?.message || String(error)}); used safe fallback with short screen directories.`,
        ...safeResult.warnings
      ]
    };
  }
}

export async function createRunDir(operation, prompt) {
  await ensureDir(RUNS_DIR);
  const dir = path.join(RUNS_DIR, `${timestamp()}-${operation}-${slugify(prompt)}`);
  await ensureDir(dir);
  return dir;
}

export async function createRunDirForName(operation, name) {
  await ensureDir(RUNS_DIR);
  const dir = path.join(RUNS_DIR, `${timestamp()}-${operation}-${slugify(name)}`);
  await ensureDir(dir);
  return dir;
}

export async function saveArtifacts({ outDir, htmlUrl, imageUrl }) {
  await ensureDir(outDir);

  if (htmlUrl) {
    await writeText(path.join(outDir, "html-url.txt"), htmlUrl);
    const response = await fetch(htmlUrl);
    if (response.ok) {
      const html = await response.text();
      await fs.writeFile(path.join(outDir, "screen.html"), html);
    }
  }

  if (imageUrl) {
    await writeText(path.join(outDir, "image-url.txt"), imageUrl);
    const response = await fetch(imageUrl);
    if (response.ok) {
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") || "";
      const ext = contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
          ? "webp"
          : "jpeg";
      await fs.writeFile(path.join(outDir, `screen.${ext}`), buffer);
    }
  }
}

export async function saveScreenArtifacts({ outDir, screen, metadata = {} }) {
  const htmlUrl = await screen.getHtml();
  const imageUrl = await screen.getImage();
  const result = {
    ...metadata,
    htmlUrl,
    imageUrl,
    outDir
  };

  await writeJson(path.join(outDir, "result.json"), result);
  await saveArtifacts({ outDir, htmlUrl, imageUrl });
  return result;
}

export async function saveLatestScreen(metadata) {
  await ensureDir(RUNS_DIR);
  await writeJson(LATEST_SCREEN_PATH, metadata);
}

export async function loadLatestScreen() {
  try {
    const raw = await fs.readFile(LATEST_SCREEN_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    console.error("No latest screen found.");
    console.error("Run `npm run generate -- --prompt \"...\"` first or pass --project-id and --screen-id.");
    process.exit(1);
  }
}

export async function resolveTarget(args, stitchInstance = stitch) {
  const projectId = args["project-id"];
  const screenId = args["screen-id"];

  if (projectId && screenId) {
    const project = stitchInstance.project(projectId);
    const screen = await project.getScreen(screenId);
    return { project, screen };
  }

  const latest = await loadLatestScreen();
  const project = stitchInstance.project(latest.projectId);
  const screen = await project.getScreen(latest.screenId);
  return { project, screen, latest };
}

export function createToolClient(options = {}) {
  ensureApiKey();
  const timeout = normalizeTimeoutMs(options.timeoutMs);
  return new StitchToolClient({
    apiKey: process.env.STITCH_API_KEY,
    ...(timeout ? { timeout } : {})
  });
}

export function createStitch(options = {}) {
  const client = createToolClient(options);
  return {
    stitch: new Stitch(client),
    client
  };
}

export function extractToolResult(result) {
  if (result?.structuredContent) return result.structuredContent;
  if (result?.content?.length) {
    const text = result.content
      .map((part) => part?.text)
      .filter(Boolean)
      .join("\n")
      .trim();
    if (text) {
      try {
        return JSON.parse(text);
      } catch {
        return { text };
      }
    }
  }
  return result;
}

export async function closeToolClient(client) {
  try {
    if (client?.transport) {
      const previousOnError = client.transport.onerror;
      client.transport.onerror = (error) => {
        const name = error?.name || "";
        const message = String(error?.message || error || "");
        if (name === "AbortError" || message.includes("AbortError")) return;
        if (previousOnError) previousOnError(error);
      };
    }
    await client.close();
  } catch {
    // Some MCP transports report AbortError during normal shutdown.
  }
}

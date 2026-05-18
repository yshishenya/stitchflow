import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { stitch, Stitch, StitchToolClient } from "@google/stitch-sdk";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

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

export async function withRetry(operation, options = {}) {
  const retries = normalizeRetryCount(options.retries);
  const retryDelayMs = normalizeRetryDelayMs(options.retryDelayMs);
  const label = options.label || "Stitch operation";
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= retries || !isTransientStitchError(error)) throw error;
      attempt += 1;
      console.warn(`${label} failed with a transient Stitch error. Retry ${attempt}/${retries}...`);
      await sleep(retryDelayMs);
    }
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

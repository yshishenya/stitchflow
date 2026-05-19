import fs from "node:fs/promises";
import path from "node:path";
import {
  closeToolClient,
  createRunDirForName,
  createToolClient,
  ensureDir,
  extractToolResult,
  parseArgs,
  parseCsv,
  saveArtifacts,
  saveLatestScreen,
  writeJson
} from "./_common.mjs";

const args = parseArgs(process.argv.slice(2));
const action = String(args.action || "list").toLowerCase();
const projectId = args["project-id"];
const assetId = normalizeAssetId(args["asset-id"]);
let screenInstanceResolution = null;
const client = createToolClient({ timeoutMs: args["timeout-ms"] });
const outDir = args["output-dir"]
  ? path.resolve(args["output-dir"])
  : await createRunDirForName("design-system", `${action}-${projectId || "global"}`);

function usage() {
  console.error(`Usage:
  npm run design-system -- --action list --project-id 123
  npm run design-system -- --action create --project-id 123 --file ./design-system.json
  npm run design-system -- --action update --project-id 123 --asset-id 456 --file ./design-system.json
  npm run design-system -- --action apply --project-id 123 --asset-id 456 --screen-ids abc,def
  npm run design-system -- --action apply --project-id 123 --asset-id 456 --screen-ids abc,def --allow-screen-id-fallback
  npm run design-system -- --action apply --project-id 123 --asset-id 456 --screen-instances-file ./instances.json`);
}

function normalizeAssetId(value) {
  if (!value) return null;
  return String(value).replace(/^assets\//, "");
}

function assetName(value) {
  const normalized = normalizeAssetId(value);
  return normalized ? `assets/${normalized}` : null;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(path.resolve(filePath), "utf8"));
}

function defaultDesignSystem() {
  return {
    displayName: args.name || "StitchFlow CLI Design System",
    theme: {
      colorMode: String(args["color-mode"] || "DARK").toUpperCase(),
      headlineFont: String(args["headline-font"] || "INTER").toUpperCase(),
      bodyFont: String(args["body-font"] || "INTER").toUpperCase(),
      roundness: String(args.roundness || "ROUND_EIGHT").toUpperCase(),
      customColor: args.color || "#10b981"
    }
  };
}

async function readDesignSystem() {
  if (!args.file) return defaultDesignSystem();
  const raw = await readJson(args.file);
  return raw.designSystem || raw;
}

function extractProject(raw) {
  return raw.project || raw;
}

function extractScreenInstances(project) {
  return (
    project.screenInstances ||
    project.screen_instances ||
    project.data?.screenInstances ||
    []
  ).filter((instance) => instance?.id && instance?.sourceScreen);
}

function screenIdFromResource(value) {
  const raw = String(value || "");
  return raw.includes("/screens/") ? raw.split("/screens/").at(-1) : raw.replace(/^screens\//, "");
}

async function resolveSelectedScreenInstances() {
  if (args["screen-instances-file"]) {
    const raw = await readJson(args["screen-instances-file"]);
    const instances = raw.selectedScreenInstances || raw.screenInstances || raw;
    if (!Array.isArray(instances) || !instances.length) {
      throw new Error("screen-instances-file must contain a non-empty array or selectedScreenInstances array.");
    }
    screenInstanceResolution = "screen-instances-file";
    return instances.map((instance) => ({
      id: instance.id,
      sourceScreen: instance.sourceScreen
    }));
  }

  const requestedScreenIds = parseCsv(args["screen-ids"]);
  if (!projectId) throw new Error("--project-id is required to resolve screen instances.");

  const rawProject = extractToolResult(await client.callTool("get_project", {
    name: `projects/${projectId}`
  }));
  const instances = extractScreenInstances(extractProject(rawProject));
  if (!instances.length && requestedScreenIds.length && args["allow-screen-id-fallback"]) {
    screenInstanceResolution = "screen-id-fallback";
    console.warn("No screen instances found in get_project response; using explicit --allow-screen-id-fallback.");
    return requestedScreenIds.map((screenId) => {
      const normalized = screenIdFromResource(screenId);
      return {
        id: normalized,
        sourceScreen: `projects/${projectId}/screens/${normalized}`
      };
    });
  }
  if (!instances.length) {
    throw new Error("No screen instances found in get_project response. Pass --screen-instances-file, or use --screen-ids with --allow-screen-id-fallback if you accept the live MCP fallback behavior.");
  }

  const selected = requestedScreenIds.length
    ? requestedScreenIds.map((screenId) => {
        const normalized = screenIdFromResource(screenId);
        const match = instances.find((instance) => screenIdFromResource(instance.sourceScreen) === normalized);
        if (!match) throw new Error(`No screen instance found for screen id ${screenId}.`);
        return match;
      })
    : instances;

  screenInstanceResolution = "project-screen-instances";
  return selected.map((instance) => ({
    id: instance.id,
    sourceScreen: instance.sourceScreen
  }));
}

function extractDesignSystems(result) {
  return result.designSystems || result.design_systems || result.assets || [];
}

function extractReturnedAssetId(result) {
  const candidates = [
    result.name,
    result.assetId,
    result.asset_id,
    result.asset?.name,
    result.designSystem?.name,
    result.design_system?.name
  ].filter(Boolean);

  return candidates.length ? normalizeAssetId(candidates[0]) : null;
}

function extractScreens(result) {
  return (result.outputComponents || [])
    .flatMap((component) => component?.design?.screens || [])
    .filter(Boolean);
}

async function saveReturnedScreens({ result, operation, projectId: appliedProjectId }) {
  const screens = extractScreens(result);
  const saved = [];

  for (let i = 0; i < screens.length; i += 1) {
    const screen = screens[i];
    const screenId = screen.id || screenIdFromResource(screen.name);
    const screenDir = path.join(outDir, `screen-${String(i + 1).padStart(2, "0")}-${screenId || "unknown"}`);
    const htmlUrl = screen.htmlCode?.downloadUrl || "";
    const imageUrl = screen.screenshot?.downloadUrl || "";
    await saveArtifacts({ outDir: screenDir, htmlUrl, imageUrl });
    const metadata = {
      operation,
      createdAt: new Date().toISOString(),
      projectId: appliedProjectId,
      screenId,
      htmlUrl,
      imageUrl,
      outDir: screenDir
    };
    await writeJson(path.join(screenDir, "result.json"), metadata);
    saved.push(metadata);
  }

  if (saved.at(-1)) await saveLatestScreen(saved.at(-1));
  return saved;
}

try {
  await ensureDir(outDir);

  let raw;
  let result;
  let savedScreens = [];
  const metadata = {
    operation: "design-system",
    action,
    createdAt: new Date().toISOString(),
    projectId: projectId || null,
    assetId: assetId || null,
    outDir
  };

  if (action === "list") {
    if (!projectId) {
      usage();
      throw new Error("--project-id is required for design-system list. The live Stitch MCP currently rejects global list requests.");
    }
    raw = await client.callTool("list_design_systems", { projectId });
    result = extractToolResult(raw);
    metadata.designSystemCount = extractDesignSystems(result).length;
  } else if (action === "create") {
    const designSystem = await readDesignSystem();
    raw = await client.callTool("create_design_system", {
      ...(projectId ? { projectId } : {}),
      designSystem
    });
    result = extractToolResult(raw);
    metadata.assetId = extractReturnedAssetId(result);
  } else if (action === "update") {
    if (!projectId || !assetId) {
      usage();
      throw new Error("--project-id and --asset-id are required for design-system update.");
    }
    const designSystem = await readDesignSystem();
    raw = await client.callTool("update_design_system", {
      projectId,
      name: assetName(assetId),
      designSystem
    });
    result = extractToolResult(raw);
    metadata.assetId = assetId;
  } else if (action === "apply") {
    if (!projectId || !assetId) {
      usage();
      throw new Error("--project-id and --asset-id are required for design-system apply.");
    }
    const selectedScreenInstances = await resolveSelectedScreenInstances();
    raw = await client.callTool("apply_design_system", {
      projectId,
      assetId,
      selectedScreenInstances
    });
    result = extractToolResult(raw);
    savedScreens = await saveReturnedScreens({
      result,
      operation: "design-system-apply-screen",
      projectId
    });
    metadata.selectedScreenInstances = selectedScreenInstances;
    metadata.screenInstanceResolution = screenInstanceResolution;
    metadata.savedScreens = savedScreens;
  } else {
    usage();
    throw new Error(`Unknown design-system action: ${action}`);
  }

  await writeJson(path.join(outDir, "result.json"), {
    ...metadata,
    result
  });

  console.log(`Design system action: ${action}`);
  if (projectId) console.log(`Project: ${projectId}`);
  if (metadata.assetId) console.log(`Asset: ${metadata.assetId}`);
  if (metadata.screenInstanceResolution) console.log(`Screen instance resolution: ${metadata.screenInstanceResolution}`);
  if (metadata.designSystemCount !== undefined) console.log(`Design systems: ${metadata.designSystemCount}`);
  if (savedScreens.length) console.log(`Applied screens: ${savedScreens.length}`);
  console.log(`Saved to: ${outDir}`);
} finally {
  await closeToolClient(client);
}

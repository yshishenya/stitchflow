import path from "node:path";
import {
  closeToolClient,
  createRunDir,
  createStitch,
  ensureApiKey,
  normalizeCreativeRange,
  normalizeDeviceType,
  normalizeVariantCount,
  parseArgs,
  parseCsv,
  resolveTarget,
  saveArtifacts,
  saveLatestScreen,
  withRetry,
  writeJson
} from "./_common.mjs";

ensureApiKey();

const args = parseArgs(process.argv.slice(2));
const prompt = args.prompt;

if (!prompt) {
  console.error('Usage: npm run variants -- --prompt "Explore 3 visual directions" [--variant-count 3] [--creative-range EXPLORE] [--aspects LAYOUT,COLOR_SCHEME] [--timeout-ms 900000] [--retries 2]');
  process.exit(1);
}

const deviceType = normalizeDeviceType(args.device, "DESKTOP");
const variantCount = normalizeVariantCount(args["variant-count"], 3);
const creativeRange = normalizeCreativeRange(args["creative-range"], "EXPLORE");
const aspects = parseCsv(args.aspects);
const { stitch, client } = createStitch({ timeoutMs: args["timeout-ms"] });

try {
  const { project, screen } = await resolveTarget(args, stitch);

  console.log(`Project: ${project.id}`);
  console.log(`Base screen: ${screen.id}`);
  console.log(`Generating ${variantCount} variant(s)...`);

  const variants = await withRetry(
    () => screen.variants(
      prompt,
      {
        variantCount,
        creativeRange,
        ...(aspects.length ? { aspects } : {})
      },
      deviceType
    ),
    {
      label: "generate_variants",
      retries: args.retries,
      retryDelayMs: args["retry-delay-ms"]
    }
  );

  const outDir = await createRunDir("variants", prompt);
  const results = [];

  for (let i = 0; i < variants.length; i += 1) {
    const variant = variants[i];
    const variantDir = path.join(outDir, `variant-${i + 1}`);
    const htmlUrl = await variant.getHtml();
    const imageUrl = await variant.getImage();
    const metadata = {
      operation: "variant",
      createdAt: new Date().toISOString(),
      projectId: project.id,
      baseScreenId: screen.id,
      screenId: variant.id,
      prompt,
      deviceType,
      creativeRange,
      aspects,
      htmlUrl,
      imageUrl,
      outDir: variantDir
    };

    await saveArtifacts({ outDir: variantDir, htmlUrl, imageUrl });
    await writeJson(path.join(variantDir, "result.json"), metadata);
    results.push(metadata);
  }

  await writeJson(path.join(outDir, "variants.json"), {
    operation: "variants",
    createdAt: new Date().toISOString(),
    projectId: project.id,
    baseScreenId: screen.id,
    prompt,
    deviceType,
    creativeRange,
    aspects,
    variantCount,
    variants: results
  });

  if (results[0]) {
    await saveLatestScreen(results[0]);
  }

  console.log(`Saved to: ${outDir}`);
  for (const [index, result] of results.entries()) {
    console.log(`Variant ${index + 1}: ${result.screenId}`);
    console.log(`  HTML URL: ${result.htmlUrl || "n/a"}`);
    console.log(`  Image URL: ${result.imageUrl || "n/a"}`);
  }
} finally {
  await closeToolClient(client);
}

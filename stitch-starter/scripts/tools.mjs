import { closeToolClient, createToolClient, writeJson } from "./_common.mjs";

const client = createToolClient();

try {
  const result = await client.listTools();
  const tools = result.tools || [];

  for (const tool of tools) {
    const description = String(tool.description || "").split("\n")[0];
    console.log(`${tool.name}\t${description}`);
  }

  await writeJson("runs/latest-tools.json", {
    createdAt: new Date().toISOString(),
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  });
} finally {
  await closeToolClient(client);
}

import { Template, defaultBuildLogger } from "e2b";
import { template } from "./template";

// E2B_API_KEY is expected to already be set in this process's environment
// (injected by the caller) — deliberately no dotenv/.env file here.
async function main() {
  if (!process.env.E2B_API_KEY) throw new Error("E2B_API_KEY is not set in the environment");
  await Template.build(template, "paii-ai-foundations", {
    cpuCount: 2,
    memoryMB: 2048,
    onBuildLogs: defaultBuildLogger(),
  });
}

main().catch((e) => { console.error(e); process.exit(1); });

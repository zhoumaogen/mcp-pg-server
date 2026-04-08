import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const rootEnvPath = resolve(process.cwd(), ".env");
const buildEnvPath = resolve(process.cwd(), "build", ".env");

if (!existsSync(rootEnvPath)) {
  console.warn("Skip copying .env: project root .env not found.");
  process.exit(0);
}

copyFileSync(rootEnvPath, buildEnvPath);
console.log("Copied .env to build/.env");

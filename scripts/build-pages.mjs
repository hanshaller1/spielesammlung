import { spawnSync } from "node:child_process";
import process from "node:process";

const vinextCommand = process.platform === "win32" ? "vinext.cmd" : "vinext";
const result = spawnSync(vinextCommand, ["build"], {
  env: { ...process.env, GITHUB_PAGES: "true" },
  shell: process.platform === "win32",
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);

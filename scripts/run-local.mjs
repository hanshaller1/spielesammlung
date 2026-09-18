import { spawn } from "node:child_process";
import process from "node:process";

const [requestedCommand, ...args] = process.argv.slice(2);
if (!requestedCommand) {
  console.error("Usage: node scripts/run-local.mjs <command> [...args]");
  process.exit(64);
}

const command = process.platform === "win32" && requestedCommand === "vinext"
  ? "vinext.cmd"
  : requestedCommand;

const child = spawn(command, args, {
  cwd: process.cwd(),
  env: {
    ...process.env,
    WRANGLER_LOG_PATH: ".wrangler/wrangler.log",
  },
  shell: process.platform === "win32",
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Child process terminated by ${signal}`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});

import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve, sep } from "node:path";
import process from "node:process";
import { Readable } from "node:stream";

const [requestedCommand, ...args] = process.argv.slice(2);
if (!requestedCommand) {
  console.error("Usage: node scripts/run-local.mjs <command> [...args]");
  process.exit(64);
}

const cliEntries = {
  vite: resolve("node_modules/vite/bin/vite.js"),
  vinext: resolve("node_modules/vinext/dist/cli.js"),
};
const command = cliEntries[requestedCommand];

if (!command) {
  console.error(`Unsupported local command: ${requestedCommand}`);
  process.exit(64);
}

const environment = {
  ...process.env,
  WRANGLER_LOG_PATH: ".wrangler/wrangler.log",
};

if (process.platform === "win32" && requestedCommand === "vinext" && args[0] === "start") {
  await startWindowsProductionProxy(command, args, environment);
} else {
  await spawnChild(process.execPath, [command, ...args], environment);
}

function spawnChild(childCommand, childArgs, env) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(childCommand, childArgs, {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        console.error(`Child process terminated by ${signal}`);
        resolvePromise(1);
        return;
      }
      resolvePromise(code ?? 1);
    });
  }).then((code) => process.exit(code));
}

async function startWindowsProductionProxy(vinextCli, startArgs, env) {
  const publicPort = Number(process.env.PORT ?? 3000);
  const internalPort = Number(process.env.VINEXT_INTERNAL_PORT ?? publicPort + 1);
  const clientDirectory = resolve("dist/client");
  const child = spawn(process.execPath, [vinextCli, ...startArgs, "-p", String(internalPort)], {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });

  const proxy = createServer(async (request, response) => {
    if (request.url?.startsWith("/assets/")) {
      await serveWindowsAsset(request.url, clientDirectory, response);
      return;
    }

    try {
      const target = `http://127.0.0.1:${internalPort}${request.url ?? "/"}`;
      const init = {
        method: request.method,
        headers: request.headers,
        ...(request.method === "GET" || request.method === "HEAD"
          ? {}
          : { body: Readable.toWeb(request), duplex: "half" }),
      };
      const upstream = await fetch(target, init);
      const headers = Object.fromEntries(
        [...upstream.headers].filter(
          ([key]) => !["content-encoding", "content-length", "transfer-encoding"].includes(key),
        ),
      );
      response.writeHead(upstream.status, headers);
      if (upstream.body) {
        Readable.fromWeb(upstream.body).pipe(response);
      } else {
        response.end();
      }
    } catch (error) {
      response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      response.end(`Vinext production server unavailable: ${error.message}`);
    }
  });

  await new Promise((resolvePromise, reject) => {
    proxy.once("error", reject);
    proxy.listen(publicPort, "0.0.0.0", () => {
      console.log(`[local] Windows asset proxy listening at http://localhost:${publicPort}/`);
      resolvePromise();
    });
  });

  const shutdown = () => {
    proxy.close();
    child.kill();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  child.once("exit", (code, signal) => {
    proxy.close();
    process.exit(signal ? 1 : code ?? 1);
  });
}

async function serveWindowsAsset(requestUrl, clientDirectory, response) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, "http://localhost").pathname);
  } catch {
    response.writeHead(400);
    response.end("Bad Request");
    return;
  }

  const filePath = resolve(clientDirectory, `.${pathname}`);
  if (!filePath.startsWith(`${resolve(clientDirectory)}${sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    await access(filePath);
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": fileStats.size,
      "content-type": contentType(filePath),
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("Not Found");
  }
}

function contentType(filePath) {
  const extension = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return {
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
  }[extension] ?? "application/octet-stream";
}

const fs = require("fs");
const { spawn, spawnSync } = require("child_process");
const path = require("path");

const isRender =
  Boolean(process.env.RENDER) ||
  Boolean(process.env.RENDER_SERVICE_ID) ||
  Boolean(process.env.RENDER_INSTANCE_ID) ||
  Boolean(process.env.RENDER_EXTERNAL_HOSTNAME);

if (isRender) {
  console.error(
    "[launcher] run-dev.js is for local development only. On Render deploy the backend from /backend and the frontend as a Static Site from /vite-project (see README.md)."
  );
  process.exit(1);
}

const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
let isShuttingDown = false;
const processConfigs = [];
const childByName = new Map();
const restartTimers = new Map();
const root = __dirname;
const lockFile = path.join(root, ".run-dev.lock");

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (_e) {
    return false;
  }
}

function acquireLock() {
  try {
    if (fs.existsSync(lockFile)) {
      const raw = fs.readFileSync(lockFile, "utf8").trim();
      const existingPid = Number(raw);
      if (isPidAlive(existingPid) && existingPid !== process.pid) {
        console.error(`[launcher] Another run-dev process is already running (PID ${existingPid}).`);
        process.exit(1);
      }
      fs.unlinkSync(lockFile);
    }
  } catch (_e) {
    // Ignore lock cleanup errors; best effort.
  }

  fs.writeFileSync(lockFile, String(process.pid), "utf8");
}

function releaseLock() {
  try {
    if (!fs.existsSync(lockFile)) return;
    const raw = fs.readFileSync(lockFile, "utf8").trim();
    if (Number(raw) === process.pid) {
      fs.unlinkSync(lockFile);
    }
  } catch (_e) {
    // ignore lock errors
  }
}

function ensureMongoService(serviceName) {
  const shell = process.platform === "win32";
  const exists = spawnSync("sc", ["query", serviceName], {
    shell,
    stdio: "ignore",
  });
  if (exists.status !== 0) return;

  spawnSync("net", ["start", serviceName], {
    shell,
    stdio: "ignore",
  });
}

function clearPortListeners(port) {
  if (process.platform !== "win32") return;

  const result = spawnSync("netstat", ["-ano", "-p", "tcp"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (result.status !== 0 || !result.stdout) return;

  const lines = result.stdout.split(/\r?\n/);
  const pids = new Set();
  for (const line of lines) {
    if (!line.includes(`:${port}`) || !/LISTENING/i.test(line)) continue;
    const parts = line.trim().split(/\s+/);
    const pid = Number(parts[parts.length - 1]);
    if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) continue;
    pids.add(pid);
  }

  for (const pid of pids) {
    const killed = spawnSync("taskkill", ["/F", "/PID", String(pid)], {
      stdio: "ignore",
    });
    if (killed.status === 0) {
      console.log(`[launcher] Stopped PID ${pid} using port ${port}.`);
    }
  }
}

function run(name, cwd, command, args, restartDelayMs = 2000) {
  const child = spawn(command, args, {
    cwd,
    shell: process.platform === "win32",
    stdio: "pipe",
    env: process.env,
  });

  childByName.set(name, child);

  child.stdout.on("data", (data) => {
    process.stdout.write(`[${name}] ${data}`);
  });

  child.stderr.on("data", (data) => {
    process.stderr.write(`[${name}] ${data}`);
  });

  child.on("exit", (code, signal) => {
    const current = childByName.get(name);
    if (current === child) {
      childByName.delete(name);
    }

    if (isShuttingDown) {
      return;
    }

    if (signal) {
      console.error(`[${name}] exited due to signal ${signal}`);
    } else {
      console.error(`[${name}] exited with code ${code}`);
    }

    const timer = setTimeout(() => {
      if (isShuttingDown) {
        return;
      }
      const config = processConfigs.find((p) => p.name === name);
      if (!config) return;
      console.log(`[${name}] restarting...`);
      run(config.name, config.cwd, config.command, config.args, config.restartDelayMs);
    }, restartDelayMs);
    restartTimers.set(name, timer);
    if (typeof timer.unref === "function") {
      timer.unref();
    }
  });

  return child;
}

const backendDir = path.join(root, "backend");
const frontendDir = path.join(root, "vite-project");
const frontendHost = process.env.ECOMM_FRONTEND_HOST || "0.0.0.0";

acquireLock();

if (process.platform === "win32") {
  ensureMongoService("MongoDB");
  ensureMongoService("MongoDBServer");
  clearPortListeners(5001);
  clearPortListeners(5173);
}

processConfigs.push({
  name: "backend",
  cwd: backendDir,
  command: npmExecutable,
  args: ["run", "dev"],
  restartDelayMs: 2000,
});

processConfigs.push({
  name: "frontend",
  cwd: frontendDir,
  command: npmExecutable,
  args: ["run", "dev", "--", "--host", frontendHost, "--port", "5173"],
  restartDelayMs: 2000,
});

for (const config of processConfigs) {
  run(config.name, config.cwd, config.command, config.args, config.restartDelayMs);
}

function shutdown() {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  for (const timer of restartTimers.values()) {
    clearTimeout(timer);
  }
  restartTimers.clear();

  for (const child of childByName.values()) {
    child.kill("SIGTERM");
  }

  setTimeout(() => {
    for (const child of childByName.values()) {
      child.kill("SIGKILL");
    }
  }, 1500).unref();

  setTimeout(() => process.exit(0), 2000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", releaseLock);
process.on("uncaughtException", (err) => {
  console.error("[launcher] Uncaught exception:", err?.message || err);
  shutdown();
});

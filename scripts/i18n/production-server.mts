import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";

const START_TIMEOUT_MS = 30_000;
const STOP_TIMEOUT_MS = 5_000;
const require = createRequire(import.meta.url);
const nextCliPath = require.resolve("next/dist/bin/next");

type ProcessExitState = Pick<
  ChildProcessWithoutNullStreams,
  "exitCode" | "signalCode"
>;

export type ProductionServer = {
  baseUrl: string;
  readLogs: () => string;
  stop: () => Promise<void>;
};

export function hasProcessExited(processState: ProcessExitState): boolean {
  return processState.exitCode !== null || processState.signalCode !== null;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function reservePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "localhost", resolve);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("failed to reserve a TCP port");
  }
  const { port } = address;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
}

async function waitForReady(
  child: ChildProcessWithoutNullStreams,
  readLogs: () => string,
  readSpawnError: () => Error | null,
): Promise<void> {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const logs = readLogs();
    const spawnError = readSpawnError();
    if (spawnError) throw spawnError;
    if (/Ready in|ready - started server/iu.test(logs)) return;
    if (hasProcessExited(child)) {
      throw new Error(`production server exited before readiness\n${logs}`);
    }
    await delay(50);
  }
  throw new Error(
    `production server was not ready within 30 seconds\n${readLogs()}`,
  );
}

function signalServerTree(
  child: ChildProcessWithoutNullStreams,
  signal: "SIGTERM" | "SIGKILL",
) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    child.kill(signal);
    return;
  }

  try {
    process.kill(-child.pid, signal);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
}

function isServerTreeRunning(child: ChildProcessWithoutNullStreams) {
  if (!child.pid) return false;
  if (process.platform === "win32") return !hasProcessExited(child);

  try {
    process.kill(-child.pid, 0);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return false;
    throw error;
  }
}

async function waitForServerTree(
  child: ChildProcessWithoutNullStreams,
  timeout: number,
) {
  const deadline = Date.now() + timeout;
  while (isServerTreeRunning(child) && Date.now() < deadline) {
    await delay(50);
  }
  return !isServerTreeRunning(child);
}

async function stopServer(
  child: ChildProcessWithoutNullStreams,
  childExited: Promise<void>,
): Promise<void> {
  signalServerTree(child, "SIGTERM");
  if (!(await waitForServerTree(child, STOP_TIMEOUT_MS))) {
    signalServerTree(child, "SIGKILL");
    if (!(await waitForServerTree(child, STOP_TIMEOUT_MS))) {
      throw new Error("production server process tree did not stop");
    }
  }
  await childExited;
}

export async function startProductionServer(
  cwd: string,
): Promise<ProductionServer> {
  const port = await reservePort();
  const child = spawn(
    process.execPath,
    [nextCliPath, "start", "--hostname", "localhost", "--port", String(port)],
    {
      cwd,
      detached: process.platform !== "win32",
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: "pipe",
    },
  );
  let logs = "";
  let spawnError: Error | null = null;
  child.stdout.on("data", (chunk: Buffer) => {
    logs += chunk.toString();
  });
  child.stderr.on("data", (chunk: Buffer) => {
    logs += chunk.toString();
  });
  const childExited = new Promise<void>((resolve) => {
    child.once("error", (error) => {
      spawnError = error;
      resolve();
    });
    child.once("exit", () => resolve());
  });
  const readLogs = () => logs;

  try {
    await waitForReady(child, readLogs, () => spawnError);
  } catch (error) {
    await stopServer(child, childExited);
    throw error;
  }

  let stopPromise: Promise<void> | null = null;
  return {
    baseUrl: `http://localhost:${port}`,
    readLogs,
    stop() {
      stopPromise ??= stopServer(child, childExited);
      return stopPromise;
    },
  };
}

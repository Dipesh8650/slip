import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { prepareDatabaseEnvironment } from "./database-env.mjs";
const directory = fileURLToPath(new URL("./", import.meta.url));
const children = [];
let database;
let notifySignal;
const signalReceived = new Promise(resolve => {
  notifySignal = resolve;
});
const onInterrupt = () => notifySignal({ signal: "SIGINT" });
const onTerminate = () => notifySignal({ signal: "SIGTERM" });
function launch(command, args) {
  const child = spawn(command, args, {
    cwd: directory,
    env: database.env,
    stdio: "inherit",
  });
  const record = { child, finished: false, done: null };
  record.done = new Promise(resolve => {
    child.once("error", () => {
      record.finished = true;
      resolve({ failed: true });
    });
    child.once("close", code => {
      record.finished = true;
      resolve({ failed: true, code });
    });
  });
  children.push(record);
  return record;
}
async function stopChildren() {
  for (const record of children) {
    if (!record.finished) record.child.kill("SIGTERM");
  }
  const timeout = setTimeout(() => {
    for (const record of children) {
      if (!record.finished) record.child.kill("SIGKILL");
    }
  }, 5000);
  timeout.unref();
  try {
    await Promise.all(children.map(record => record.done));
  } finally {
    clearTimeout(timeout);
  }
}
try {
  database = await prepareDatabaseEnvironment();
  process.on("SIGINT", onInterrupt);
  process.on("SIGTERM", onTerminate);
  launch("python", [
    "-m", "uvicorn", "app.main:app",
    "--host", "127.0.0.1",
    "--port", "8000",
    "--no-access-log",
  ]);
  launch(process.execPath, ["gateway.mjs"]);
  const result = await Promise.race([
    signalReceived,
    ...children.map(record => record.done),
  ]);
  if (result.failed) {
    console.error("A Slip service exited; stopping the application.");
    process.exitCode = 1;
  } else {
    process.exitCode = result.signal === "SIGINT" ? 130 : 143;
  }
} catch {
  console.error("Slip startup failed. Check the runtime configuration.");
  process.exitCode = 1;
} finally {
  await stopChildren();
  process.removeListener("SIGINT", onInterrupt);
  process.removeListener("SIGTERM", onTerminate);
  if (database) await database.cleanup();
}

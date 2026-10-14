import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { prepareDatabaseEnvironment } from "./database-env.mjs";
let database;
let child;
const forwardSignal = signal => {
  if (child && child.exitCode === null) child.kill(signal);
};
const onInterrupt = () => forwardSignal("SIGINT");
const onTerminate = () => forwardSignal("SIGTERM");
try {
  database = await prepareDatabaseEnvironment();
  process.on("SIGINT", onInterrupt);
  process.on("SIGTERM", onTerminate);
  const exitCode = await new Promise((resolve, reject) => {
    child = spawn("python", ["-m", "alembic", "upgrade", "head"], {
      cwd: fileURLToPath(new URL("./", import.meta.url)),
      env: database.env,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("close", (code, signal) => resolve(signal ? 1 : (code ?? 1)));
  });
  process.exitCode = exitCode;
} catch {
  console.error("Slip database migration failed. Check the managed database binding and migration logs.");
  process.exitCode = 1;
} finally {
  process.removeListener("SIGINT", onInterrupt);
  process.removeListener("SIGTERM", onTerminate);
  if (database) await database.cleanup();
}

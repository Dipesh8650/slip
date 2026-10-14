import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getKainoDatabaseConfig } from "@kainostore/sdk/database";
export async function prepareDatabaseEnvironment() {
  const config = getKainoDatabaseConfig();
  const directory = await mkdtemp(join(tmpdir(), "slip-db-"));
  const certificatePath = join(directory, "ca.pem");
  try {
    await writeFile(certificatePath, config.ssl.ca, { mode: 0o600 });
    return {
      env: {
        ...process.env,
        POSTGRES_HOST: config.host,
        POSTGRES_PORT: String(config.port),
        POSTGRES_USER: config.user,
        POSTGRES_PASSWORD: config.password,
        POSTGRES_DB: config.database,
        PGSSLMODE: "verify-full",
        PGSSLROOTCERT: certificatePath,
        PGCONNECT_TIMEOUT: "10",
      },
      cleanup: () => rm(directory, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

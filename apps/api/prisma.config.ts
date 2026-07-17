import { config } from "dotenv";
import { existsSync } from "fs";
import { join } from "path";
import { defineConfig } from "prisma/config";

// Load the single monorepo-root .env. Prisma CLI runs with cwd = apps/api,
// so the root file is two levels up; also handle running from the repo root.
for (const p of [
  join(process.cwd(), ".env"),
  join(process.cwd(), "..", "..", ".env"),
]) {
  if (existsSync(p)) {
    config({ path: p });
    break;
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});

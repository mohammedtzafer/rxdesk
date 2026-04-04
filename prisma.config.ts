import dotenv from "dotenv";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Load from .env.local (Next.js convention), fall back to .env
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

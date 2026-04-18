import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  // Share the schema from the frontend repo — one source of truth
  schema: "../prisma/schema.prisma",
  migrations: {
    path: "../prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

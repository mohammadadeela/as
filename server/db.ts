import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isExternalDb = process.env.DATABASE_URL.includes("render.com") ||
  process.env.DATABASE_URL.includes("neon.tech") ||
  process.env.DATABASE_URL.includes("supabase.co") ||
  process.env.DATABASE_URL.includes("railway.app");

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isExternalDb ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });

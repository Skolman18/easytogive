/**
 * EasyToGive — Database Migration Runner
 *
 * Usage:
 *   1. In .env.local, set SUPABASE_DB_URL with your database password
 *   2. Run: npm run migrate
 */

import postgres from "postgres";
import fs from "fs";
import path from "path";

// Load .env.local manually (tsx doesn't auto-load it)
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl || dbUrl.includes("[YOUR-DB-PASSWORD]")) {
  console.error("\n❌  SUPABASE_DB_URL is not set or still has the placeholder.");
  console.error("   Edit .env.local and replace [YOUR-DB-PASSWORD] with your actual");
  console.error("   database password from: Supabase Dashboard → Settings → Database\n");
  process.exit(1);
}

const migrationsDir = path.join(process.cwd(), "supabase/migrations");

const sql = postgres(dbUrl, { max: 1 });

async function run() {
  console.log("🔌  Connecting to Supabase database…");
  try {
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("⚠️  No migration files found in supabase/migrations.");
      return;
    }

    for (const file of files) {
      const migrationFile = path.join(migrationsDir, file);
      const migrationSql = fs.readFileSync(migrationFile, "utf8");
      console.log(`📋  Running migration: ${file}`);
      await sql.unsafe(migrationSql);
    }

    console.log("✅  Migrations applied successfully.");
  } catch (err) {
    console.error("❌  Migration failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();

/**
 * Quick connection + schema check for Supabase.
 *
 * Run: npx tsx scripts/check-supabase.ts
 *
 * Verifies that:
 *  - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are configured
 *  - The connection works (auth + network)
 *  - All 7 tables from the migration exist and are queryable
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ Env vars missing:");
  console.error("   SUPABASE_URL:", url ? "✓" : "MISSING");
  console.error("   SUPABASE_SERVICE_ROLE_KEY:", key ? "✓" : "MISSING");
  process.exit(1);
}

console.log("🔗 URL:", url);
console.log(
  "🔑 Key prefix:",
  key.slice(0, 14) + "..." + (key.length > 30 ? key.slice(-6) : "")
);
console.log();

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

const TABLES = [
  "teams",
  "chantiers",
  "report_orders",
  "sectors",
  "streets",
  "leads",
  "sector_assignments",
] as const;

(async () => {
  let allOk = true;
  for (const table of TABLES) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });
      if (error) {
        console.error(`❌ ${table.padEnd(20)} → ${error.message}`);
        allOk = false;
      } else {
        console.log(`✓  ${table.padEnd(20)} → ${count ?? 0} rows`);
      }
    } catch (err) {
      console.error(
        `❌ ${table.padEnd(20)} → ${err instanceof Error ? err.message : err}`
      );
      allOk = false;
    }
  }

  console.log();
  if (allOk) {
    console.log("✅ Connexion OK + schéma déployé. On peut continuer.");
    process.exit(0);
  } else {
    console.log(
      "❌ Au moins une table manque ou est inaccessible. Vérifie que :"
    );
    console.log("   1. Le SQL de schéma a bien été run dans le SQL Editor");
    console.log("   2. La clé est bien la service_role (pas la publishable)");
    process.exit(1);
  }
})();

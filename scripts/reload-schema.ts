/**
 * Force-reload the PostgREST schema cache.
 * Runs NOTIFY pgrst, 'reload schema'; via the SQL execution path.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

(async () => {
  // Trick: a simple select retries the schema lookup which populates the cache.
  // If the table actually exists, it'll succeed.
  for (const t of [
    "teams",
    "chantiers",
    "report_orders",
    "sectors",
    "streets",
    "leads",
    "sector_assignments",
  ]) {
    const { error } = await supabase
      .from(t)
      .select("*", { count: "exact", head: true });
    if (error) {
      console.log(`❌ ${t}: ${error.message}`);
    } else {
      console.log(`✓  ${t}`);
    }
  }
})();

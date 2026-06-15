/**
 * Diagnostic: try every write operation against the teams table.
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
  console.log("1. SELECT count:");
  const sel = await supabase
    .from("teams")
    .select("*", { count: "exact", head: true });
  console.log("   ", sel.error?.message ?? `OK (${sel.count} rows)`);

  console.log("\n2. INSERT single:");
  const ins = await supabase.from("teams").insert({
    key: "Nikita",
    chief_name: "Test",
    employees: [],
    notes: null,
  });
  console.log("   ", ins.error?.message ?? "OK");

  console.log("\n3. UPSERT single:");
  const ups = await supabase.from("teams").upsert(
    {
      key: "Nikita",
      chief_name: "TestUpsert",
      employees: [],
      notes: null,
    },
    { onConflict: "key" }
  );
  console.log("   ", ups.error?.message ?? "OK");

  console.log("\n4. DELETE single:");
  const del = await supabase.from("teams").delete().eq("key", "Nikita");
  console.log("   ", del.error?.message ?? "OK");

  console.log("\n5. RPC ping:");
  const { data: ver, error: verErr } = await supabase.rpc("version");
  console.log("   ", verErr?.message ?? `Postgres: ${ver ?? "(no RPC)"}`);
})();

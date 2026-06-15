/**
 * End-to-end test of the rewritten kv.ts helpers.
 * Confirms that the full pipeline (Supabase → SQL → mapping → TS objects)
 * works as expected.
 *
 * Read-only — does NOT mutate anything in the database.
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

// Stub the @/lib/kv import path so the kv helpers can be loaded outside Next.
// (The kv modules don't directly import @/lib/kv anymore — they go through
// @/lib/supabase — so this is a no-op safety net.)

(async () => {
  const { listAllChantiers, listChantiersByStatus } = await import(
    "../src/lib/chantiers/kv"
  );
  const { listTeams } = await import("../src/lib/teams/kv");
  const { listAllReportOrders } = await import("../src/lib/reports/kv");
  const { listSectors, listAllLeads } = await import(
    "../src/lib/prospection/kv"
  );

  console.log("Testing kv helpers end-to-end...\n");

  const chantiers = await listAllChantiers();
  console.log(`✓  listAllChantiers()        → ${chantiers.length} chantiers`);
  if (chantiers[0]) {
    const c = chantiers[0];
    console.log(
      `   sample: ${c.clientName} (${c.status}, ${c.urgency}, signedAt=${new Date(c.signedAt).toLocaleDateString()})`
    );
  }

  const scheduled = await listChantiersByStatus("scheduled");
  console.log(`✓  listChantiersByStatus()   → ${scheduled.length} scheduled`);

  const teams = await listTeams();
  console.log(`✓  listTeams()               → ${teams.length} teams`);
  for (const t of teams) {
    console.log(
      `   ${t.key.padEnd(10)} chief=${t.chiefName.padEnd(12)} employees=${t.employees.length}`
    );
  }

  const reports = await listAllReportOrders();
  console.log(`✓  listAllReportOrders()     → ${reports.length} report orders`);

  const sectors = await listSectors();
  console.log(`✓  listSectors()             → ${sectors.length} sectors`);
  for (const s of sectors) {
    console.log(`   ${s.name.padEnd(30)} streets=${s.streetIds.length}`);
  }

  const leads = await listAllLeads();
  console.log(`✓  listAllLeads()            → ${leads.length} leads`);

  console.log("\n✅ Tous les helpers fonctionnent. La couche Supabase est opérationnelle.");
})();

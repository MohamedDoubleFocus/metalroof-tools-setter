/**
 * Bootstrap: create the FIRST admin user before /admin/users is reachable.
 *
 * Run:
 *   npx tsx scripts/seed-admin-user.ts <email> <password> [fullName]
 *
 * Example:
 *   npx tsx scripts/seed-admin-user.ts contact@groupebricole.com SuperSecret123 "Mohamed Wafi"
 *
 * The created user has role=admin. After this you can log in via /login and
 * create all other accounts through the admin UI.
 *
 * Idempotent: if a user with that email already exists, we just upsert the
 * profile to ensure role=admin.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant.");
  process.exit(1);
}

const [, , emailArg, passwordArg, ...nameParts] = process.argv;
const fullName = nameParts.join(" ").trim() || null;

if (!emailArg || !passwordArg) {
  console.error(
    "Usage: npx tsx scripts/seed-admin-user.ts <email> <password> [fullName]"
  );
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const password = passwordArg;

if (password.length < 8) {
  console.error("❌ Mot de passe trop court (min 8 caractères).");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

(async () => {
  console.log(`🔧 Bootstrapping admin user ${email}...`);

  // 1. Look up or create auth user
  let userId: string;
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
  const existing = list?.users?.find(
    (u) => u.email?.toLowerCase() === email
  );

  if (existing) {
    console.log(`   Auth user already exists: ${existing.id}`);
    userId = existing.id;
    // Reset password to whatever the caller asked for
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    if (error) {
      console.error("❌ updateUserById:", error.message);
      process.exit(1);
    }
    console.log("   ✓ Password reset");
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user) {
      console.error("❌ createUser:", error?.message);
      process.exit(1);
    }
    userId = data.user.id;
    console.log(`   ✓ Created auth user: ${userId}`);
  }

  // 2. Upsert profile with admin role
  const { error: profErr } = await admin.from("profiles").upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      role: "admin",
      team: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (profErr) {
    console.error("❌ upsert profile:", profErr.message);
    process.exit(1);
  }
  console.log("   ✓ Profile upserted with role=admin");

  console.log(`\n✅ Admin ready.\n   Email:    ${email}\n   Password: ${password}\n`);
  console.log("Tu peux maintenant te connecter via /login.");
})();

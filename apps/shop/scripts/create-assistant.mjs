// Creates — or reconciles — Claude's own admin login: the Assistant
// (assistant@auraprotocols.com). Idempotent: safe to run again any time;
// it finds the existing auth user and staff row rather than duplicating
// them, and resets the Supabase password to match the saved password file
// if the two ever drift apart. It never re-enables a staff row Alvester
// disabled on /admin/team — it checks that BEFORE touching the password,
// and exits non-zero without writing anything.
//
// This is a staff login, not a buyer: it gets no account_agreements row
// (that table records a customer's sign-up agreement to the storefront
// terms — the Assistant never shops).
//
// Run: node apps/shop/scripts/create-assistant.mjs
// Reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from apps/shop/.env.local —
// this writes to whatever project that .env.local points at. Never run
// against anything but the real Aura Store project, and only when asked.
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ASSISTANT_EMAIL = "assistant@auraprotocols.com";
const ASSISTANT_NAME = "Assistant (Claude)";
const PASSWORD_FILE = join(homedir(), ".aura", "assistant.json");

// KEY=value lines, same as the old helper — not a full dotenv parser.
function readEnvLocal() {
  const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
  const out = {};
  if (!existsSync(envPath)) return out;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

// Reuses the saved password if there is one, so a re-run never breaks a
// session this script already minted; otherwise generates and saves one.
function loadOrCreatePassword() {
  if (existsSync(PASSWORD_FILE)) {
    const saved = JSON.parse(readFileSync(PASSWORD_FILE, "utf8"));
    if (saved.email === ASSISTANT_EMAIL && saved.password) return saved.password;
  }
  const password = randomBytes(32).toString("base64url");
  mkdirSync(dirname(PASSWORD_FILE), { recursive: true });
  writeFileSync(PASSWORD_FILE, JSON.stringify({ email: ASSISTANT_EMAIL, password }), { mode: 0o600 });
  return password;
}

async function findUserByEmail(admin, email) {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers failed: ${JSON.stringify(error)}`);
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  const env = readEnvLocal();
  const url = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not found in apps/shop/.env.local");
  const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

  let user = await findUserByEmail(admin, ASSISTANT_EMAIL);

  // Check the existing staff row BEFORE touching the password: if Alvester
  // disabled it on /admin/team, re-running this script must never flip it
  // back to active, and must stop before it even resets the password.
  let existingStaff = null;
  if (user) {
    const { data, error } = await admin.from("staff").select("status").eq("customer_id", user.id).maybeSingle();
    if (error) throw new Error(`staff read failed: ${JSON.stringify(error)}`);
    existingStaff = data;
  }
  if (existingStaff?.status === "disabled") {
    console.error("assistant is DISABLED — enable it on /admin/team");
    process.exitCode = 1;
    return;
  }

  const password = loadOrCreatePassword();

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: ASSISTANT_EMAIL, password, email_confirm: true, user_metadata: { full_name: ASSISTANT_NAME },
    });
    if (error) throw new Error(`createUser failed: ${JSON.stringify(error)}`);
    user = data.user;
  } else {
    // Keep the auth user's password matching the password file — if they'd
    // ever drifted apart, assistant-session.mjs would silently fail to sign in.
    const { error } = await admin.auth.admin.updateUserById(user.id, { password });
    if (error) throw new Error(`updateUserById failed: ${JSON.stringify(error)}`);
  }

  const { error: custErr } = await admin.from("customers").upsert(
    { id: user.id, full_name: ASSISTANT_NAME, email_verified_at: new Date().toISOString(), verify_required: false, marketing_opt_in: false },
    { onConflict: "id" },
  );
  if (custErr) throw new Error(`customers upsert failed: ${JSON.stringify(custErr)}`);

  // Insert the staff row only when none exists yet. An existing row's
  // status/added_by are never touched here — only /admin/team's Disable
  // and Enable change those.
  if (!existingStaff) {
    const { data: ownerRow, error: ownerErr } = await admin.from("staff").select("customer_id").eq("role", "owner").eq("status", "active").limit(1).maybeSingle();
    if (ownerErr) throw new Error(`owner read failed: ${JSON.stringify(ownerErr)}`);

    const { error: staffErr } = await admin.from("staff").insert(
      { customer_id: user.id, role: "assistant", status: "active", added_by: ownerRow?.customer_id ?? null },
    );
    if (staffErr) throw new Error(`staff insert failed: ${JSON.stringify(staffErr)}`);
  }

  console.log(`ok assistant ${user.id}`);
}

main().catch((err) => {
  console.error(String(err));
  process.exitCode = 1;
});

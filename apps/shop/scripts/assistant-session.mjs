// Signs in AS THE ASSISTANT ONLY and writes a Playwright storageState file,
// so Claude can drive the running app's admin as itself for a live check —
// never as Alvester, never as any other email. There is no email argument;
// passing one is refused outright.
//
// Run: node apps/shop/scripts/assistant-session.mjs <out.json> <origin>
//   e.g. node apps/shop/scripts/assistant-session.mjs .aura/assistant-state.json http://localhost:3000
// Requires create-assistant.mjs to have run first (reads ~/.aura/assistant.json).
import { createServerClient } from "@supabase/ssr";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PASSWORD_FILE = join(homedir(), ".aura", "assistant.json");
const ASSISTANT_EMAIL = "assistant@auraprotocols.com";

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

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2) throw new Error("usage: node assistant-session.mjs <out.json> <origin> — this script signs in as the Assistant only, no email argument");
  const [outPath, originArg] = args;

  if (!existsSync(PASSWORD_FILE)) throw new Error(`${PASSWORD_FILE} not found — run create-assistant.mjs first`);
  const { email, password } = JSON.parse(readFileSync(PASSWORD_FILE, "utf8"));
  if (email !== ASSISTANT_EMAIL) throw new Error(`${PASSWORD_FILE} has email "${email}", not "${ASSISTANT_EMAIL}" — refusing to sign in as anyone else`);

  const env = readEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not found in apps/shop/.env.local");

  const jar = new Map();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (list) => { for (const { name, value } of list) jar.set(name, value); },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed: ${JSON.stringify(error)}`);

  const origin = new URL(originArg);
  // Cookie shape matches the known-good helper (sign-in-as.cjs): httpOnly
  // false (Playwright's storageState needs to see these like a browser tab
  // would with Supabase's client-side cookies), and a cookie Supabase ever
  // set to "" (cleared) is dropped rather than written back.
  const cookies = [...jar.entries()].filter(([, value]) => value).map(([name, value]) => ({
    name, value, domain: origin.hostname, path: "/", expires: -1, httpOnly: false, secure: origin.protocol === "https:", sameSite: "Lax",
  }));
  writeFileSync(outPath, JSON.stringify({ cookies, origins: [] }, null, 2));
  console.log(`ok ${cookies.length} cookies -> ${outPath}`);
}

main().catch((err) => {
  console.error(String(err));
  process.exitCode = 1;
});

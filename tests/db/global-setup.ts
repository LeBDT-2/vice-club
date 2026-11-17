import { loadTestEnv } from "./env";

export default async function setup() {
  const { url } = loadTestEnv();
  const res = await fetch(`${url}/auth/v1/health`).catch(() => null);
  if (!res || !res.ok) throw new Error(`Supabase local injoignable sur ${url}. Lance « pnpm exec supabase start ».`);
}

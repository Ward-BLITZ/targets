import { createClient, SupabaseClient } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

// Service-role client: enkel gebruiken in server-side code (API-routes),
// nooit in de browser. Omzeilt RLS, dus elke route die dit gebruikt moet
// zelf de ingelogde gebruiker controleren (zie getGebruikerUitToken).
export function getSupabaseAdmin(): SupabaseClient {
  if (!admin) {
    admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return admin;
}

export type Gebruiker = { id: string; email: string; naam: string };

// Leidt de ingelogde gebruiker af uit de Bearer-token die de browser
// meestuurt (dezelfde Supabase Auth-sessie als het hoofddashboard).
export async function getGebruikerUitToken(
  authHeader: string | null
): Promise<Gebruiker | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const client = getSupabaseAdmin();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) return null;
  const u = data.user;
  const meta = (u.user_metadata || {}) as Record<string, any>;
  const naam =
    meta.naam ||
    [meta.voornaam, meta.achternaam].filter(Boolean).join(" ") ||
    (u.email ? u.email.split("@")[0] : "Onbekend");
  return { id: u.id, email: u.email || "", naam };
}

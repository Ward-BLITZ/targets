import { createClient } from "@supabase/supabase-js";

// LET OP: dit bestand mag alleen server-side gebruikt worden (API routes).
// De service role key omzeilt row-level security en mag nooit naar de browser.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export function getSupabaseAdmin() {
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY of NEXT_PUBLIC_SUPABASE_URL ontbreekt in de server-omgevingsvariabelen."
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

// Haalt de ingelogde gebruiker op basis van het Supabase-access-token dat de
// browser meestuurt (Authorization: Bearer <token>). Geeft null terug als het
// token ontbreekt of ongeldig is.
export async function getGebruikerUitToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  const meta = (data.user.user_metadata || {}) as Record<string, unknown>;
  const naam =
    (meta.naam as string) ||
    (meta.voornaam
      ? `${meta.voornaam as string} ${(meta.achternaam as string) || ""}`.trim()
      : null) ||
    data.user.email?.split("@")[0] ||
    "Onbekend";
  return {
    id: data.user.id,
    email: data.user.email || "",
    naam
  };
}

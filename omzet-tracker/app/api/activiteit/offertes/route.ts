import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getGebruikerUitToken } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// Enkel de datums van verstuurde offertes van de ingelogde gebruiker (of van
// iedereen met ?alle=1) — gebruikt op de Activiteit-pagina om het aantal
// offertes per week te tellen t.o.v. het weekdoel. Hergebruikt de bestaande
// omzet_uploads-tabel (type = 'offerte'), geen aparte tabel nodig.
export async function GET(req: NextRequest) {
  const gebruiker = await getGebruikerUitToken(req.headers.get("authorization"));
  if (!gebruiker) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  const alle = req.nextUrl.searchParams.get("alle") === "1";

  let query = admin
    .from("omzet_uploads")
    .select("datum")
    .eq("type", "offerte")
    .order("datum", { ascending: false })
    .limit(1000);
  if (!alle) query = query.eq("geupload_door_email", gebruiker.email);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ datums: (data || []).map((r) => r.datum) });
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getGebruikerUitToken } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const GELDIGE_TYPES = ["nieuw", "bestaand", "groothandel", "b2c"] as const;

export async function POST(req: NextRequest) {
  const gebruiker = await getGebruikerUitToken(req.headers.get("authorization"));
  if (!gebruiker) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { datum, bedrijfsnaam, type, notitie } = body || {};

  if (!datum || Number.isNaN(Date.parse(datum))) {
    return NextResponse.json({ error: "Ongeldige of ontbrekende datum." }, { status: 400 });
  }
  if (typeof bedrijfsnaam !== "string" || !bedrijfsnaam.trim()) {
    return NextResponse.json({ error: "Bedrijfsnaam is verplicht." }, { status: 400 });
  }
  if (!GELDIGE_TYPES.includes(type)) {
    return NextResponse.json({ error: "Ongeldig type bezoek." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("activiteit_visits")
    .insert({
      gebruiker_email: gebruiker.email,
      gebruiker_naam: gebruiker.naam,
      datum,
      bedrijfsnaam: bedrijfsnaam.trim(),
      type,
      notitie: typeof notitie === "string" && notitie.trim() ? notitie.trim() : null
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rij: data });
}

export async function GET(req: NextRequest) {
  const gebruiker = await getGebruikerUitToken(req.headers.get("authorization"));
  if (!gebruiker) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  const alle = req.nextUrl.searchParams.get("alle") === "1";

  let query = admin
    .from("activiteit_visits")
    .select("*")
    .order("datum", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (!alle) query = query.eq("gebruiker_email", gebruiker.email);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rijen: data });
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getGebruikerUitToken } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const GELDIGE_VISIT = ["ja", "nee", "te_bevestigen"] as const;

export async function POST(req: NextRequest) {
  const gebruiker = await getGebruikerUitToken(req.headers.get("authorization"));
  if (!gebruiker) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { datum, naam, kwalitatief, minuten, visit } = body || {};

  if (!datum || Number.isNaN(Date.parse(datum))) {
    return NextResponse.json({ error: "Ongeldige of ontbrekende datum." }, { status: 400 });
  }
  if (typeof naam !== "string" || !naam.trim()) {
    return NextResponse.json({ error: "Naam is verplicht." }, { status: 400 });
  }
  if (!GELDIGE_VISIT.includes(visit)) {
    return NextResponse.json({ error: "Ongeldige visit-status." }, { status: 400 });
  }
  const minutenGetal = Number(minuten);
  if (!Number.isFinite(minutenGetal) || minutenGetal < 0) {
    return NextResponse.json({ error: "Ongeldig aantal minuten." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("activiteit_calls")
    .insert({
      gebruiker_email: gebruiker.email,
      gebruiker_naam: gebruiker.naam,
      datum,
      naam: naam.trim(),
      kwalitatief: !!kwalitatief,
      minuten: minutenGetal,
      visit
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rij: data });
}

// GET: laatste calls van de ingelogde gebruiker (of van iedereen met ?alle=1).
export async function GET(req: NextRequest) {
  const gebruiker = await getGebruikerUitToken(req.headers.get("authorization"));
  if (!gebruiker) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  const alle = req.nextUrl.searchParams.get("alle") === "1";

  let query = admin
    .from("activiteit_calls")
    .select("*")
    .order("datum", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);
  if (!alle) query = query.eq("gebruiker_email", gebruiker.email);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rijen: data });
}

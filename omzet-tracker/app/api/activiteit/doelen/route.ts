import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getGebruikerUitToken } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const GELDIGE_METRIEKEN = ["calls_kwalitatief", "visits", "offertes"] as const;

// GET: de 3 wekelijkse doelen van de ingelogde gebruiker.
export async function GET(req: NextRequest) {
  const gebruiker = await getGebruikerUitToken(req.headers.get("authorization"));
  if (!gebruiker) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("activiteit_weekdoelen")
    .select("*")
    .eq("gebruiker_email", gebruiker.email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ doelen: data });
}

// POST: één weekdoel aanmaken/bijwerken (upsert op gebruiker + metriek).
export async function POST(req: NextRequest) {
  const gebruiker = await getGebruikerUitToken(req.headers.get("authorization"));
  if (!gebruiker) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { metriek, doelPerWeek } = body || {};

  if (!GELDIGE_METRIEKEN.includes(metriek)) {
    return NextResponse.json({ error: "Ongeldige metriek." }, { status: 400 });
  }
  if (typeof doelPerWeek !== "number" || !Number.isFinite(doelPerWeek) || doelPerWeek < 0) {
    return NextResponse.json({ error: "Ongeldig doel." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("activiteit_weekdoelen")
    .upsert(
      { gebruiker_email: gebruiker.email, metriek, doel_per_week: Math.round(doelPerWeek) },
      { onConflict: "gebruiker_email,metriek" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ doel: data });
}

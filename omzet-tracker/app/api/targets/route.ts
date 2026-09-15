import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getGebruikerUitToken } from "@/lib/supabaseAdmin";
import { geldigePeriode } from "@/lib/periode";

export const runtime = "nodejs";

// GET: targets van de ingelogde gebruiker (of van iedereen met ?alle=1, voor
// een teamoverzicht).
export async function GET(req: NextRequest) {
  const gebruiker = await getGebruikerUitToken(req.headers.get("authorization"));
  if (!gebruiker) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  const alle = req.nextUrl.searchParams.get("alle") === "1";

  let query = admin.from("omzet_targets").select("*").order("periode", { ascending: true });
  if (!alle) query = query.eq("gebruiker_email", gebruiker.email);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ targets: data });
}

// POST: target aanmaken/bijwerken voor de ingelogde gebruiker (upsert op
// gebruiker + categorie + periode).
export async function POST(req: NextRequest) {
  const gebruiker = await getGebruikerUitToken(req.headers.get("authorization"));
  if (!gebruiker) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { categorie, periode, doelBedrag } = body || {};

  if (!["B2B", "B2C", "KMO"].includes(categorie)) {
    return NextResponse.json({ error: "Ongeldige categorie." }, { status: 400 });
  }
  if (typeof periode !== "string" || !geldigePeriode(periode)) {
    return NextResponse.json(
      {
        error:
          'Ongeldige periode. Gebruik "2026", "2026-Q1", "2026-01" of een vrije reeks zoals "2026-08_2026-12".'
      },
      { status: 400 }
    );
  }
  if (typeof doelBedrag !== "number" || !Number.isFinite(doelBedrag) || doelBedrag < 0) {
    return NextResponse.json({ error: "Ongeldig doelbedrag." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("omzet_targets")
    .upsert(
      {
        gebruiker_naam: gebruiker.naam,
        gebruiker_email: gebruiker.email,
        categorie,
        periode,
        doel_bedrag: doelBedrag
      },
      { onConflict: "gebruiker_email,categorie,periode" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ target: data });
}

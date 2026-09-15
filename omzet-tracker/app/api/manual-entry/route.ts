import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getGebruikerUitToken } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const GELDIGE_TYPES = ["offerte", "factuur"] as const;
const GELDIGE_CATEGORIEEN = ["B2B", "B2C", "KMO"] as const;

function isToegestaneCombinatie(type: string, categorie: string) {
  if (type === "offerte") return categorie === "B2B" || categorie === "B2C";
  if (type === "factuur") return ["B2B", "B2C", "KMO"].includes(categorie);
  return false;
}

// Handmatige invoer: een omzetregel toevoegen zonder een factuur/offerte-
// bestand te uploaden. Bedrag wordt rechtstreeks door de gebruiker ingegeven,
// er gebeurt geen AI-extractie.
export async function POST(req: NextRequest) {
  try {
    const gebruiker = await getGebruikerUitToken(req.headers.get("authorization"));
    if (!gebruiker) {
      return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { type, categorie, bedragExBtw, notitie } = body || {};

    if (!GELDIGE_TYPES.includes(type)) {
      return NextResponse.json({ error: "Ongeldig type (offerte/factuur)." }, { status: 400 });
    }
    if (!GELDIGE_CATEGORIEEN.includes(categorie)) {
      return NextResponse.json({ error: "Ongeldige categorie." }, { status: 400 });
    }
    if (!isToegestaneCombinatie(type, categorie)) {
      return NextResponse.json(
        { error: "Offertes kunnen enkel B2B of B2C zijn, geen KMO project." },
        { status: 400 }
      );
    }
    if (typeof bedragExBtw !== "number" || !Number.isFinite(bedragExBtw) || bedragExBtw < 0) {
      return NextResponse.json({ error: "Ongeldig bedrag." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("omzet_uploads")
      .insert({
        type,
        categorie,
        bedrag_ex_btw: bedragExBtw,
        bestandsnaam: "Handmatige invoer",
        geupload_door_naam: gebruiker.naam,
        geupload_door_email: gebruiker.email,
        status: "handmatig",
        ruwe_tekst_uittreksel: null,
        notitie: typeof notitie === "string" && notitie.trim() ? notitie.trim() : null
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rij: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Onbekende fout bij het handmatig toevoegen." },
      { status: 500 }
    );
  }
}

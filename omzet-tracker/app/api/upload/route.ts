import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getGebruikerUitToken } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 30;

const GELDIGE_TYPES = ["offerte", "factuur"] as const;
// "KMO" = KMO project (zie Doelstellingen-document): projecten waar Ward zelf
// een sleutelrol had in de verkoop. Niet te verwarren met B2B partners.
const GELDIGE_CATEGORIEEN = ["B2B", "B2C", "KMO"] as const;
const BUCKET = "omzet-documenten";

function isToegestaneCombinatie(type: string, categorie: string) {
  if (type === "offerte") return categorie === "B2B" || categorie === "B2C";
  if (type === "factuur") return ["B2B", "B2C", "KMO"].includes(categorie);
  return false;
}

// Handmatige invoer: nummer, datum en bedrag zijn verplicht en worden altijd
// rechtstreeks door de gebruiker ingegeven. Een document (PDF/foto) is
// optioneel en wordt enkel als bijlage bewaard in Supabase Storage — er
// gebeurt geen automatische bedrag-herkenning (geen Claude API nodig).
export async function POST(req: NextRequest) {
  try {
    const gebruiker = await getGebruikerUitToken(req.headers.get("authorization"));
    if (!gebruiker) {
      return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
    }

    const form = await req.formData();
    const type = String(form.get("type") || "");
    const categorie = String(form.get("categorie") || "");
    const nummer = String(form.get("nummer") || "").trim();
    const datum = String(form.get("datum") || "").trim();
    const bedragRuw = String(form.get("bedragExBtw") || "").trim();
    const notitie = String(form.get("notitie") || "").trim();
    const bestand = form.get("bestand");

    if (!GELDIGE_TYPES.includes(type as any)) {
      return NextResponse.json({ error: "Ongeldig type (offerte/factuur)." }, { status: 400 });
    }
    if (!GELDIGE_CATEGORIEEN.includes(categorie as any)) {
      return NextResponse.json({ error: "Ongeldige categorie." }, { status: 400 });
    }
    if (!isToegestaneCombinatie(type, categorie)) {
      return NextResponse.json(
        { error: "Offertes kunnen enkel B2B of B2C zijn, geen KMO project." },
        { status: 400 }
      );
    }
    if (!nummer) {
      return NextResponse.json(
        { error: "Verkoopordernummer/factuurnummer is verplicht." },
        { status: 400 }
      );
    }
    if (!datum || Number.isNaN(Date.parse(datum))) {
      return NextResponse.json({ error: "Ongeldige of ontbrekende datum." }, { status: 400 });
    }
    const bedragExBtw = parseFloat(bedragRuw.replace(",", "."));
    if (!Number.isFinite(bedragExBtw) || bedragExBtw < 0) {
      return NextResponse.json({ error: "Ongeldig bedrag." }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    let bestandsnaam: string | null = null;
    let bestandPad: string | null = null;

    if (bestand instanceof Blob && (bestand as File).size > 0) {
      const origineleNaam = (bestand as File).name || "document";
      const arrayBuffer = await bestand.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const veiligeNaam = origineleNaam.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const pad = `${gebruiker.email}/${Date.now()}-${veiligeNaam}`;

      const { error: uploadError } = await admin.storage.from(BUCKET).upload(pad, buffer, {
        contentType: bestand.type || "application/octet-stream",
        upsert: false
      });

      if (uploadError) {
        return NextResponse.json(
          { error: `Bestand kon niet opgeslagen worden: ${uploadError.message}` },
          { status: 500 }
        );
      }
      bestandsnaam = origineleNaam;
      bestandPad = pad;
    }

    const { data, error } = await admin
      .from("omzet_uploads")
      .insert({
        type,
        categorie,
        nummer,
        datum,
        bedrag_ex_btw: bedragExBtw,
        bestandsnaam,
        bestand_pad: bestandPad,
        geupload_door_naam: gebruiker.naam,
        geupload_door_email: gebruiker.email,
        status: "handmatig",
        notitie: notitie || null
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rij: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Onbekende fout bij het toevoegen." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const gebruiker = await getGebruikerUitToken(req.headers.get("authorization"));
  if (!gebruiker) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("omzet_uploads")
    .select("*")
    .order("datum", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rijen: data });
}

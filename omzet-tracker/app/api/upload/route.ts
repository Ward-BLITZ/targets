import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getGebruikerUitToken } from "@/lib/supabaseAdmin";
import { haalTekstUitPdf } from "@/lib/pdf";
import { haalBedragUitTekst, haalBedragUitAfbeelding } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

const GELDIGE_TYPES = ["offerte", "factuur"] as const;
// "KMO" = KMO project (zie Doelstellingen-document): projecten waar Ward zelf
// een sleutelrol had in de verkoop. Niet te verwarren met B2B partners.
const GELDIGE_CATEGORIEEN = ["B2B", "B2C", "KMO"] as const;

function isToegestaneCombinatie(type: string, categorie: string) {
  if (type === "offerte") return categorie === "B2B" || categorie === "B2C";
  if (type === "factuur") return ["B2B", "B2C", "KMO"].includes(categorie);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const gebruiker = await getGebruikerUitToken(req.headers.get("authorization"));
    if (!gebruiker) {
      return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("bestand");
    const type = String(form.get("type") || "");
    const categorie = String(form.get("categorie") || "");

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Geen bestand ontvangen." }, { status: 400 });
    }
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

    const bestandsnaam = (file as File).name || "onbekend-bestand";
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || "";

    let bedragExBtw: number | null = null;
    let status: "verwerkt" | "mislukt" = "mislukt";
    let toelichting = "";
    let tekstUittreksel = "";

    if (mimeType === "application/pdf" || bestandsnaam.toLowerCase().endsWith(".pdf")) {
      const tekst = await haalTekstUitPdf(buffer);
      tekstUittreksel = tekst.slice(0, 2000);
      if (tekst.trim().length > 40) {
        const resultaat = await haalBedragUitTekst(tekst);
        bedragExBtw = resultaat.bedragExBtw;
        status = resultaat.gevonden ? "verwerkt" : "mislukt";
        toelichting = resultaat.toelichting;
      } else {
        toelichting =
          "PDF bevat geen leesbare tekstlaag (waarschijnlijk een scan). Vul het bedrag handmatig in.";
      }
    } else if (["image/png", "image/jpeg", "image/webp"].includes(mimeType)) {
      const base64 = buffer.toString("base64");
      const resultaat = await haalBedragUitAfbeelding(base64, mimeType as any);
      bedragExBtw = resultaat.bedragExBtw;
      status = resultaat.gevonden ? "verwerkt" : "mislukt";
      toelichting = resultaat.toelichting;
    } else {
      toelichting = `Bestandstype "${mimeType || "onbekend"}" wordt niet ondersteund. Gebruik PDF, PNG of JPG.`;
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("omzet_uploads")
      .insert({
        type,
        categorie,
        bedrag_ex_btw: bedragExBtw,
        bestandsnaam,
        geupload_door_naam: gebruiker.naam,
        geupload_door_email: gebruiker.email,
        status,
        ruwe_tekst_uittreksel: tekstUittreksel || null,
        notitie: toelichting || null
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rij: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Onbekende fout bij verwerken van de upload." },
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
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rijen: data });
}

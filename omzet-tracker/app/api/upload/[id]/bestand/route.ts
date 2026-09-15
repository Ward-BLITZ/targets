import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getGebruikerUitToken } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
const BUCKET = "omzet-documenten";

// Geeft een tijdelijke (60s) beveiligde link terug naar het opgeslagen
// document, zodat de browser het bijgevoegde bestand kan openen zonder dat
// de storage-bucket publiek hoeft te zijn.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const gebruiker = await getGebruikerUitToken(req.headers.get("authorization"));
  if (!gebruiker) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  const { data: rij, error } = await admin
    .from("omzet_uploads")
    .select("bestand_pad")
    .eq("id", params.id)
    .single();

  if (error || !rij?.bestand_pad) {
    return NextResponse.json({ error: "Geen bestand gevonden bij deze regel." }, { status: 404 });
  }

  const { data, error: urlError } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(rij.bestand_pad, 60);

  if (urlError || !data) {
    return NextResponse.json(
      { error: urlError?.message || "Kon geen link naar het bestand aanmaken." },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: data.signedUrl });
}

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getGebruikerUitToken } from "@/lib/supabaseAdmin";
import { periodeNaarBereik } from "@/lib/periode";

export const runtime = "nodejs";

// Combineert de targets van de gebruiker met de werkelijk ingeboekte omzet
// (facturen, geen offertes) binnen elke periode, per categorie.
export async function GET(req: NextRequest) {
  const gebruiker = await getGebruikerUitToken(req.headers.get("authorization"));
  if (!gebruiker) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  const alle = req.nextUrl.searchParams.get("alle") === "1";

  let targetQuery = admin.from("omzet_targets").select("*");
  if (!alle) targetQuery = targetQuery.eq("gebruiker_email", gebruiker.email);
  const { data: targets, error: targetError } = await targetQuery;
  if (targetError) return NextResponse.json({ error: targetError.message }, { status: 500 });

  const { data: facturen, error: facturenError } = await admin
    .from("omzet_uploads")
    .select("categorie, bedrag_ex_btw, created_at, geupload_door_email")
    .eq("type", "factuur")
    .not("bedrag_ex_btw", "is", null);
  if (facturenError) return NextResponse.json({ error: facturenError.message }, { status: 500 });

  const resultaat = (targets || []).map((target) => {
    const bereik = periodeNaarBereik(target.periode);
    const relevanteFacturen = (facturen || []).filter((f) => {
      if (f.categorie !== target.categorie) return false;
      if (!alle && f.geupload_door_email !== gebruiker.email) return false;
      if (!bereik) return false;
      const datum = new Date(f.created_at);
      return datum >= bereik.start && datum < bereik.eind;
    });
    const werkelijk = relevanteFacturen.reduce((som, f) => som + (Number(f.bedrag_ex_btw) || 0), 0);
    const doel = Number(target.doel_bedrag) || 0;
    return {
      id: target.id,
      gebruikerNaam: target.gebruiker_naam,
      gebruikerEmail: target.gebruiker_email,
      categorie: target.categorie,
      periode: target.periode,
      doelBedrag: doel,
      werkelijkBedrag: werkelijk,
      percentage: doel > 0 ? Math.round((werkelijk / doel) * 1000) / 10 : 0,
      aantalFacturen: relevanteFacturen.length
    };
  });

  return NextResponse.json({ voortgang: resultaat });
}

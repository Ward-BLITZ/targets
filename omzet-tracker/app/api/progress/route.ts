import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getGebruikerUitToken } from "@/lib/supabaseAdmin";
import { periodeNaarBereik } from "@/lib/periode";

export const runtime = "nodejs";

// Combineert de targets van de gebruiker met de werkelijk ingeboekte omzet
// (facturen, geen offertes) binnen elke periode, per categorie. Gebruikt de
// zelf-ingevulde factuurdatum (niet het moment van invoeren) om te bepalen
// of een factuur binnen de doelperiode valt. Geeft ook de individuele
// facturen mee terug, zodat je op een target kan klikken om te zien welke
// facturen/orders eraan meetellen.
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
    .select("id, nummer, categorie, bedrag_ex_btw, datum, bestandsnaam, notitie, geupload_door_email, geupload_door_naam")
    .eq("type", "factuur")
    .not("bedrag_ex_btw", "is", null);
  if (facturenError) return NextResponse.json({ error: facturenError.message }, { status: 500 });

  const resultaat = (targets || []).map((target) => {
    const bereik = periodeNaarBereik(target.periode);
    const relevanteFacturen = (facturen || []).filter((f) => {
      if (f.categorie !== target.categorie) return false;
      if (!alle && f.geupload_door_email !== gebruiker.email) return false;
      if (!bereik || !f.datum) return false;
      const datum = new Date(f.datum);
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
      aantalFacturen: relevanteFacturen.length,
      facturen: relevanteFacturen
        .sort((a, b) => (a.datum < b.datum ? 1 : -1))
        .map((f) => ({
          id: f.id,
          nummer: f.nummer,
          datum: f.datum,
          bedragExBtw: Number(f.bedrag_ex_btw) || 0,
          bestandsnaam: f.bestandsnaam,
          notitie: f.notitie,
          geuploadDoorNaam: f.geupload_door_naam
        }))
    };
  });

  return NextResponse.json({ voortgang: resultaat });
}

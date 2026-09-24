import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getGebruikerUitToken } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// Vooral gebruikt om een "te bevestigen" visit achteraf op "ja" of "nee" te
// zetten, maar laat ook toe om nummer/naam/kwalitatief/minuten te corrigeren.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const gebruiker = await getGebruikerUitToken(req.headers.get("authorization"));
  if (!gebruiker) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (["ja", "nee", "te_bevestigen"].includes(body.visit)) update.visit = body.visit;
  if (typeof body.naam === "string" && body.naam.trim()) update.naam = body.naam.trim();
  if (typeof body.datum === "string" && !Number.isNaN(Date.parse(body.datum))) {
    update.datum = body.datum;
  }
  if (typeof body.kwalitatief === "boolean") update.kwalitatief = body.kwalitatief;
  if (typeof body.minuten === "number" && Number.isFinite(body.minuten)) {
    update.minuten = body.minuten;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Niets om bij te werken." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("activiteit_calls")
    .update(update)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rij: data });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const gebruiker = await getGebruikerUitToken(req.headers.get("authorization"));
  if (!gebruiker) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("activiteit_calls").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

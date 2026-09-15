import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getGebruikerUitToken } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// Laat de gebruiker het automatisch gevonden bedrag (of categorie/type)
// achteraf corrigeren, bv. als de extractie het mis had of niks vond.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const gebruiker = await getGebruikerUitToken(req.headers.get("authorization"));
  if (!gebruiker) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (typeof body.bedragExBtw === "number") {
    update.bedrag_ex_btw = body.bedragExBtw;
    update.status = "handmatig";
  }
  if (body.type === "offerte" || body.type === "factuur") {
    update.type = body.type;
  }
  if (["B2B", "B2C", "KMO"].includes(body.categorie)) {
    update.categorie = body.categorie;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Niets om bij te werken." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("omzet_uploads")
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
  const { error } = await admin.from("omzet_uploads").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

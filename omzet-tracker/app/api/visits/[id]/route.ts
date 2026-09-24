import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, getGebruikerUitToken } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const gebruiker = await getGebruikerUitToken(req.headers.get("authorization"));
  if (!gebruiker) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (typeof body.bedrijfsnaam === "string" && body.bedrijfsnaam.trim()) {
    update.bedrijfsnaam = body.bedrijfsnaam.trim();
  }
  if (typeof body.datum === "string" && !Number.isNaN(Date.parse(body.datum))) {
    update.datum = body.datum;
  }
  if (["nieuw", "bestaand", "groothandel", "b2c"].includes(body.type)) {
    update.type = body.type;
  }
  if (typeof body.notitie === "string") {
    update.notitie = body.notitie.trim() || null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Niets om bij te werken." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("activiteit_visits")
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
  const { error } = await admin.from("activiteit_visits").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

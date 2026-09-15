"use client";

import { useEffect, useRef, useState } from "react";
import { useGebruiker } from "@/lib/useGebruiker";

type Rij = {
  id: string;
  created_at: string;
  type: "offerte" | "factuur";
  categorie: "B2B" | "B2C" | "KMO";
  nummer: string;
  datum: string;
  bedrag_ex_btw: number | null;
  bestandsnaam: string | null;
  bestand_pad: string | null;
  notitie: string | null;
  geupload_door_naam: string;
};

const CATEGORIE_LABEL: Record<string, string> = {
  B2B: "B2B partners",
  B2C: "B2C",
  KMO: "KMO project"
};

const CATEGORIEEN_PER_TYPE: Record<string, string[]> = {
  offerte: ["B2B", "B2C"],
  factuur: ["B2B", "B2C", "KMO"]
};

function vandaag() {
  return new Date().toISOString().slice(0, 10);
}

export default function UploadPagina() {
  const gebruiker = useGebruiker();
  const [type, setType] = useState<"offerte" | "factuur">("factuur");
  const [categorie, setCategorie] = useState("B2B");
  const [nummer, setNummer] = useState("");
  const [datum, setDatum] = useState(vandaag());
  const [bedrag, setBedrag] = useState("");
  const [notitie, setNotitie] = useState("");
  const [bestand, setBestand] = useState<File | null>(null);
  const [overDropzone, setOverDropzone] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [verwijderBezig, setVerwijderBezig] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [rijen, setRijen] = useState<Rij[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const opties = CATEGORIEEN_PER_TYPE[type];

  useEffect(() => {
    if (!opties.includes(categorie)) setCategorie(opties[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  async function laadRijen() {
    if (gebruiker === "laden" || !gebruiker) return;
    const res = await fetch("/api/upload", {
      headers: { Authorization: `Bearer ${gebruiker.accessToken}` }
    });
    const json = await res.json();
    if (res.ok) setRijen(json.rijen || []);
  }

  useEffect(() => {
    laadRijen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gebruiker]);

  async function versturen() {
    if (gebruiker === "laden" || !gebruiker) return;
    setFout(null);

    if (!nummer.trim()) {
      setFout("Verkoopordernummer/factuurnummer is verplicht.");
      return;
    }
    if (!datum) {
      setFout("Datum is verplicht.");
      return;
    }
    const bedragGetal = parseFloat(bedrag.replace(",", "."));
    if (!Number.isFinite(bedragGetal) || bedragGetal < 0) {
      setFout("Vul een geldig bedrag in (bv. 1234.56).");
      return;
    }

    setBezig(true);
    try {
      const form = new FormData();
      form.append("type", type);
      form.append("categorie", categorie);
      form.append("nummer", nummer.trim());
      form.append("datum", datum);
      form.append("bedragExBtw", String(bedragGetal));
      if (notitie.trim()) form.append("notitie", notitie.trim());
      if (bestand) form.append("bestand", bestand);

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${gebruiker.accessToken}` },
        body: form
      });
      const json = await res.json();
      if (!res.ok) {
        setFout(json.error || "Er ging iets mis.");
        return;
      }
      setNummer("");
      setDatum(vandaag());
      setBedrag("");
      setNotitie("");
      setBestand(null);
      if (inputRef.current) inputRef.current.value = "";
      await laadRijen();
    } finally {
      setBezig(false);
    }
  }

  async function bewerken(r: Rij) {
    if (gebruiker === "laden" || !gebruiker) return;
    const nieuwNummer = window.prompt("Verkoopordernummer/factuurnummer:", r.nummer);
    if (nieuwNummer === null) return;
    const nieuweDatum = window.prompt("Datum (YYYY-MM-DD):", r.datum);
    if (nieuweDatum === null) return;
    const nieuwBedrag = window.prompt(
      "Bedrag exclusief btw:",
      r.bedrag_ex_btw !== null ? String(r.bedrag_ex_btw) : ""
    );
    if (nieuwBedrag === null) return;
    const bedragGetal = parseFloat(nieuwBedrag.replace(",", "."));
    if (!Number.isFinite(bedragGetal)) return;

    await fetch(`/api/upload/${r.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${gebruiker.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nummer: nieuwNummer.trim(),
        datum: nieuweDatum,
        bedragExBtw: bedragGetal
      })
    });
    await laadRijen();
  }

  async function verwijderen(r: Rij) {
    if (gebruiker === "laden" || !gebruiker) return;
    const bevestigd = window.confirm(
      `Weet je zeker dat je "${r.nummer}" (€ ${
        r.bedrag_ex_btw !== null ? r.bedrag_ex_btw.toLocaleString("nl-BE") : "?"
      }) wil verwijderen? Dit kan niet ongedaan gemaakt worden.`
    );
    if (!bevestigd) return;

    setVerwijderBezig(r.id);
    try {
      const res = await fetch(`/api/upload/${r.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${gebruiker.accessToken}` }
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(json.error || "Verwijderen is mislukt.");
        return;
      }
      setRijen((huidig) => huidig.filter((x) => x.id !== r.id));
    } finally {
      setVerwijderBezig(null);
    }
  }

  async function bekijkBestand(id: string) {
    if (gebruiker === "laden" || !gebruiker) return;
    const res = await fetch(`/api/upload/${id}/bestand`, {
      headers: { Authorization: `Bearer ${gebruiker.accessToken}` }
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Kon het bestand niet openen.");
      return;
    }
    window.open(json.url, "_blank");
  }

  if (gebruiker === "laden") return <p>Bezig met laden...</p>;
  if (!gebruiker) return null;

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Omzet toevoegen</h2>

        <div className="field">
          <label>Wat voeg je toe?</label>
          <select value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="factuur">Factuur</option>
            <option value="offerte">Offerte</option>
          </select>
        </div>

        <div className="field">
          <label>Categorie</label>
          <select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
            {opties.map((o) => (
              <option key={o} value={o}>
                {CATEGORIE_LABEL[o] || o}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>{type === "offerte" ? "Offertenummer" : "Verkooporder-/factuurnummer"}</label>
          <input
            value={nummer}
            onChange={(e) => setNummer(e.target.value)}
            placeholder="bv. 2026-0134"
          />
        </div>

        <div className="field">
          <label>Datum</label>
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </div>

        <div className="field">
          <label>Bedrag exclusief btw</label>
          <input
            value={bedrag}
            onChange={(e) => setBedrag(e.target.value)}
            placeholder="bv. 1234.56"
          />
        </div>

        <div className="field">
          <label>Notitie (optioneel)</label>
          <input
            value={notitie}
            onChange={(e) => setNotitie(e.target.value)}
            placeholder="bv. klantnaam"
          />
        </div>

        <div className="field">
          <label>Document (optioneel)</label>
          <div
            className={`dropzone${overDropzone ? " over" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setOverDropzone(true);
            }}
            onDragLeave={() => setOverDropzone(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOverDropzone(false);
              const f = e.dataTransfer.files?.[0];
              if (f) setBestand(f);
            }}
          >
            {bestand ? (
              <div>
                <strong>{bestand.name}</strong>
                <div style={{ fontSize: 12, marginTop: 4 }}>Klik om te vervangen</div>
              </div>
            ) : (
              <div>Sleep een PDF/foto hierheen, of klik om te kiezen (niet verplicht)</div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              style={{ display: "none" }}
              onChange={(e) => setBestand(e.target.files?.[0] || null)}
            />
          </div>
        </div>

        {fout && <div className="error">{fout}</div>}

        <div style={{ marginTop: 14 }}>
          <button className="btn primary" disabled={bezig} onClick={versturen}>
            {bezig ? "Bezig..." : "Toevoegen"}
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Laatste regels</h3>
        {rijen.length === 0 && <p style={{ color: "var(--tx3)" }}>Nog niets toegevoegd.</p>}
        {rijen.map((r) => (
          <div className="rij" key={r.id}>
            <div>
              <div>
                <strong>{r.nummer}</strong>{" "}
                <span style={{ color: "var(--tx3)" }}>
                  · {r.type} · {CATEGORIE_LABEL[r.categorie] || r.categorie} · {r.datum}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--tx3)" }}>
                {r.geupload_door_naam}
                {r.notitie ? ` · ${r.notitie}` : ""}
                {r.bestandsnaam ? (
                  <>
                    {" · "}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        bekijkBestand(r.id);
                      }}
                    >
                      {r.bestandsnaam}
                    </a>
                  </>
                ) : (
                  " · geen document"
                )}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{ fontWeight: 700, cursor: "pointer" }}
                onClick={() => bewerken(r)}
                title="Klik om te bewerken"
              >
                {r.bedrag_ex_btw !== null
                  ? `€ ${r.bedrag_ex_btw.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}`
                  : "— klik om in te vullen"}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <span className="badge">bewerken ✎</span>
                <span
                  className="badge"
                  style={{ cursor: "pointer", color: "var(--danger)" }}
                  onClick={() => verwijderen(r)}
                >
                  {verwijderBezig === r.id ? "bezig..." : "verwijderen 🗑"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

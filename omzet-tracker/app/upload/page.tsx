"use client";

import { useEffect, useRef, useState } from "react";
import { useGebruiker } from "@/lib/useGebruiker";

type Rij = {
  id: string;
  created_at: string;
  type: "offerte" | "factuur";
  categorie: "B2B" | "B2C" | "KMO";
  bedrag_ex_btw: number | null;
  bestandsnaam: string;
  status: "verwerkt" | "mislukt" | "handmatig";
  notitie: string | null;
  geupload_door_naam: string;
};

const CATEGORIE_LABEL: Record<string, string> = {
  B2B: "B2B",
  B2C: "B2C",
  KMO: "KMO project"
};

const CATEGORIEEN_PER_TYPE: Record<string, string[]> = {
  offerte: ["B2B", "B2C"],
  factuur: ["B2B", "B2C", "KMO"]
};

export default function UploadPagina() {
  const gebruiker = useGebruiker();
  const [modus, setModus] = useState<"bestand" | "handmatig">("bestand");
  const [type, setType] = useState<"offerte" | "factuur">("factuur");
  const [categorie, setCategorie] = useState("B2B");
  const [bestand, setBestand] = useState<File | null>(null);
  const [overDropzone, setOverDropzone] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [rijen, setRijen] = useState<Rij[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handmatige invoer (geen bestand)
  const [handmatigBedrag, setHandmatigBedrag] = useState("");
  const [handmatigNotitie, setHandmatigNotitie] = useState("");

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
    if (!bestand || gebruiker === "laden" || !gebruiker) return;
    setBezig(true);
    setFout(null);
    try {
      const form = new FormData();
      form.append("bestand", bestand);
      form.append("type", type);
      form.append("categorie", categorie);
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
      setBestand(null);
      if (inputRef.current) inputRef.current.value = "";
      await laadRijen();
    } finally {
      setBezig(false);
    }
  }

  async function versturenHandmatig() {
    if (gebruiker === "laden" || !gebruiker) return;
    const bedrag = parseFloat(handmatigBedrag.replace(",", "."));
    if (!Number.isFinite(bedrag) || bedrag < 0) {
      setFout("Vul een geldig bedrag in (bv. 1234.56).");
      return;
    }
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch("/api/manual-entry", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gebruiker.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          type,
          categorie,
          bedragExBtw: bedrag,
          notitie: handmatigNotitie || null
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setFout(json.error || "Er ging iets mis.");
        return;
      }
      setHandmatigBedrag("");
      setHandmatigNotitie("");
      await laadRijen();
    } finally {
      setBezig(false);
    }
  }

  async function corrigeerBedrag(id: string, huidig: number | null) {
    const invoer = window.prompt(
      "Bedrag exclusief btw (bv. 1234.56):",
      huidig !== null ? String(huidig) : ""
    );
    if (invoer === null || gebruiker === "laden" || !gebruiker) return;
    const bedrag = parseFloat(invoer.replace(",", "."));
    if (!Number.isFinite(bedrag)) return;
    await fetch(`/api/upload/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${gebruiker.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ bedragExBtw: bedrag })
    });
    await laadRijen();
  }

  if (gebruiker === "laden") return <p>Bezig met laden...</p>;
  if (!gebruiker) return null;

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Factuur of offerte toevoegen</h2>

        <div className="field">
          <label>Hoe wil je toevoegen?</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className={`btn${modus === "bestand" ? " primary" : ""}`}
              onClick={() => {
                setModus("bestand");
                setFout(null);
              }}
            >
              Bestand uploaden
            </button>
            <button
              type="button"
              className={`btn${modus === "handmatig" ? " primary" : ""}`}
              onClick={() => {
                setModus("handmatig");
                setFout(null);
              }}
            >
              Handmatig toevoegen
            </button>
          </div>
        </div>

        <div className="field">
          <label>Wat {modus === "handmatig" ? "voeg je toe" : "upload je"}?</label>
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

        {modus === "bestand" ? (
          <>
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
                <div>Sleep een PDF/foto hierheen, of klik om te kiezen</div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={(e) => setBestand(e.target.files?.[0] || null)}
              />
            </div>

            {fout && <div className="error">{fout}</div>}

            <div style={{ marginTop: 14 }}>
              <button className="btn primary" disabled={!bestand || bezig} onClick={versturen}>
                {bezig ? "Bezig met analyseren..." : "Uploaden & bedrag zoeken"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label>Bedrag exclusief btw</label>
              <input
                value={handmatigBedrag}
                onChange={(e) => setHandmatigBedrag(e.target.value)}
                placeholder="bv. 1234.56"
              />
            </div>
            <div className="field">
              <label>Notitie (optioneel)</label>
              <input
                value={handmatigNotitie}
                onChange={(e) => setHandmatigNotitie(e.target.value)}
                placeholder="bv. klantnaam of omschrijving"
              />
            </div>

            {fout && <div className="error">{fout}</div>}

            <div style={{ marginTop: 14 }}>
              <button
                className="btn primary"
                disabled={!handmatigBedrag || bezig}
                onClick={versturenHandmatig}
              >
                {bezig ? "Bezig..." : "Toevoegen"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Laatste uploads</h3>
        {rijen.length === 0 && <p style={{ color: "var(--tx3)" }}>Nog niets geüpload.</p>}
        {rijen.map((r) => (
          <div className="rij" key={r.id}>
            <div>
              <div>
                <strong>{r.bestandsnaam}</strong>{" "}
                <span style={{ color: "var(--tx3)" }}>
                  · {r.type} · {CATEGORIE_LABEL[r.categorie] || r.categorie}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "var(--tx3)" }}>
                {new Date(r.created_at).toLocaleDateString("nl-BE")} · {r.geupload_door_naam}
                {r.notitie ? ` · ${r.notitie}` : ""}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{ fontWeight: 700, cursor: "pointer" }}
                onClick={() => corrigeerBedrag(r.id, r.bedrag_ex_btw)}
                title="Klik om te corrigeren"
              >
                {r.bedrag_ex_btw !== null
                  ? `€ ${r.bedrag_ex_btw.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}`
                  : "— klik om in te vullen"}
              </div>
              <span className={`badge${r.status === "mislukt" ? " mislukt" : ""}`}>
                {r.status === "verwerkt"
                  ? "automatisch gevonden"
                  : r.status === "handmatig"
                  ? "handmatig ingevuld"
                  : "niet gevonden"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

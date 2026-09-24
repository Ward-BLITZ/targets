"use client";

import { useEffect, useState } from "react";
import { useGebruiker } from "@/lib/useGebruiker";

type Factuur = {
  id: string;
  nummer: string;
  datum: string;
  bedragExBtw: number;
  bestandsnaam: string | null;
  notitie: string | null;
  geuploadDoorNaam: string;
};

type Voortgang = {
  id: string;
  categorie: string;
  periode: string;
  doelBedrag: number;
  werkelijkBedrag: number;
  percentage: number;
  aantalFacturen: number;
  facturen: Factuur[];
};

const CATEGORIE_LABEL: Record<string, string> = {
  B2B: "B2B partners",
  B2C: "B2C",
  KMO: "KMO project"
};

// Uit het Doelstellingen-document (Aug-Dec 2026): persoonlijk omzetdoel
// € 275.000 ex btw, verdeeld B2B 50% / B2C 20% / KMO 30%.
const DOELSTELLINGEN_AUG_DEC_2026 = [
  { categorie: "B2B", periode: "2026-08_2026-12", doelBedrag: 137500 },
  { categorie: "B2C", periode: "2026-08_2026-12", doelBedrag: 55000 },
  { categorie: "KMO", periode: "2026-08_2026-12", doelBedrag: 82500 }
];

export default function TargetsPagina() {
  const gebruiker = useGebruiker();
  const [categorie, setCategorie] = useState("B2B");
  const [periode, setPeriode] = useState(String(new Date().getFullYear()));
  const [doelBedrag, setDoelBedrag] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [voortgang, setVoortgang] = useState<Voortgang[]>([]);
  const [opengeklapt, setOpengeklapt] = useState<string | null>(null);

  async function laadVoortgang() {
    if (gebruiker === "laden" || !gebruiker) return;
    const res = await fetch("/api/progress", {
      headers: { Authorization: `Bearer ${gebruiker.accessToken}` }
    });
    const json = await res.json();
    if (res.ok) setVoortgang(json.voortgang || []);
  }

  useEffect(() => {
    laadVoortgang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gebruiker]);

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    if (gebruiker === "laden" || !gebruiker) return;
    setFout(null);
    setBezig(true);
    try {
      const res = await fetch("/api/targets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gebruiker.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          categorie,
          periode,
          doelBedrag: parseFloat(doelBedrag.replace(",", "."))
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setFout(json.error || "Er ging iets mis.");
        return;
      }
      setDoelBedrag("");
      await laadVoortgang();
    } finally {
      setBezig(false);
    }
  }

  async function vulDoelstellingenIn() {
    if (gebruiker === "laden" || !gebruiker) return;
    setBezig(true);
    setFout(null);
    try {
      for (const t of DOELSTELLINGEN_AUG_DEC_2026) {
        const res = await fetch("/api/targets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${gebruiker.accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(t)
        });
        if (!res.ok) {
          const json = await res.json();
          setFout(json.error || "Er ging iets mis bij het invullen.");
          return;
        }
      }
      await laadVoortgang();
    } finally {
      setBezig(false);
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
        <h2 style={{ marginTop: 0 }}>Doelstellingen Aug - Dec 2026</h2>
        <p style={{ fontSize: 13, color: "var(--tx3)" }}>
          Vult in één klik de 3 targets uit het document in: B2B partners € 137.500 (50%), B2C
          € 55.000 (20%), KMO project € 82.500 (30%) — periode 2026-08 t/m 2026-12.
        </p>
        <button className="btn" type="button" disabled={bezig} onClick={vulDoelstellingenIn}>
          Vul deze doelen in
        </button>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Target instellen</h2>
        <p style={{ fontSize: 13, color: "var(--tx3)" }}>
          Periode-formaat: <code>2026</code> (heel jaar), <code>2026-Q1</code> (kwartaal),{" "}
          <code>2026-01</code> (maand), of een vrije reeks zoals <code>2026-08_2026-12</code>{" "}
          (augustus t/m december 2026).
        </p>
        <form onSubmit={opslaan}>
          <div className="field">
            <label>Categorie</label>
            <select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
              <option value="B2B">B2B partners</option>
              <option value="B2C">B2C</option>
              <option value="KMO">KMO project</option>
            </select>
          </div>
          <div className="field">
            <label>Periode</label>
            <input value={periode} onChange={(e) => setPeriode(e.target.value)} required />
          </div>
          <div className="field">
            <label>Doelbedrag (excl. btw)</label>
            <input
              value={doelBedrag}
              onChange={(e) => setDoelBedrag(e.target.value)}
              placeholder="bv. 250000"
              required
            />
          </div>
          {fout && <div className="error">{fout}</div>}
          <button className="btn primary" type="submit" disabled={bezig}>
            {bezig ? "Bezig..." : "Opslaan"}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Voortgang</h3>
        <p style={{ fontSize: 12, color: "var(--tx3)", marginTop: -6 }}>
          Klik op een target om de facturen/orders te zien die meetellen.
        </p>
        {voortgang.length === 0 && (
          <p style={{ color: "var(--tx3)" }}>Nog geen targets ingesteld.</p>
        )}
        {voortgang.map((v) => (
          <div key={v.id} style={{ marginBottom: 16 }}>
            <div
              className="rij"
              style={{ border: "none", padding: "0 0 4px", cursor: "pointer" }}
              onClick={() => setOpengeklapt(opengeklapt === v.id ? null : v.id)}
            >
              <span>
                <strong>{CATEGORIE_LABEL[v.categorie] || v.categorie}</strong> · {v.periode}{" "}
                <span style={{ color: "var(--tx3)", fontSize: 12 }}>
                  {opengeklapt === v.id ? "▲" : "▼"}
                </span>
              </span>
              <span>
                € {v.werkelijkBedrag.toLocaleString("nl-BE", { maximumFractionDigits: 0 })} / €{" "}
                {v.doelBedrag.toLocaleString("nl-BE", { maximumFractionDigits: 0 })} (
                {v.percentage}%)
              </span>
            </div>
            <div className="progress-outer">
              <div
                className="progress-inner"
                style={{ width: `${Math.min(100, v.percentage)}%` }}
              />
            </div>
            <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 3 }}>
              {v.aantalFacturen} factu{v.aantalFacturen === 1 ? "ur" : "ren"} meegeteld
            </div>

            {opengeklapt === v.id && (
              <div style={{ marginTop: 10, background: "var(--bg2)", borderRadius: 8, padding: "8px 12px" }}>
                {v.facturen.length === 0 && (
                  <p style={{ color: "var(--tx3)", fontSize: 13, margin: "4px 0" }}>
                    Geen facturen binnen deze periode.
                  </p>
                )}
                {v.facturen.map((f) => (
                  <div className="rij" key={f.id} style={{ padding: "8px 0" }}>
                    <div>
                      <strong>{f.nummer}</strong>{" "}
                      <span style={{ color: "var(--tx3)", fontSize: 12 }}>
                        · {f.datum} · {f.geuploadDoorNaam}
                        {f.notitie ? ` · ${f.notitie}` : ""}
                      </span>
                      {f.bestandsnaam && (
                        <>
                          {" · "}
                          <a
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              bekijkBestand(f.id);
                            }}
                          >
                            {f.bestandsnaam}
                          </a>
                        </>
                      )}
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      € {f.bedragExBtw.toLocaleString("nl-BE", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

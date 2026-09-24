"use client";

import { useEffect, useMemo, useState } from "react";
import { useGebruiker } from "@/lib/useGebruiker";
import { isoWeekLabel, isoWeekStart } from "@/lib/week";

type Call = {
  id: string;
  datum: string;
  naam: string;
  kwalitatief: boolean;
  minuten: number;
  visit: "ja" | "nee" | "te_bevestigen";
};

type Visit = {
  id: string;
  datum: string;
  bedrijfsnaam: string;
  type: "nieuw" | "bestaand" | "groothandel" | "b2c";
  notitie: string | null;
};

type Doel = { metriek: string; doel_per_week: number };

const TYPE_LABEL: Record<string, string> = {
  nieuw: "Nieuwe installateur",
  bestaand: "Bestaande partner",
  groothandel: "Groothandel",
  b2c: "B2C-lead"
};

function vandaag() {
  return new Date().toISOString().slice(0, 10);
}

export default function ActiviteitPagina() {
  const gebruiker = useGebruiker();

  const [doelenKwalitatief, setDoelenKwalitatief] = useState("30");
  const [doelenVisits, setDoelenVisits] = useState("8");
  const [doelenOffertes, setDoelenOffertes] = useState("10");
  const [doelenBezig, setDoelenBezig] = useState(false);
  const [doelenFout, setDoelenFout] = useState<string | null>(null);

  const [calls, setCalls] = useState<Call[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [offerteDatums, setOfferteDatums] = useState<string[]>([]);

  // Call-formulier
  const [callDatum, setCallDatum] = useState(vandaag());
  const [callNaam, setCallNaam] = useState("");
  const [callKwalitatief, setCallKwalitatief] = useState("nee");
  const [callMinuten, setCallMinuten] = useState("");
  const [callVisit, setCallVisit] = useState<"ja" | "nee" | "te_bevestigen">("nee");
  const [callBezig, setCallBezig] = useState(false);
  const [callFout, setCallFout] = useState<string | null>(null);

  // Visit-formulier
  const [visitDatum, setVisitDatum] = useState(vandaag());
  const [visitBedrijf, setVisitBedrijf] = useState("");
  const [visitType, setVisitType] = useState<"nieuw" | "bestaand" | "groothandel" | "b2c">("nieuw");
  const [visitNotitie, setVisitNotitie] = useState("");
  const [visitBezig, setVisitBezig] = useState(false);
  const [visitFout, setVisitFout] = useState<string | null>(null);

  async function laadAlles() {
    if (gebruiker === "laden" || !gebruiker) return;
    const headers = { Authorization: `Bearer ${gebruiker.accessToken}` };
    const [doelenRes, callsRes, visitsRes, offertesRes] = await Promise.all([
      fetch("/api/activiteit/doelen", { headers }),
      fetch("/api/calls", { headers }),
      fetch("/api/visits", { headers }),
      fetch("/api/activiteit/offertes", { headers })
    ]);
    const doelenJson = await doelenRes.json();
    const callsJson = await callsRes.json();
    const visitsJson = await visitsRes.json();
    const offertesJson = await offertesRes.json();

    if (doelenRes.ok) {
      const doelen: Doel[] = doelenJson.doelen || [];
      const vind = (m: string) => doelen.find((d) => d.metriek === m)?.doel_per_week;
      if (vind("calls_kwalitatief") !== undefined) setDoelenKwalitatief(String(vind("calls_kwalitatief")));
      if (vind("visits") !== undefined) setDoelenVisits(String(vind("visits")));
      if (vind("offertes") !== undefined) setDoelenOffertes(String(vind("offertes")));
    }
    if (callsRes.ok) setCalls(callsJson.rijen || []);
    if (visitsRes.ok) setVisits(visitsJson.rijen || []);
    if (offertesRes.ok) setOfferteDatums(offertesJson.datums || []);
  }

  useEffect(() => {
    laadAlles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gebruiker]);

  async function doelenOpslaan() {
    if (gebruiker === "laden" || !gebruiker) return;
    setDoelenFout(null);
    setDoelenBezig(true);
    try {
      const items = [
        { metriek: "calls_kwalitatief", doelPerWeek: parseInt(doelenKwalitatief, 10) || 0 },
        { metriek: "visits", doelPerWeek: parseInt(doelenVisits, 10) || 0 },
        { metriek: "offertes", doelPerWeek: parseInt(doelenOffertes, 10) || 0 }
      ];
      for (const item of items) {
        const res = await fetch("/api/activiteit/doelen", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${gebruiker.accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(item)
        });
        if (!res.ok) {
          const json = await res.json();
          setDoelenFout(json.error || "Er ging iets mis.");
          return;
        }
      }
    } finally {
      setDoelenBezig(false);
    }
  }

  async function callToevoegen() {
    if (gebruiker === "laden" || !gebruiker) return;
    setCallFout(null);
    if (!callNaam.trim()) {
      setCallFout("Naam is verplicht.");
      return;
    }
    const minutenGetal = parseFloat(callMinuten.replace(",", "."));
    if (!Number.isFinite(minutenGetal) || minutenGetal < 0) {
      setCallFout("Vul een geldig aantal minuten in.");
      return;
    }
    setCallBezig(true);
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gebruiker.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          datum: callDatum,
          naam: callNaam.trim(),
          kwalitatief: callKwalitatief === "ja",
          minuten: minutenGetal,
          visit: callVisit
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setCallFout(json.error || "Er ging iets mis.");
        return;
      }
      setCallNaam("");
      setCallMinuten("");
      setCallKwalitatief("nee");
      setCallVisit("nee");
      setCallDatum(vandaag());
      await laadAlles();
    } finally {
      setCallBezig(false);
    }
  }

  async function visitToevoegen() {
    if (gebruiker === "laden" || !gebruiker) return;
    setVisitFout(null);
    if (!visitBedrijf.trim()) {
      setVisitFout("Bedrijfsnaam is verplicht.");
      return;
    }
    setVisitBezig(true);
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${gebruiker.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          datum: visitDatum,
          bedrijfsnaam: visitBedrijf.trim(),
          type: visitType,
          notitie: visitNotitie.trim() || undefined
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setVisitFout(json.error || "Er ging iets mis.");
        return;
      }
      setVisitBedrijf("");
      setVisitNotitie("");
      setVisitDatum(vandaag());
      await laadAlles();
    } finally {
      setVisitBezig(false);
    }
  }

  async function bevestigVisit(call: Call, resultaat: "ja" | "nee") {
    if (gebruiker === "laden" || !gebruiker) return;
    await fetch(`/api/calls/${call.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${gebruiker.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ visit: resultaat })
    });
    await laadAlles();
  }

  async function callVerwijderen(id: string) {
    if (gebruiker === "laden" || !gebruiker) return;
    if (!window.confirm("Deze call verwijderen?")) return;
    await fetch(`/api/calls/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${gebruiker.accessToken}` }
    });
    await laadAlles();
  }

  async function visitVerwijderen(id: string) {
    if (gebruiker === "laden" || !gebruiker) return;
    if (!window.confirm("Dit bezoek verwijderen?")) return;
    await fetch(`/api/visits/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${gebruiker.accessToken}` }
    });
    await laadAlles();
  }

  const teBevestigen = useMemo(() => calls.filter((c) => c.visit === "te_bevestigen"), [calls]);

  const weekOverzicht = useMemo(() => {
    type WeekData = {
      week: string;
      weekStart: string;
      callsTotaal: number;
      callsKwalitatief: number;
      minutenTotaal: number;
      visitsJa: number;
      visitsNee: number;
      teBevestigen: number;
      bezoeken: number;
      offertes: number;
    };
    const map = new Map<string, WeekData>();

    function pak(datum: string): WeekData {
      const week = isoWeekLabel(datum);
      if (!map.has(week)) {
        map.set(week, {
          week,
          weekStart: isoWeekStart(datum),
          callsTotaal: 0,
          callsKwalitatief: 0,
          minutenTotaal: 0,
          visitsJa: 0,
          visitsNee: 0,
          teBevestigen: 0,
          bezoeken: 0,
          offertes: 0
        });
      }
      return map.get(week)!;
    }

    for (const c of calls) {
      const w = pak(c.datum);
      w.callsTotaal += 1;
      if (c.kwalitatief) w.callsKwalitatief += 1;
      w.minutenTotaal += Number(c.minuten) || 0;
      if (c.visit === "ja") w.visitsJa += 1;
      else if (c.visit === "nee") w.visitsNee += 1;
      else w.teBevestigen += 1;
    }
    for (const v of visits) {
      const w = pak(v.datum);
      w.bezoeken += 1;
    }
    for (const d of offerteDatums) {
      const w = pak(d);
      w.offertes += 1;
    }

    return Array.from(map.values())
      .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1))
      .slice(0, 10);
  }, [calls, visits, offerteDatums]);

  const doelKwalitatiefNum = parseInt(doelenKwalitatief, 10) || 0;
  const doelVisitsNum = parseInt(doelenVisits, 10) || 0;
  const doelOffertesNum = parseInt(doelenOffertes, 10) || 0;

  if (gebruiker === "laden") return <p>Bezig met laden...</p>;
  if (!gebruiker) return null;

  return (
    <div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Weekdoelen</h2>
        <p style={{ fontSize: 13, color: "var(--tx3)" }}>
          Deze doelen gelden voor elke week (geen einddatum), zoals in het Doelstellingen-document.
        </p>
        <div className="field">
          <label>Kwalitatieve calls per week</label>
          <input value={doelenKwalitatief} onChange={(e) => setDoelenKwalitatief(e.target.value)} />
        </div>
        <div className="field">
          <label>Visits per week</label>
          <input value={doelenVisits} onChange={(e) => setDoelenVisits(e.target.value)} />
        </div>
        <div className="field">
          <label>Offertes per week</label>
          <input value={doelenOffertes} onChange={(e) => setDoelenOffertes(e.target.value)} />
        </div>
        {doelenFout && <div className="error">{doelenFout}</div>}
        <button className="btn primary" disabled={doelenBezig} onClick={doelenOpslaan}>
          {doelenBezig ? "Bezig..." : "Doelen opslaan"}
        </button>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Call toevoegen</h2>
        <div className="field">
          <label>Datum</label>
          <input type="date" value={callDatum} onChange={(e) => setCallDatum(e.target.value)} />
        </div>
        <div className="field">
          <label>Naam</label>
          <input
            value={callNaam}
            onChange={(e) => setCallNaam(e.target.value)}
            placeholder="bv. Jan Peeters (installateur X)"
          />
        </div>
        <div className="field">
          <label>Kwalitatief?</label>
          <select value={callKwalitatief} onChange={(e) => setCallKwalitatief(e.target.value)}>
            <option value="ja">Ja</option>
            <option value="nee">Nee (bv. voicemail)</option>
          </select>
        </div>
        <div className="field">
          <label>Aantal minuten gebeld</label>
          <input value={callMinuten} onChange={(e) => setCallMinuten(e.target.value)} placeholder="bv. 4" />
        </div>
        <div className="field">
          <label>Visit?</label>
          <select value={callVisit} onChange={(e) => setCallVisit(e.target.value as any)}>
            <option value="ja">Ja</option>
            <option value="nee">Nee</option>
            <option value="te_bevestigen">Te bevestigen</option>
          </select>
        </div>
        {callFout && <div className="error">{callFout}</div>}
        <button className="btn primary" disabled={callBezig} onClick={callToevoegen}>
          {callBezig ? "Bezig..." : "Call toevoegen"}
        </button>
      </div>

      {teBevestigen.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Nog te bevestigen visits</h3>
          {teBevestigen.map((c) => (
            <div className="rij" key={c.id}>
              <div>
                <strong>{c.naam}</strong>{" "}
                <span style={{ color: "var(--tx3)" }}>· {c.datum}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => bevestigVisit(c, "ja")}>
                  Ging door
                </button>
                <button className="btn" onClick={() => bevestigVisit(c, "nee")}>
                  Ging niet door
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Visit toevoegen</h2>
        <div className="field">
          <label>Datum</label>
          <input type="date" value={visitDatum} onChange={(e) => setVisitDatum(e.target.value)} />
        </div>
        <div className="field">
          <label>Bedrijfsnaam</label>
          <input value={visitBedrijf} onChange={(e) => setVisitBedrijf(e.target.value)} />
        </div>
        <div className="field">
          <label>Type bezoek</label>
          <select value={visitType} onChange={(e) => setVisitType(e.target.value as any)}>
            <option value="nieuw">Nieuwe installateur</option>
            <option value="bestaand">Bestaande partner</option>
            <option value="groothandel">Groothandel</option>
            <option value="b2c">B2C-lead</option>
          </select>
        </div>
        <div className="field">
          <label>Notitie (optioneel)</label>
          <input value={visitNotitie} onChange={(e) => setVisitNotitie(e.target.value)} />
        </div>
        {visitFout && <div className="error">{visitFout}</div>}
        <button className="btn primary" disabled={visitBezig} onClick={visitToevoegen}>
          {visitBezig ? "Bezig..." : "Visit toevoegen"}
        </button>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Overzicht per week</h3>
        {weekOverzicht.length === 0 && (
          <p style={{ color: "var(--tx3)" }}>Nog geen calls, visits of offertes geregistreerd.</p>
        )}
        {weekOverzicht.map((w) => {
          const bevestigd = w.visitsJa + w.visitsNee;
          const conversie = bevestigd > 0 ? Math.round((w.visitsJa / bevestigd) * 100) : null;
          const gemMinuten = w.callsTotaal > 0 ? Math.round((w.minutenTotaal / w.callsTotaal) * 10) / 10 : 0;
          return (
            <div key={w.week} style={{ marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                Week van {w.weekStart} ({w.week})
              </div>
              <div style={{ fontSize: 13, color: "var(--tx2)", lineHeight: 1.7 }}>
                Calls: {w.callsTotaal} — waarvan kwalitatief: {w.callsKwalitatief}/{doelKwalitatiefNum || "?"}{" "}
                (gem. {gemMinuten} min)
                <br />
                Visits uit calls: {w.visitsJa} ja-antwoord uit {bevestigd} bevestigd
                {conversie !== null ? ` (${conversie}% conversie)` : ""}
                {w.teBevestigen > 0 ? `, nog ${w.teBevestigen} te bevestigen` : ""}
                <br />
                Bezoeken gelogd: {w.bezoeken}/{doelVisitsNum || "?"}
                <br />
                Offertes verstuurd: {w.offertes}/{doelOffertesNum || "?"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Laatste calls</h3>
        {calls.length === 0 && <p style={{ color: "var(--tx3)" }}>Nog geen calls.</p>}
        {calls.slice(0, 25).map((c) => (
          <div className="rij" key={c.id}>
            <div>
              <strong>{c.naam}</strong>{" "}
              <span style={{ color: "var(--tx3)" }}>
                · {c.datum} · {c.kwalitatief ? "kwalitatief" : "niet-kwalitatief"} · {c.minuten} min · visit:{" "}
                {c.visit === "te_bevestigen" ? "te bevestigen" : c.visit}
              </span>
            </div>
            <span
              className="badge"
              style={{ cursor: "pointer", color: "var(--danger)" }}
              onClick={() => callVerwijderen(c.id)}
            >
              verwijderen 🗑
            </span>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Laatste visits</h3>
        {visits.length === 0 && <p style={{ color: "var(--tx3)" }}>Nog geen visits.</p>}
        {visits.slice(0, 25).map((v) => (
          <div className="rij" key={v.id}>
            <div>
              <strong>{v.bedrijfsnaam}</strong>{" "}
              <span style={{ color: "var(--tx3)" }}>
                · {v.datum} · {TYPE_LABEL[v.type] || v.type}
                {v.notitie ? ` · ${v.notitie}` : ""}
              </span>
            </div>
            <span
              className="badge"
              style={{ cursor: "pointer", color: "var(--danger)" }}
              onClick={() => visitVerwijderen(v.id)}
            >
              verwijderen 🗑
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

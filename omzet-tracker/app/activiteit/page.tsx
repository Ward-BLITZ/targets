"use client";

import { useEffect, useMemo, useState } from "react";
import { useGebruiker } from "@/lib/useGebruiker";
import { isoWeekLabel, maandagVanWeek, weekEindDatum } from "@/lib/week";

type Call = {
  id: string;
  datum: string;
  naam: string;
  categorie: "B2B" | "B2C";
  kwalitatief: boolean;
  niet_kwalitatief_reden: string | null;
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

function eersteDagVanMaand() {
  const nu = new Date();
  return new Date(Date.UTC(nu.getFullYear(), nu.getMonth(), 1)).toISOString().slice(0, 10);
}

function eersteDagVanJaar() {
  const nu = new Date();
  return new Date(Date.UTC(nu.getFullYear(), 0, 1)).toISOString().slice(0, 10);
}

function ProgressBalk({ waarde, doel }: { waarde: number; doel: number }) {
  const pct = doel > 0 ? Math.min(100, Math.round((waarde / doel) * 100)) : 0;
  return (
    <div className="progress-outer" style={{ marginTop: 4, marginBottom: 2 }}>
      <div className="progress-inner" style={{ width: `${pct}%` }} />
    </div>
  );
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

  const [weekOffset, setWeekOffset] = useState(0);

  const [totalenModus, setTotalenModus] = useState<"maand" | "jaar" | "aangepast">("maand");
  const [aangepastStart, setAangepastStart] = useState(eersteDagVanMaand());
  const [aangepastEind, setAangepastEind] = useState(vandaag());

  // Call-formulier
  const [callDatum, setCallDatum] = useState(vandaag());
  const [callNaam, setCallNaam] = useState("");
  const [callCategorie, setCallCategorie] = useState<"B2B" | "B2C">("B2B");
  const [callKwalitatief, setCallKwalitatief] = useState("nee");
  const [callRedenType, setCallRedenType] = useState<"voicemail" | "andere">("voicemail");
  const [callRedenAnders, setCallRedenAnders] = useState("");
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
    let nietKwalitatiefReden: string | undefined;
    if (callKwalitatief === "nee") {
      if (callRedenType === "andere") {
        if (!callRedenAnders.trim()) {
          setCallFout("Vul in wat de andere reden was.");
          return;
        }
        nietKwalitatiefReden = callRedenAnders.trim();
      } else {
        nietKwalitatiefReden = "Voicemail";
      }
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
          categorie: callCategorie,
          kwalitatief: callKwalitatief === "ja",
          nietKwalitatiefReden,
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
      setCallRedenType("voicemail");
      setCallRedenAnders("");
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

  const doelKwalitatiefNum = parseInt(doelenKwalitatief, 10) || 0;
  const doelVisitsNum = parseInt(doelenVisits, 10) || 0;
  const doelOffertesNum = parseInt(doelenOffertes, 10) || 0;

  // Statistieken voor één specifieke week, aan de hand van het aantal weken
  // terug (weekOffset). offset 0 = huidige week.
  const weekData = useMemo(() => {
    const weekStart = maandagVanWeek(weekOffset);
    const weekEind = weekEindDatum(weekStart);
    const binnen = (d: string) => d >= weekStart && d < weekEind;

    const callsWeek = calls.filter((c) => binnen(c.datum));
    const visitsWeek = visits.filter((v) => binnen(v.datum));
    const offertesWeek = offerteDatums.filter((d) => binnen(d));

    const callsKwalitatief = callsWeek.filter((c) => c.kwalitatief).length;
    const minutenTotaal = callsWeek.reduce((som, c) => som + (Number(c.minuten) || 0), 0);
    const visitsJa = callsWeek.filter((c) => c.visit === "ja").length;
    const visitsNee = callsWeek.filter((c) => c.visit === "nee").length;
    const visitsTeBevestigen = callsWeek.filter((c) => c.visit === "te_bevestigen").length;

    return {
      weekStart,
      weekEind,
      label: isoWeekLabel(weekStart),
      callsTotaal: callsWeek.length,
      callsKwalitatief,
      minutenTotaal,
      gemMinuten: callsWeek.length > 0 ? Math.round((minutenTotaal / callsWeek.length) * 10) / 10 : 0,
      visitsJa,
      visitsNee,
      visitsTeBevestigen,
      bezoeken: visitsWeek.length,
      offertes: offertesWeek.length
    };
  }, [calls, visits, offerteDatums, weekOffset]);

  // Totalen over een periode (deze maand / dit jaar / aangepaste periode).
  const totalenPeriode = useMemo(() => {
    let start: string;
    let eind: string; // exclusief
    if (totalenModus === "maand") {
      start = eersteDagVanMaand();
      const nu = new Date();
      eind = new Date(Date.UTC(nu.getFullYear(), nu.getMonth() + 1, 1)).toISOString().slice(0, 10);
    } else if (totalenModus === "jaar") {
      start = eersteDagVanJaar();
      const nu = new Date();
      eind = new Date(Date.UTC(nu.getFullYear() + 1, 0, 1)).toISOString().slice(0, 10);
    } else {
      start = aangepastStart;
      const d = new Date(aangepastEind + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + 1);
      eind = d.toISOString().slice(0, 10);
    }
    const binnen = (d: string) => d >= start && d < eind;

    const callsP = calls.filter((c) => binnen(c.datum));
    const visitsP = visits.filter((v) => binnen(v.datum));
    const offertesP = offerteDatums.filter((d) => binnen(d));
    const minutenTotaal = callsP.reduce((som, c) => som + (Number(c.minuten) || 0), 0);

    return {
      start,
      eindWeergave:
        totalenModus === "aangepast"
          ? aangepastEind
          : new Date(new Date(eind).getTime() - 86400000).toISOString().slice(0, 10),
      callsTotaal: callsP.length,
      callsB2B: callsP.filter((c) => c.categorie === "B2B").length,
      callsB2C: callsP.filter((c) => c.categorie === "B2C").length,
      callsKwalitatief: callsP.filter((c) => c.kwalitatief).length,
      gemMinuten: callsP.length > 0 ? Math.round((minutenTotaal / callsP.length) * 10) / 10 : 0,
      visitsJa: callsP.filter((c) => c.visit === "ja").length,
      visitsNee: callsP.filter((c) => c.visit === "nee").length,
      visitsTeBevestigen: callsP.filter((c) => c.visit === "te_bevestigen").length,
      bezoeken: visitsP.length,
      offertes: offertesP.length
    };
  }, [calls, visits, offerteDatums, totalenModus, aangepastStart, aangepastEind]);

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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <button className="btn" onClick={() => setWeekOffset((o) => o + 1)}>
            ← Vorige week
          </button>
          <h3 style={{ margin: 0 }}>
            Week van {weekData.weekStart} ({weekData.label})
          </h3>
          <button className="btn" disabled={weekOffset === 0} onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}>
            Volgende week →
          </button>
        </div>
        {weekOffset === 0 && (
          <p style={{ fontSize: 12, color: "var(--tx3)", textAlign: "center", marginTop: 0 }}>Huidige week</p>
        )}

        <div style={{ fontSize: 13, color: "var(--tx2)" }}>
          <div>
            Kwalitatieve calls: {weekData.callsKwalitatief} / {doelKwalitatiefNum}{" "}
            <span style={{ color: "var(--tx3)" }}>
              ({weekData.callsTotaal} calls totaal, gem. {weekData.gemMinuten} min)
            </span>
          </div>
          <ProgressBalk waarde={weekData.callsKwalitatief} doel={doelKwalitatiefNum} />

          <div style={{ marginTop: 10 }}>
            Visits: {weekData.bezoeken} / {doelVisitsNum}{" "}
            <span style={{ color: "var(--tx3)" }}>
              (uit calls: {weekData.visitsJa} ja, {weekData.visitsNee} nee
              {weekData.visitsTeBevestigen > 0 ? `, ${weekData.visitsTeBevestigen} te bevestigen` : ""})
            </span>
          </div>
          <ProgressBalk waarde={weekData.bezoeken} doel={doelVisitsNum} />

          <div style={{ marginTop: 10 }}>
            Offertes: {weekData.offertes} / {doelOffertesNum}
          </div>
          <ProgressBalk waarde={weekData.offertes} doel={doelOffertesNum} />
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Totalen</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button
            className={`btn${totalenModus === "maand" ? " primary" : ""}`}
            onClick={() => setTotalenModus("maand")}
          >
            Deze maand
          </button>
          <button
            className={`btn${totalenModus === "jaar" ? " primary" : ""}`}
            onClick={() => setTotalenModus("jaar")}
          >
            Dit jaar
          </button>
          <button
            className={`btn${totalenModus === "aangepast" ? " primary" : ""}`}
            onClick={() => setTotalenModus("aangepast")}
          >
            Aangepaste periode
          </button>
        </div>

        {totalenModus === "aangepast" && (
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Van</label>
              <input type="date" value={aangepastStart} onChange={(e) => setAangepastStart(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Tot en met</label>
              <input type="date" value={aangepastEind} onChange={(e) => setAangepastEind(e.target.value)} />
            </div>
          </div>
        )}

        <p style={{ fontSize: 12, color: "var(--tx3)", marginTop: -6 }}>
          Periode: {totalenPeriode.start} t/m {totalenPeriode.eindWeergave}
        </p>

        <div style={{ fontSize: 13, color: "var(--tx2)", lineHeight: 1.9 }}>
          Calls totaal: <strong>{totalenPeriode.callsTotaal}</strong> (B2B: {totalenPeriode.callsB2B}, B2C:{" "}
          {totalenPeriode.callsB2C}) — waarvan kwalitatief: <strong>{totalenPeriode.callsKwalitatief}</strong> (gem.{" "}
          {totalenPeriode.gemMinuten} min)
          <br />
          Visits uit calls: <strong>{totalenPeriode.visitsJa}</strong> ja, {totalenPeriode.visitsNee} nee
          {totalenPeriode.visitsTeBevestigen > 0 ? `, ${totalenPeriode.visitsTeBevestigen} te bevestigen` : ""}
          <br />
          Bezoeken gelogd: <strong>{totalenPeriode.bezoeken}</strong>
          <br />
          Offertes verstuurd: <strong>{totalenPeriode.offertes}</strong>
        </div>
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
          <label>Categorie</label>
          <select value={callCategorie} onChange={(e) => setCallCategorie(e.target.value as any)}>
            <option value="B2B">B2B</option>
            <option value="B2C">B2C</option>
          </select>
        </div>
        <div className="field">
          <label>Kwalitatief?</label>
          <select value={callKwalitatief} onChange={(e) => setCallKwalitatief(e.target.value)}>
            <option value="ja">Ja</option>
            <option value="nee">Nee</option>
          </select>
        </div>
        {callKwalitatief === "nee" && (
          <>
            <div className="field">
              <label>Reden</label>
              <select value={callRedenType} onChange={(e) => setCallRedenType(e.target.value as any)}>
                <option value="voicemail">Voicemail</option>
                <option value="andere">Andere</option>
              </select>
            </div>
            {callRedenType === "andere" && (
              <div className="field">
                <label>Welke reden?</label>
                <input
                  value={callRedenAnders}
                  onChange={(e) => setCallRedenAnders(e.target.value)}
                  placeholder="bv. niet opgenomen, verkeerd nummer, ..."
                />
              </div>
            )}
          </>
        )}
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
                <span style={{ color: "var(--tx3)" }}>· {c.datum} · {c.categorie}</span>
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
        <h3 style={{ marginTop: 0 }}>Laatste calls</h3>
        {calls.length === 0 && <p style={{ color: "var(--tx3)" }}>Nog geen calls.</p>}
        {calls.slice(0, 25).map((c) => (
          <div className="rij" key={c.id}>
            <div>
              <strong>{c.naam}</strong>{" "}
              <span style={{ color: "var(--tx3)" }}>
                · {c.datum} · {c.categorie} ·{" "}
                {c.kwalitatief ? "kwalitatief" : `niet-kwalitatief (${c.niet_kwalitatief_reden || "onbekend"})`} ·{" "}
                {c.minuten} min · visit: {c.visit === "te_bevestigen" ? "te bevestigen" : c.visit}
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

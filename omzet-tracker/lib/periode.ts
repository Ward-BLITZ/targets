// Zet een periode-string om naar een datumbereik voor het optellen van omzet.
// Ondersteunde formaten:
//   "2026"                -> heel jaar 2026
//   "2026-Q1"             -> eerste kwartaal 2026 (Q1..Q4)
//   "2026-01"             -> januari 2026 (01..12)
//   "2026-08_2026-12"     -> vrije reeks: augustus t/m december 2026 (start_eind, beide inbegrepen)

export type PeriodeBereik = { start: Date; eind: Date; label: string };

export function periodeNaarBereik(periode: string): PeriodeBereik | null {
  const reeksMatch = periode.match(/^(\d{4})-(\d{2})_(\d{4})-(\d{2})$/);
  if (reeksMatch) {
    const startJaar = parseInt(reeksMatch[1], 10);
    const startMaand = parseInt(reeksMatch[2], 10);
    const eindJaar = parseInt(reeksMatch[3], 10);
    const eindMaand = parseInt(reeksMatch[4], 10);
    if (startMaand < 1 || startMaand > 12 || eindMaand < 1 || eindMaand > 12) return null;
    return {
      start: new Date(Date.UTC(startJaar, startMaand - 1, 1)),
      eind: new Date(Date.UTC(eindJaar, eindMaand, 1)), // eind-maand telt volledig mee
      label: periode
    };
  }

  const jaarMatch = periode.match(/^(\d{4})$/);
  if (jaarMatch) {
    const jaar = parseInt(jaarMatch[1], 10);
    return {
      start: new Date(Date.UTC(jaar, 0, 1)),
      eind: new Date(Date.UTC(jaar + 1, 0, 1)),
      label: periode
    };
  }

  const kwartaalMatch = periode.match(/^(\d{4})-Q([1-4])$/i);
  if (kwartaalMatch) {
    const jaar = parseInt(kwartaalMatch[1], 10);
    const kwartaal = parseInt(kwartaalMatch[2], 10);
    const startMaand = (kwartaal - 1) * 3;
    return {
      start: new Date(Date.UTC(jaar, startMaand, 1)),
      eind: new Date(Date.UTC(jaar, startMaand + 3, 1)),
      label: periode.toUpperCase()
    };
  }

  const maandMatch = periode.match(/^(\d{4})-(\d{2})$/);
  if (maandMatch) {
    const jaar = parseInt(maandMatch[1], 10);
    const maand = parseInt(maandMatch[2], 10); // 1-12
    if (maand < 1 || maand > 12) return null;
    return {
      start: new Date(Date.UTC(jaar, maand - 1, 1)),
      eind: new Date(Date.UTC(jaar, maand, 1)),
      label: periode
    };
  }

  return null;
}

export function geldigePeriode(periode: string): boolean {
  return periodeNaarBereik(periode) !== null;
}

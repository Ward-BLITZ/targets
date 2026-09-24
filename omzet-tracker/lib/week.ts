// Kleine helpers om datums (YYYY-MM-DD) per week te groeperen en om per week
// heen en weer te kunnen navigeren op de Activiteit-pagina.

export function isoWeekLabel(datumStr: string): string {
  const d = new Date(datumStr + "T00:00:00Z");
  const dagNr = (d.getUTCDay() + 6) % 7; // maandag = 0
  const donderdag = new Date(d);
  donderdag.setUTCDate(d.getUTCDate() - dagNr + 3);
  const jaarStart = new Date(Date.UTC(donderdag.getUTCFullYear(), 0, 1));
  const weekNr = Math.ceil(((donderdag.getTime() - jaarStart.getTime()) / 86400000 + 1) / 7);
  return `${donderdag.getUTCFullYear()}-W${String(weekNr).padStart(2, "0")}`;
}

// Eerste dag (maandag) van de week waarin deze datum valt.
export function isoWeekStart(datumStr: string): string {
  const d = new Date(datumStr + "T00:00:00Z");
  const dagNr = (d.getUTCDay() + 6) % 7;
  const maandag = new Date(d);
  maandag.setUTCDate(d.getUTCDate() - dagNr);
  return maandag.toISOString().slice(0, 10);
}

// Maandag van de week die "offsetWeken" weken vóór de huidige week ligt.
// offset 0 = maandag van deze week, 1 = maandag van vorige week, enz.
export function maandagVanWeek(offsetWeken: number): string {
  const nu = new Date();
  const vandaagUTC = new Date(Date.UTC(nu.getFullYear(), nu.getMonth(), nu.getDate()));
  const dagNr = (vandaagUTC.getUTCDay() + 6) % 7;
  const huidigeMaandag = new Date(vandaagUTC);
  huidigeMaandag.setUTCDate(vandaagUTC.getUTCDate() - dagNr);
  huidigeMaandag.setUTCDate(huidigeMaandag.getUTCDate() - offsetWeken * 7);
  return huidigeMaandag.toISOString().slice(0, 10);
}

// Eerste dag ná deze week (exclusieve bovengrens, voor datum < weekEind).
export function weekEindDatum(weekStartStr: string): string {
  const d = new Date(weekStartStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function huidigeWeekLabel(): string {
  return isoWeekLabel(new Date().toISOString().slice(0, 10));
}

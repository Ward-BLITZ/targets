// Kleine helper om datums (YYYY-MM-DD) te groeperen per ISO-week
// (maandag t/m zondag), zodat de activiteiten-pagina "per week" kan tonen.

export function isoWeekLabel(datumStr: string): string {
  const d = new Date(datumStr + "T00:00:00Z");
  const dagNr = (d.getUTCDay() + 6) % 7; // maandag = 0
  const donderdag = new Date(d);
  donderdag.setUTCDate(d.getUTCDate() - dagNr + 3);
  const jaarStart = new Date(Date.UTC(donderdag.getUTCFullYear(), 0, 1));
  const weekNr = Math.ceil(((donderdag.getTime() - jaarStart.getTime()) / 86400000 + 1) / 7);
  return `${donderdag.getUTCFullYear()}-W${String(weekNr).padStart(2, "0")}`;
}

// Eerste dag (maandag) van de week waarin deze datum valt — handig als
// sorteersleutel en als label ("week van ...").
export function isoWeekStart(datumStr: string): string {
  const d = new Date(datumStr + "T00:00:00Z");
  const dagNr = (d.getUTCDay() + 6) % 7;
  const maandag = new Date(d);
  maandag.setUTCDate(d.getUTCDate() - dagNr);
  return maandag.toISOString().slice(0, 10);
}

export function huidigeWeekLabel(): string {
  return isoWeekLabel(new Date().toISOString().slice(0, 10));
}

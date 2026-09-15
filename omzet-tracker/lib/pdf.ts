// Haalt platte tekst uit een PDF-buffer. Werkt enkel goed voor PDF's met een
// echte tekstlaag (dus niet voor puur ingescande foto's zonder OCR-laag) -
// in dat laatste geval komt er weinig/geen tekst uit en valt de upload-route
// terug op de afbeelding-extractie via Claude's vision.
export async function haalTekstUitPdf(buffer: Buffer): Promise<string> {
  // Dynamische import: pdf-parse leest bij het inladen soms een test-bestand
  // in als je het top-level importeert; dynamisch importeren binnen de
  // functie voorkomt dat dat al bij het opstarten van de server gebeurt.
  const pdfParse = (await import("pdf-parse")).default;
  const resultaat = await pdfParse(buffer);
  return resultaat.text || "";
}

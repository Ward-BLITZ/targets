import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY ontbreekt in de server-omgevingsvariabelen.");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export type ExtractieResultaat = {
  bedragExBtw: number | null;
  gevonden: boolean;
  toelichting: string;
};

const SYSTEM_PROMPT = `Je bent een assistent die uit facturen en offertes het totaalbedrag EXCLUSIEF BTW haalt.
Zoek naar termen zoals "totaal excl. btw", "subtotaal", "netto bedrag", "totaal exclusief btw",
"total excl. VAT", "net amount", "subtotal". Kies het EINDTOTAAL exclusief btw van het hele
document (niet een tussentotaal van één regel, en niet het bedrag inclusief btw).
Antwoord ALLEEN met een geldig JSON-object, zonder uitleg errond en zonder markdown-codeblok:
{"bedragExBtw": <getal of null>, "gevonden": <true of false>, "toelichting": "<korte reden, max 15 woorden>"}
Gebruik een punt als decimaalteken in het getal (bv. 1234.56), geen duizendtal-scheidingstekens.`;

function parseJsonAntwoord(tekst: string): ExtractieResultaat {
  let ruw = tekst.trim();
  // Val terug op het eerste { ... }-blok als het model toch tekst eromheen zet.
  const match = ruw.match(/\{[\s\S]*\}/);
  if (match) ruw = match[0];
  try {
    const parsed = JSON.parse(ruw);
    const bedrag =
      typeof parsed.bedragExBtw === "number" && Number.isFinite(parsed.bedragExBtw)
        ? parsed.bedragExBtw
        : null;
    return {
      bedragExBtw: bedrag,
      gevonden: Boolean(parsed.gevonden) && bedrag !== null,
      toelichting: typeof parsed.toelichting === "string" ? parsed.toelichting : ""
    };
  } catch {
    return { bedragExBtw: null, gevonden: false, toelichting: "Kon antwoord niet interpreteren." };
  }
}

// Haalt het bedrag exclusief btw uit platte tekst (bv. uit een PDF met tekstlaag).
export async function haalBedragUitTekst(tekst: string): Promise<ExtractieResultaat> {
  const beperkteTekst = tekst.slice(0, 15000); // ruim voldoende voor een factuur/offerte
  const res = await getClient().messages.create({
    model: "claude-sonnet-5",
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Hier is de tekst van het document:\n\n${beperkteTekst}`
      }
    ]
  });
  const tekstBlok = res.content.find((b) => b.type === "text");
  const antwoord = tekstBlok && tekstBlok.type === "text" ? tekstBlok.text : "";
  return parseJsonAntwoord(antwoord);
}

// Haalt het bedrag exclusief btw uit een afbeelding (bv. gefotografeerde/gescande factuur).
export async function haalBedragUitAfbeelding(
  base64Data: string,
  mediaType: "image/png" | "image/jpeg" | "image/webp"
): Promise<ExtractieResultaat> {
  const res = await getClient().messages.create({
    model: "claude-sonnet-5",
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Data }
          },
          {
            type: "text",
            text: "Haal het totaalbedrag exclusief btw uit deze factuur/offerte."
          }
        ]
      }
    ]
  });
  const tekstBlok = res.content.find((b) => b.type === "text");
  const antwoord = tekstBlok && tekstBlok.type === "text" ? tekstBlok.text : "";
  return parseJsonAntwoord(antwoord);
}

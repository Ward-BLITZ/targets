# Blitz Omzet Tracker

Losse applicatie (niet in het grote dashboard) om wekelijks facturen en
offertes bij te houden. Bij elke regel vul je zelf in:

- **Type**: Offerte of Factuur
- **Categorie**: bij Offerte alleen B2B partners of B2C, bij Factuur ook KMO project
- **Verkooporder-/factuurnummer**: verplicht
- **Datum**: verplicht
- **Bedrag exclusief btw**: verplicht, altijd handmatig ingevuld
- **Document (PDF/foto)**: optioneel, enkel als bijlage — er gebeurt geen
  automatische bedrag-herkenning. Deze app roept dus geen AI/Claude API aan
  en heeft daar ook geen key voor nodig.

Als je een document toevoegt, wordt dat opgeslagen in een beveiligde
Supabase Storage-bucket (`omzet-documenten`) en kan je het later terug
openen via de link in de lijst (tijdelijke, beveiligde link — de bucket zelf
is niet publiek toegankelijk).

De categorieën volgen het Doelstellingen-document: **B2B partners**
(installateurs die BLITZ verkopen, partners doen de verkoop), **B2C**
(particuliere installaties), **KMO project** (projecten waar Ward zelf een
sleutelrol had in de verkoop — telt niet mee als een partner de verkoop
deed, dat is dan B2B).

Op de Targets-pagina geeft elke ingelogde persoon zelf zijn/haar doelen op
(per categorie en periode) en ziet de voortgang t.o.v. de werkelijk
ingeboekte facturen, op basis van de zelf ingevulde factuurdatum (offertes
tellen niet mee voor de voortgang, enkel facturen). Periodes ondersteunen
ook een vrije reeks zoals `2026-08_2026-12`, naast jaar/kwartaal/maand.
Bovenaan de Targets-pagina staat een knop die de 3 doelen uit het document
(B2B € 137.500 / B2C € 55.000 / KMO € 82.500, periode 2026-08 t/m 2026-12)
in één klik invult; je kan ze daarna nog aanpassen.

## Techniek

- **Next.js 14** (App Router, TypeScript).
- **Supabase** — zelfde project/database als het dashboard, plus een eigen
  Storage-bucket voor de optionele bijlagen. Login gebeurt met dezelfde
  gebruikersaccounts.

Geen Anthropic/Claude API meer nodig — enkel Supabase.

## Lokaal draaien

```bash
npm install
cp .env.example .env.local   # vul de echte sleutels in
npm run dev
```

Open http://localhost:3000.

## Benodigde sleutels (.env.local / Vercel environment variables)

| Variabele | Waar te vinden |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL (staat al ingevuld in `.env.example`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key (**geheim houden**, nooit in de browser) |

## Deployen via GitHub + Vercel

1. Maak een nieuwe (lege, private) repository aan op GitHub, bv. `blitz-omzet-tracker`.
2. Zet deze map (`omzet-tracker/`) in die repository (bv. via GitHub Desktop:
   Add Local Repository → commit → Publish repository).
3. Ga naar vercel.com → **Add New Project** → kies de repository.
4. Bij "Environment Variables": voeg de 3 sleutels uit de tabel hierboven
   toe (voor Production én Preview).
5. Klik **Deploy**. Na een paar minuten krijg je een link zoals
   `blitz-omzet-tracker.vercel.app`.
6. Test: log in met een bestaand dashboard-account, voeg een omzetregel toe
   (met en zonder bijlage), controleer of hij in de lijst verschijnt, stel
   een target in.

## Wijzigingsgeschiedenis (kort)

- Categorie "Project" hernoemd naar "KMO project" (incl. bestaande
  Supabase-kolommen/constraints aangepast).
- Automatische bedrag-herkenning via de Claude API is verwijderd. Bedrag
  wordt altijd handmatig ingevoerd; nummer en datum zijn verplicht; het
  document is optioneel en dient enkel als bijlage.
- Periode-formaat uitgebreid met vrije reeksen (`2026-08_2026-12`).
- Voortgang op de Targets-pagina rekent nu op basis van de ingevulde
  factuurdatum in plaats van het moment van invoeren.

## Bestanden die je kan verwijderen als ze nog in je repo staan

Uit de vorige versie (met AI-herkenning) zijn deze bestanden niet meer
nodig en mag je ze verwijderen: `lib/anthropic.ts`, `lib/pdf.ts`,
`app/api/manual-entry/route.ts`. In `package.json` staan `@anthropic-ai/sdk`
en `pdf-parse` ook niet langer als dependency.

# Blitz Omzet Tracker

Losse applicatie (niet in het grote dashboard) om wekelijks facturen en
offertes toe te voegen — via upload (bestand) of handmatig. Bij elke
toevoeging kies je:

- **Type**: Offerte of Factuur
- **Categorie**: bij Offerte alleen B2B of B2C, bij Factuur ook KMO project

De categorieën volgen het Doelstellingen-document: **B2B partners**
(installateurs die BLITZ verkopen, partners doen de verkoop), **B2C**
(particuliere installaties), **KMO project** (projecten waar Ward zelf een
sleutelrol had in de verkoop — telt niet mee als een partner de verkoop
deed, dat is dan B2B).

Twee manieren om een omzetregel toe te voegen (knop bovenaan de
Upload-pagina):

1. **Bestand uploaden** — de app leest het bestand (PDF met tekstlaag, of
   een foto/scan als PNG/JPG), stuurt de tekst of afbeelding naar de Claude
   API, en laat die het **totaalbedrag exclusief btw** zoeken. Dat bedrag
   verschijnt meteen in de lijst en is aanklikbaar om te corrigeren als de
   automatische herkenning het mis had of niets vond.
2. **Handmatig toevoegen** — geen bestand nodig: kies type + categorie, vul
   zelf het bedrag exclusief btw in (en eventueel een notitie), klaar. Komt
   in dezelfde lijst terecht, gemarkeerd als "handmatig ingevuld".

Op de Targets-pagina geeft elke ingelogde persoon zelf zijn/haar doelen op
(per categorie en periode) en ziet de voortgang t.o.v. de werkelijk
ingeboekte facturen (offertes tellen niet mee voor de voortgang, enkel
facturen — handmatige facturen tellen wel mee). Periodes ondersteunen ook
een vrije reeks zoals `2026-08_2026-12`, naast jaar/kwartaal/maand — nodig
voor de doelperiode uit het document (augustus t/m december 2026). Bovenaan
de Targets-pagina staat een knop die de 3 doelen uit het document
(B2B € 137.500 / B2C € 55.000 / KMO € 82.500, periode 2026-08 t/m 2026-12)
in één klik invult; je kan ze daarna nog aanpassen.

De YTD-cijfers uit het document (B2B € 17.783,92, B2C € 12.573,29, KMO € 0)
zijn niet automatisch ingeladen omdat ze buiten de Aug-Dec-doelperiode
vallen en niet uit een factuur/offerte in deze app komen — voeg ze zelf toe
via "Handmatig toevoegen" met de juiste periode als je wil dat ze meetellen
in een jaaroverzicht.

Alles wordt weggeschreven naar **hetzelfde Supabase-project** als het
bestaande dashboard, in twee nieuwe tabellen (`omzet_uploads` en
`omzet_targets`) — die tabellen staan al klaar, dat hoef je niet zelf aan te
maken.

## Techniek

- **Next.js 14** (App Router, TypeScript) — de standaardkeuze voor
  GitHub + Vercel, met server-side API-routes voor de zware verwerking
  (bestandsuitlezing en de Claude-aanroep gebeuren op de server, nooit in de
  browser).
- **Supabase** — zelfde project/database als het dashboard. Login gebeurt
  met dezelfde gebruikersaccounts.
- **Anthropic (Claude) API** — voor het uitlezen van het bedrag exclusief
  btw uit tekst of afbeelding.

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
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |

## Deployen via GitHub + Vercel

1. Maak een nieuwe (lege, private) repository aan op GitHub, bv. `blitz-omzet-tracker`.
2. Upload deze hele map (`omzet-tracker/`) naar die repository — via de
   GitHub-website (drag & drop van alle bestanden werkt, `git` is niet
   verplicht als je dat niet gewend bent), of via `git push` als je dat wel
   gewend bent.
3. Ga naar vercel.com → **Add New Project** → kies de zopas geüploade
   GitHub-repository.
4. Bij "Environment Variables": voeg de 4 sleutels uit de tabel hierboven
   toe (voor Production én Preview).
5. Klik **Deploy**. Na een paar minuten krijg je een link zoals
   `blitz-omzet-tracker.vercel.app`.
6. Test: log in met een bestaand dashboard-account, upload een
   proef-factuur, controleer of het bedrag klopt, stel een target in.

## Doelstellingen-document

De inhoud van `Doelstellingen 2026.docx` is verwerkt (je hebt de tekst zelf
doorgestuurd, want het bestand kon niet automatisch geopend worden). De
categorieën en de quick-fill-knop op de Targets-pagina zijn hierop
gebaseerd. Visits/calls-doelen (8 visits/week, 2 groothandels/week, 30
kwalitatieve B2B-calls/week, 10 offertes/week) zitten niet in deze app —
die gaan over activiteit, niet over omzet per factuur/offerte, en vielen
buiten de expliciete scope ("voorlopig enkel focussen op facturen en
offertes"). Laat het weten als je die ook wil bijhouden.

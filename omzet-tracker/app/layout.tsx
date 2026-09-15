import type { Metadata } from "next";
import "./globals.css";
import TopBar from "./TopBar";

export const metadata: Metadata = {
  title: "Blitz Omzet Tracker",
  description: "Facturen, offertes en targets bijhouden."
};

// Zet het bewaarde thema meteen bij het laden (voor de React-hydratie), zodat
// de pagina niet eerst kort donker opflitst als je licht gekozen had.
const THEMA_SCRIPT = `
(function () {
  try {
    var thema = localStorage.getItem('blitz-omzet-thema');
    if (thema === 'light' || thema === 'dark') {
      document.documentElement.setAttribute('data-theme', thema);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEMA_SCRIPT }} />
      </head>
      <body>
        <TopBar />
        <main>{children}</main>
      </body>
    </html>
  );
}

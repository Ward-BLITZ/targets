import type { Metadata } from "next";
import "./globals.css";
import TopBar from "./TopBar";

export const metadata: Metadata = {
  title: "Blitz Omzet Tracker",
  description: "Facturen, offertes en targets bijhouden."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>
        <TopBar />
        <main>{children}</main>
      </body>
    </html>
  );
}

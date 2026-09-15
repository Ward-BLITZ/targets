"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const THEMA_SLEUTEL = "blitz-omzet-thema";

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [thema, setThema] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      const opgeslagen = localStorage.getItem(THEMA_SLEUTEL);
      if (opgeslagen === "light" || opgeslagen === "dark") {
        setThema(opgeslagen);
        document.documentElement.setAttribute("data-theme", opgeslagen);
      }
    } catch (e) {
      // localStorage niet beschikbaar (bv. privé-venster) — gewoon donker laten staan
    }
  }, []);

  function wisselThema() {
    const nieuw = thema === "dark" ? "light" : "dark";
    setThema(nieuw);
    document.documentElement.setAttribute("data-theme", nieuw);
    try {
      localStorage.setItem(THEMA_SLEUTEL, nieuw);
    } catch (e) {}
  }

  async function uitloggen() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (pathname === "/login") return null;

  const linkStijl = (actief: boolean) => ({
    color: actief ? "var(--tx)" : "var(--tx3)",
    fontWeight: actief ? 700 : 400,
    textDecoration: "none",
    fontSize: 14
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        maxWidth: 720,
        margin: "0 auto",
        padding: "20px 16px 0"
      }}
    >
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <strong style={{ color: "var(--tx)" }}>Blitz Omzet Tracker</strong>
        <Link href="/upload" style={linkStijl(pathname === "/upload")}>
          Omzet
        </Link>
        <Link href="/targets" style={linkStijl(pathname === "/targets")}>
          Targets
        </Link>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" onClick={wisselThema} style={{ fontSize: 13 }} title="Wissel tussen licht en donker">
          {thema === "dark" ? "☀ Licht" : "🌙 Donker"}
        </button>
        <button className="btn" onClick={uitloggen} style={{ fontSize: 13 }}>
          Uitloggen
        </button>
      </div>
    </div>
  );
}

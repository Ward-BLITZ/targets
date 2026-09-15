"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();

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
      <button className="btn" onClick={uitloggen} style={{ fontSize: 13 }}>
        Uitloggen
      </button>
    </div>
  );
}

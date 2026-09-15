"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  async function uitloggen() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="topbar">
      <span className="logo">BLITZ · OMZET</span>
      <nav>
        <Link href="/upload" className={pathname === "/upload" ? "actief" : ""}>
          Upload
        </Link>
        <Link href="/targets" className={pathname === "/targets" ? "actief" : ""}>
          Targets &amp; voortgang
        </Link>
      </nav>
      <div className="spacer" />
      <button className="btn" onClick={uitloggen}>
        Uitloggen
      </button>
    </div>
  );
}

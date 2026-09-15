"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPagina() {
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const router = useRouter();

  async function inloggen(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    setBezig(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord });
    setBezig(false);
    if (error) {
      setFout(error.message);
      return;
    }
    router.replace("/upload");
  }

  return (
    <div className="card" style={{ maxWidth: 380, margin: "60px auto" }}>
      <h2 style={{ marginTop: 0 }}>Inloggen</h2>
      <p style={{ fontSize: 13, color: "var(--tx3)" }}>
        Zelfde inloggegevens als het Blitz-dashboard.
      </p>
      <form onSubmit={inloggen}>
        <div className="field">
          <label>E-mailadres</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Wachtwoord</label>
          <input
            type="password"
            value={wachtwoord}
            onChange={(e) => setWachtwoord(e.target.value)}
            required
          />
        </div>
        {fout && <div className="error">{fout}</div>}
        <button className="btn primary" type="submit" disabled={bezig}>
          {bezig ? "Bezig..." : "Inloggen"}
        </button>
      </form>
    </div>
  );
}

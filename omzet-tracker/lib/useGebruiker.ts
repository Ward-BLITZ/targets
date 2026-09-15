"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export type GebruikerSessie = { email: string; naam: string; accessToken: string };

// Client-side hook: haalt de ingelogde gebruiker op en stuurt naar /login
// als er geen sessie is. Zelfde Supabase Auth-account als het dashboard.
export function useGebruiker(): GebruikerSessie | null | "laden" {
  const [gebruiker, setGebruiker] = useState<GebruikerSessie | null | "laden">("laden");
  const router = useRouter();

  useEffect(() => {
    let actief = true;

    async function laadSessie() {
      const { data } = await supabase.auth.getSession();
      if (!actief) return;
      const sessie = data.session;
      if (!sessie) {
        setGebruiker(null);
        router.replace("/login");
        return;
      }
      const meta = (sessie.user.user_metadata || {}) as Record<string, any>;
      const naam =
        meta.naam ||
        [meta.voornaam, meta.achternaam].filter(Boolean).join(" ") ||
        (sessie.user.email ? sessie.user.email.split("@")[0] : "Onbekend");
      setGebruiker({
        email: sessie.user.email || "",
        naam,
        accessToken: sessie.access_token
      });
    }

    laadSessie();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sessie) => {
      if (!sessie) {
        setGebruiker(null);
        router.replace("/login");
      }
    });

    return () => {
      actief = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return gebruiker;
}

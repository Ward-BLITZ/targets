"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export type IngelogdeGebruiker = {
  email: string;
  naam: string;
  accessToken: string;
};

// Client-hook: haalt de ingelogde gebruiker op en stuurt naar /login als er
// geen sessie is. Retourneert null zolang het nog aan het laden is.
export function useGebruiker(): IngelogdeGebruiker | null | "laden" {
  const [gebruiker, setGebruiker] = useState<IngelogdeGebruiker | null | "laden">("laden");
  const router = useRouter();

  useEffect(() => {
    let actief = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!actief) return;
      const sessie = data.session;
      if (!sessie) {
        setGebruiker(null);
        router.replace("/login");
        return;
      }
      const meta = (sessie.user.user_metadata || {}) as Record<string, unknown>;
      const naam =
        (meta.naam as string) ||
        (meta.voornaam
          ? `${meta.voornaam as string} ${(meta.achternaam as string) || ""}`.trim()
          : null) ||
        sessie.user.email?.split("@")[0] ||
        "Onbekend";
      setGebruiker({
        email: sessie.user.email || "",
        naam,
        accessToken: sessie.access_token
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sessie) => {
      if (!sessie) {
        setGebruiker(null);
        router.replace("/login");
      }
    });

    return () => {
      actief = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return gebruiker;
}

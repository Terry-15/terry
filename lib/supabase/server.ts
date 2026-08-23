import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * Client Supabase côté serveur (composants serveur, Server Actions, Route Handlers).
 * La session est portée par les cookies gérés par `@supabase/ssr`.
 */
export async function clientServeur() {
  const magasinCookies = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return magasinCookies.getAll();
      },
      setAll(cookiesAEcrire) {
        try {
          cookiesAEcrire.forEach(({ name, value, options }) => {
            magasinCookies.set(name, value, options);
          });
        } catch {
          // Appel depuis un composant serveur : le rafraîchissement de session
          // est assuré par le middleware, on peut ignorer l'écriture ici.
        }
      },
    },
  });
}

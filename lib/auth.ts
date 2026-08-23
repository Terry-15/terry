import { supabaseConfigure } from "./supabase/config";
import { clientServeur } from "./supabase/server";

export interface Utilisateur {
  nom: string;
  email: string | null;
  authentifie: boolean;
}

/** Utilisateur courant — identité fictive en mode démo. */
export async function utilisateurCourant(): Promise<Utilisateur> {
  if (!supabaseConfigure()) {
    return { nom: "Utilisateur démo", email: null, authentifie: false };
  }

  const sb = await clientServeur();
  const { data } = await sb.auth.getUser();
  const user = data.user;
  if (!user) return { nom: "Utilisateur", email: null, authentifie: false };

  const nom =
    (user.user_metadata?.nom_complet as string | undefined) ??
    user.email?.split("@")[0] ??
    "Utilisateur";

  return { nom, email: user.email ?? null, authentifie: true };
}

export async function nomAuteur(): Promise<string> {
  return (await utilisateurCourant()).nom;
}

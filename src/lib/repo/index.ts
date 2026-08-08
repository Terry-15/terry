import { supabaseConfigure } from "@/lib/supabase/config";

import { depotDemo } from "./demo";
import type { Depot } from "./depot";
import { depotSupabase } from "./supabase";

/**
 * Sélectionne le dépôt actif :
 *  - Supabase dès que NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY sont renseignées ;
 *  - jeu de démonstration en mémoire sinon, pour que l'application tourne
 *    immédiatement après un `npm install && npm run dev`.
 */
export function depot(): Depot {
  return supabaseConfigure() ? depotSupabase : depotDemo;
}

export const modeDemo = () => !supabaseConfigure();

export type {
  ActionAvecErreur,
  Depot,
  EntreeAction,
  EntreeAnalyse,
  EntreeErreur,
  FiltresActions,
  MajAction,
} from "./depot";

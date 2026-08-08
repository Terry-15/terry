import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigure } from "@/lib/supabase/config";

const CHEMINS_PUBLICS = ["/connexion", "/auth"];

/**
 * Rafraîchit la session Supabase à chaque requête et protège l'application.
 * Sans configuration Supabase (mode démo), le proxy laisse tout passer.
 */
export default async function proxy(requete: NextRequest) {
  if (!supabaseConfigure()) return NextResponse.next();

  let reponse = NextResponse.next({ request: requete });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return requete.cookies.getAll();
      },
      setAll(cookiesAEcrire) {
        cookiesAEcrire.forEach(({ name, value }) => requete.cookies.set(name, value));
        reponse = NextResponse.next({ request: requete });
        cookiesAEcrire.forEach(({ name, value, options }) =>
          reponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const chemin = requete.nextUrl.pathname;
  const estPublic = CHEMINS_PUBLICS.some((p) => chemin.startsWith(p));

  if (!user && !estPublic) {
    const url = requete.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("suite", chemin);
    return NextResponse.redirect(url);
  }

  if (user && chemin === "/connexion") {
    const url = requete.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return reponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

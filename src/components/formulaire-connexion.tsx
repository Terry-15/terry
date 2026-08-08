"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { clientNavigateur } from "@/lib/supabase/client";

type Mode = "connexion" | "inscription";

export function FormulaireConnexion() {
  const router = useRouter();
  const params = useSearchParams();
  const suite = params.get("suite") || "/";

  const [mode, setMode] = useState<Mode>("connexion");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [nomComplet, setNomComplet] = useState("");
  const [message, setMessage] = useState<{ type: "erreur" | "info"; texte: string } | null>(null);
  const [enCours, setEnCours] = useState(false);

  const soumettre = async (evenement: React.FormEvent) => {
    evenement.preventDefault();
    setEnCours(true);
    setMessage(null);

    const supabase = clientNavigateur();

    if (mode === "inscription") {
      const { error } = await supabase.auth.signUp({
        email,
        password: motDePasse,
        options: { data: { nom_complet: nomComplet || email.split("@")[0] } },
      });
      setEnCours(false);
      setMessage(
        error
          ? { type: "erreur", texte: error.message }
          : {
              type: "info",
              texte:
                "Compte créé. Si la confirmation par e-mail est activée sur votre projet Supabase, validez le lien reçu avant de vous connecter.",
            },
      );
      if (!error) setMode("connexion");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
    setEnCours(false);

    if (error) {
      setMessage({ type: "erreur", texte: error.message });
      return;
    }

    router.push(suite);
    router.refresh();
  };

  return (
    <form onSubmit={soumettre} className="carte space-y-3 p-4">
      {message ? (
        <p
          role="alert"
          className={`rounded-lg px-3 py-2 text-sm ${
            message.type === "erreur"
              ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
          }`}
        >
          {message.texte}
        </p>
      ) : null}

      {mode === "inscription" ? (
        <div>
          <label className="libelle-champ" htmlFor="nom_complet">
            Nom complet
          </label>
          <input
            id="nom_complet"
            value={nomComplet}
            onChange={(e) => setNomComplet(e.target.value)}
            className="champ"
            autoComplete="name"
          />
        </div>
      ) : null}

      <div>
        <label className="libelle-champ" htmlFor="email">
          Adresse e-mail
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="champ"
          autoComplete="email"
        />
      </div>

      <div>
        <label className="libelle-champ" htmlFor="mot_de_passe">
          Mot de passe
        </label>
        <input
          id="mot_de_passe"
          type="password"
          required
          minLength={6}
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          className="champ"
          autoComplete={mode === "inscription" ? "new-password" : "current-password"}
        />
      </div>

      <button type="submit" className="bouton-primaire w-full" disabled={enCours}>
        {enCours ? "Veuillez patienter…" : mode === "connexion" ? "Se connecter" : "Créer le compte"}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "connexion" ? "inscription" : "connexion");
          setMessage(null);
        }}
        className="w-full text-center text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        {mode === "connexion"
          ? "Pas encore de compte ? En créer un"
          : "J'ai déjà un compte — se connecter"}
      </button>
    </form>
  );
}

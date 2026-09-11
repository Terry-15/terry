"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { IndexMonde } from "@/moteur/monde";
import {
  charger,
  effacerSauvegarde,
  indexPartie,
  nouvellePartie,
  sauvegarder,
  type Partie,
} from "@/jeu/partie";

type ValeurContexte = {
  partie: Partie | null;
  idx: IndexMonde | null;
  /** Incrémenté à chaque modification : c'est lui qui déclenche les rendus. */
  version: number;
  chargement: boolean;
  /** Modifie la partie en place puis sauvegarde. */
  agir: (action: (partie: Partie, idx: IndexMonde) => void) => void;
  demarrer: (clubId: string, manager: string, graine: number) => void;
  abandonner: () => void;
};

const Contexte = createContext<ValeurContexte | null>(null);

export function FournisseurPartie({ children }: { children: React.ReactNode }) {
  const [partie, setPartie] = useState<Partie | null>(null);
  const [version, setVersion] = useState(0);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    // localStorage n'existe pas au rendu serveur : on charge après montage.
    const sauvegarde = charger();
    if (sauvegarde) setPartie(sauvegarde);
    setChargement(false);
  }, []);

  // L'index est reconstruit à chaque modification : 756 entrées, c'est instantané.
  const idx = useMemo(() => (partie ? indexPartie(partie) : null), [partie, version]);

  const agir = useCallback(
    (action: (partie: Partie, idx: IndexMonde) => void) => {
      setPartie((courante) => {
        if (!courante) return courante;
        action(courante, indexPartie(courante));
        sauvegarder(courante);
        setVersion((v) => v + 1);
        return courante;
      });
    },
    [],
  );

  const demarrer = useCallback((clubId: string, manager: string, graine: number) => {
    const fraiche = nouvellePartie(clubId, manager, graine);
    sauvegarder(fraiche);
    setPartie(fraiche);
    setVersion((v) => v + 1);
  }, []);

  const abandonner = useCallback(() => {
    effacerSauvegarde();
    setPartie(null);
    setVersion((v) => v + 1);
  }, []);

  const valeur = useMemo<ValeurContexte>(
    () => ({ partie, idx, version, chargement, agir, demarrer, abandonner }),
    [partie, idx, version, chargement, agir, demarrer, abandonner],
  );

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

export function usePartie(): ValeurContexte {
  const valeur = useContext(Contexte);
  if (!valeur) throw new Error("usePartie doit être utilisé dans <FournisseurPartie>");
  return valeur;
}

/** Variante pour les écrans qui n'ont de sens qu'avec une partie en cours. */
export function usePartieChargee(): { partie: Partie; idx: IndexMonde } & Omit<ValeurContexte, "partie" | "idx"> {
  const valeur = usePartie();
  return valeur as { partie: Partie; idx: IndexMonde } & Omit<ValeurContexte, "partie" | "idx">;
}

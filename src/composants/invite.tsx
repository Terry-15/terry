import Link from "next/link";

export function InviteNouvellePartie() {
  return (
    <div className="carte text-center">
      <h2 className="titre-carte">Aucune partie en cours</h2>
      <p className="mt-1 mb-4 text-doux">Choisissez un club pour commencer une saison.</p>
      <Link href="/" className="bouton-principal">
        Commencer
      </Link>
    </div>
  );
}

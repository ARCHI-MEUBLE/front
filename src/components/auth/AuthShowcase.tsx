import Link from "next/link";
import { TESTIMONIALS } from "@/components/home/homeData";

// Un vrai avis client (celui du configurateur, le plus parlant sur une page de connexion)
const REVIEW = TESTIMONIALS[1];

const IMAGE = "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?ixlib=rb-4.0.3&auto=format&fit=crop&w=1632&q=80";

// Colonne de gauche des pages de connexion et d'inscription : photo, logo et avis
export function AuthShowcase() {
  return (
    <div className="relative hidden flex-col bg-am-navy p-10 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:self-start">
      <div
        className="absolute inset-0"
        style={{ backgroundImage: `url("${IMAGE}")`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      {/* Le dégradé garantit un texte lisible quelle que soit la zone claire de la photo */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/15" />
      <div className="relative z-20 flex items-center">
        <Link href="/" aria-label="ArchiMeuble, accueil">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo site .png" alt="ArchiMeuble" className="h-10 w-auto brightness-0 invert" />
        </Link>
      </div>
      <figure className="relative z-20 m-0 mt-auto space-y-2">
        <blockquote className="m-0 text-lg">&ldquo;{REVIEW.quote}&rdquo;</blockquote>
        <figcaption className="text-sm text-white/85">
          {REVIEW.name}, {REVIEW.city}
        </figcaption>
      </figure>
    </div>
  );
}

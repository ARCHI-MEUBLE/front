"use client";
import { useEffect, useRef, useState } from "react";

import {
  CategoryCard,
  FloatingCategoryPanel,
  type ActivationSource,
  type CategoryContent,
} from "./CategoryCard";

const categories: CategoryContent[] = [
  {
    title: "Dressing",
    descriptions: [
      "Le dressing parfait s’adapte à votre vie, pas l’inverse.",
      "Conçu selon vos mesures, il exploite chaque centimètre, qu’il soit mural, d’angle ou sous pente.",
      "Fabrication locale à Lille, Made in France, avec un accompagnement précis du premier croquis à la pose.",
      "Nos spécialistes restent disponibles pour affiner votre projet à chaque étape.",
    ],
    image: "/images/accueil image/dressing.jpg",
    imageAlt: "Dressing sur mesure bleu clair dans une chambre lumineuse",
  },
  {
    title: "Bibliothèque",
    descriptions: [
      "Une bibliothèque bien pensée sublime votre pièce.",
      "Intégrée au salon, à l’escalier ou au bureau, chaque structure est conçue sur mesure au millimètre près.",
      "Fabrication Made in France dans notre atelier de Lille et livraison en 30 jours.",
      "Un interlocuteur dédié reste joignable pour faire évoluer le projet.",
    ],
    image: "/images/accueil image/biblio.jpg",
    imageAlt: "Bibliothèque moderne sur mesure avec rangements ouverts",
  },
  {
    title: "Buffet",
    descriptions: [
      "Alliez rangement et esthétisme avec un buffet fabriqué sur mesure.",
      "Nous ajustons chaque proportion, porte et teinte pour un meuble harmonieux et durable.",
      "Production Made in France, réalisée à Lille avec des matériaux sélectionnés.",
      "Nous restons disponibles pour faire évoluer chaque détail selon vos besoins.",
    ],
    image: "/images/accueil image/buffet.jpg",
    imageAlt: "Buffet contemporain orange dans une salle à manger minimaliste",
  },
  {
    title: "Bureau",
    descriptions: [
      "Un bureau conçu pour votre façon de travailler.",
      "Design, ergonomie et rangements intégrés sont pensés selon vos usages quotidiens.",
      "Fabrication locale à Lille, Made in France, pour une finition irréprochable.",
      "Notre équipe reste à portée de main pour répondre à toutes vos questions.",
    ],
    image: "/images/accueil image/bureau.jpg",
    imageAlt: "Bureau sur mesure vert avec rangements intégrés",
  },
  {
    title: "Meuble TV",
    descriptions: [
      "Un meuble TV discret, épuré et parfaitement intégré à votre mur.",
      "Choisissez la disposition, les matériaux et les rangements invisibles selon vos habitudes.",
      "Réalisé à Lille dans notre atelier Made in France, avec des finitions durables.",
      "Nous vous accompagnons facilement par téléphone ou message à chaque étape.",
    ],
    image: "/images/accueil image/meubletv.jpg",
    imageAlt: "Meuble TV gris sur mesure avec niches ouvertes",
  },
  {
    title: "Meuble sous-escalier",
    descriptions: [
      "Optimisez chaque recoin de votre intérieur.",
      "Tiroirs, penderies, niches ou portes invisibles sont dessinés au millimètre pour votre escalier.",
      "Conception et fabrication à Lille, Made in France, pour une intégration impeccable.",
      "Un conseiller reste disponible pour ajuster votre projet quand vous le souhaitez.",
    ],
    image: "/images/accueil image/meublesousescalier.jpg",
    imageAlt: "Meuble de rangement sur mesure sous un escalier",
  },
  {
    title: "Tête de lit",
    descriptions: [
      "Une tête de lit sur mesure, adaptée à votre chambre et à vos besoins.",
      "Rangements, niches ou éclairage s’intègrent avec précision et sobriété.",
      "Fabrication Made in France dans notre atelier lillois pour une qualité durable.",
      "Contactez-nous facilement pour faire évoluer chaque détail.",
    ],
    image: "/images/accueil image/tetedelit.jpg",
    imageAlt: "Tête de lit bleue réalisée sur mesure avec rangements",
  },
];

export function CategoriesSection() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryContent | null>(null);
  const [visibleCategory, setVisibleCategory] = useState<CategoryContent | null>(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    categories.forEach((category) => {
      const image = new window.Image();
      image.src = category.image;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(hover: none)");

    const updateTouchState = (event?: MediaQueryListEvent) => {
      const matches = event ? event.matches : mediaQuery.matches;
      setIsTouchDevice(matches);

      if (!matches) {
        setSelectedCategory(null);
      }
    };

    updateTouchState();

    mediaQuery.addEventListener("change", updateTouchState);

    return () => {
      mediaQuery.removeEventListener("change", updateTouchState);
    };
  }, []);

  useEffect(() => {
    if (!selectedCategory) {
      setIsOverlayVisible(false);

      if (visibleCategory) {
        const timeout = window.setTimeout(() => {
          setVisibleCategory(null);
        }, 220);

        return () => {
          window.clearTimeout(timeout);
        };
      }

      return;
    }

    setVisibleCategory(selectedCategory);

    const frame = window.requestAnimationFrame(() => {
      setIsOverlayVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [selectedCategory, visibleCategory]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const cancelScheduledClose = () => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelScheduledClose();

    closeTimeoutRef.current = window.setTimeout(() => {
      setSelectedCategory(null);
    }, 200);
  };

  const [lastActivationSource, setLastActivationSource] = useState<ActivationSource>("pointer");

  const handleActivate = (category: CategoryContent, source: ActivationSource) => {
    cancelScheduledClose();
    setLastActivationSource(source);
    setSelectedCategory(category);
  };

  const handleToggle = (category: CategoryContent) => {
    setLastActivationSource("pointer");

    setSelectedCategory((previous) => {
      if (previous && previous.title === category.title) {
        return null;
      }

      return category;
    });
  };

  const handleDeactivate = (options?: { immediate?: boolean }) => {
    if (options?.immediate) {
      cancelScheduledClose();
      setSelectedCategory(null);
      return;
    }

    if (!isTouchDevice) {
      scheduleClose();
    }
  };

  const handleOverlayEnter = () => {
    cancelScheduledClose();
  };

  const handleOverlayLeave = () => {
    if (!isTouchDevice) {
      scheduleClose();
    }
  };

  const handleOverlayClose = () => {
    cancelScheduledClose();
    setSelectedCategory(null);
  };

  const ctaHref = "#contact";
  const isPointerPassthrough = !isTouchDevice && lastActivationSource === "pointer";

  return (
    <section id="creations" className="bg-surface py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl text-center md:mx-auto">
          <span className="text-xs font-medium uppercase tracking-[0.4em] text-muted">
            Nos créations de meubles sur mesure
          </span>
          <h2 className="font-serif mt-4 text-4xl leading-tight text-ink md:text-[44px]">
            Des pièces pensées pour chaque pièce
          </h2>
          <p className="mt-6 text-base leading-relaxed text-stone">
            Rangements optimisés, bibliothèques aériennes ou bureaux élégants : explorez nos réalisations emblématiques et imaginez la vôtre.
          </p>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard
              key={category.title}
              category={category}
              isTouchDevice={isTouchDevice}
              onActivate={(source) => handleActivate(category, source)}
              onDeactivate={handleDeactivate}
              onToggle={() => handleToggle(category)}
            />
          ))}
        </div>
        {visibleCategory ? (
          <FloatingCategoryPanel
            category={visibleCategory}
            ctaHref={ctaHref}
            isVisible={isOverlayVisible}
            activationSource={lastActivationSource}
            isPointerPassthrough={isPointerPassthrough}
            onClose={handleOverlayClose}
            onPointerEnter={handleOverlayEnter}
            onPointerLeave={handleOverlayLeave}
          />
        ) : null}
      </div>
    </section>
  );
}
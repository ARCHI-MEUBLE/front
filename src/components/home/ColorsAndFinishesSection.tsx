import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export type ColorOption = {
  slug: string;
  image: string;
  fancyName: string;
  swatch: string;
};

interface ColorsAndFinishesSectionProps {
  colors: ColorOption[];
}

export function ColorsAndFinishesSection({ colors }: ColorsAndFinishesSectionProps) {
  const initialSlug = colors[0]?.slug ?? "";

  const [selectedSlug, setSelectedSlug] = useState(initialSlug);
  const [visibleSlug, setVisibleSlug] = useState(initialSlug);
  const [loadedSlugs, setLoadedSlugs] = useState<Record<string, boolean>>(() =>
    initialSlug ? { [initialSlug]: true } : {}
  );

  const prefetchedRef = useRef<Set<string>>(new Set(initialSlug ? [initialSlug] : []));

  useEffect(() => {
    const firstColor = colors[0];

    if (!firstColor) {
      setSelectedSlug("");
      setVisibleSlug("");
      setLoadedSlugs({});
      prefetchedRef.current = new Set();
      return;
    }

    setSelectedSlug((previous) => {
      if (previous && colors.some((color) => color.slug === previous)) {
        return previous;
      }

      return firstColor.slug;
    });

    setVisibleSlug((previous) => {
      if (previous && colors.some((color) => color.slug === previous)) {
        return previous;
      }

      return firstColor.slug;
    });

    setLoadedSlugs((previous) => {
      if (previous[firstColor.slug]) {
        return previous;
      }

      return {
        ...previous,
        [firstColor.slug]: true,
      };
    });

    if (!prefetchedRef.current.has(firstColor.slug)) {
      prefetchedRef.current.add(firstColor.slug);
    }
  }, [colors]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    colors.forEach((color) => {
      if (prefetchedRef.current.has(color.slug)) {
        return;
      }

      prefetchedRef.current.add(color.slug);

      const image = new window.Image();
      image.src = color.image;
      image.onload = () => {
        setLoadedSlugs((previous) => {
          if (previous[color.slug]) {
            if (selectedSlug === color.slug) {
              setVisibleSlug(color.slug);
            }

            return previous;
          }

          const next = {
            ...previous,
            [color.slug]: true,
          };

          if (selectedSlug === color.slug) {
            setVisibleSlug(color.slug);
          }

          return next;
        });
      };
    });
  }, [colors, selectedSlug]);

  const activeColor = useMemo(() => {
    return colors.find((color) => color.slug === selectedSlug) ?? colors[0];
  }, [colors, selectedSlug]);

  if (!activeColor) {
    return null;
  }

  const handleSelectColor = (slug: string) => {
    if (slug === selectedSlug) {
      return;
    }

    setSelectedSlug(slug);

    if (loadedSlugs[slug]) {
      setVisibleSlug(slug);
    }
  };

  return (
    <section id="couleurs" className="bg-[#efe2d5] py-24">
      <div className="mx-auto flex max-w-7xl flex-col gap-16 px-6 lg:flex-row">
        <div className="flex flex-1 flex-col">
          <div className="relative overflow-hidden rounded-[42px] bg-white/70 shadow-sm backdrop-blur">
            <div className="relative h-[420px] w-full lg:h-[520px]">
              {colors.map((color) => {
                const isVisible = color.slug === visibleSlug;
                const isSelected = color.slug === selectedSlug;
                const isLoaded = Boolean(loadedSlugs[color.slug]);

                return (
                  <Image
                    key={color.slug}
                    src={color.image}
                    alt={`Armoire finition ${color.fancyName}`}
                    fill
                    priority={color.slug === colors[0]?.slug}
                    loading={color.slug === colors[0]?.slug ? "eager" : "lazy"}
                    onLoadingComplete={() => {
                      setLoadedSlugs((previous) => {
                        if (previous[color.slug]) {
                          if (selectedSlug === color.slug) {
                            setVisibleSlug(color.slug);
                          }

                          return previous;
                        }

                        const next = {
                          ...previous,
                          [color.slug]: true,
                        };

                        if (selectedSlug === color.slug) {
                          setVisibleSlug(color.slug);
                        }

                        return next;
                      });
                    }}
                    className={`absolute inset-0 object-cover object-left transition-opacity duration-300 ${
                      isVisible || (isSelected && isLoaded) ? "opacity-100" : "opacity-0"
                    }`}
                  />
                );
              })}
            </div>
          </div>
          <div className="mt-8 rounded-3xl bg-white/80 px-8 py-6 shadow-sm backdrop-blur">
            <p className="text-xs font-medium uppercase tracking-[0.4em] text-ink/35">Teinte sélectionnée</p>
            <p className="heading-serif mt-3 text-3xl text-ink" aria-live="polite">
              {activeColor.fancyName}
            </p>
          </div>
        </div>

        <div className="flex w-full max-w-xl flex-col justify-between gap-12 lg:py-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.4em] text-ink/40">Couleurs et finitions</p>
            <h2 className="heading-serif mt-4 text-4xl leading-tight text-ink">
              Des couleurs pour tous les projets
            </h2>
            <p className="mt-6 text-base leading-relaxed text-ink/70">
              Nous travaillons avec toutes les teintes que vous pouvez imaginer : des bois naturels aux nuances
              contemporaines. Nos meubles étant réalisés sur mesure, vous pouvez choisir absolument n’importe
              quelle teinte ou finition, sans aucune limite.
            </p>
          </div>

          <div className="grid grid-cols-6 gap-3 sm:grid-cols-8">
            {colors.map((color) => {
              const isSelected = color.slug === selectedSlug;

              return (
                <button
                  key={color.slug}
                  type="button"
                  onClick={() => handleSelectColor(color.slug)}
                  style={{ backgroundColor: color.swatch }}
                  className={`group relative flex h-12 w-12 items-center justify-center rounded-xl transition duration-200 ${
                    isSelected ? "ring-2 ring-ink" : "ring-1 ring-[#d7c9b9] hover:ring-ink/40"
                  }`}
                  aria-label={`Afficher la finition ${color.fancyName}`}
                  aria-pressed={isSelected}
                >
                  <span className="sr-only">{color.fancyName}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-4 pt-4 sm:flex-row">
            <Link href="/models" className="button-elevated">
              Découvrir nos collections
            </Link>
            <Link href="/samples" className="button-outline">
              Commander un échantillon
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

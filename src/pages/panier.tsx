"use client";

import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";

/**
 * Cart Page - Design éditorial minimal
 *
 * Pas de rounded-[40px]
 * Pas de shadow-sm/shadow-xl
 * Layout épuré niveau Aesop/COS
 */

interface CartItem {
  id: number;
  name: string;
  description: string;
  image: string;
  material?: string;
}

// Mock - remplacer par le vrai context
const useCart = () => ({
  items: [] as CartItem[],
  removeItem: (id: number) => {},
});

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem } = useCart();
  const isEmpty = items.length === 0;

  return (
      <div className="min-h-screen bg-[#FAFAF9]">
        <Head>
          <title>Votre sélection - ArchiMeuble</title>
        </Head>

        <main className="mx-auto max-w-4xl px-6 py-20 lg:py-28">
          {/* Header */}
          <div className="border-b border-[#E8E6E3] pb-10">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-[#8B7355]">
            Votre sélection
          </span>
            <h1 className="mt-4 font-serif text-[clamp(32px,5vw,48px)] leading-[1.1] tracking-[-0.02em] text-[#1A1917]">
              Échantillons
            </h1>
            <p className="mt-4 max-w-md text-[#706F6C]">
              Retrouvez les matières qui vous inspirent. Ajustez votre sélection
              avant de finaliser.
            </p>
          </div>

          {/* Empty state */}
          {isEmpty ? (
              <div className="py-24 text-center">
                <div className="mx-auto h-px w-16 bg-[#E8E6E3]" />
                <h2 className="mt-8 font-serif text-2xl text-[#1A1917]">
                  Votre panier est vide
                </h2>
                <p className="mx-auto mt-4 max-w-sm text-[#706F6C]">
                  Découvrez nos échantillons pour commencer et ressentir les matières
                  qui donneront vie à votre projet.
                </p>
                <Link
                    href="/samples"
                    className="mt-10 inline-flex h-12 items-center justify-center bg-[#1A1917] px-8 text-sm font-medium tracking-wide text-white transition-colors hover:bg-[#2D2B28]"
                >
                  Explorer les finitions
                </Link>
              </div>
          ) : (
              <>
                {/* Items */}
                <div className="divide-y divide-[#E8E6E3]">
                  {items.map((item) => (
                      <div
                          key={item.id}
                          className="grid gap-6 py-8 sm:grid-cols-[140px_1fr] sm:gap-8"
                      >
                        {/* Image - carré, pas de rounded */}
                        <div className="relative aspect-square overflow-hidden bg-[#F5F5F4]">
                          <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="140px"
                          />
                        </div>

                        {/* Content */}
                        <div className="flex flex-col justify-between">
                          <div>
                            <h2 className="font-serif text-xl text-[#1A1917]">
                              {item.name}
                            </h2>
                            {item.material && (
                                <p className="mt-1 text-sm text-[#8B7355]">
                                  {item.material}
                                </p>
                            )}
                            <p className="mt-3 text-sm leading-relaxed text-[#706F6C]">
                              {item.description}
                            </p>
                          </div>

                          <button
                              onClick={() => removeItem(item.id)}
                              className="mt-6 self-start text-sm font-medium text-[#706F6C] underline underline-offset-4 transition-colors hover:text-[#1A1917]"
                          >
                            Retirer
                          </button>
                        </div>
                      </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="mt-10 border-t border-[#1A1917] pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-[#706F6C]">
                        {items.length} échantillon{items.length > 1 ? "s" : ""}
                      </p>
                      <p className="mt-1 text-xs text-[#8B7355]">
                        Livraison offerte
                      </p>
                    </div>
                    <p className="font-serif text-3xl text-[#1A1917]">Gratuit</p>
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-10">
                  <button
                      onClick={() => router.push("/checkout/samples")}
                      className="inline-flex h-14 w-full items-center justify-center bg-[#1A1917] text-sm font-medium tracking-wide text-white transition-colors hover:bg-[#2D2B28] sm:w-auto sm:px-12"
                  >
                    Commander mes échantillons
                  </button>
                  <p className="mt-4 text-sm text-[#706F6C]">
                    Nous vous recontacterons pour imaginer le meuble parfaitement
                    adapté à votre intérieur.
                  </p>
                </div>
              </>
          )}
        </main>
      </div>
  );
}
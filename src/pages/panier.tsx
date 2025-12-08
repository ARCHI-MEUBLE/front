import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useSampleCart } from "@/contexts/SampleCartContext";

export default function CartPage() {
  const { items, removeItem } = useSampleCart();
  const isEmpty = items.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-surface text-ink">
      <Head>
        <title>Votre sélection d&apos;échantillons — ArchiMeuble</title>
      </Head>
      <Header />
      <main className="flex flex-1 flex-col">
        <section className="mx-auto w-full max-w-5xl px-6 py-20">
          <h1 className="font-serif text-4xl text-ink">Votre sélection d’échantillons</h1>
          <p className="mt-4 text-base leading-relaxed text-stone">
            Retrouvez ici les matières qui vous inspirent. Ajustez votre sélection avant de finaliser l’envoi.
          </p>

          {isEmpty ? (
            <div className="mt-16 flex flex-col items-center rounded-[40px] border border-dashed border-[#d7c9b9] bg-white/70 px-12 py-16 text-center shadow-sm">
              <p className="font-serif text-2xl text-ink">Votre panier est vide.</p>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-stone">
                Découvrez nos échantillons pour commencer et ressentir les matières qui donneront vie à votre projet.
              </p>
              <Link
                href="/#couleurs"
                className="mt-8 btn-primary"
              >
                Explorer les finitions
              </Link>
            </div>
          ) : (
            <div className="mt-16 space-y-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-6 rounded-sm border border-[#e0d7cc] bg-white/80 p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:flex-row"
                >
                  <div className="relative h-40 w-full overflow-hidden rounded-sm sm:w-48">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="(min-width:1024px) 12rem, 50vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h2 className="font-serif text-2xl text-ink">{item.name}</h2>
                      <p className="mt-3 text-sm leading-relaxed text-stone">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="mt-8 self-start rounded-full border border-[#d7c9b9] px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-stone transition hover:border-ink hover:text-ink"
                    >
                      Retirer du panier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-auto bg-white/60 py-14">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 px-6 text-center sm:flex-row sm:text-left">
            <div>
              <p className="font-serif text-xl text-ink">3 échantillons maximum — Livraison offerte</p>
              <p className="mt-2 text-sm leading-relaxed text-stone">
                Nous vous recontactons ensuite pour imaginer le meuble parfaitement adapté à votre intérieur.
              </p>
            </div>
            <button type="button" className="btn-primary">
              Commander mes échantillons
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

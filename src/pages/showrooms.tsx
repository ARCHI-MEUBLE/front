import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, MapPin, Ruler, Calendar } from "lucide-react";

type Realisation = {
  id: string;
  title: string;
  category: string;
  location: string;
  year: string;
  dimensions?: string;
  description: string;
  images: string[];
  featured?: boolean;
};

const CATEGORIES = [
  { id: "all", label: "Toutes" },
  { id: "dressing", label: "Dressings" },
  { id: "bibliotheque", label: "Bibliothèques" },
  { id: "meuble-tv", label: "Meubles TV" },
  { id: "bureau", label: "Bureaux" },
  { id: "rangement", label: "Rangements" },
];

const REALISATIONS: Realisation[] = [
  {
    id: "dressing-lille-centre",
    title: "Dressing sur mesure",
    category: "dressing",
    location: "Lille Centre",
    year: "2024",
    dimensions: "3.2m x 2.8m",
    description: "Dressing en chêne naturel avec éclairage LED intégré et tiroirs à fermeture douce.",
    images: ["/images/accueil image/dressing.jpg"],
    featured: true,
  },
  {
    id: "bibliotheque-roubaix",
    title: "Bibliothèque murale",
    category: "bibliotheque",
    location: "Roubaix",
    year: "2024",
    dimensions: "4.5m x 3m",
    description: "Bibliothèque du sol au plafond en MDF laqué blanc avec échelle coulissante.",
    images: ["/images/accueil image/biblio.jpg"],
    featured: true,
  },
  {
    id: "meuble-tv-tourcoing",
    title: "Meuble TV suspendu",
    category: "meuble-tv",
    location: "Tourcoing",
    year: "2024",
    dimensions: "2.4m x 0.45m",
    description: "Meuble TV flottant avec panneau arrière en tasseaux et rangements cachés.",
    images: ["/images/accueil image/meubletv.jpg"],
  },
  {
    id: "bureau-marcq",
    title: "Bureau d'angle",
    category: "bureau",
    location: "Marcq-en-Baroeul",
    year: "2023",
    dimensions: "2.2m x 1.8m",
    description: "Bureau d'angle avec caissons intégrés et plan de travail en chêne massif.",
    images: ["/images/accueil image/bureau.jpg"],
  },
  {
    id: "rangement-lambersart",
    title: "Placard sous escalier",
    category: "rangement",
    location: "Lambersart",
    year: "2023",
    dimensions: "Sur mesure",
    description: "Optimisation de l'espace sous escalier avec portes coulissantes et étagères modulables.",
    images: ["/images/accueil image/meublesousescalier.jpg"],
  },
  {
    id: "buffet-wasquehal",
    title: "Buffet contemporain",
    category: "rangement",
    location: "Wasquehal",
    year: "2023",
    dimensions: "2.4m x 0.9m",
    description: "Buffet sur mesure avec façades en placage chêne et poignées intégrées.",
    images: ["/images/accueil image/buffet.jpg"],
    featured: true,
  },
  {
    id: "tete-lit-villeneuve",
    title: "Tête de lit avec rangements",
    category: "rangement",
    location: "Villeneuve d'Ascq",
    year: "2024",
    dimensions: "3m x 1.2m",
    description: "Tête de lit panoramique avec niches éclairées et tables de chevet intégrées.",
    images: ["/images/accueil image/tetedelit.jpg"],
  },
];

export default function RealisationsPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredRealisations = selectedCategory === "all"
    ? REALISATIONS
    : REALISATIONS.filter(r => r.category === selectedCategory);

  const featuredRealisations = REALISATIONS.filter(r => r.featured);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <Head>
        <title>Nos Réalisations — ArchiMeuble</title>
        <meta name="description" content="Découvrez nos réalisations de meubles sur mesure : dressings, bibliothèques, meubles TV. Fabrication artisanale Made in France dans la métropole lilloise." />
      </Head>
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-[#1A1917] py-24 lg:py-32">
          {/* Background texture */}
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }} />
          </div>

          <div className="relative mx-auto max-w-7xl px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                {/* Made in France Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm"
                >
                  <div className="flex gap-0.5">
                    <div className="h-4 w-1.5 rounded-sm bg-[#0055A4]" />
                    <div className="h-4 w-1.5 rounded-sm bg-white" />
                    <div className="h-4 w-1.5 rounded-sm bg-[#EF4135]" />
                  </div>
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/80">
                    Made in France
                  </span>
                </motion.div>

                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="text-xs font-medium uppercase tracking-[0.3em] text-[#8B7355]"
                >
                  Portfolio
                </motion.span>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mt-4 font-serif text-4xl leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
                >
                  Nos réalisations
                  <br />
                  <span className="text-[#8B7355]">sur mesure</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-6 max-w-md text-lg leading-relaxed text-white/70"
                >
                  Chaque projet est unique. Découvrez comment nous transformons
                  vos espaces avec des créations artisanales pensées pour durer.
                </motion.p>

                {/* Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-10 grid grid-cols-3 gap-8"
                >
                  {[
                    { value: "150+", label: "Projets livrés" },
                    { value: "100%", label: "Sur mesure" },
                    { value: "10 ans", label: "Garantie" },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <div className="font-serif text-3xl text-white">{stat.value}</div>
                      <div className="mt-1 text-sm text-white/50">{stat.label}</div>
                    </div>
                  ))}
                </motion.div>
              </div>

              {/* Featured images grid */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="relative hidden lg:block"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-[#2A2825]">
                      <div className="h-full w-full bg-gradient-to-br from-[#8B7355]/20 to-transparent" />
                    </div>
                    <div className="aspect-square overflow-hidden rounded-2xl bg-[#2A2825]">
                      <div className="h-full w-full bg-gradient-to-br from-[#8B7355]/10 to-transparent" />
                    </div>
                  </div>
                  <div className="space-y-4 pt-8">
                    <div className="aspect-square overflow-hidden rounded-2xl bg-[#2A2825]">
                      <div className="h-full w-full bg-gradient-to-br from-[#8B7355]/15 to-transparent" />
                    </div>
                    <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-[#2A2825]">
                      <div className="h-full w-full bg-gradient-to-br from-[#8B7355]/20 to-transparent" />
                    </div>
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -left-6 bottom-24 rounded-2xl border border-white/10 bg-[#1A1917]/90 p-4 backdrop-blur-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8B7355]">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">Métropole Lilloise</div>
                      <div className="text-xs text-white/50">Hauts-de-France</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Savoir-faire Section */}
        <section className="border-b border-[#E8E4DE] bg-white py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#8B7355]">
                  Notre savoir-faire
                </span>
                <h2 className="mt-4 font-serif text-3xl text-[#1A1917] lg:text-4xl">
                  L'artisanat français
                  <br />au service de vos projets
                </h2>
                <p className="mt-6 leading-relaxed text-[#6B6560]">
                  Basés dans la métropole lilloise, nous concevons et fabriquons
                  chaque meuble dans notre atelier. Du premier croquis à la pose finale,
                  nous maîtrisons chaque étape pour vous garantir un résultat parfait.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {[
                  { icon: "01", title: "Conception", desc: "Plans 3D sur mesure" },
                  { icon: "02", title: "Fabrication", desc: "Atelier français" },
                  { icon: "03", title: "Finitions", desc: "Qualité artisanale" },
                  { icon: "04", title: "Installation", desc: "Pose soignée" },
                ].map((step) => (
                  <div key={step.icon} className="rounded-2xl border border-[#E8E4DE] bg-[#FAFAF9] p-6">
                    <div className="font-serif text-2xl text-[#8B7355]">{step.icon}</div>
                    <h3 className="mt-3 font-medium text-[#1A1917]">{step.title}</h3>
                    <p className="mt-1 text-sm text-[#6B6560]">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Category Filter */}
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col items-center">
              <h2 className="font-serif text-3xl text-[#1A1917]">Explorez nos projets</h2>
              <p className="mt-3 text-[#6B6560]">Filtrez par type de réalisation</p>

              {/* Filter buttons */}
              <div className="mt-10 flex flex-wrap justify-center gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
                      selectedCategory === cat.id
                        ? 'bg-[#1A1917] text-white'
                        : 'bg-white text-[#1A1917] hover:bg-[#F5F3F0] border border-[#E8E4DE]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Projects Grid */}
            <motion.div
              layout
              className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              <AnimatePresence mode="popLayout">
                {filteredRealisations.map((realisation, i) => (
                  <motion.article
                    key={realisation.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    onMouseEnter={() => setHoveredId(realisation.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="group relative overflow-hidden rounded-2xl bg-white"
                  >
                    {/* Image */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-[#E8E4DE]">
                      <motion.img
                        src={realisation.images[0]}
                        alt={realisation.title}
                        className="h-full w-full object-cover"
                        animate={{
                          scale: hoveredId === realisation.id ? 1.05 : 1
                        }}
                        transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
                      />

                      {/* Overlay on hover */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-t from-[#1A1917]/80 via-[#1A1917]/20 to-transparent"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: hoveredId === realisation.id ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                      />

                      {/* Featured badge */}
                      {realisation.featured && (
                        <div className="absolute left-4 top-4 rounded-full bg-[#8B7355] px-3 py-1 text-xs font-medium text-white">
                          Coup de coeur
                        </div>
                      )}

                      {/* View button on hover */}
                      <motion.div
                        className="absolute inset-x-4 bottom-4 flex items-center justify-center"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{
                          opacity: hoveredId === realisation.id ? 1 : 0,
                          y: hoveredId === realisation.id ? 0 : 10
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <Link
                          href={`/contact-request?projet=${encodeURIComponent(realisation.title)}`}
                          className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-medium text-[#1A1917] transition-transform active:scale-95"
                        >
                          Projet similaire
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </motion.div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-medium text-[#1A1917]">{realisation.title}</h3>
                          <p className="mt-1 text-sm text-[#6B6560]">{realisation.description}</p>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[#6B6560]">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {realisation.location}
                        </span>
                        {realisation.dimensions && (
                          <span className="flex items-center gap-1.5">
                            <Ruler className="h-3.5 w-3.5" />
                            {realisation.dimensions}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {realisation.year}
                        </span>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            </motion.div>

            {filteredRealisations.length === 0 && (
              <div className="mt-12 text-center text-[#6B6560]">
                Aucune réalisation dans cette catégorie pour le moment.
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-serif text-3xl text-[#1A1917] lg:text-4xl">
                Votre projet sur mesure
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[#6B6560]">
                Chaque espace est unique. Discutons de votre projet et créons
                ensemble le meuble parfait pour votre intérieur.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/contact-request"
                  className="inline-flex items-center gap-2 rounded-full bg-[#1A1917] px-8 py-4 font-medium text-white transition-transform hover:scale-105 active:scale-100"
                >
                  Demander un devis gratuit
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/samples"
                  className="inline-flex items-center gap-2 rounded-full border border-[#1A1917]/20 px-8 py-4 font-medium text-[#1A1917] transition-colors hover:bg-[#F5F3F0]"
                >
                  Commander des échantillons
                </Link>
              </div>

              {/* Trust badges */}
              <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-[#6B6560]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    <div className="h-3 w-1 rounded-sm bg-[#0055A4]" />
                    <div className="h-3 w-1 rounded-sm bg-[#E8E4DE]" />
                    <div className="h-3 w-1 rounded-sm bg-[#EF4135]" />
                  </div>
                  Fabriqué en France
                </div>
                <div>Garantie 10 ans</div>
                <div>Devis gratuit</div>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

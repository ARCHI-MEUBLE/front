import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useCallback, useEffect, useState } from "react";
import { apiClient, FurnitureModel, Category } from "@/lib/apiClient";
import { ProductCard, ProductModel } from "@/components/ProductCard";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Ruler, Palette, Truck } from "lucide-react";

export default function ModelsPage() {
  const router = useRouter();
  const [models, setModels] = useState<ProductModel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");

  // Read category from URL query parameter
  useEffect(() => {
    if (router.isReady && router.query.category) {
      setActiveCategory(router.query.category as string);
    }
  }, [router.isReady, router.query.category]);

  const loadModels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.models.getAll();
      const productModels: ProductModel[] = data.map((model: FurnitureModel & { category?: string; hover_image_url?: string }) => ({
        id: model.id,
        name: model.name,
        description: model.description || "",
        image_path: model.image_url || "",
        hover_image_path: model.hover_image_url || null,
        created_at: model.created_at,
        base_price: model.price || 890,
        category: model.category || (model.name.toLowerCase().includes("dressing") ? "dressing"
          : model.name.toLowerCase().includes("biblio") ? "bibliotheque"
          : model.name.toLowerCase().includes("buffet") ? "buffet"
          : model.name.toLowerCase().includes("bureau") ? "bureau"
          : model.name.toLowerCase().includes("tv") ? "meuble-tv"
          : model.name.toLowerCase().includes("escalier") ? "sous-escalier"
          : model.name.toLowerCase().includes("lit") ? "tete-de-lit"
          : "all")
      }));
      setModels(productModels);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadModels();

    // Charger les catégories
    const loadCategories = async () => {
      try {
        const data = await apiClient.categories.getAll(true); // Seulement actives
        setCategories(data);
      } catch (err) {
        console.error("Erreur lors du chargement des catégories:", err);
      }
    };
    loadCategories();
  }, [loadModels]);

  const filteredModels = activeCategory === "all"
    ? models
    : models.filter(m => m.category === activeCategory);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <Head>
        <title>Nos Modèles — ArchiMeuble</title>
        <meta
          name="description"
          content="Découvrez nos modèles de meubles sur mesure fabriqués à Lille. Dressings, bibliothèques, buffets, bureaux, meubles TV et plus."
        />
      </Head>
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-[#1A1917] py-20 lg:py-28">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-[0.03]">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }} />
          </div>

          <div className="relative mx-auto max-w-7xl px-6">
            <div className="max-w-3xl">
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
                  Fabriqué en France
                </span>
              </motion.div>

              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="text-xs font-medium uppercase tracking-[0.3em] text-[#8B7355]"
              >
                Collection
              </motion.span>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-4 font-serif text-4xl leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl"
              >
                Nos modèles
                <br />
                <span className="text-[#8B7355]">sur mesure</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 max-w-xl text-lg leading-relaxed text-white/70"
              >
                Chaque meuble est entièrement personnalisable : dimensions,
                matériaux, finitions. Configurez le vôtre en quelques clics.
              </motion.p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-b border-[#E8E4DE] bg-white py-10">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-8 sm:grid-cols-3">
              {[
                { icon: Ruler, title: "Sur mesure", desc: "Dimensions personnalisées" },
                { icon: Palette, title: "Finitions au choix", desc: "Large palette de coloris" },
                { icon: Truck, title: "Livraison & Pose", desc: "Installation comprise" },
              ].map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="flex items-center gap-4"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F5F3F0]">
                    <feature.icon className="h-5 w-5 text-[#1A1917]" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-medium text-[#1A1917]">{feature.title}</h3>
                    <p className="text-sm text-[#6B6560]">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Category Filter */}
        <section className="py-12">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col items-center">
              <h2 className="font-serif text-2xl text-[#1A1917]">Explorez notre collection</h2>
              <p className="mt-2 text-[#6B6560]">Sélectionnez une catégorie</p>

              {/* Filter buttons */}
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                <button
                  key="all"
                  onClick={() => setActiveCategory("all")}
                  className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                    activeCategory === "all"
                      ? 'bg-[#1A1917] text-white'
                      : 'border border-[#E8E4DE] bg-white text-[#1A1917] hover:border-[#1A1917]/20 hover:bg-[#F5F3F0]'
                  }`}
                >
                  Tous les modèles
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.slug)}
                    className={`rounded-full px-5 py-2.5 text-sm font-medium transition-all ${
                      activeCategory === cat.slug
                        ? 'bg-[#1A1917] text-white'
                        : 'border border-[#E8E4DE] bg-white text-[#1A1917] hover:border-[#1A1917]/20 hover:bg-[#F5F3F0]'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Products Grid */}
        <section className="bg-white py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-6">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="overflow-hidden rounded-2xl border border-[#E8E4DE]">
                      <div className="aspect-[4/3] animate-pulse bg-[#F5F3F0]" />
                      <div className="p-5">
                        <div className="h-5 w-32 animate-pulse rounded bg-[#F5F3F0]" />
                        <div className="mt-3 h-4 w-20 animate-pulse rounded bg-[#F5F3F0]" />
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : error ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-20 text-center"
                >
                  <p className="text-[#6B6560]">{error}</p>
                  <button
                    onClick={loadModels}
                    className="mt-6 rounded-full bg-[#1A1917] px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-105"
                  >
                    Réessayer
                  </button>
                </motion.div>
              ) : filteredModels.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-20 text-center"
                >
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F5F3F0]">
                    <Ruler className="h-8 w-8 text-[#6B6560]" strokeWidth={1.5} />
                  </div>
                  <p className="mt-6 text-[#6B6560]">Aucun modèle dans cette catégorie.</p>
                </motion.div>
              ) : (
                <motion.div
                  key={activeCategory}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-8 flex items-center justify-between">
                    <p className="text-[#6B6560]">
                      <span className="font-medium text-[#1A1917]">{filteredModels.length}</span> modèle{filteredModels.length > 1 ? 's' : ''} disponible{filteredModels.length > 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredModels.map((model, i) => (
                      <motion.div
                        key={model.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <ProductCard model={model} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-6">
            <div className="overflow-hidden rounded-3xl bg-[#1A1917]">
              <div className="grid lg:grid-cols-2">
                {/* Left: Content */}
                <div className="p-10 lg:p-16">
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#8B7355]">
                    Projet sur mesure
                  </span>
                  <h2 className="mt-4 font-serif text-3xl text-white lg:text-4xl">
                    Vous ne trouvez pas
                    <br />votre bonheur ?
                  </h2>
                  <p className="mt-6 leading-relaxed text-white/70">
                    Nous réalisons tous types de meubles sur mesure. Partagez-nous
                    votre projet et nous vous accompagnons de la conception à l'installation.
                  </p>

                  <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                    <Link
                      href="/contact-request"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-[#1A1917] transition-transform hover:scale-105"
                    >
                      Demander un devis gratuit
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/samples"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                    >
                      Commander des échantillons
                    </Link>
                  </div>

                  {/* Trust badges */}
                  <div className="mt-12 flex flex-wrap items-center gap-6 text-sm text-white/50">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        <div className="h-3 w-1 rounded-sm bg-[#0055A4]" />
                        <div className="h-3 w-1 rounded-sm bg-white/50" />
                        <div className="h-3 w-1 rounded-sm bg-[#EF4135]" />
                      </div>
                      Made in France
                    </div>
                    <div>Devis gratuit</div>
                  </div>
                </div>

                {/* Right: Decorative */}
                <div className="relative hidden lg:block">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#8B7355]/20 to-transparent" />
                  <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[#8B7355]/10 blur-3xl" />
                  <div className="absolute top-1/4 right-1/4 h-32 w-32 rounded-full bg-[#8B7355]/20" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

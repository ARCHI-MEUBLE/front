import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { toast } from "react-hot-toast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useCustomer } from "@/context/CustomerContext";
import { HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";
import { CatalogueHero } from "@/components/catalogue/CatalogueHero";
import { CatalogueToolbar } from "@/components/catalogue/CatalogueToolbar";
import { CatalogueCard, CatalogueItemData } from "@/components/catalogue/CatalogueCard";
import { CataloguePagination } from "@/components/catalogue/CataloguePagination";
import { CatalogueCta } from "@/components/catalogue/CatalogueCta";
import { EmptyState } from "@/components/shared/EmptyState";

const ITEMS_PER_PAGE = 12;

export default function Catalogue() {
  const { isAuthenticated, requireIdentity } = useCustomer();
  const [items, setItems] = useState<CatalogueItemData[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  // Échec du chargement : à distinguer d'une boutique vide, sinon une panne s'affiche « La boutique arrive bientôt »
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [selectedVariation, setSelectedVariation] = useState<Record<number, number>>({});

  useEffect(() => {
    const fetchCategoriesAndCounts = async () => {
      try {
        const res = await fetch("/api/catalogue?action=categories");
        const data = await res.json();
        if (!data.success) return;
        const cats: string[] = data.data;
        setCategories(cats);

        const [allRes, ...perCategoryRes] = await Promise.all([
          fetch("/api/catalogue?action=list&limit=1"),
          ...cats.map((category: string) =>
            fetch(`/api/catalogue?action=list&limit=1&category=${encodeURIComponent(category)}`)
          ),
        ]);
        const allData = await allRes.json();
        if (allData.success) setTotalCount(allData.pagination.total);
        const counts: Record<string, number> = {};
        for (let i = 0; i < cats.length; i++) {
          const data = await perCategoryRes[i].json();
          counts[cats[i]] = data.success ? data.pagination.total : 0;
        }
        setCategoryCounts(counts);
      } catch {
        // catégories indisponibles
      }
    };
    fetchCategoriesAndCounts();
  }, [reloadKey]);

  useEffect(() => {
    const loadCart = async () => {
      try {
        const res = await fetch("/backend/api/cart/index.php", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setCartCount(data.items?.length || 0);
        }
      } catch {
        // panier indisponible
      }
    };
    loadCart();
  }, []);

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          action: "list",
          limit: ITEMS_PER_PAGE.toString(),
          offset: ((currentPage - 1) * ITEMS_PER_PAGE).toString(),
          sort: sortBy,
        });
        if (selectedCategory) params.append("category", selectedCategory);
        if (searchTerm) params.append("search", searchTerm);

        const res = await fetch(`/api/catalogue?${params}`);
        const data = await res.json();
        if (data.success) {
          setItems(data.data);
          setTotalItems(data.pagination.total);
          setLoadFailed(false);
        } else {
          setLoadFailed(true);
        }
      } catch {
        setLoadFailed(true);
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, [selectedCategory, searchTerm, sortBy, currentPage, reloadKey]);

  const handleAddToCart = useCallback(
    async (item: CatalogueItemData) => {
      if (!isAuthenticated && !(await requireIdentity())) return;
      try {
        const variations = item.variations || [];
        const defaultIndex = variations.findIndex((v) => v.is_default === 1);
        const selectedIndex = selectedVariation[item.id] ?? (defaultIndex >= 0 ? defaultIndex : -1);
        const variation = selectedIndex >= 0 ? variations[selectedIndex] : null;

        const res = await fetch("/api/cart/catalogue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            catalogue_item_id: item.id,
            variation_id: variation ? variation.id : null,
            quantity: 1,
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(`${item.name} ajouté au panier`);
          setCartCount((count) => count + 1);
        } else {
          toast.error(data.error || "Erreur lors de l'ajout");
        }
      } catch {
        toast.error("Erreur réseau");
      }
    },
    [isAuthenticated, requireIdentity, selectedVariation]
  );

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const hasFilters = searchTerm !== "" || selectedCategory !== "";
  // Aucun produit au total et aucun filtre : la boutique est vide, inutile d'afficher une barre de filtres
  // (totalCount vient du décompte sans filtre : effacer une recherche ne fait donc pas disparaître la barre)
  const isCatalogueEmpty = !loading && !loadFailed && totalCount === 0 && items.length === 0 && !hasFilters;

  return (
    <div className="flex min-h-screen flex-col bg-am-paper text-black">
      <Head>
        <title>Boutique — ArchiMeuble</title>
        <meta
          name="description"
          content="Découvrez notre sélection de produits et accessoires haut de gamme pour vos projets d'aménagement."
        />
      </Head>
      <Header />
      <main className="flex-1">
        <CatalogueHero />
        <section
          aria-label="Produits de la boutique"
          className={HOME_SECTION_NO_TOP}
          style={{ paddingTop: "clamp(48px,6vw,80px)" }}
        >
          {loadFailed && !loading ? (
            <EmptyState
              title="La boutique est momentanément indisponible"
              text="Les produits n'ont pas pu être chargés. Réessayez dans un instant. Si le problème continue, l'atelier reste joignable par téléphone ou via le formulaire de contact."
              primary={{ label: "Réessayer", onClick: () => setReloadKey((key) => key + 1) }}
              secondary={{ label: "Nous contacter", href: "/contact-request" }}
            />
          ) : isCatalogueEmpty ? (
            <EmptyState
              title="La boutique arrive bientôt"
              text="Nos accessoires et finitions seront bientôt disponibles ici. En attendant, configurez votre meuble sur mesure ou demandez un devis à l'atelier."
              primary={{ label: "Configurer mon meuble", href: "/models" }}
              secondary={{ label: "Demander un devis", href: "/demande-devis" }}
            />
          ) : (
            <>
              <CatalogueToolbar
                categories={categories}
                categoryCounts={categoryCounts}
                totalCount={totalCount}
                selectedCategory={selectedCategory}
                onCategoryChange={(category) => {
                  setSelectedCategory(category);
                  setCurrentPage(1);
                }}
                searchTerm={searchTerm}
                onSearchChange={(value) => {
                  setSearchTerm(value);
                  setCurrentPage(1);
                }}
                sortBy={sortBy}
                onSortChange={setSortBy}
                cartCount={cartCount}
              />

              {loading ? (
                <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-3.5">
                      <div className="animate-pulse rounded bg-am-mist/25" style={{ aspectRatio: "1/1" }} />
                      <div className="h-3 w-1/3 animate-pulse rounded bg-am-mist/25" />
                      <div className="h-4 w-2/3 animate-pulse rounded bg-am-mist/25" />
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <EmptyState
                  title="Aucun produit ne correspond"
                  text="Essayez un autre mot-clé ou une autre catégorie."
                  primary={{
                    label: "Réinitialiser les filtres",
                    onClick: () => {
                      setSearchTerm("");
                      setSelectedCategory("");
                    },
                  }}
                />
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map((item) => (
                      <CatalogueCard
                        key={item.id}
                        item={item}
                        selectedVariationIndex={selectedVariation[item.id] ?? -1}
                        onSelectVariation={(index) =>
                          setSelectedVariation((prev) => ({ ...prev, [item.id]: index }))
                        }
                        onAddToCart={() => handleAddToCart(item)}
                      />
                    ))}
                  </div>
                  <CataloguePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </>
              )}
            </>
          )}
        </section>
        <CatalogueCta />
      </main>
      <Footer />
    </div>
  );
}

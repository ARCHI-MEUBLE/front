import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { toast } from "react-hot-toast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useCustomer } from "@/context/CustomerContext";
import { useRouter } from "next/router";
import { HOME_SECTION_NO_TOP } from "@/components/home/homeLayout";
import { CatalogueHero } from "@/components/catalogue/CatalogueHero";
import { CatalogueToolbar } from "@/components/catalogue/CatalogueToolbar";
import { CatalogueCard, CatalogueItemData } from "@/components/catalogue/CatalogueCard";
import { CataloguePagination } from "@/components/catalogue/CataloguePagination";
import { CatalogueCta } from "@/components/catalogue/CatalogueCta";

const ITEMS_PER_PAGE = 12;

export default function Catalogue() {
  const router = useRouter();
  const { isAuthenticated } = useCustomer();
  const [items, setItems] = useState<CatalogueItemData[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
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
  }, []);

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
        }
      } catch {
        toast.error("Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, [selectedCategory, searchTerm, sortBy, currentPage]);

  const handleAddToCart = useCallback(
    async (item: CatalogueItemData) => {
      if (!isAuthenticated) {
        toast.error("Veuillez vous connecter pour ajouter au panier");
        router.push("/auth/login?redirect=/catalogue");
        return;
      }
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
    [isAuthenticated, router, selectedVariation]
  );

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F6F2] text-[#161513]">
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
                  <div className="animate-pulse rounded bg-[#ECE9E1]" style={{ aspectRatio: "1/1" }} />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-[#ECE9E1]" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-[#ECE9E1]" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-[#5F5B53]">
                Nous n&apos;avons trouvé aucun produit correspondant à vos critères.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("");
                }}
                className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#161513] bg-[#161513] px-6 py-3 text-[15px] font-medium text-[#F7F6F2]"
              >
                Réinitialiser les filtres
              </button>
            </div>
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
        </section>
        <CatalogueCta />
      </main>
      <Footer />
    </div>
  );
}

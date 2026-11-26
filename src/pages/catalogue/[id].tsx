import { useState, useEffect, useCallback } from "react";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { Seo } from "@/components/Seo";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useCustomer } from "@/context/CustomerContext";
import { notifyCartChanged } from "@/lib/cartCount";
import { HOME_SECTION_NO_TOP, HOME_SECTION } from "@/components/home/homeLayout";
import { ProductBreadcrumb } from "@/components/catalogue/ProductBreadcrumb";
import { ProductInfo } from "@/components/catalogue/ProductInfo";
import { RelatedProducts, RelatedProduct } from "@/components/catalogue/RelatedProducts";
import { CatalogueItemDetail } from "@/lib/catalogueItem";
import { PUBLIC_PAGE_CACHE, fetchBackend } from "@/lib/backendServer";

interface ProductDetailProps {
  // Article lu par le serveur : la page arrive complète chez Google et dans les aperçus de partage.
  // null si le backend n'a pas répondu à temps : l'article est alors chargé dans le navigateur.
  initialItem: CatalogueItemDetail | null;
}

export const getServerSideProps: GetServerSideProps<ProductDetailProps> = async ({ params, res }) => {
  const id = Number(params?.id);
  if (!Number.isInteger(id) || id <= 0) return { notFound: true };
  const result = await fetchBackend(`/backend/api/catalogue.php?action=item&id=${id}`);
  // Article supprimé : vraie 404, Google le retire de son index
  if (result.status === "not-found") return { notFound: true };
  const data = result.status === "ok" ? (result.data as { success?: boolean; data?: CatalogueItemDetail }) : null;
  const initialItem = data?.success && data.data ? data.data : null;
  if (initialItem) res.setHeader("Cache-Control", PUBLIC_PAGE_CACHE);
  return { props: { initialItem } };
};

const defaultVariationIndex = (item: CatalogueItemDetail | null) => {
  const index = item?.variations?.findIndex((v) => v.is_default === 1) ?? -1;
  return index >= 0 ? index : 0;
};

export default function ProductDetail({ initialItem }: ProductDetailProps) {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, requireIdentity } = useCustomer();

  const [item, setItem] = useState<CatalogueItemDetail | null>(initialItem);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(!initialItem);
  const [selectedVariationIdx, setSelectedVariationIdx] = useState(() => defaultVariationIndex(initialItem));
  const [quantity, setQuantity] = useState(initialItem?.min_order_quantity || 1);
  const [adding, setAdding] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    if (!id) return;

    const showItem = (data: CatalogueItemDetail) => {
      setItem(data);
      setSelectedVariationIdx(defaultVariationIndex(data));
      setQuantity(data.min_order_quantity || 1);
    };

    // Article déjà fourni par le serveur (arrivée sur la page ou passage à un article voisin)
    if (initialItem && initialItem.id === Number(id)) {
      setAddedToCart(false);
      showItem(initialItem);
      setLoading(false);
      return;
    }

    const fetchItem = async () => {
      setLoading(true);
      setAddedToCart(false);
      try {
        const res = await fetch(`/api/catalogue?action=item&id=${id}`);
        const data = await res.json();
        if (data.success) {
          showItem(data.data);
        } else {
          toast.error("Produit introuvable");
          router.push("/catalogue");
        }
      } catch {
        toast.error("Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id, initialItem, router]);

  useEffect(() => {
    if (!id) return;
    const fetchRelated = async () => {
      try {
        const res = await fetch("/api/catalogue?action=list&limit=5");
        const data = await res.json();
        if (data.success) {
          setRelated(data.data.filter((p: RelatedProduct) => p.id !== Number(id)).slice(0, 4));
        }
      } catch {
        // suggestions indisponibles
      }
    };
    fetchRelated();
  }, [id]);

  const handleAddToCart = useCallback(async () => {
    if (!isAuthenticated && !(await requireIdentity())) return;
    if (!item) return;

    setAdding(true);
    try {
      const variation = item.variations?.[selectedVariationIdx];
      const res = await fetch("/api/cart/catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogue_item_id: item.id,
          variation_id: variation?.id || null,
          quantity,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Ajouté au panier !");
        setAddedToCart(true);
        notifyCartChanged();
      } else {
        toast.error(data.error || "Erreur lors de l'ajout");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setAdding(false);
    }
  }, [isAuthenticated, requireIdentity, item, quantity, selectedVariationIdx]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-am-paper">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-black border-b-transparent" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!item) return null;

  const currentImage = item.variations?.[selectedVariationIdx]?.image_url || item.image_url;

  return (
    <div className="flex min-h-screen flex-col bg-am-paper text-black">
      <Seo
        title={`${item.name} — Boutique ArchiMeuble`}
        description={item.description || `${item.name} : ${item.category}, sélectionné par ArchiMeuble, menuisier à Lille.`}
        path={`/catalogue/${item.id}`}
        image={item.image_url}
        jsonLd={[
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Boutique", path: "/catalogue" },
            { name: item.name, path: `/catalogue/${item.id}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: item.name,
            description: item.description || undefined,
            image: item.image_url ? absoluteUrl(item.image_url) : undefined,
            category: item.category || undefined,
            material: item.material || undefined,
            brand: { "@type": "Brand", name: "ArchiMeuble" },
            offers: {
              "@type": "Offer",
              price: Number(item.unit_price).toFixed(2),
              priceCurrency: "EUR",
              url: absoluteUrl(`/catalogue/${item.id}`),
            },
          },
        ]}
      />
      <Header />
      <main className="flex-1">
        <section
          aria-labelledby="produit-title"
          className={HOME_SECTION_NO_TOP}
          style={{ paddingTop: "clamp(32px,5vw,64px)" }}
        >
          <ProductBreadcrumb category={item.category} name={item.name} />
          <div className="grid grid-cols-1 items-start gap-[clamp(32px,5vw,80px)] lg:grid-cols-2">
            <div className="relative overflow-hidden rounded bg-am-mist/25" style={{ aspectRatio: "1/1" }}>
              {currentImage && (
                <Image src={currentImage} alt={item.name} fill unoptimized priority className="object-cover" />
              )}
            </div>
            <ProductInfo
              item={item}
              quantity={quantity}
              onQuantityChange={setQuantity}
              selectedVariationIdx={selectedVariationIdx}
              onSelectVariation={setSelectedVariationIdx}
              adding={adding}
              addedToCart={addedToCart}
              onAddToCart={handleAddToCart}
              onGoToCart={() => router.push("/cart")}
            />
          </div>
        </section>

        {related.length > 0 && (
          <section aria-labelledby="related-title" className={HOME_SECTION}>
            <h2 id="related-title" className="m-0 mb-8 text-heading text-black">
              Vous aimerez aussi
            </h2>
            <RelatedProducts items={related} />
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

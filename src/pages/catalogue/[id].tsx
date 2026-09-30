import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import { toast } from "react-hot-toast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useCustomer } from "@/context/CustomerContext";
import { HOME_SECTION_NO_TOP, HOME_SECTION } from "@/components/home/homeLayout";
import { ProductBreadcrumb } from "@/components/catalogue/ProductBreadcrumb";
import { ProductInfo } from "@/components/catalogue/ProductInfo";
import { RelatedProducts, RelatedProduct } from "@/components/catalogue/RelatedProducts";
import { CatalogueItemDetail } from "@/lib/catalogueItem";

export default function ProductDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated } = useCustomer();

  const [item, setItem] = useState<CatalogueItemDetail | null>(null);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariationIdx, setSelectedVariationIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchItem = async () => {
      setLoading(true);
      setAddedToCart(false);
      try {
        const res = await fetch(`/api/catalogue?action=item&id=${id}`);
        const data = await res.json();
        if (data.success) {
          setItem(data.data);
          if (data.data.variations && data.data.variations.length > 0) {
            const defaultIndex = data.data.variations.findIndex((v: { is_default: number }) => v.is_default === 1);
            setSelectedVariationIdx(defaultIndex >= 0 ? defaultIndex : 0);
          }
          setQuantity(data.data.min_order_quantity || 1);
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
  }, [id, router]);

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
    if (!isAuthenticated) {
      toast.error("Veuillez vous connecter pour ajouter au panier");
      router.push(`/auth/login?redirect=/catalogue/${id}`);
      return;
    }
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
      } else {
        toast.error(data.error || "Erreur lors de l'ajout");
      }
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setAdding(false);
    }
  }, [isAuthenticated, item, quantity, selectedVariationIdx, router, id]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F7F6F2]">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#161513] border-b-transparent" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!item) return null;

  const currentImage = item.variations?.[selectedVariationIdx]?.image_url || item.image_url;

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F6F2] text-[#161513]">
      <Head>
        <title>{item.name} — ArchiMeuble</title>
        <meta name="description" content={item.description || item.name} />
      </Head>
      <Header />
      <main className="flex-1">
        <section
          aria-labelledby="produit-title"
          className={HOME_SECTION_NO_TOP}
          style={{ paddingTop: "clamp(32px,5vw,64px)" }}
        >
          <ProductBreadcrumb category={item.category} name={item.name} />
          <div className="grid grid-cols-1 items-start gap-[clamp(32px,5vw,80px)] lg:grid-cols-2">
            <div className="relative overflow-hidden rounded bg-[#ECE9E1]" style={{ aspectRatio: "1/1" }}>
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
            <h2
              id="related-title"
              className="m-0 mb-8 font-[Geist] font-medium tracking-[-0.045em] text-[#161513]"
              style={{ fontSize: "clamp(28px,3vw,44px)" }}
            >
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

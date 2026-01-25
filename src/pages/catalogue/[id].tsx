import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { 
  IconShoppingCart, 
  IconChevronLeft, 
  IconPackage,
  IconCheck,
  IconArrowLeft,
  IconMinus,
  IconPlus,
  IconDimensions,
  IconLayersIntersect
} from '@tabler/icons-react';
import { useCustomer } from '@/context/CustomerContext';

interface CatalogueItem {
  id: number;
  name: string;
  category: string;
  description: string;
  material: string;
  dimensions: string;
  unit_price: number;
  unit: string;
  min_order_quantity: number;
  image_url: string;
  weight: number;
  tags: string;
  variation_label?: string;
  variations?: { id: number; color_name: string; image_url: string; is_default: number }[];
}

export default function ProductDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated } = useCustomer();
  
  const [item, setItem] = useState<CatalogueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariationIdx, setSelectedVariationIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const fetchItem = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/catalogue?action=item&id=${id}`);
        const data = await res.json();
        if (data.success) {
          setItem(data.data);
          // Trouver l'index de la variation par défaut
          if (data.data.variations && data.data.variations.length > 0) {
            const defIdx = data.data.variations.findIndex((v: any) => v.is_default === 1);
            setSelectedVariationIdx(defIdx >= 0 ? defIdx : 0);
          }
          if (data.data.min_order_quantity) {
            setQuantity(data.data.min_order_quantity);
          }
        } else {
          toast.error("Produit introuvable");
          router.push('/catalogue');
        }
      } catch (e) {
        toast.error("Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    
    fetchItem();
  }, [id, router]);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error("Veuillez vous connecter pour ajouter au panier");
      router.push(`/auth/login?redirect=/catalogue/${id}`);
      return;
    }

    setAdding(true);
    try {
      const variation = item?.variations?.[selectedVariationIdx];
      const res = await fetch('/api/cart/catalogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogue_item_id: item?.id,
          variation_id: variation?.id || null,
          quantity: quantity
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success("Ajouté au panier !");
        setAddedToCart(true);
      } else {
        toast.error(data.error || "Erreur lors de l'ajout");
      }
    } catch (e) {
      toast.error("Erreur réseau");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!item) return null;

  const currentImage = item.variations?.[selectedVariationIdx]?.image_url || item.image_url;

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 lg:py-20">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-12 group"
        >
          <IconArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
          <span>Retour au catalogue</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Image Gallery */}
          <div className="space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative aspect-square bg-white rounded-3xl overflow-hidden border border-border/40 shadow-sm"
            >
              {currentImage ? (
                <Image
                  src={currentImage}
                  alt={item.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-muted/30 text-muted-foreground">
                  <IconPackage size={80} stroke={1} />
                </div>
              )}
            </motion.div>

            {item.variations && item.variations.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {item.variations.map((v, idx) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariationIdx(idx)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      selectedVariationIdx === idx ? 'border-primary shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <Image src={v.image_url} alt={v.color_name} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <div className="space-y-4 mb-10">
              <span className="text-xs uppercase tracking-[0.3em] text-primary font-bold">
                {item.category}
              </span>
              <h1 className="text-4xl lg:text-5xl font-serif text-[#1A1917]">
                {item.name}
              </h1>
              <p className="text-2xl font-bold text-primary">
                {item.unit_price}€ <span className="text-base font-normal text-muted-foreground italic">/ {item.unit}</span>
              </p>
            </div>

            <div className="space-y-8 mb-12">
              <div className="prose prose-stone max-w-none text-muted-foreground leading-relaxed">
                {item.description || "Aucune description disponible pour ce produit."}
              </div>

              <div className="grid grid-cols-2 gap-6 pt-8 border-t border-border/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <IconLayersIntersect size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Matériau</p>
                    <p className="font-medium">{item.material || "Non spécifié"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <IconDimensions size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Dimensions</p>
                    <p className="font-medium">{item.dimensions || "Standard"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Selection Options */}
            <div className="space-y-8 p-8 bg-white rounded-3xl border border-border/40 shadow-sm">
              {item.variations && item.variations.length > 0 && (
                <div className="space-y-4">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">
                    {item.variation_label || "Couleur / Finition"}
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {item.variations.map((v, idx) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVariationIdx(idx)}
                        className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                          selectedVariationIdx === idx 
                            ? 'border-primary bg-primary text-white' 
                            : 'border-border/50 hover:border-primary/50'
                        }`}
                      >
                        {v.color_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Quantité</label>
                  <div className="flex items-center h-14 w-full sm:w-40 border border-border/50 rounded-xl px-2">
                    <button 
                      onClick={() => setQuantity(q => Math.max(item.min_order_quantity || 1, q - 1))}
                      className="p-2 hover:text-primary transition-colors"
                    >
                      <IconMinus size={18} />
                    </button>
                    <input 
                      type="number" 
                      value={quantity}
                      onChange={e => setQuantity(Math.max(item.min_order_quantity || 1, parseInt(e.target.value) || 0))}
                      className="flex-1 text-center bg-transparent font-bold outline-none"
                    />
                    <button 
                      onClick={() => setQuantity(q => q + 1)}
                      className="p-2 hover:text-primary transition-colors"
                    >
                      <IconPlus size={18} />
                    </button>
                  </div>
                  {item.min_order_quantity > 1 && (
                    <p className="text-[10px] text-muted-foreground italic">Minimum de commande : {item.min_order_quantity} {item.unit}s</p>
                  )}
                </div>

                <div className="flex-[2] flex flex-col gap-3 justify-end">
                  <Button 
                    onClick={handleAddToCart}
                    disabled={adding}
                    variant={addedToCart ? "outline" : "default"}
                    className="h-14 w-full gap-3 text-lg font-serif"
                  >
                    <IconShoppingCart size={22} />
                    {adding ? "Ajout en cours..." : addedToCart ? "Ajouter encore" : "Ajouter au panier"}
                  </Button>

                  <AnimatePresence>
                    {addedToCart && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <Button 
                          onClick={() => router.push('/cart')}
                          className="h-14 w-full gap-3 text-lg font-serif bg-green-600 hover:bg-green-700 text-white border-none"
                        >
                          <IconCheck size={22} />
                          Aller au panier
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-8 text-muted-foreground">
              <div className="flex items-center gap-2 text-xs">
                <IconCheck size={16} className="text-green-500" />
                Qualité certifiée
              </div>
              <div className="flex items-center gap-2 text-xs">
                <IconCheck size={16} className="text-green-500" />
                Expédition sous 48h
              </div>
              <div className="flex items-center gap-2 text-xs">
                <IconCheck size={16} className="text-green-500" />
                Service client local
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

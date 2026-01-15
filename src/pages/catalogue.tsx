import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useCustomer } from '@/context/CustomerContext';
import { useRouter } from 'next/router';
import { 
  IconSearch, 
  IconFilter, 
  IconChevronLeft, 
  IconChevronRight, 
  IconShoppingCart, 
  IconPackage,
  IconArrowRight
} from '@tabler/icons-react';

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
  variations?: { id?: number; color_name: string; image_url: string; is_default: number }[];
}

export default function Catalogue() {
  const router = useRouter();
  const { isAuthenticated } = useCustomer();
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 12;
  const [selectedVariation, setSelectedVariation] = useState<Record<number, number>>({});

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await fetch('/api/catalogue?action=categories');
        const data = await res.json();
        if (data.success) setCategories(data.data);
      } catch (e) {}
    };
    fetchCats();
  }, []);

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          action: 'list',
          limit: itemsPerPage.toString(),
          offset: ((currentPage - 1) * itemsPerPage).toString(),
        });
        if (selectedCategory) params.append('category', selectedCategory);
        if (searchTerm) params.append('search', searchTerm);
        
        const res = await fetch(`/api/catalogue?${params}`);
        const data = await res.json();
        if (data.success) {
          setItems(data.data);
          setTotalItems(data.pagination.total);
        }
      } catch (e) {
        toast.error("Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, [selectedCategory, searchTerm, sortBy, currentPage]);

  const handleAddToCart = async (item: CatalogueItem) => {
    if (!isAuthenticated) {
      toast.error("Veuillez vous connecter pour ajouter au panier");
      router.push(`/auth/login?redirect=/catalogue`);
      return;
    }

    try {
      const vars = item.variations || [];
      const defaultIdx = vars.findIndex(v => v.is_default === 1);
      const selIdx = selectedVariation[item.id] ?? (defaultIdx !== undefined && defaultIdx >= 0 ? defaultIdx : -1);
      const variation = selIdx >= 0 ? vars[selIdx] : null;

      const res = await fetch('/api/cart/catalogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogue_item_id: item.id,
          variation_id: variation ? variation.id : null,
          quantity: item.min_order_quantity || 1
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${item.name} ajouté au panier`);
      } else {
        toast.error(data.error || "Erreur lors de l'ajout");
      }
    } catch (e) {
      toast.error("Erreur réseau");
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9]">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-[#1A1917] py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl lg:text-6xl font-serif text-white mb-6"
          >
            <span className="italic">Boutique</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/60 text-lg max-w-2xl mx-auto"
          >
            Découvrez notre sélection de portes, façades et quincailleries haut de gamme pour vos projets d'aménagement.
          </motion.p>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-6 mb-12 items-end">
          <div className="flex-1 w-full space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Recherche</Label>
            <div className="relative">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                className="pl-10 h-12 bg-white border-border/50" 
                placeholder="Ex: Porte chêne, charnière..." 
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          
          <div className="w-full lg:w-64 space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Catégorie</Label>
            <select 
              className="w-full h-12 rounded-md border border-border/50 bg-white px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
              value={selectedCategory}
              onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            >
              <option value="">Toutes les catégories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="w-full lg:w-64 space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Trier par</Label>
            <select 
              className="w-full h-12 rounded-md border border-border/50 bg-white px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="newest">Nouveautés</option>
              <option value="price_asc">Prix croissant</option>
              <option value="price_desc">Prix décroissant</option>
            </select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-4">
                <div className="aspect-square bg-muted rounded-xl" />
                <div className="h-4 bg-muted w-2/3 rounded" />
                <div className="h-4 bg-muted w-full rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="group"
                >
                  <div className="relative aspect-square overflow-hidden rounded-2xl bg-white border border-border/40 hover:border-primary/30 transition-all duration-500 hover:shadow-xl">
                    <Link href={`/catalogue/${item.id}`} className="block h-full w-full">
                    {(() => {
                      const vars = item.variations || [];
                      const defaultIdx = vars.findIndex(v => v.is_default === 1);
                      const selIdx = selectedVariation[item.id] ?? (defaultIdx >= 0 ? defaultIdx : -1);
                      const img = selIdx >= 0 ? vars[selIdx]?.image_url : item.image_url;
                      
                      return img ? (
                        <Image
                          src={img}
                          alt={item.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-muted/30">
                          <IconPackage size={48} stroke={1} className="text-muted-foreground/40" />
                        </div>
                      );
                    })()}
                    </Link>
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 pointer-events-none">
                      <Button onClick={(e) => { e.preventDefault(); handleAddToCart(item); }} className="w-full gap-2 bg-white text-black hover:bg-primary hover:text-white border-none h-11 pointer-events-auto">
                        <IconShoppingCart size={18} />
                        Ajouter
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1">
                    <div className="flex justify-between items-start">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">{item.category}</p>
                      <p className="text-sm font-bold text-primary">{item.unit_price}€</p>
                    </div>
                    <Link href={`/catalogue/${item.id}`}>
                      <h3 className="font-serif text-lg text-[#1A1917] group-hover:text-primary transition-colors line-clamp-1 cursor-pointer">{item.name}</h3>
                    </Link>
                    
                    {item.variations && item.variations.length > 0 && (
                      <div className="pt-2 flex gap-1.5 flex-wrap">
                        {item.variations.map((v, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedVariation(p => ({...p, [item.id]: idx}))}
                            className={`w-5 h-5 rounded-full border-2 transition-all ${
                              (selectedVariation[item.id] ?? item.variations?.findIndex(v => v.is_default === 1)) === idx 
                                ? 'border-primary scale-110 shadow-sm' 
                                : 'border-transparent'
                            }`}
                            style={{ 
                              background: v.image_url.includes('models') ? `url(${v.image_url}) center/cover` : 'gray',
                              backgroundColor: '#eee' 
                            }}
                            title={v.color_name}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {items.length === 0 && (
              <div className="text-center py-32 space-y-4">
                <IconSearch size={64} stroke={1} className="mx-auto text-muted-foreground/30" />
                <h3 className="text-xl font-serif">Aucun article trouvé</h3>
                <p className="text-muted-foreground">Essayez d'ajuster vos filtres ou votre recherche.</p>
                <Button variant="outline" onClick={() => { setSearchTerm(''); setSelectedCategory(''); }}>
                  Réinitialiser les filtres
                </Button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-16 flex justify-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <IconChevronLeft size={18} />
                </Button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <Button
                    key={i}
                    variant={currentPage === i + 1 ? "default" : "outline"}
                    className="w-10 h-10"
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button 
                  variant="outline" 
                  size="icon"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <IconChevronRight size={18} />
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

// Composants UI locaux simplifiés
function Label({ children, className }: { children: React.ReactNode, className?: string }) {
  return <label className={`block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>{children}</label>;
}

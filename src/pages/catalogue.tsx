"use client";

import { useState, useEffect, useRef } from 'react';
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
  IconChevronLeft,
  IconChevronRight,
  IconShoppingCart,
  IconPackage,
  IconX,
  IconAdjustments
} from '@tabler/icons-react';

// Composant pour l'effet peinture
function PaintHighlight({ children, color = "#FDE047" }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      <svg
        className="absolute -inset-x-2 -inset-y-1 -z-10 h-[calc(100%+8px)] w-[calc(100%+16px)]"
        viewBox="0 0 120 50"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M8,12 Q2,8 4,18 L2,25 Q0,32 6,38 L12,42 Q18,46 25,44 L95,46 Q105,48 110,42 L116,35 Q120,28 118,20 L115,12 Q112,4 105,6 L20,4 Q12,2 8,12 Z"
          fill={color}
          opacity="0.55"
        />
        <path
          d="M12,14 Q6,12 8,20 L6,26 Q4,33 10,36 L16,40 Q22,43 30,41 L90,43 Q100,44 104,39 L110,32 Q114,26 112,19 L109,13 Q106,7 98,9 L25,7 Q16,6 12,14 Z"
          fill={color}
          opacity="0.35"
        />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

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
  const sectionRef = useRef<HTMLElement>(null);
  const [items, setItems] = useState<CatalogueItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const itemsPerPage = 12;
  const [selectedVariation, setSelectedVariation] = useState<Record<number, number>>({});

  useEffect(() => {
    const elements = sectionRef.current?.querySelectorAll("[data-animate]");
    elements?.forEach((el, i) => {
      (el as HTMLElement).style.animationDelay = `${i * 80}ms`;
      el.classList.add("animate-in");
    });
  }, []);

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
  const hasActiveFilters = selectedCategory || searchTerm;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF9]">
      <Header />

      {/* Hero Section */}
      <section
        ref={sectionRef}
        className="relative bg-[#1A1917] py-16 sm:py-20 lg:py-28 overflow-hidden"
      >
        {/* Background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-[#8B7355]/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[10%] right-[5%] w-[300px] h-[300px] bg-[#5B4D3A]/15 blur-[100px] rounded-full" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            {/* Eyebrow */}
            <div
              data-animate
              className="flex items-center gap-3 opacity-0 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 transition-all duration-700"
            >
              <div className="h-px w-8 bg-[#8B7355]" />
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#8B7355]">
                Notre boutique
              </span>
            </div>

            {/* Title */}
            <h1
              data-animate
              className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-[-0.02em] text-white opacity-0 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 transition-all duration-700"
            >
              Notre{" "}
              <PaintHighlight color="#FDE047">Boutique</PaintHighlight>
            </h1>

            {/* Description */}
            <p
              data-animate
              className="mt-6 text-base sm:text-lg font-medium leading-relaxed text-[#A8A7A3] max-w-xl opacity-0 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 transition-all duration-700"
            >
              Découvrez notre sélection de produits et accessoires haut de gamme pour vos projets d'aménagement.
            </p>

            {/* Stats */}
            <div
              data-animate
              className="mt-10 flex items-center gap-8 opacity-0 translate-y-4 [&.animate-in]:opacity-100 [&.animate-in]:translate-y-0 transition-all duration-700"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                <span className="text-2xl font-black text-[#8B7355]">100%</span>
                <span className="text-xs text-[#706F6C] uppercase tracking-wider">Qualité</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                <span className="text-2xl font-black text-[#8B7355]">Pro</span>
                <span className="text-xs text-[#706F6C] uppercase tracking-wider">Matériaux</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                <span className="text-2xl font-black text-[#8B7355]">48h</span>
                <span className="text-xs text-[#706F6C] uppercase tracking-wider">Livraison</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto w-full px-5 sm:px-6 lg:px-8 py-10 lg:py-16">
        {/* Toolbar */}
        <div className="flex flex-col gap-6 mb-10 lg:mb-12">
          {/* Mobile: Search + Filter toggle */}
          <div className="flex gap-3 lg:hidden">
            <div className="relative flex-1">
              <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#706F6C]" />
              <Input
                className="pl-12 h-12 bg-white border-[#E8E6E3] text-base"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`h-12 w-12 flex items-center justify-center border transition-colors ${
                showMobileFilters || hasActiveFilters
                  ? 'bg-[#1A1917] border-[#1A1917] text-white'
                  : 'bg-white border-[#E8E6E3] text-[#1A1917]'
              }`}
            >
              <IconAdjustments size={20} />
            </button>
          </div>

          {/* Mobile filters panel */}
          {showMobileFilters && (
            <div className="lg:hidden bg-white border border-[#E8E6E3] p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#706F6C]">Catégorie</label>
                <select
                  className="w-full h-12 border border-[#E8E6E3] bg-white px-4 text-sm focus:ring-2 focus:ring-[#8B7355] outline-none"
                  value={selectedCategory}
                  onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                >
                  <option value="">Toutes les catégories</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#706F6C]">Trier par</label>
                <select
                  className="w-full h-12 border border-[#E8E6E3] bg-white px-4 text-sm focus:ring-2 focus:ring-[#8B7355] outline-none"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                >
                  <option value="newest">Nouveautés</option>
                  <option value="price_asc">Prix croissant</option>
                  <option value="price_desc">Prix décroissant</option>
                </select>
              </div>
            </div>
          )}

          {/* Desktop toolbar */}
          <div className="hidden lg:flex items-end gap-6">
            <div className="flex-1 space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#706F6C]">Recherche</label>
              <div className="relative">
                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#706F6C]" />
                <Input
                  className="pl-12 h-12 bg-white border-[#E8E6E3] text-base"
                  placeholder="Ex: Porte chêne, charnière..."
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>

            <div className="w-56 space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#706F6C]">Catégorie</label>
              <select
                className="w-full h-12 border border-[#E8E6E3] bg-white px-4 text-sm focus:ring-2 focus:ring-[#8B7355] outline-none"
                value={selectedCategory}
                onChange={e => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              >
                <option value="">Toutes les catégories</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="w-48 space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.15em] text-[#706F6C]">Trier par</label>
              <select
                className="w-full h-12 border border-[#E8E6E3] bg-white px-4 text-sm focus:ring-2 focus:ring-[#8B7355] outline-none"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="newest">Nouveautés</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
              </select>
            </div>
          </div>

          {/* Active filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory('')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1A1917] text-white text-sm font-medium"
                >
                  {selectedCategory}
                  <IconX size={14} />
                </button>
              )}
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#1A1917] text-white text-sm font-medium"
                >
                  "{searchTerm}"
                  <IconX size={14} />
                </button>
              )}
              <button
                onClick={() => { setSearchTerm(''); setSelectedCategory(''); }}
                className="text-sm font-medium text-[#706F6C] hover:text-[#1A1917] underline underline-offset-2"
              >
                Tout effacer
              </button>
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="mb-8">
          <p className="text-sm text-[#706F6C]">
            {loading ? 'Chargement...' : `${totalItems} produit${totalItems > 1 ? 's' : ''} trouvé${totalItems > 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-4">
                <div className="aspect-square bg-[#E8E6E3]" />
                <div className="h-3 bg-[#E8E6E3] w-1/3" />
                <div className="h-4 bg-[#E8E6E3] w-2/3" />
                <div className="h-3 bg-[#E8E6E3] w-1/4" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Image container */}
                  <div className="relative aspect-square overflow-hidden bg-white border border-[#E8E6E3] transition-all duration-300 group-hover:border-[#1A1917]">
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
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-[#F5F5F4]">
                            <IconPackage size={48} stroke={1} className="text-[#D4D4D4]" />
                          </div>
                        );
                      })()}
                    </Link>

                    {/* Hover overlay with add to cart */}
                    <div className="absolute inset-x-0 bottom-0 p-3 lg:p-4 bg-gradient-to-t from-black/70 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                      <button
                        onClick={(e) => { e.preventDefault(); handleAddToCart(item); }}
                        className="w-full h-10 lg:h-11 bg-white text-[#1A1917] text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#8B7355] hover:text-white transition-colors"
                      >
                        <IconShoppingCart size={16} />
                        <span className="hidden sm:inline">Ajouter au panier</span>
                        <span className="sm:hidden">Ajouter</span>
                      </button>
                    </div>

                    {/* Corner accent on hover */}
                    <div className="absolute right-0 top-0 h-8 w-8 origin-top-right scale-0 bg-[#1A1917] transition-transform duration-200 group-hover:scale-100" />
                  </div>

                  {/* Product info */}
                  <div className="mt-4 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8B7355]">
                      {item.category}
                    </p>
                    <Link href={`/catalogue/${item.id}`}>
                      <h3 className="font-bold text-sm lg:text-base text-[#1A1917] group-hover:text-[#8B7355] transition-colors line-clamp-1">
                        {item.name}
                      </h3>
                    </Link>
                    <p className="text-sm lg:text-base font-bold text-[#1A1917]">
                      {Number(item.unit_price).toFixed(2)}€
                      <span className="text-xs font-normal text-[#706F6C] ml-1">/ {item.unit}</span>
                    </p>

                    {/* Variations */}
                    {item.variations && item.variations.length > 0 && (
                      <div className="pt-2 flex gap-1.5 flex-wrap">
                        {item.variations.slice(0, 5).map((v, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedVariation(p => ({...p, [item.id]: idx}))}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              (selectedVariation[item.id] ?? item.variations?.findIndex(v => v.is_default === 1)) === idx
                                ? 'border-[#1A1917] scale-110'
                                : 'border-transparent hover:border-[#E8E6E3]'
                            }`}
                            style={{
                              background: v.image_url ? `url(${v.image_url}) center/cover` : '#E8E6E3',
                            }}
                            title={v.color_name}
                          />
                        ))}
                        {item.variations.length > 5 && (
                          <span className="text-xs text-[#706F6C] self-center">+{item.variations.length - 5}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Empty state */}
            {items.length === 0 && (
              <div className="text-center py-20 lg:py-32">
                <div className="w-20 h-20 mx-auto mb-6 bg-[#F5F5F4] rounded-full flex items-center justify-center">
                  <IconSearch size={32} className="text-[#D4D4D4]" />
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-[#1A1917] mb-2">Aucun article trouvé</h3>
                <p className="text-[#706F6C] mb-8 max-w-md mx-auto">
                  Nous n'avons trouvé aucun produit correspondant à vos critères. Essayez d'ajuster vos filtres.
                </p>
                <button
                  onClick={() => { setSearchTerm(''); setSelectedCategory(''); }}
                  className="inline-flex h-12 items-center justify-center bg-[#1A1917] px-8 text-sm font-medium text-white hover:bg-[#2D2B28] transition-colors"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-16 lg:mt-20 flex items-center justify-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                  className="h-10 w-10 lg:h-12 lg:w-12 flex items-center justify-center border border-[#E8E6E3] bg-white text-[#1A1917] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#1A1917] hover:text-white hover:border-[#1A1917] transition-colors"
                >
                  <IconChevronLeft size={18} />
                </button>

                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-10 w-10 lg:h-12 lg:w-12 flex items-center justify-center text-sm font-bold transition-colors ${
                          currentPage === pageNum
                            ? 'bg-[#1A1917] text-white'
                            : 'border border-[#E8E6E3] bg-white text-[#1A1917] hover:bg-[#F5F5F4]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                  className="h-10 w-10 lg:h-12 lg:w-12 flex items-center justify-center border border-[#E8E6E3] bg-white text-[#1A1917] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#1A1917] hover:text-white hover:border-[#1A1917] transition-colors"
                >
                  <IconChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-in {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}

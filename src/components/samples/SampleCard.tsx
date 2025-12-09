import { useState } from 'react';
import { Plus, Check } from 'lucide-react';
import type { SampleColor } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

interface SampleCardProps {
  color: SampleColor;
  material: string;
  onAddToCart: (colorId: number) => Promise<void>;
  isInCart?: boolean;
  isLimitReached?: boolean;
  index?: number;
}

export function SampleCard({
  color,
  material,
  onAddToCart,
  isInCart = false,
  isLimitReached = false,
  index = 0
}: SampleCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleAddToCart = async () => {
    if (isAdding || isInCart || isLimitReached) return;

    setIsAdding(true);
    try {
      await onAddToCart(color.id);
      toast.success(`${color.name} ajouté à votre sélection`);
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'ajout');
    } finally {
      setIsAdding(false);
    }
  };

  const isDisabled = isInCart || isLimitReached || isAdding;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative"
    >
      <div className={`relative overflow-hidden rounded-2xl bg-white transition-all duration-500 ${
        isHovered ? 'shadow-2xl shadow-black/10' : 'shadow-md shadow-black/5'
      }`}>
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden">
          {color.image_url ? (
            <motion.img
              src={color.image_url}
              alt={color.name}
              className="h-full w-full object-cover"
              animate={{ scale: isHovered ? 1.05 : 1 }}
              transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
            />
          ) : (
            <div
              className="h-full w-full"
              style={{ backgroundColor: color.hex || '#E8E4DE' }}
            />
          )}

          {/* Gradient overlay on hover */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Status badge */}
          {isInCart && (
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-[#1A1917] px-3 py-1.5 text-xs font-medium text-white">
              <Check className="h-3 w-3" />
              Sélectionné
            </div>
          )}

          {/* Add button - appears on hover */}
          <motion.div
            className="absolute inset-x-4 bottom-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={handleAddToCart}
              disabled={isDisabled}
              className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${
                isInCart
                  ? 'cursor-default bg-white/90 text-[#1A1917]'
                  : isLimitReached
                  ? 'cursor-not-allowed bg-white/50 text-white/70'
                  : 'bg-white text-[#1A1917] hover:bg-white/90 active:scale-[0.98]'
              }`}
            >
              {isAdding ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A1917] border-t-transparent" />
              ) : isInCart ? (
                <>
                  <Check className="h-4 w-4" />
                  Dans votre sélection
                </>
              ) : isLimitReached ? (
                'Limite atteinte'
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Ajouter
                </>
              )}
            </button>
          </motion.div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-[#1A1917]">{color.name}</h3>
              <p className="mt-0.5 text-sm text-[#6B6560]">{material}</p>
            </div>

            {/* Color swatch */}
            {color.hex && (
              <div
                className="h-6 w-6 shrink-0 rounded-full border border-black/10"
                style={{ backgroundColor: color.hex }}
              />
            )}
          </div>

          {/* Free badge */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-medium text-[#8B7355]">
              Échantillon gratuit
            </span>

            {/* Mobile add button */}
            <button
              onClick={handleAddToCart}
              disabled={isDisabled}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all sm:hidden ${
                isInCart
                  ? 'bg-[#1A1917] text-white'
                  : isLimitReached
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-[#F5F3F0] text-[#1A1917] active:bg-[#E8E4DE]'
              }`}
            >
              {isAdding ? (
                <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
              ) : isInCart ? (
                <Check className="h-3 w-3" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

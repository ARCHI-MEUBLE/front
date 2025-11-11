import { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import type { SampleColor } from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

interface SampleCardProps {
  color: SampleColor;
  material: string;
  onAddToCart: (colorId: number) => Promise<void>;
  isInCart?: boolean;
  isLimitReached?: boolean;
}

export function SampleCard({ color, material, onAddToCart, isInCart = false, isLimitReached = false }: SampleCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const handleAddToCart = async () => {
    if (isAdding || justAdded || isInCart || isLimitReached) return;

    setIsAdding(true);
    try {
      await onAddToCart(color.id);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } catch (error: any) {
      console.error('Erreur ajout panier:', error);
      toast.error(error.message || 'Erreur lors de l\'ajout au panier');
    } finally {
      setIsAdding(false);
    }
  };

  const isDisabled = isInCart || isLimitReached || isAdding;

  return (
    <motion.div
      className="group flex flex-col items-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.03 }}
    >
      {/* Image de l'échantillon */}
      <div className="relative" role="img" aria-label={`Échantillon ${color.name} en ${material}`}>
        <motion.div
          className="h-32 w-32 overflow-hidden rounded-3xl border-2 border-border-light bg-white shadow-sm"
          whileHover={{ scale: 1.05, rotate: 2 }}
          transition={{ duration: 0.2 }}
          style={{ backgroundColor: color.image_url ? undefined : (color.hex || '#EEE') }}
        >
          {color.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={color.image_url}
              alt={`Échantillon de couleur ${color.name}`}
              className="h-full w-full object-cover"
            />
          ) : null}
        </motion.div>

        {/* Badge "Ajouté" */}
        {justAdded && (
          <motion.div
            className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-2 shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.4 }}
          >
            <Check className="h-4 w-4" />
          </motion.div>
        )}
      </div>

      {/* Nom de la couleur */}
      <div className="mt-4 text-center">
        <h3 className="text-sm font-bold tracking-wide text-ink uppercase">
          {color.name}
        </h3>
        <p className="text-xs text-ink/60 mt-1">{material}</p>
      </div>

      {/* Bouton Commander */}
      <motion.button
        type="button"
        onClick={handleAddToCart}
        disabled={isDisabled || justAdded}
        whileHover={{ scale: isDisabled ? 1 : 1.05 }}
        whileTap={{ scale: isDisabled ? 1 : 0.95 }}
        className={`
          mt-4 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold
          transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2
          ${justAdded || isInCart
            ? 'bg-green-500 text-white cursor-default focus:ring-green-500'
            : isLimitReached
            ? 'bg-gray-400 text-white cursor-not-allowed focus:ring-gray-400'
            : 'bg-ink text-white hover:bg-ink/90 hover:shadow-md active:scale-95 focus:ring-ink'
          }
          disabled:opacity-70 disabled:cursor-not-allowed
        `}
        title={isLimitReached ? 'Limite de 3 échantillons atteinte' : isInCart ? 'Déjà dans votre panier' : ''}
        aria-label={
          justAdded || isInCart
            ? `Échantillon ${color.name} déjà ajouté au panier`
            : isLimitReached
            ? 'Limite de 3 échantillons gratuits atteinte'
            : `Commander un échantillon gratuit ${color.name}`
        }
        aria-disabled={isDisabled || justAdded}
      >
        {justAdded || isInCart ? (
          <>
            <Check className="h-4 w-4" />
            <span>{isInCart ? 'Dans le panier' : 'Ajouté !'}</span>
          </>
        ) : isLimitReached ? (
          <span>Limite atteinte</span>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" />
            <span>{isAdding ? 'Ajout...' : 'Commander'}</span>
          </>
        )}
      </motion.button>

      {/* Badge "Gratuit" */}
      <motion.div
        className="mt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <span className="inline-block bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full border border-green-200">
          Gratuit
        </span>
      </motion.div>
    </motion.div>
  );
}

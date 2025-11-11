import { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import type { SampleColor } from '@/lib/apiClient';

interface SampleCardProps {
  color: SampleColor;
  material: string;
  onAddToCart: (colorId: number) => Promise<void>;
}

export function SampleCard({ color, material, onAddToCart }: SampleCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const handleAddToCart = async () => {
    if (isAdding || justAdded) return;

    setIsAdding(true);
    try {
      await onAddToCart(color.id);
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } catch (error) {
      console.error('Erreur ajout panier:', error);
      alert('Erreur lors de l\'ajout au panier');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="group flex flex-col items-center">
      {/* Image de l'échantillon */}
      <div className="relative">
        <div
          className="h-32 w-32 overflow-hidden rounded-3xl border-2 border-border-light bg-white shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:scale-105"
          style={{ backgroundColor: color.image_url ? undefined : (color.hex || '#EEE') }}
        >
          {color.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={color.image_url}
              alt={color.name}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        {/* Badge "Ajouté" */}
        {justAdded && (
          <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-2 shadow-lg animate-bounce">
            <Check className="h-4 w-4" />
          </div>
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
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={isAdding || justAdded}
        className={`
          mt-4 flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold
          transition-all duration-200 shadow-sm
          ${justAdded
            ? 'bg-green-500 text-white cursor-default'
            : 'bg-ink text-white hover:bg-ink/90 hover:shadow-md active:scale-95'
          }
          disabled:opacity-70 disabled:cursor-not-allowed
        `}
      >
        {justAdded ? (
          <>
            <Check className="h-4 w-4" />
            <span>Ajouté !</span>
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" />
            <span>{isAdding ? 'Ajout...' : 'Commander'}</span>
          </>
        )}
      </button>

      {/* Badge "Gratuit" */}
      <div className="mt-2">
        <span className="inline-block bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full border border-green-200">
          Gratuit
        </span>
      </div>
    </div>
  );
}

import { Check } from 'lucide-react';
import type { SampleColor } from '@/lib/apiClient';

interface FacadeColorSelectorProps {
  colors: SampleColor[];
  // Identifiant de la couleur actuelle des façades (null = couleur par défaut)
  selectedColorId: number | null;
  // Vrai tant que les façades suivent la couleur de la structure
  sameAsStructure: boolean;
  loading?: boolean;
  onSelect: (color: SampleColor) => void;
  onReset: () => void;
}

export default function FacadeColorSelector({
  colors,
  selectedColorId,
  sameAsStructure,
  loading = false,
  onSelect,
  onReset,
}: FacadeColorSelectorProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="h-5 w-5 animate-spin border-2 border-[#1A1917] border-t-transparent" style={{ borderRadius: '50%' }} />
      </div>
    );
  }

  if (colors.length === 0) {
    return (
      <p className="border border-dashed border-[#C9C6BF] bg-white px-3 py-3 text-xs text-[#706F6C]" style={{ borderRadius: '2px' }}>
        Aucune couleur disponible pour cette matière.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onReset}
        aria-pressed={sameAsStructure}
        className={`flex w-full items-center justify-between gap-3 border-2 px-3 py-2.5 text-left transition-all ${
          sameAsStructure
            ? 'border-[#1A1917] bg-[#1A1917] text-white'
            : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
        }`}
        style={{ borderRadius: '4px' }}
      >
        <span>
          <span className="block text-[13px] font-semibold leading-tight">Identique à la structure</span>
          <span className={`mt-0.5 block text-[11px] leading-tight ${sameAsStructure ? 'text-white/70' : 'text-[#706F6C]'}`}>
            Portes et tiroirs dans la couleur du meuble
          </span>
        </span>
        {sameAsStructure && <Check className="h-4 w-4 flex-shrink-0" strokeWidth={2.5} />}
      </button>

      <div>
        <p className="mb-2 text-[11px] text-[#706F6C]">Ou choisissez une autre couleur pour les façades :</p>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {colors.map((color) => {
            const isSelected = !sameAsStructure && selectedColorId === color.id;
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => onSelect(color)}
                title={color.name || 'Sans nom'}
                aria-label={color.name || 'Couleur'}
                aria-pressed={isSelected}
                className={`relative aspect-square border-2 transition-all hover:scale-105 ${
                  isSelected
                    ? 'border-[#1A1917] ring-2 ring-[#1A1917] ring-offset-1'
                    : 'border-[#E8E6E3] hover:border-[#706F6C]'
                }`}
                style={{
                  backgroundColor: color.hex || '#D8C7A1',
                  backgroundImage: color.image_url ? `url(${color.image_url})` : undefined,
                  backgroundSize: 'cover',
                  borderRadius: '2px',
                }}
              >
                {isSelected && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <Check className="h-4 w-4 text-white" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

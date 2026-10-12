import { ChevronLeft, ChevronRight, DoorClosed, Lightbulb, Rows3, X } from 'lucide-react';
import type { ZoneDomain } from './steps';

interface ZoneQuickMenuProps {
  title: string;
  size?: { width: number; height: number } | null;
  // Navigation entre compartiments (précédent / suivant)
  canNavigate: boolean;
  onPrev: () => void;
  onNext: () => void;
  // Famille d'actions de l'étape en cours, mise en avant
  activeDomain: ZoneDomain | null;
  onDomain: (domain: ZoneDomain) => void;
  onClose: () => void;
}

const DOMAINS: { id: ZoneDomain; label: string; hint: string; icon: typeof Rows3 }[] = [
  { id: 'division', label: 'Diviser', hint: 'Diviser cette zone en étagères ou en colonnes', icon: Rows3 },
  { id: 'facade', label: 'Façades', hint: 'Portes, tiroirs et poignées', icon: DoorClosed },
  { id: 'accessory', label: 'Accessoires', hint: 'Éclairage, passe-câble, penderie', icon: Lightbulb },
];

const iconButton =
  'flex h-8 w-8 items-center justify-center text-[#706F6C] transition-colors hover:bg-[#F5F5F4] hover:text-[#1A1917]';

// Menu « sur clic » : s'affiche sur le viewer dès qu'une zone est sélectionnée
export default function ZoneQuickMenu({
  title,
  size,
  canNavigate,
  onPrev,
  onNext,
  activeDomain,
  onDomain,
  onClose,
}: ZoneQuickMenuProps) {
  return (
    // Réservé aux grands écrans (sur mobile il recouvrirait le viewer). Le conteneur laisse la place aux
    // boutons annuler/rétablir (gauche) et au sélecteur Plan/3D (droite)
    <div className="pointer-events-none absolute z-20 hidden justify-center lg:left-[7.5rem] lg:right-[11.5rem] lg:top-4 lg:flex">
      <div
        role="toolbar"
        aria-label="Actions sur la zone sélectionnée"
        className="pointer-events-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-0.5 border border-[#E8E6E3] bg-white p-1 shadow-md"
        style={{ borderRadius: '2px' }}
      >
        {canNavigate && (
          <button type="button" onClick={onPrev} className={iconButton} aria-label="Compartiment précédent" title="Compartiment précédent">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        <div className="min-w-[96px] px-2 text-center leading-tight">
          <span className="block text-xs font-semibold text-[#1A1917]">{title}</span>
          {size && (
            <span className="block font-mono text-[10px] text-[#706F6C]">
              {Math.round(size.width)} × {Math.round(size.height)} mm
            </span>
          )}
        </div>

        {canNavigate && (
          <button type="button" onClick={onNext} className={iconButton} aria-label="Compartiment suivant" title="Compartiment suivant">
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        <span className="mx-1 h-6 w-px bg-[#E8E6E3]" />

        {DOMAINS.map(({ id, label, hint, icon: Icon }) => {
          const isActive = activeDomain === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onDomain(id)}
              title={hint}
              aria-pressed={isActive}
              className={`flex h-8 items-center gap-1.5 px-2 text-[11px] font-medium transition-colors ${
                isActive ? 'bg-[#1A1917] text-white' : 'text-[#706F6C] hover:bg-[#F5F5F4] hover:text-[#1A1917]'
              }`}
              style={{ borderRadius: '2px' }}
            >
              <Icon className="h-3.5 w-3.5" />
              {isActive && <span>{label}</span>}
            </button>
          );
        })}

        <button type="button" onClick={onClose} className={iconButton} aria-label="Désélectionner" title="Désélectionner">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

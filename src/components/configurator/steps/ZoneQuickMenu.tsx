import { ChevronLeft, ChevronRight, CornerLeftUp, RotateCcw, Trash2, X } from 'lucide-react';

interface ZoneQuickMenuProps {
  title: string;
  size?: { width: number; height: number } | null;
  // Ligne sous le titre quand il n'y a pas de cotes (planche sélectionnée)
  subtitle?: string;
  // Libellé et info-bulle du bouton de suppression (par défaut : la section)
  deleteLabel?: string;
  deleteHint?: string;
  // Remet un panneau retiré
  onRestore?: () => void;
  // Zone voisine (même niveau) précédente / suivante : absent s'il n'y en a pas
  onPrev?: () => void;
  onNext?: () => void;
  // Sélectionne le groupe qui contient la zone : absent pour le meuble entier
  onParent?: () => void;
  // Supprime la section (sa voisine récupère sa place) : absent pour le meuble entier
  onDelete?: () => void;
  onClose: () => void;
}

const iconButton =
  'flex h-8 w-8 items-center justify-center text-black/65 transition-colors hover:bg-am-mist/30 hover:text-black';

// Menu « sur clic » : indique la zone sélectionnée sur le viewer, permet de passer à la voisine
// ou de remonter au groupe parent, ou de supprimer la section
export default function ZoneQuickMenu({
  title,
  size,
  subtitle,
  deleteLabel = 'Supprimer',
  deleteHint = 'Supprimer cette section : la section voisine prend sa place',
  onRestore,
  onPrev,
  onNext,
  onParent,
  onDelete,
  onClose,
}: ZoneQuickMenuProps) {
  return (
    // Réservé aux grands écrans (sur mobile il recouvrirait le viewer). Le conteneur laisse la place aux
    // boutons annuler/rétablir (gauche) et au sélecteur Plan/3D (droite)
    <div className="pointer-events-none absolute z-20 hidden justify-center @container lg:left-[7.5rem] lg:right-[11.5rem] lg:top-4 lg:flex">
      <div
        role="toolbar"
        aria-label="Zone sélectionnée"
        className="pointer-events-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-0.5 border border-black/10 bg-white p-1 shadow-md"
        style={{ borderRadius: '2px' }}
      >
        {onPrev && (
          <button type="button" onClick={onPrev} className={iconButton} aria-label="Zone précédente" title="Zone précédente">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        <div className="min-w-[96px] px-2 text-center leading-tight">
          <span className="block text-xs font-semibold text-black">{title}</span>
          {size && (
            <span className="block font-mono text-[10px] text-black/65">
              {Math.round(size.width)} × {Math.round(size.height)} mm
            </span>
          )}
          {!size && subtitle && <span className="block text-[10px] text-black/65">{subtitle}</span>}
        </div>

        {onNext && (
          <button type="button" onClick={onNext} className={iconButton} aria-label="Zone suivante" title="Zone suivante">
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {onParent && (
          <>
            <span className="mx-1 h-6 w-px bg-black/10" />
            <button
              type="button"
              onClick={onParent}
              className="flex h-8 min-w-8 items-center justify-center gap-1.5 px-2 text-[11px] font-medium text-black/65 transition-colors hover:bg-am-mist/30 hover:text-black"
              style={{ borderRadius: '2px' }}
              aria-label="Sélectionner le groupe parent"
              title="Sélectionner le groupe qui contient cette zone"
            >
              <CornerLeftUp className="h-3.5 w-3.5" />
              {/* Icône seule quand la place manque (viewer étroit) */}
              <span className="hidden @min-[22.5rem]:inline">Groupe parent</span>
            </button>
          </>
        )}

        {onDelete && (
          <>
            <span className="mx-1 h-6 w-px bg-black/10" />
            <button
              type="button"
              onClick={onDelete}
              className="flex h-8 min-w-8 items-center justify-center gap-1.5 px-2 text-[11px] font-medium text-black/65 transition-colors hover:bg-red-50 hover:text-red-600"
              style={{ borderRadius: '2px' }}
              aria-label={deleteLabel}
              title={deleteHint}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden @min-[22.5rem]:inline">{deleteLabel}</span>
            </button>
          </>
        )}

        {onRestore && (
          <>
            <span className="mx-1 h-6 w-px bg-black/10" />
            <button
              type="button"
              onClick={onRestore}
              className="flex h-8 min-w-8 items-center justify-center gap-1.5 px-2 text-[11px] font-medium text-black/65 transition-colors hover:bg-am-mist/30 hover:text-black"
              style={{ borderRadius: '2px' }}
              aria-label="Remettre la planche"
              title="Remettre ce panneau sur le meuble"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden @min-[22.5rem]:inline">Remettre la planche</span>
            </button>
          </>
        )}

        <span className="mx-1 h-6 w-px bg-black/10" />

        <button type="button" onClick={onClose} className={iconButton} aria-label="Désélectionner" title="Désélectionner">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

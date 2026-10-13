import type { RefObject } from 'react';
import { Focus, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { VIEW_LABELS, type ViewPreset } from '@/lib/configurator/cameraFraming';
import type { CameraApi } from './CameraRig';

interface CameraToolbarProps {
  apiRef: RefObject<CameraApi | null>;
  hasSelection: boolean;
}

const VIEWS: ViewPreset[] = ['front', 'threeQuarter', 'side', 'top'];
const VIEW_TITLES: Record<ViewPreset, string> = {
  front: 'Vue de face',
  threeQuarter: 'Vue en perspective',
  side: 'Vue de côté',
  top: 'Vue de dessus',
};

const panel = 'pointer-events-auto flex items-center border border-[#E8E6E3] bg-white shadow-sm lg:flex-col';
const button =
  'flex h-9 min-w-9 items-center justify-center gap-1.5 px-2 text-xs font-medium text-[#706F6C] transition-colors hover:bg-[#F5F5F4] hover:text-[#1A1917] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-[#706F6C] lg:w-14';
// Les boutons sont côte à côte sur mobile, empilés sur ordinateur : le trait de séparation suit
const separator = 'border-l border-[#E8E6E3] lg:border-l-0 lg:border-t';

// Commandes de la caméra : vues prédéfinies, zoom, cadrage du meuble ou de la zone choisie.
// Sur ordinateur : colonne sur le bord droit, sous le sélecteur Plan 2D / Vue 3D. Le bas du viewer est
// déjà pris par les actions (décorations, portes…) et, en développement, par l'indicateur de Next.js.
// Sur mobile : en bas à gauche, le meuble laisse de la place sous lui.
export function CameraToolbar({ apiRef, hasSelection }: CameraToolbarProps) {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-1.5 lg:bottom-auto lg:left-auto lg:right-4 lg:top-[4.25rem] lg:flex-col lg:items-end lg:gap-2">
      <div className={`${panel} hidden lg:flex`} style={{ borderRadius: '2px' }} role="group" aria-label="Vues">
        {VIEWS.map((view, index) => (
          <button
            key={view}
            type="button"
            onClick={() => apiRef.current?.setView(view)}
            title={VIEW_TITLES[view]}
            aria-label={VIEW_TITLES[view]}
            className={`${button} ${index > 0 ? separator : ''}`}
          >
            {VIEW_LABELS[view]}
          </button>
        ))}
      </div>

      <div className={panel} style={{ borderRadius: '2px' }} role="group" aria-label="Zoom">
        <button type="button" onClick={() => apiRef.current?.zoomBy(1.3)} title="Éloigner" aria-label="Éloigner" className={button}>
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => apiRef.current?.zoomBy(1 / 1.3)}
          title="Rapprocher"
          aria-label="Rapprocher"
          className={`${button} ${separator}`}
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => apiRef.current?.frame('furniture')}
          title="Recentrer sur le meuble"
          aria-label="Recentrer sur le meuble"
          className={`${button} ${separator}`}
        >
          <Maximize2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => apiRef.current?.frame('selection')}
          disabled={!hasSelection}
          title="Zoomer sur la zone sélectionnée"
          aria-label="Zoomer sur la zone sélectionnée"
          className={`${button} ${separator} hidden lg:flex`}
        >
          <Focus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

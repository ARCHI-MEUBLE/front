import React from 'react';
import dynamic from 'next/dynamic';

import { Zone } from './ZoneEditor/types';
import { ComponentColors } from './MaterialSelector';
import type { ThreeCanvasHandle } from './types';

// On utilise dynamic import pour forcer le rendu côté client uniquement
const ThreeCanvas = dynamic(() => import('./ThreeCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#FAFAF9]" style={{ minHeight: '500px' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin border-4 border-[#1A1917] border-t-transparent rounded-full" />
        <p className="text-sm font-medium text-[#706F6C]">Initialisation du studio 3D...</p>
      </div>
    </div>
  )
});

export interface ThreeViewerProps {
  width: number;
  height: number;
  depth: number;
  color: string;
  imageUrl?: string | null;
  hasSocle: boolean;
  socle?: string;
  rootZone: Zone | null;
  selectedZoneId?: string | null;
  onSelectZone?: (id: string | null) => void;
  isBuffet?: boolean;
  doorsOpen?: boolean;
  showDecorations?: boolean;
  onToggleDoors?: () => void;
  componentColors?: ComponentColors;
  useMultiColor?: boolean;
  doorType?: 'none' | 'single' | 'double';
  doorSide?: 'left' | 'right';
  onCaptureReady?: (captureFunction: () => string | null) => void;
}

// Export du type pour utilisation externe
export type { ThreeCanvasHandle };

export default function ThreeViewer(props: ThreeViewerProps) {
  // On s'assure que le conteneur a une taille explicite
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px', position: 'relative' }}>
      <ThreeCanvas {...props} />
    </div>
  );
}

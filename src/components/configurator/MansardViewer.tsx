import React from 'react';
import dynamic from 'next/dynamic';

import { Zone } from './ZoneEditor/types';
import { ComponentColors } from './MaterialSelector';
import type { ThreeCanvasHandle } from './types';

// On utilise dynamic import pour forcer le rendu côté client uniquement
const SlopedThreeCanvas = dynamic(() => import('./SlopedThreeCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#FAFAF9]" style={{ minHeight: '100%' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin border-4 border-[#1A1917] border-t-transparent rounded-full" />
        <p className="text-sm font-medium text-[#706F6C]">Initialisation du studio 3D Mansarde...</p>
      </div>
    </div>
  )
});

export interface MansardViewerProps {
  width: number;
  height: number;
  heightRight: number;
  depth: number;
  color: string;
  imageUrl?: string | null;
  hasSocle: boolean;
  socle?: string;
  rootZone: Zone | null;
  selectedZoneIds?: string[];
  onSelectZone?: (id: string | null) => void;
  isBuffet?: boolean;
  doorsOpen?: boolean;
  showDecorations?: boolean;
  onToggleDoors?: () => void;
  componentColors?: ComponentColors;
  useMultiColor?: boolean;
  doorType?: 'none' | 'single' | 'double';
  doorSide?: 'left' | 'right';
  mountingStyle?: 'applique' | 'encastre';
  onCaptureReady?: (captureFunction: () => string | null) => void;
  // Panel selection and deletion
  selectedPanelIds?: Set<string>;
  onSelectPanel?: (panelId: string | null) => void;
  deletedPanelIds?: Set<string>;
}

export default function MansardViewer(props: MansardViewerProps) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <SlopedThreeCanvas {...props} />
    </div>
  );
}

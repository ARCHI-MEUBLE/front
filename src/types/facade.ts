// Types pour les façades
export interface DrillingType {
  id: number;
  name: string;
  description: string;
  icon_svg: string;
  price: number;
  is_active: boolean;
  created_at: string;
}

export interface FacadeDrilling {
  id: string;
  type: string;
  typeName?: string;
  drilling_type_id?: number; // ID du type de perçage sélectionné
  x: number; // Position X en pourcentage (0-100)
  y: number; // Position Y en pourcentage (0-100)
  width?: number; // Largeur en mm (pour perçages rectangulaires)
  height?: number; // Hauteur en mm (pour perçages rectangulaires)
  diameter?: number; // Diamètre en mm (pour perçages circulaires)
  price?: number;
}

export interface FacadeMaterial {
  id: number;
  name: string;
  color_hex: string;
  texture_url?: string;
  price_modifier: number;
  price_per_m2: number;
  is_active: boolean;
}

export type HingeType = 
  | 'no-hole-no-hinge' 
  | 'hole-with-applied-hinge' 
  | 'hole-with-twin-hinge' 
  | 'hole-with-integrated-hinge';

export type HingeCount = 2 | 3 | 4 | 5;

export type OpeningDirection = 'left' | 'right';

export interface HingeConfig {
  type: HingeType;
  count: HingeCount;
  direction: OpeningDirection;
  price: number;
}

export interface FacadeConfig {
  width: number; // en mm
  height: number; // en mm
  depth: number; // en mm
  material: FacadeMaterial;
  hinges: HingeConfig;
  drillings: FacadeDrilling[];
}

export interface SavedFacade {
  id: number;
  customer_id?: number;
  facade_id?: number;
  configuration_data: string;
  preview_image?: string;
  total_price: number;
  created_at: string;
  updated_at: string;
}

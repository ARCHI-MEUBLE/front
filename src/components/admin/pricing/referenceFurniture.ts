// Meubles de référence de la simulation : les modèles du site qui ont une configuration 3D, ou, à défaut, trois
// meubles types (même forme que config_data à l'enregistrement d'une configuration).
import type { ReferenceModel } from '@/lib/pricingAdminApi';

export interface ReferenceFurniture {
  key: string;
  name: string;
  configData: Record<string, unknown>;
}

const HANDLES = { modelId: null, doorOrientation: 'vertical', drawerOrientation: 'horizontal' };

function sample(
  key: string,
  name: string,
  [width, height, depth]: [number, number, number],
  material: string,
  socle: 'none' | 'metal' | 'wood',
  advancedZones: Record<string, unknown>
): ReferenceFurniture {
  return {
    key,
    name,
    configData: {
      dimensions: { width, height, depth },
      styling: { materialKey: material, finish: material, socle },
      features: { doorType: 'none' },
      advancedZones,
      handles: HANDLES,
    },
  };
}

const leaf = (id: string, content: string, extra: Record<string, unknown> = {}) => ({ id, type: 'leaf', content, ...extra });

export function sampleFurniture(material: string): ReferenceFurniture[] {
  return [
    sample('sample-tv', 'Meuble TV type', [1700, 600, 450], material, 'metal', {
      id: 'root',
      type: 'vertical',
      splitRatios: [33, 34, 33],
      children: [leaf('tv-1', 'drawer'), leaf('tv-2', 'shelf', { hasCableHole: true }), leaf('tv-3', 'door_right')],
    }),
    sample('sample-library', 'Bibliothèque type', [1200, 2000, 350], material, 'wood', {
      id: 'root',
      type: 'horizontal',
      children: [leaf('lib-1', 'empty'), leaf('lib-2', 'empty'), leaf('lib-3', 'empty'), leaf('lib-4', 'empty'), leaf('lib-5', 'door_double')],
    }),
    sample('sample-wardrobe', 'Dressing type', [2000, 2200, 600], material, 'none', {
      id: 'root',
      type: 'vertical',
      children: [
        leaf('dr-1', 'dressing', { doorContent: 'door_double', hasLight: true }),
        {
          id: 'dr-2',
          type: 'horizontal',
          children: [leaf('dr-2a', 'shelf'), leaf('dr-2b', 'shelf'), leaf('dr-2c', 'drawer'), leaf('dr-2d', 'drawer')],
        },
      ],
    }),
  ];
}

export function fromModels(models: ReferenceModel[]): ReferenceFurniture[] {
  return models.map((m) => ({ key: `model-${m.id}`, name: m.name, configData: m.configData }));
}

// « 170 × 60 × 45 cm » (largeur × hauteur × profondeur)
export function describeDimensions(configData: Record<string, unknown>): string {
  const d = (configData.dimensions ?? {}) as Record<string, unknown>;
  const cm = (v: unknown) => (Number(v) / 10).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  return `${cm(d.width)} × ${cm(d.height)} × ${cm(d.depth)} cm`;
}

export function describeMaterial(configData: Record<string, unknown>): string | null {
  const styling = (configData.styling ?? {}) as Record<string, unknown>;
  const material = styling.materialKey ?? styling.finish;
  return typeof material === 'string' && material.trim() ? material : null;
}

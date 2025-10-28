// src/utils/stylePresets.ts

export interface StylePreset {
  id: string
  name: string
  description: string
  thumbnail: string
  config: {
    finish: string
    color: string
    doors: number
    socle: boolean
    baseDimensions?: {
      width: number
      depth: number
      height: number
    }
  }
}

export const stylePresets: StylePreset[] = [
  {
    id: 'classique',
    name: 'Style Classique',
    description: 'Bois naturel, finition mate, design intemporel',
    thumbnail: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=250&fit=crop&q=80',
    config: {
      finish: 'mat',
      color: '#8B4513', // Brun classique
      doors: 2,
      socle: true,
      baseDimensions: {
        width: 1200,
        depth: 400,
        height: 800
      }
    }
  },
  {
    id: 'moderne',
    name: 'Style Moderne',
    description: 'Laqué blanc brillant, lignes épurées, minimaliste',
    thumbnail: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=250&fit=crop&q=80',
    config: {
      finish: 'brillant',
      color: '#FFFFFF', // Blanc
      doors: 1,
      socle: false,
      baseDimensions: {
        width: 1600,
        depth: 350,
        height: 700
      }
    }
  },
  {
    id: 'scandinave',
    name: 'Style Scandinave',
    description: 'Bois clair, finition naturelle, fonctionnel',
    thumbnail: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&h=250&fit=crop&q=80',
    config: {
      finish: 'mat',
      color: '#F5DEB3', // Bois clair
      doors: 2,
      socle: true,
      baseDimensions: {
        width: 1400,
        depth: 380,
        height: 750
      }
    }
  },
  {
    id: 'industriel',
    name: 'Style Industriel',
    description: 'Métal noir, finition brute, esprit loft',
    thumbnail: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=400&h=250&fit=crop&q=80',
    config: {
      finish: 'mat',
      color: '#2C2C2C', // Noir/gris foncé
      doors: 3,
      socle: false,
      baseDimensions: {
        width: 1800,
        depth: 400,
        height: 900
      }
    }
  },
  {
    id: 'contemporain',
    name: 'Style Contemporain',
    description: 'Finition satinée, couleurs neutres, élégant',
    thumbnail: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=250&fit=crop&q=80',
    config: {
      finish: 'satiné',
      color: '#E8E8E8', // Gris clair
      doors: 2,
      socle: true,
      baseDimensions: {
        width: 1500,
        depth: 420,
        height: 850
      }
    }
  },
  {
    id: 'rustique',
    name: 'Style Rustique',
    description: 'Bois massif, finition vieillie, authentique',
    thumbnail: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&h=250&fit=crop&q=80',
    config: {
      finish: 'mat',
      color: '#654321', // Brun foncé
      doors: 4,
      socle: true,
      baseDimensions: {
        width: 2000,
        depth: 450,
        height: 950
      }
    }
  }
]

/**
 * Applique un preset de style à la configuration actuelle
 */
export function applyStylePreset(
  preset: StylePreset,
  currentConfig: any
): any {
  return {
    ...currentConfig,
    finish: preset.config.finish,
    color: preset.config.color,
    doors: preset.config.doors,
    socle: preset.config.socle,
    // Optionnel : appliquer les dimensions si l'utilisateur le souhaite
    ...(preset.config.baseDimensions && {
      width: preset.config.baseDimensions.width,
      depth: preset.config.baseDimensions.depth,
      height: preset.config.baseDimensions.height
    })
  }
}

/**
 * Génère un prompt enrichi à partir d'un preset
 */
export function generatePromptFromPreset(
  baseModel: string,
  preset: StylePreset
): string {
  const { width, depth, height } = preset.config.baseDimensions || { 
    width: 1200, 
    depth: 400, 
    height: 800 
  }
  
  // Format: M1(width,depth,height)finish,color,doors,socle
  const finishCode = preset.config.finish === 'brillant' ? 'B' : 
                     preset.config.finish === 'satiné' ? 'S' : 'M'
  
  return `${baseModel}(${width},${depth},${height})${finishCode},${preset.config.color},D${preset.config.doors},${preset.config.socle ? 'socle' : 'nosocle'}`
}

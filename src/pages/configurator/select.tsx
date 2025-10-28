import Link from 'next/link'
import Image from 'next/image'
import Head from 'next/head'
import { useState } from 'react'

const presets = [
  { 
    id: 'M1', 
    name: 'M1 - Meuble TV', 
    default: 'M1(1000,400,1000)E',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=250&fit=crop&q=80',
    description: 'Meuble TV classique, format horizontal',
    dimensions: { largeur: 1000, profondeur: 400, hauteur: 1000 }
  },
  { 
    id: 'M2', 
    name: 'M2 - Sous mansarde', 
    default: 'M2(2000,450,700,1200)E',
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&h=250&fit=crop&q=80',
    description: 'Meuble sous mansarde (hauteur variable)',
    dimensions: { largeur: 2000, profondeur: 450, hauteur: '700-1200' }
  },
  { 
    id: 'M3', 
    name: 'M3 - Sous escalier', 
    default: 'M3(1500,400,800,1500)E',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=250&fit=crop&q=80',
    description: 'Meuble sous escalier (hauteur progressive)',
    dimensions: { largeur: 1500, profondeur: 400, hauteur: '800-1500' }
  },
  { 
    id: 'M4', 
    name: 'M4 - Design complexe', 
    default: 'M4(1200,400,900,1200)E',
    image: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=400&h=250&fit=crop&q=80',
    description: 'Design moderne avec hauteurs variées',
    dimensions: { largeur: 1200, profondeur: 400, hauteur: '900-1200' }
  },
]

export default function SelectPage() {
  const [choice, setChoice] = useState(presets[0].id)
  const [prompt, setPrompt] = useState(presets[0].default)
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null)
  const [previewGlb, setPreviewGlb] = useState<{ [key: string]: string | null }>({})
  const [loadingPreview, setLoadingPreview] = useState<{ [key: string]: boolean }>({})

  // Générer le GLB pour la preview au hover
  const generatePreview = async (presetId: string, promptStr: string) => {
    if (previewGlb[presetId] || loadingPreview[presetId]) return; // Déjà généré ou en cours

    setLoadingPreview(prev => ({ ...prev, [presetId]: true }));
    
    try {
      const response = await fetch('http://localhost:8000/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptStr, closed: false })
      });

      if (!response.ok) throw new Error('Erreur génération');

      const data = await response.json();
      setPreviewGlb(prev => ({ ...prev, [presetId]: `http://localhost:8000${data.glb_url}` }));
    } catch (error) {
      console.error('Erreur génération preview:', error);
    } finally {
      setLoadingPreview(prev => ({ ...prev, [presetId]: false }));
    }
  };

  const handleMouseEnter = (presetId: string, promptStr: string) => {
    setHoveredPreset(presetId);
    generatePreview(presetId, promptStr);
  };

  function goToConfigurator() {
    // navigate to /configurator/[id]?prompt=...
    // We'll use Link programmatically via anchor
  }

  return (
    <>
      <Head>
        <title>Sélection du modèle - ArchiMeuble</title>
        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }
        `}</style>
      </Head>
      
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Choisir un meuble de départ</h1>
      <div className="grid grid-cols-2 gap-4 relative">
        {presets.map(p => (
          <div 
            key={p.id} 
            className={`border p-4 rounded cursor-pointer transition-all hover:shadow-lg ${choice === p.id ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}`}
            onClick={() => { setChoice(p.id); setPrompt(p.default) }}
            onMouseEnter={() => handleMouseEnter(p.id, p.default)}
            onMouseLeave={() => setHoveredPreset(null)}
          >
            <div className="relative w-full h-40 mb-3 rounded overflow-hidden">
              <Image 
                src={p.image} 
                alt={p.name} 
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
            <h2 className="font-semibold text-lg">{p.name}</h2>
            <p className="text-sm text-gray-500 mt-1">{p.description}</p>
            <p className="text-xs text-gray-400 mt-2">Prompt: {p.default}</p>
            <button 
              className="mt-3 w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 transition"
              onClick={(e) => { e.stopPropagation(); setChoice(p.id); setPrompt(p.default) }}
            >
              Sélectionner
            </button>
          </div>
        ))}
      </div>

      {/* Popup de prévisualisation au survol */}
      {hoveredPreset && (() => {
        const preset = presets.find(p => p.id === hoveredPreset);
        if (!preset) return null;
        
        const glbUrl = previewGlb[preset.id];
        const isLoading = loadingPreview[preset.id];
        
        return (
          <div 
            className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
            style={{ animation: 'fadeIn 0.2s ease-in-out' }}
          >
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-indigo-500 overflow-hidden max-w-md">
              {/* Zone 3D Viewer ou Image */}
              <div className="relative w-full h-64 bg-gradient-to-br from-gray-100 to-gray-200">
                {isLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                      <p className="mt-4 text-sm text-gray-600">Génération 3D...</p>
                    </div>
                  </div>
                ) : glbUrl ? (
                  <model-viewer
                    src={glbUrl}
                    alt={preset.name}
                    auto-rotate
                    camera-controls
                    style={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <Image 
                    src={preset.image} 
                    alt={preset.name} 
                    fill
                    sizes="400px"
                    className="object-cover"
                    priority
                  />
                )}
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent p-4">
                  <h3 className="text-xl font-bold text-white">{preset.name}</h3>
                  {glbUrl && <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">3D</span>}
                </div>
              </div>
              <div className="p-5 bg-gradient-to-br from-indigo-50 to-white">
                <p className="text-sm text-gray-700 mb-3">{preset.description}</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-white rounded-lg p-2 shadow-sm">
                    <p className="text-xs text-gray-500">Largeur</p>
                    <p className="text-lg font-bold text-indigo-600">{preset.dimensions.largeur}</p>
                    <p className="text-xs text-gray-400">mm</p>
                  </div>
                  <div className="bg-white rounded-lg p-2 shadow-sm">
                    <p className="text-xs text-gray-500">Profondeur</p>
                    <p className="text-lg font-bold text-indigo-600">{preset.dimensions.profondeur}</p>
                    <p className="text-xs text-gray-400">mm</p>
                  </div>
                  <div className="bg-white rounded-lg p-2 shadow-sm">
                    <p className="text-xs text-gray-500">Hauteur</p>
                    <p className="text-lg font-bold text-indigo-600">{preset.dimensions.hauteur}</p>
                    <p className="text-xs text-gray-400">mm</p>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-white rounded-lg text-xs text-gray-600 font-mono">
                  {preset.default}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="mt-6">
        <label className="block text-sm font-medium">Prompt / Dimensions</label>
        <input className="mt-1 input" value={prompt} onChange={e => setPrompt(e.target.value)} />
      </div>

      <div className="mt-6">
        <Link 
          href={`/configurator/${choice}?prompt=${encodeURIComponent(prompt)}`}
          className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition"
        >
          Aller au configurateur 3D →
        </Link>
      </div>
    </div>
    </>
  )
}

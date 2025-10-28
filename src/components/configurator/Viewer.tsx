import React, { useRef, useEffect } from 'react'

type Props = {
  glb?: string
}

export default function Viewer({ glb }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // We use <model-viewer> web component — ensure it's loaded in _app.tsx or add script tag
  }, [glb])

  return (
    <div className="w-full h-[600px] bg-gray-100 rounded overflow-hidden">
      {/* Use model-viewer if available, otherwise a placeholder */}
      {typeof window !== 'undefined' ? (
        glb ? (
          <model-viewer src={glb} alt="Meuble 3D" auto-rotate camera-controls ar ar-modes="webxr scene-viewer quick-look" exposure="1" style={{ width: '100%', height: '100%' }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center p-8">
              <div className="text-7xl mb-4">📦</div>
              <p className="text-gray-700 font-semibold text-lg">Modèle 3D en préparation</p>
              <p className="text-sm text-gray-600 mt-2">
                Ajustez les paramètres pour générer votre meuble personnalisé
              </p>
              <div className="mt-4 animate-pulse">
                <div className="inline-block h-2 w-32 bg-indigo-300 rounded"></div>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center">Preview</div>
      )}
    </div>
  )
}

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
    <div className="h-full w-full overflow-hidden bg-[#FAFAF9]">
      {/* Use model-viewer if available, otherwise a placeholder */}
      {typeof window !== 'undefined' ? (
        glb ? (
          <model-viewer
            src={glb}
            alt="Meuble 3D"
            auto-rotate
            camera-controls
            ar
            ar-modes="webxr scene-viewer quick-look"
            exposure="1"
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#FAFAF9]">
            <div className="text-center p-8">
              <div className="mb-4 text-6xl">📦</div>
              <p className="text-lg font-medium text-[#1A1917]">Modèle 3D en préparation</p>
              <p className="mt-2 text-sm text-[#706F6C]">
                Ajustez les paramètres pour générer votre meuble personnalisé
              </p>
              <div className="mt-6">
                <div
                  className="mx-auto h-1 w-32 bg-[#E8E6E3]"
                  style={{
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[#706F6C]">
          Chargement...
        </div>
      )}
    </div>
  )
}

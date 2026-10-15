import React, { useRef, useEffect } from 'react'

type Props = {
  glb?: string
}

export default function Viewer({ glb }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // We use <model-viewer> web component — the page using this component must load its script (see cart.tsx)
  }, [glb])

  return (
    <div className="h-full w-full overflow-hidden bg-am-mist/15">
      {/* Use model-viewer if available, otherwise a placeholder */}
      {typeof window !== 'undefined' ? (
        glb ? (
          <model-viewer
            src={glb}
            alt="Meuble 3D"
            auto-rotate
            camera-controls
            touch-action="pan-y"
            interaction-prompt="auto"
            ar
            ar-modes="webxr scene-viewer quick-look"
            exposure="1"
            style={{ width: '100%', height: '100%', touchAction: 'manipulation' }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-am-mist/15">
            <div className="text-center p-8">
              <div className="mb-4 text-6xl">📦</div>
              <p className="text-lg font-medium text-black">Modèle 3D en préparation</p>
              <p className="mt-2 text-sm text-black/65">
                Ajustez les paramètres pour générer votre meuble personnalisé
              </p>
              <div className="mt-6">
                <div
                  className="mx-auto h-1 w-32 bg-black/10"
                  style={{
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="flex h-full w-full items-center justify-center text-black/65">
          Chargement...
        </div>
      )}
    </div>
  )
}

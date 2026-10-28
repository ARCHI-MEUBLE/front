import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';

// Aperçu 3D (WebGL : navigateur seulement)
const ArModelPreview = dynamic(() => import('@/components/ar/ArModelPreview'), { ssr: false });

// Le meuble en 3D plein écran, dans la page : ne dépend pas de l'application Google (Scene Viewer), qui peut être
// absente ou en panne sur le téléphone
export default function Model3dDialog({ glbPath, title, onClose }: { glbPath: string; title: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${title} en 3D`} className="fixed inset-0 z-[1000] flex flex-col bg-am-paper">
      <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
        <p className="text-sm text-black/75">Faites tourner le meuble du doigt, pincez pour zoomer.</p>
        <button
          type="button"
          aria-label="Fermer la vue 3D"
          onClick={onClose}
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-black/15 bg-white text-black"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 bg-white" style={{ touchAction: 'none' }}>
        <ArModelPreview url={glbPath} />
      </div>
    </div>,
    document.body
  );
}

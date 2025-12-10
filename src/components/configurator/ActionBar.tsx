import { Eye, EyeOff, RotateCcw, Download, Share2 } from 'lucide-react';

interface ActionBarProps {
  doorsOpen: boolean;
  onToggleDoors: () => void;
  onReset?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  generating?: boolean;
}

export default function ActionBar({
  doorsOpen,
  onToggleDoors,
  onReset,
  onExport,
  onShare,
  generating = false,
}: ActionBarProps) {
  return (
    <div className="flex items-center justify-between border-t border-[#E8E6E3] bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        {/* Toggle portes ouvertes/fermées */}
        <button
          type="button"
          onClick={onToggleDoors}
          className={`flex h-10 items-center gap-2 border px-4 text-sm font-medium transition-colors ${
            doorsOpen
              ? 'border-[#1A1917] bg-[#1A1917] text-white'
              : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
          }`}
          style={{ borderRadius: '2px' }}
          title={doorsOpen ? 'Afficher fermé' : 'Afficher ouvert'}
        >
          {doorsOpen ? (
            <>
              <Eye className="h-4 w-4" />
              <span>Ouvert</span>
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4" />
              <span>Fermé</span>
            </>
          )}
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Réinitialiser */}
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="flex h-10 w-10 items-center justify-center border border-[#E8E6E3] bg-white text-[#706F6C] transition-colors hover:border-[#1A1917] hover:text-[#1A1917]"
            style={{ borderRadius: '2px' }}
            title="Réinitialiser la configuration"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}

        {/* Exporter */}
        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="flex h-10 w-10 items-center justify-center border border-[#E8E6E3] bg-white text-[#706F6C] transition-colors hover:border-[#1A1917] hover:text-[#1A1917]"
            style={{ borderRadius: '2px' }}
            title="Télécharger le fichier 3D"
          >
            <Download className="h-4 w-4" />
          </button>
        )}

        {/* Partager */}
        {onShare && (
          <button
            type="button"
            onClick={onShare}
            className="flex h-10 w-10 items-center justify-center border border-[#E8E6E3] bg-white text-[#706F6C] transition-colors hover:border-[#1A1917] hover:text-[#1A1917]"
            style={{ borderRadius: '2px' }}
            title="Partager cette configuration"
          >
            <Share2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Indicateur de génération */}
      {generating && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80">
          <div className="flex items-center gap-2 text-sm text-[#706F6C]">
            <div className="h-4 w-4 animate-spin border-2 border-[#1A1917] border-t-transparent" style={{ borderRadius: '50%' }} />
            <span>Génération...</span>
          </div>
        </div>
      )}
    </div>
  );
}

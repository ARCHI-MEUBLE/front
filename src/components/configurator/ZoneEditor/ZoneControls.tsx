import { Zone, ZoneContent, ZONE_CONTENT_META } from './types';

interface ZoneControlsProps {
  selectedZone: Zone;
  parentZone: Zone | null;
  onSplitZone: (zoneId: string, direction: 'horizontal' | 'vertical', count: number) => void;
  onSetContent: (zoneId: string, content: ZoneContent) => void;
  onResetZone: (zoneId: string) => void;
  onSetSplitRatio: (zoneId: string, ratio: number) => void;
  onSelectParent?: () => void;
}

export default function ZoneControls({
  selectedZone,
  parentZone,
  onSplitZone,
  onSetContent,
  onResetZone,
  onSetSplitRatio,
  onSelectParent,
}: ZoneControlsProps) {
  const isLeaf = selectedZone.type === 'leaf';
  const meta = ZONE_CONTENT_META[selectedZone.content ?? 'empty'];

  // Vérifier si on peut ajuster le ratio
  const canAdjustRatio = selectedZone.type !== 'leaf' &&
    selectedZone.children?.length === 2;

  const parentCanAdjust = parentZone &&
    parentZone.type !== 'leaf' &&
    parentZone.children?.length === 2;

  return (
    <div className="space-y-6">
      {/* Zone sélectionnée */}
      <div className="border-b border-[#E8E6E3] pb-4">
        <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">
          Zone sélectionnée
        </span>
        <h4 className="mt-1 font-serif text-lg text-[#1A1917]">
          {isLeaf ? meta.label : (selectedZone.type === 'horizontal' ? 'Division horizontale' : 'Division verticale')}
        </h4>
        {isLeaf && (
          <p className="mt-1 text-xs text-[#706F6C]">{meta.description}</p>
        )}
        {!isLeaf && selectedZone.children && (
          <p className="mt-1 text-xs text-[#706F6C]">
            {selectedZone.children.length} compartiment{selectedZone.children.length > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Contenu (pour les feuilles) */}
      {isLeaf && (
        <div className="space-y-3">
          <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">
            Contenu
          </span>
          <div className="grid grid-cols-1 gap-2">
            {(['empty', 'drawer', 'dressing'] as ZoneContent[]).map((content) => {
              const contentMeta = ZONE_CONTENT_META[content];
              const isActive = (selectedZone.content ?? 'empty') === content;
              return (
                <button
                  key={content}
                  type="button"
                  onClick={() => onSetContent(selectedZone.id, content)}
                  className={`flex items-center justify-between border px-4 py-3 text-left transition-colors ${
                    isActive
                      ? 'border-[#1A1917] bg-[#1A1917] text-white'
                      : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
                  }`}
                  style={{ borderRadius: '2px' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center border font-mono text-sm" style={{
                      borderRadius: '2px',
                      borderColor: isActive ? 'rgba(255,255,255,0.3)' : '#E8E6E3',
                      backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : '#FAFAF9',
                    }}>
                      {contentMeta.icon}
                    </span>
                    <span className="font-medium">{contentMeta.label}</span>
                  </div>
                  <span className={`text-xs ${isActive ? 'text-white/70' : 'text-[#706F6C]'}`}>
                    {contentMeta.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Division (pour les feuilles) */}
      {isLeaf && (
        <div className="space-y-3">
          <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">
            Diviser en
          </span>

          {/* Division horizontale (rangées) */}
          <div className="space-y-2">
            <p className="text-xs text-[#706F6C]">Rangées horizontales</p>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map((count) => (
                <button
                  key={`h-${count}`}
                  type="button"
                  onClick={() => onSplitZone(selectedZone.id, 'horizontal', count)}
                  className="flex h-12 flex-1 items-center justify-center border border-[#E8E6E3] bg-white font-mono text-sm text-[#1A1917] transition-colors hover:border-[#1A1917] hover:bg-[#1A1917] hover:text-white"
                  style={{ borderRadius: '2px' }}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Division verticale (colonnes) */}
          <div className="space-y-2">
            <p className="text-xs text-[#706F6C]">Colonnes verticales</p>
            <div className="flex gap-2">
              {[2, 3, 4].map((count) => (
                <button
                  key={`v-${count}`}
                  type="button"
                  onClick={() => onSplitZone(selectedZone.id, 'vertical', count)}
                  className="flex h-12 flex-1 items-center justify-center border border-[#E8E6E3] bg-white font-mono text-sm text-[#1A1917] transition-colors hover:border-[#1A1917] hover:bg-[#1A1917] hover:text-white"
                  style={{ borderRadius: '2px' }}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ajustement ratio (pour les divisions) */}
      {canAdjustRatio && (
        <div className="space-y-3">
          <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">
            Proportions
          </span>
          <div className="space-y-2">
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={selectedZone.splitRatio ?? 50}
              onChange={(e) => onSetSplitRatio(selectedZone.id, Number(e.target.value))}
              className="w-full accent-[#1A1917]"
            />
            <div className="flex justify-between text-xs font-mono text-[#706F6C]">
              <span>{Math.round(selectedZone.splitRatio ?? 50)}%</span>
              <span>{Math.round(100 - (selectedZone.splitRatio ?? 50))}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Lien vers parent si ajustable */}
      {isLeaf && parentCanAdjust && onSelectParent && (
        <button
          type="button"
          onClick={onSelectParent}
          className="flex w-full items-center justify-center gap-2 border border-[#E8E6E3] bg-white px-4 py-2 text-xs text-[#706F6C] transition-colors hover:border-[#1A1917] hover:text-[#1A1917]"
          style={{ borderRadius: '2px' }}
        >
          Ajuster la division parente
        </button>
      )}

      {/* Supprimer la division */}
      {!isLeaf && (
        <button
          type="button"
          onClick={() => onResetZone(selectedZone.id)}
          className="flex w-full items-center justify-center gap-2 border border-[#E8E6E3] bg-white px-4 py-3 text-sm text-[#706F6C] transition-colors hover:border-red-500 hover:text-red-600"
          style={{ borderRadius: '2px' }}
        >
          Supprimer cette division
        </button>
      )}

      {/* Supprimer division parente */}
      {parentZone && parentZone.type !== 'leaf' && (
        <button
          type="button"
          onClick={() => onResetZone(parentZone.id)}
          className="flex w-full items-center justify-center gap-2 border border-[#E8E6E3] bg-white px-4 py-2 text-xs text-[#706F6C] transition-colors hover:border-red-500 hover:text-red-600"
          style={{ borderRadius: '2px' }}
        >
          Supprimer la division parente
        </button>
      )}
    </div>
  );
}

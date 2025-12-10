import { Zone, ZoneContent, ZONE_CONTENT_META } from './types';

interface ZoneControlsProps {
  selectedZone: Zone;
  parentZone: Zone | null;
  onSplitZone: (zoneId: string, direction: 'horizontal' | 'vertical', count: number) => void;
  onSetContent: (zoneId: string, content: ZoneContent) => void;
  onResetZone: (zoneId: string) => void;
  onSetSplitRatio: (zoneId: string, ratio: number) => void;
  onSetSplitRatios?: (zoneId: string, ratios: number[]) => void;
  onSelectParent?: () => void;
}

export default function ZoneControls({
  selectedZone,
  parentZone,
  onSplitZone,
  onSetContent,
  onResetZone,
  onSetSplitRatio,
  onSetSplitRatios,
  onSelectParent,
}: ZoneControlsProps) {
  const isLeaf = selectedZone.type === 'leaf';
  const meta = ZONE_CONTENT_META[selectedZone.content ?? 'empty'];

  // Vérifier si on peut ajuster le ratio (2 enfants)
  const canAdjustRatio = selectedZone.type !== 'leaf' &&
    selectedZone.children?.length === 2;

  // Vérifier si on peut ajuster les ratios multiples (3+ enfants)
  const canAdjustMultipleRatios = selectedZone.type !== 'leaf' &&
    (selectedZone.children?.length ?? 0) > 2;

  const parentCanAdjust = parentZone &&
    parentZone.type !== 'leaf' &&
    (parentZone.children?.length ?? 0) >= 2;

  // Obtenir les ratios actuels pour affichage
  const getCurrentRatios = (): number[] => {
    const children = selectedZone.children ?? [];
    if (children.length === 2 && selectedZone.splitRatio !== undefined) {
      return [selectedZone.splitRatio, 100 - selectedZone.splitRatio];
    }
    if (children.length > 2 && selectedZone.splitRatios?.length === children.length) {
      return selectedZone.splitRatios;
    }
    return children.map(() => Math.round(100 / children.length));
  };

  // Mettre à jour un ratio individuel (pour 3+ enfants)
  const handleRatioSliderChange = (index: number, newValue: number) => {
    if (!onSetSplitRatios) return;
    const currentRatios = getCurrentRatios();
    const oldValue = currentRatios[index];
    const delta = newValue - oldValue;

    // Trouver un autre ratio à ajuster (celui d'après ou d'avant)
    const adjustIndex = index < currentRatios.length - 1 ? index + 1 : index - 1;
    const newRatios = [...currentRatios];
    newRatios[index] = newValue;
    newRatios[adjustIndex] = Math.max(10, currentRatios[adjustIndex] - delta);

    // Normaliser pour que la somme fasse 100
    const sum = newRatios.reduce((a, b) => a + b, 0);
    const normalized = newRatios.map(r => Math.round((r / sum) * 100));
    onSetSplitRatios(selectedZone.id, normalized);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Zone sélectionnée */}
      <div className="border-b border-[#E8E6E3] pb-3 sm:pb-4">
        <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">
          Zone sélectionnée
        </span>
        <h4 className="mt-1 font-serif text-base text-[#1A1917] sm:text-lg">
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
                  className={`flex items-center justify-between border px-3 py-2.5 text-left transition-colors sm:px-4 sm:py-3 ${
                    isActive
                      ? 'border-[#1A1917] bg-[#1A1917] text-white'
                      : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
                  }`}
                  style={{ borderRadius: '2px' }}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="flex h-7 w-7 items-center justify-center border font-mono text-xs sm:h-8 sm:w-8 sm:text-sm" style={{
                      borderRadius: '2px',
                      borderColor: isActive ? 'rgba(255,255,255,0.3)' : '#E8E6E3',
                      backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : '#FAFAF9',
                    }}>
                      {contentMeta.icon}
                    </span>
                    <span className="text-sm font-medium sm:text-base">{contentMeta.label}</span>
                  </div>
                  <span className={`hidden text-xs sm:block ${isActive ? 'text-white/70' : 'text-[#706F6C]'}`}>
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
            <div className="flex gap-1.5 sm:gap-2">
              {[2, 3, 4, 5].map((count) => (
                <button
                  key={`h-${count}`}
                  type="button"
                  onClick={() => onSplitZone(selectedZone.id, 'horizontal', count)}
                  className="flex h-10 flex-1 items-center justify-center border border-[#E8E6E3] bg-white font-mono text-sm text-[#1A1917] transition-colors hover:border-[#1A1917] hover:bg-[#1A1917] hover:text-white sm:h-12"
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
            <div className="flex gap-1.5 sm:gap-2">
              {[2, 3, 4].map((count) => (
                <button
                  key={`v-${count}`}
                  type="button"
                  onClick={() => onSplitZone(selectedZone.id, 'vertical', count)}
                  className="flex h-10 flex-1 items-center justify-center border border-[#E8E6E3] bg-white font-mono text-sm text-[#1A1917] transition-colors hover:border-[#1A1917] hover:bg-[#1A1917] hover:text-white sm:h-12"
                  style={{ borderRadius: '2px' }}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Ajustement ratio (pour les divisions à 2 enfants) */}
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

      {/* Ajustement ratios multiples (pour les divisions à 3+ enfants) */}
      {canAdjustMultipleRatios && (
        <div className="space-y-3">
          <span className="text-xs font-medium uppercase tracking-wide text-[#706F6C]">
            Proportions ({selectedZone.children?.length} compartiments)
          </span>
          <div className="space-y-3">
            {getCurrentRatios().map((ratio, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#706F6C]">
                    {selectedZone.type === 'horizontal' ? 'Rangée' : 'Colonne'} {index + 1}
                  </span>
                  <span className="font-mono text-xs text-[#1A1917]">{ratio}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={80}
                  step={5}
                  value={ratio}
                  onChange={(e) => handleRatioSliderChange(index, Number(e.target.value))}
                  className="w-full accent-[#1A1917]"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-[#A8A7A5]">
            Glissez les curseurs ou les séparateurs sur le plan
          </p>
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

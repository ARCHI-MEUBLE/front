import { Rows3, Columns3, Archive, Shirt, Minus, Trash2, ArrowUp, Lightbulb, Plug } from 'lucide-react';
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
  onToggleLight?: (zoneId: string) => void;
  onToggleCableHole?: (zoneId: string) => void;
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
                                       onToggleLight,
                                       onToggleCableHole,
                                     }: ZoneControlsProps) {
  const isLeaf = selectedZone.type === 'leaf';

  const canAdjustRatio = selectedZone.type !== 'leaf' &&
      selectedZone.children?.length === 2;

  const canAdjustMultipleRatios = selectedZone.type !== 'leaf' &&
      (selectedZone.children?.length ?? 0) > 2;

  const parentCanAdjust = parentZone &&
      parentZone.type !== 'leaf' &&
      (parentZone.children?.length ?? 0) >= 2;

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

  const handleRatioSliderChange = (index: number, newValue: number) => {
    if (!onSetSplitRatios) return;
    const currentRatios = getCurrentRatios();
    const oldValue = currentRatios[index];
    const delta = newValue - oldValue;

    const adjustIndex = index < currentRatios.length - 1 ? index + 1 : index - 1;
    const newRatios = [...currentRatios];
    newRatios[index] = newValue;
    newRatios[adjustIndex] = Math.max(10, currentRatios[adjustIndex] - delta);

    const sum = newRatios.reduce((a, b) => a + b, 0);
    const normalized = newRatios.map(r => Math.round((r / sum) * 100));
    onSetSplitRatios(selectedZone.id, normalized);
  };

  // ✅ Options de contenu avec labels CLAIRS pour seniors
  const CONTENT_OPTIONS = [
    { id: 'empty' as ZoneContent, icon: Minus, label: 'Vide', desc: 'Espace libre' },
    { id: 'drawer' as ZoneContent, icon: Archive, label: 'Tiroir', desc: 'Avec poignée' },
    { id: 'dressing' as ZoneContent, icon: Shirt, label: 'Penderie', desc: 'Pour vêtements' },
  ];

  return (
      <div className="space-y-5">
        {/* Actions pour zones vides (feuilles) */}
        {isLeaf && (
            <>
              {/* ═══════════════════════════════════════════════════════════
              CONTENU - Grands boutons avec descriptions
          ═══════════════════════════════════════════════════════════ */}
              <div>
                <p className="mb-3 text-base font-semibold text-[#1A1917]">
                  Que mettre dans cette zone ?
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {CONTENT_OPTIONS.map(({ id, icon: Icon, label, desc }) => {
                    const isActive = (selectedZone.content ?? 'empty') === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onSetContent(selectedZone.id, id)}
                            className={`flex flex-col items-center justify-center gap-2 border-2 p-4 transition-all ${
                                isActive
                                    ? 'border-[#1A1917] bg-[#1A1917] text-white'
                                    : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
                            }`}
                            style={{ borderRadius: '4px' }}
                        >
                          <Icon className="h-6 w-6" />
                          <span className="text-base font-medium">{label}</span>
                        </button>
                    );
                  })}
                </div>

                {/* Option Éclairage */}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onToggleLight?.(selectedZone.id)}
                    className={`flex items-center justify-between border-2 p-4 transition-all ${
                      selectedZone.hasLight
                        ? 'border-[#1A1917] bg-[#1A1917]/5 text-[#1A1917]'
                        : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
                    }`}
                    style={{ borderRadius: '4px' }}
                  >
                    <div className="flex items-center gap-3">
                      <Lightbulb className={`h-6 w-6 ${selectedZone.hasLight ? 'text-yellow-500 fill-yellow-200' : ''}`} />
                      <div className="text-left">
                        <span className="block text-base font-semibold">Éclairage LED</span>
                        <span className="block text-sm text-[#706F6C]">Lumière intégrée</span>
                      </div>
                    </div>
                    <div className={`h-6 w-10 rounded-full border-2 transition-all relative ${selectedZone.hasLight ? 'border-[#1A1917] bg-[#1A1917]' : 'border-[#E8E6E3] bg-[#F5F5F4]'}`}>
                      <div className={`absolute top-1 h-3 w-3 rounded-full transition-all ${selectedZone.hasLight ? 'right-1 bg-white' : 'left-1 bg-[#A8A7A5]'}`} />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleCableHole?.(selectedZone.id)}
                    className={`flex items-center justify-between border-2 p-4 transition-all ${
                      selectedZone.hasCableHole
                        ? 'border-[#1A1917] bg-[#1A1917]/5 text-[#1A1917]'
                        : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
                    }`}
                    style={{ borderRadius: '4px' }}
                  >
                    <div className="flex items-center gap-3">
                      <Plug className={`h-6 w-6 ${selectedZone.hasCableHole ? 'text-blue-500' : ''}`} />
                      <div className="text-left">
                        <span className="block text-base font-semibold">Passe-câble</span>
                        <span className="block text-sm text-[#706F6C]">Trou dans le fond</span>
                      </div>
                    </div>
                    <div className={`h-6 w-10 rounded-full border-2 transition-all relative ${selectedZone.hasCableHole ? 'border-[#1A1917] bg-[#1A1917]' : 'border-[#E8E6E3] bg-[#F5F5F4]'}`}>
                      <div className={`absolute top-1 h-3 w-3 rounded-full transition-all ${selectedZone.hasCableHole ? 'right-1 bg-white' : 'left-1 bg-[#A8A7A5]'}`} />
                    </div>
                  </button>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════
              DIVISION - Termes simplifiés pour seniors
          ═══════════════════════════════════════════════════════════ */}
              <div className="border-t border-[#E8E6E3] pt-5">
                <p className="mb-3 text-base font-semibold text-[#1A1917]">
                  Diviser cette zone
                </p>

                <div className="space-y-4">
                  {/* Étagères (horizontal) - Max 10 niveaux */}
                  <div className="border border-[#E8E6E3] bg-white p-4" style={{ borderRadius: '4px' }}>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center bg-[#FAFAF9]" style={{ borderRadius: '4px' }}>
                        <Rows3 className="h-5 w-5 text-[#1A1917]" />
                      </div>
                      <div>
                        <span className="text-base font-medium text-[#1A1917]">Ajouter des étagères</span>
                        <p className="text-sm text-[#706F6C]">Divise en niveaux superposés (max 10)</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                          <button
                              key={`h-${count}`}
                              type="button"
                              onClick={() => onSplitZone(selectedZone.id, 'horizontal', count)}
                              className="flex h-10 items-center justify-center border-2 border-[#E8E6E3] bg-white text-sm font-semibold text-[#1A1917] transition-all hover:border-[#1A1917] hover:bg-[#1A1917] hover:text-white"
                              style={{ borderRadius: '4px' }}
                          >
                            {count}
                          </button>
                      ))}
                    </div>
                  </div>

                  {/* Colonnes (vertical) - Max 10 colonnes */}
                  <div className="border border-[#E8E6E3] bg-white p-4" style={{ borderRadius: '4px' }}>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center bg-[#FAFAF9]" style={{ borderRadius: '4px' }}>
                        <Columns3 className="h-5 w-5 text-[#1A1917]" />
                      </div>
                      <div>
                        <span className="text-base font-medium text-[#1A1917]">Ajouter des colonnes</span>
                        <p className="text-sm text-[#706F6C]">Divise en compartiments côte à côte (max 10)</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                          <button
                              key={`v-${count}`}
                              type="button"
                              onClick={() => onSplitZone(selectedZone.id, 'vertical', count)}
                              className="flex h-10 items-center justify-center border-2 border-[#E8E6E3] bg-white text-sm font-semibold text-[#1A1917] transition-all hover:border-[#1A1917] hover:bg-[#1A1917] hover:text-white"
                              style={{ borderRadius: '4px' }}
                          >
                            {count}
                          </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
        )}

        {/* ═══════════════════════════════════════════════════════════
          AJUSTEMENT DES PROPORTIONS (2 parties)
      ═══════════════════════════════════════════════════════════ */}
        {canAdjustRatio && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-[#1A1917]">Ajuster les tailles</span>
                <span className="font-mono text-base text-[#706F6C]">
              {Math.round(selectedZone.splitRatio ?? 50)}% / {Math.round(100 - (selectedZone.splitRatio ?? 50))}%
            </span>
              </div>
              <input
                  type="range"
                  min={15}
                  max={85}
                  step={5}
                  value={selectedZone.splitRatio ?? 50}
                  onChange={(e) => onSetSplitRatio(selectedZone.id, Number(e.target.value))}
                  className="h-3 w-full cursor-pointer accent-[#1A1917]"
              />
              <p className="text-sm text-[#706F6C]">
                Déplacez le curseur pour modifier les proportions
              </p>
            </div>
        )}

        {/* Ajustement ratios multiples (3+ parties) */}
        {canAdjustMultipleRatios && (
            <div className="space-y-3">
              <span className="text-base font-semibold text-[#1A1917]">Ajuster les tailles</span>
              <div className="space-y-3">
                {getCurrentRatios().map((ratio, index) => (
                    <div key={index} className="flex items-center gap-4">
                <span className="w-16 text-right font-mono text-base text-[#706F6C]">
                  Partie {index + 1}
                </span>
                      <input
                          type="range"
                          min={15}
                          max={70}
                          step={5}
                          value={ratio}
                          onChange={(e) => handleRatioSliderChange(index, Number(e.target.value))}
                          className="h-3 flex-1 cursor-pointer accent-[#1A1917]"
                      />
                      <span className="w-12 text-right font-mono text-base text-[#1A1917]">{ratio}%</span>
                    </div>
                ))}
              </div>
            </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
          ACTIONS SECONDAIRES - Boutons clairs
      ═══════════════════════════════════════════════════════════ */}
        {(!isLeaf || (parentZone && parentZone.type !== 'leaf')) && (
            <div className="flex flex-col gap-3 border-t border-[#E8E6E3] pt-5">
              {/* Revenir au niveau supérieur */}
              {isLeaf && parentCanAdjust && onSelectParent && (
                  <button
                      type="button"
                      onClick={onSelectParent}
                      className="flex items-center justify-center gap-3 border-2 border-[#E8E6E3] bg-white py-3 text-base font-medium text-[#1A1917] transition-all hover:border-[#1A1917]"
                      style={{ borderRadius: '4px' }}
                  >
                    <ArrowUp className="h-5 w-5" />
                    <span>Voir le groupe entier</span>
                  </button>
              )}

              {/* Supprimer la division actuelle */}
              {!isLeaf && (
                  <button
                      type="button"
                      onClick={() => onResetZone(selectedZone.id)}
                      className="flex items-center justify-center gap-3 border-2 border-[#E8E6E3] bg-white py-3 text-base font-medium text-[#706F6C] transition-all hover:border-red-400 hover:bg-red-50 hover:text-red-600"
                      style={{ borderRadius: '4px' }}
                  >
                    <Trash2 className="h-5 w-5" />
                    <span>Annuler cette division</span>
                  </button>
              )}

              {/* Supprimer la division parente */}
              {parentZone && parentZone.type !== 'leaf' && isLeaf && (
                  <button
                      type="button"
                      onClick={() => onResetZone(parentZone.id)}
                      className="flex items-center justify-center gap-3 border-2 border-[#E8E6E3] bg-white py-3 text-base font-medium text-[#706F6C] transition-all hover:border-red-400 hover:bg-red-50 hover:text-red-600"
                      style={{ borderRadius: '4px' }}
                  >
                    <Trash2 className="h-5 w-5" />
                    <span>Supprimer toutes les divisions</span>
                  </button>
              )}
            </div>
        )}
      </div>
  );
}
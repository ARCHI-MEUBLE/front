import ZoneEditor, { Zone } from '@/components/configurator/ZoneEditor';
import { Button } from '@/components/ui/button';
import { IconEdit } from '@tabler/icons-react';

function analyzeConfiguration(zone: Zone) {
  const handleTypes = new Set<string>();
  const leafZones: any[] = [];

  let leafCounter = 0;

  const traverse = (z: Zone) => {
    if (z.type === 'leaf') {
      leafCounter++;
      leafZones.push({
        number: leafCounter,
        id: z.id,
        content: z.content || 'empty',
        handleType: z.handleType,
        hasLight: z.hasLight,
        hasCableHole: z.hasCableHole,
        color: z.zoneColor?.hex
      });

      if (z.content && z.content !== 'empty') {
        if (z.handleType) {
          handleTypes.add(z.handleType);
        }
      }
    }

    if (z.children) z.children.forEach(traverse);
  };

  traverse(zone);

  return {
    handleTypes: Array.from(handleTypes),
    leafZones
  };
}

const EQUIPMENT_LABELS: Record<string, string> = {
  drawer: 'Tiroir',
  push_drawer: 'Tiroir Push-to-Open',
  dressing: 'Penderie',
  door: 'Porte Gauche',
  door_right: 'Porte Droite',
  door_double: 'Double Porte',
  mirror_door: 'Porte Vitrée',
  push_door: 'Porte Push-to-Open',
  glass_shelf: 'Étagère verre',
  shelf: 'Étagère',
  light: 'Éclairage LED',
  cable_hole: 'Passe-câble',
};

const HANDLE_LABELS: Record<string, string> = {
  vertical_bar: 'Barre verticale',
  horizontal_bar: 'Barre horizontale',
  knob: 'Bouton rond',
  recessed: 'Poignée encastrée',
};

export function ConfigurationSummary({
  width, height, depth, finish, color, socle, rootZone, price, modelName,
  isAdmin, onEdit, priceDisplaySettings, mountingStyle, colorLabel, isOwner, onEditOwn
}: any) {
  const analysis = analyzeConfiguration(rootZone);

  const equipmentCount: Record<string, number> = {};
  analysis.leafZones.forEach((z: any) => {
    const key = z.content || 'empty';
    equipmentCount[key] = (equipmentCount[key] || 0) + 1;
  });

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto custom-scrollbar">
      <div className="p-5 border-b border-[#E8E6E3]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl text-[#1A1917]">Fiche technique</h2>
            <p className="text-xs text-[#706F6C] mt-0.5">{modelName || 'Configuration client'}</p>
          </div>
          {isAdmin && onEdit && (
            <Button
              onClick={onEdit}
              size="sm"
              className="bg-[#1A1917] text-white hover:bg-[#2A2927] h-8 px-4 text-xs"
            >
              <IconEdit className="h-3.5 w-3.5 mr-1.5" />
              Modifier
            </Button>
          )}
          {!isAdmin && isOwner && onEditOwn && (
            <Button
              onClick={onEditOwn}
              size="sm"
              className="bg-[#1A1917] text-white hover:bg-[#2A2927] h-8 px-4 text-xs"
            >
              <IconEdit className="h-3.5 w-3.5 mr-1.5" />
              Modifier ma configuration
            </Button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        <div className="border border-[#E8E6E3] p-3 bg-[#FAFAF9]">
          <ZoneEditor
            rootZone={rootZone}
            selectedZoneIds={[]}
            onRootZoneChange={() => {}}
            onSelectedZoneIdsChange={() => {}}
            width={width}
            height={height}
            hideControls={true}
            showNumbers={true}
          />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="flex justify-between py-1.5 border-b border-[#E8E6E3]">
            <span className="text-[#706F6C]">Largeur</span>
            <span className="font-medium">{width} mm</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#E8E6E3]">
            <span className="text-[#706F6C]">Hauteur</span>
            <span className="font-medium">{height} mm</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#E8E6E3]">
            <span className="text-[#706F6C]">Profondeur</span>
            <span className="font-medium">{depth} mm</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#E8E6E3]">
            <span className="text-[#706F6C]">Montage</span>
            <span className="font-medium">{mountingStyle === 'encastre' ? 'Encastré' : 'En applique'}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#E8E6E3]">
            <span className="text-[#706F6C]">Matériau</span>
            <span className="font-medium">{finish}</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#E8E6E3]">
            <span className="text-[#706F6C]">Couleur</span>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 border border-black/10" style={{ backgroundColor: color }}></span>
              <span className="font-medium">{colorLabel || color}</span>
            </div>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#E8E6E3]">
            <span className="text-[#706F6C]">Socle</span>
            <span className="font-medium">
              {socle === 'metal' ? 'Métal noir' : socle === 'wood' ? 'Plinthe bois' : 'Sans socle'}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-[#E8E6E3]">
            <span className="text-[#706F6C]">Poignées</span>
            <span className="font-medium">
              {analysis.handleTypes.length > 0
                ? analysis.handleTypes.map(h => HANDLE_LABELS[h] || h).join(', ')
                : 'Push-to-open'}
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-[#706F6C] uppercase tracking-wide mb-2">Équipements ({analysis.leafZones.length} zones)</h3>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(equipmentCount).map(([key, count]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-2 py-1 bg-[#F5F5F4] text-xs border border-[#E8E6E3]"
              >
                <span className="font-medium">{count}x</span>
                <span className="text-[#706F6C]">{EQUIPMENT_LABELS[key] || (key === 'empty' ? 'Vide' : key)}</span>
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-[#706F6C] uppercase tracking-wide mb-2">Détail par zone</h3>
          <div className="border border-[#E8E6E3] divide-y divide-[#E8E6E3] text-sm">
            {analysis.leafZones.map((z: any) => (
              <div key={z.id} className="flex items-center gap-3 px-3 py-2 hover:bg-[#FAFAF9]">
                <span className="flex items-center justify-center h-5 w-5 bg-[#1A1917] text-white text-[10px] font-bold">
                  {z.number}
                </span>
                <span className="flex-1 font-medium">
                  {EQUIPMENT_LABELS[z.content] || (z.content === 'empty' ? 'Vide' : z.content)}
                </span>
                <div className="flex items-center gap-2 text-xs text-[#706F6C]">
                  {z.hasLight && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-[10px]">LED</span>}
                  {z.hasCableHole && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px]">Câble</span>}
                  {z.color && (
                    <span className="h-3 w-3 border border-black/10" style={{ backgroundColor: z.color }}></span>
                  )}
                  {z.handleType && <span className="italic">{HANDLE_LABELS[z.handleType]}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-4 border-t border-[#E8E6E3]">
          <span className="text-sm text-[#706F6C]">Estimation</span>
          <div className="text-right">
            {priceDisplaySettings?.mode === 1 && priceDisplaySettings?.range > 0 ? (
              <span className="font-serif text-2xl font-medium">
                {Math.max(0, price - priceDisplaySettings.range)} - {price + priceDisplaySettings.range} €
              </span>
            ) : (
              <span className="font-serif text-2xl font-medium">{price} €</span>
            )}
          </div>
        </div>

        <p className="text-xs text-[#706F6C] text-center py-3 border-t border-[#E8E6E3]">
          Mode consultation — Cliquez sur Modifier pour éditer
        </p>
      </div>
    </div>
  );
}

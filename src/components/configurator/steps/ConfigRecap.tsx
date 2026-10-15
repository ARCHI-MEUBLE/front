import type { ZoneStats } from '@/lib/configurator/zoneStats';
import { displayColorName, displayMaterialName } from '@/lib/displayNames';
import type { MountingStyle } from './MountingStyleSelector';

interface ConfigRecapProps {
  width: number;
  depth: number;
  height: number;
  finish: string;
  colorLabel: string;
  colorHex: string;
  colorImage?: string | null;
  // Renseigné seulement si les façades ont une autre couleur que la structure
  facadeColorLabel?: string | null;
  mountingStyle: MountingStyle;
  socle: string;
  stats: ZoneStats;
}

const SOCLE_LABELS: Record<string, string> = {
  none: 'Posé au sol',
  wood: 'Caisson bois',
  metal: 'Pieds métal',
};

function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/10 py-2 last:border-b-0">
      <dt className="text-xs text-black/65">{label}</dt>
      <dd className="text-right text-xs font-medium text-black">{children}</dd>
    </div>
  );
}

export default function ConfigRecap({
  width,
  depth,
  height,
  finish,
  colorLabel,
  colorHex,
  colorImage,
  facadeColorLabel,
  mountingStyle,
  socle,
  stats,
}: ConfigRecapProps) {
  const equipment = [
    stats.doors > 0 && plural(stats.doors, 'porte'),
    stats.drawers > 0 && plural(stats.drawers, 'tiroir'),
    stats.glassShelves > 0 && plural(stats.glassShelves, 'étagère en verre', 'étagères en verre'),
    stats.lights > 0 && `${stats.lights} × éclairage LED`,
    stats.cableHoles > 0 && plural(stats.cableHoles, 'passe-câble'),
    stats.dressings > 0 && plural(stats.dressings, 'penderie'),
  ].filter(Boolean) as string[];

  return (
    <div className="border border-black/10 bg-white" style={{ borderRadius: '2px' }}>
      <dl className="px-4 py-1">
        <Row label="Dimensions">
          <span className="font-mono">
            {width} × {depth} × {height} mm
          </span>
        </Row>
        <Row label="Matière">{displayMaterialName(finish)}</Row>
        <Row label="Couleur">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-3.5 w-3.5 border border-black/10"
              style={{
                backgroundColor: colorHex,
                backgroundImage: colorImage ? `url(${colorImage})` : undefined,
                backgroundSize: 'cover',
              }}
            />
            {displayColorName(colorLabel)}
          </span>
        </Row>
        {facadeColorLabel && <Row label="Façades">{displayColorName(facadeColorLabel)}</Row>}
        <Row label="Compartiments">{stats.compartments}</Row>
        <Row label="Montage">{mountingStyle === 'encastre' ? 'Encastré' : 'En applique'}</Row>
        <Row label="Pieds">{SOCLE_LABELS[socle] ?? socle}</Row>
        <Row label="Équipements">{equipment.length > 0 ? equipment.join(' · ') : 'Aucun'}</Row>
      </dl>
    </div>
  );
}

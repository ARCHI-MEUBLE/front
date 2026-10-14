import { useEffect, useState } from 'react';
import { ChevronDown, Columns3, Minus, Plus, Rows3 } from 'lucide-react';
import type { Zone } from '../ZoneEditor/types';
import { DivisionStepper } from '../ZoneEditor/ZoneControls';
import { partSize, splitAvailability } from '@/lib/configurator/constraints';
import { getDivisionCount, isShelfGrid, setDivisionCount, shelfColumnWidths, type DivisionDirection } from '@/lib/configurator/zoneDivision';
import { canResizeZone, setZoneSize, type ResizeAxis } from '@/lib/configurator/zoneResize';
import { getZoneSize } from '@/lib/configurator/zoneStats';

interface DivisionStepsProps {
  rootZone: Zone;
  selectedZoneIds: string[];
  width: number;
  height: number;
  onRootZoneChange: (zone: Zone) => void;
  onSelectedZoneIdsChange: (ids: string[]) => void;
}

const cm = (mm: number) => `${Math.round(mm / 10)} cm`;

// Chemin de la racine jusqu'à la zone (racine comprise)
function pathTo(zone: Zone, id: string): Zone[] | null {
  if (zone.id === id) return [zone];
  for (const child of zone.children ?? []) {
    const sub = pathTo(child, id);
    if (sub) return [zone, ...sub];
  }
  return null;
}

// Enfant de `zone` situé sur le chemin de la sélection, sinon le premier
function childOnPath(zone: Zone, path: Zone[]): Zone | null {
  if (!zone.children?.length) return null;
  return zone.children.find((child) => path.some((p) => p.id === child.id)) ?? zone.children[0];
}

// Les quatre niveaux du meuble : caisson (colonne) > étagère (casier) > compartiment
function resolveLevels(root: Zone, selectedId: string) {
  const path = pathTo(root, selectedId) ?? [root];
  const caisson = root.type === 'vertical' ? childOnPath(root, path) ?? root : root;
  const shelf = caisson.type === 'horizontal' ? childOnPath(caisson, path) ?? caisson : caisson;
  const compartment = shelf.type === 'vertical' ? childOnPath(shelf, path) : null;
  return { caisson, shelf, compartment };
}

function SizeField({
  label,
  icon: Icon,
  valueMm,
  adjustable,
  onChange,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  valueMm: number;
  adjustable: boolean;
  onChange: (mm: number) => void;
}) {
  const [input, setInput] = useState(String(valueMm));
  useEffect(() => setInput(String(valueMm)), [valueMm]);

  const apply = (raw: string) => {
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 50) onChange(num);
    else setInput(String(valueMm));
  };
  const stepButton =
    'flex h-8 w-8 items-center justify-center border border-[#E8E6E3] bg-white text-[#1A1917] transition-all hover:border-[#1A1917]';

  return (
    <div className="flex items-center justify-between gap-3 border border-[#E8E6E3] bg-white px-3 py-2.5" style={{ borderRadius: '4px' }}>
      <span className="flex items-center gap-2 text-sm text-[#706F6C]">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      {adjustable ? (
        <div className="flex items-center gap-1">
          <button type="button" className={stepButton} style={{ borderRadius: '2px' }} onClick={() => onChange(Math.max(50, valueMm - 10))} aria-label={`Réduire : ${label}`}>
            <Minus className="h-3 w-3" />
          </button>
          <div className="relative">
            <input
              type="number"
              value={input}
              min={50}
              onChange={(e) => setInput(e.target.value)}
              onBlur={(e) => apply(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && apply(input)}
              className="w-20 border border-[#E8E6E3] py-1.5 pr-7 text-center font-mono text-sm font-semibold outline-none focus:border-[#1A1917]"
              style={{ borderRadius: '2px' }}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#706F6C]">mm</span>
          </div>
          <button type="button" className={stepButton} style={{ borderRadius: '2px' }} onClick={() => onChange(valueMm + 10)} aria-label={`Agrandir : ${label}`}>
            <Plus className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <span className="font-mono text-sm font-semibold text-[#1A1917]">{valueMm} mm</span>
      )}
    </div>
  );
}

function Accordion({
  index,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  index: number;
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-[#E8E6E3] bg-[#FAFAF9]" style={{ borderRadius: '2px' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            open ? 'bg-[#1A1917] text-white' : 'border border-[#C9C6BF] text-[#706F6C]'
          }`}
        >
          {index}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-sm text-[#1A1917]">{title}</span>
          <span className="block truncate text-[11px] text-[#706F6C]">{summary}</span>
        </span>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-[#706F6C] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-3 border-t border-[#E8E6E3] px-4 py-4">{children}</div>}
    </div>
  );
}

export default function DivisionSteps({
  rootZone,
  selectedZoneIds,
  width,
  height,
  onRootZoneChange,
  onSelectedZoneIdsChange,
}: DivisionStepsProps) {
  const [openStep, setOpenStep] = useState<number | null>(1);
  const { caisson, shelf, compartment } = resolveLevels(rootZone, selectedZoneIds[0] ?? 'root');

  const sizeOf = (zone: Zone) => getZoneSize(rootZone, zone.id, width, height) ?? { width, height };
  const caissonSize = sizeOf(caisson);
  const shelfSize = sizeOf(shelf);
  const compartmentSize = compartment ? sizeOf(compartment) : shelfSize;

  const apply = (zone: Zone, direction: DivisionDirection, count: number) => {
    onRootZoneChange(setDivisionCount(rootZone, zone.id, direction, count));
    onSelectedZoneIdsChange([zone.id]);
  };
  const resize = (zone: Zone, axis: ResizeAxis, mm: number) =>
    onRootZoneChange(setZoneSize(rootZone, zone.id, axis, mm, width, height));
  const toggle = (step: number) => setOpenStep((current) => (current === step ? null : step));

  // Niveau 1 : caissons dans le meuble
  const caissonCount = getDivisionCount(rootZone, 'vertical');
  const caissonsSplit = splitAvailability('vertical', width, height);

  // Niveau 2 : étagères dans le caisson (chaque colonne imbriquée reçoit le même nombre)
  const shelvesGrid = isShelfGrid(caisson);
  const shelfCount = getDivisionCount(caisson, 'horizontal');
  const shelvesSplit = shelvesGrid
    ? shelfColumnWidths(caisson, caissonSize.width)
        .map((w) => splitAvailability('horizontal', w, caissonSize.height))
        .reduce((a, b) => (b.maxParts < a.maxParts ? b : a))
    : { maxParts: 1, reason: '' };

  // Niveau 3 : séparations verticales dans l'étagère sélectionnée
  const dividerCount = getDivisionCount(shelf, 'vertical');
  const dividersSplit = splitAvailability('vertical', shelfSize.width, shelfSize.height);

  const shelfIndex = caisson.type === 'horizontal' ? (caisson.children?.findIndex((c) => c.id === shelf.id) ?? 0) + 1 : 1;
  const caissonIndex = rootZone.type === 'vertical' ? (rootZone.children?.findIndex((c) => c.id === caisson.id) ?? 0) + 1 : 1;
  const compartmentIndex = shelf.type === 'vertical' && compartment ? (shelf.children?.findIndex((c) => c.id === compartment.id) ?? 0) + 1 : 1;

  const caissonLabel = `Caisson ${caissonIndex}`;
  const shelfLabel = `Étagère ${shelfIndex}`;

  return (
    <div className="space-y-2.5">
      <Accordion
        index={1}
        title="Diviser en caissons"
        summary={caissonCount ? `${caissonCount} caisson${caissonCount > 1 ? 's' : ''}` : 'Division personnalisée'}
        open={openStep === 1}
        onToggle={() => toggle(1)}
      >
        <DivisionStepper
          icon={Columns3}
          label="Caissons"
          value={caissonCount}
          max={Math.max(caissonsSplit.maxParts, caissonCount ?? 1)}
          sizeLabel={caissonCount ? `Caissons de ${cm(partSize(width, caissonCount))} de large` : undefined}
          reason={caissonsSplit.reason}
          onChange={(count) => apply(rootZone, 'vertical', count)}
        />
      </Accordion>

      <Accordion
        index={2}
        title="Largeur des caissons & étagères"
        summary={`${caissonLabel} · ${caissonSize.width} mm · ${shelfCount ?? '–'} étagère${(shelfCount ?? 0) > 1 ? 's' : ''}`}
        open={openStep === 2}
        onToggle={() => toggle(2)}
      >
        <p className="text-xs text-[#706F6C]">Cliquez sur un caisson du meuble pour le sélectionner.</p>
        <SizeField
          label={`Largeur du ${caissonLabel.toLowerCase()}`}
          icon={Columns3}
          valueMm={Math.round(caissonSize.width)}
          adjustable={canResizeZone(rootZone, caisson.id, 'width')}
          onChange={(mm) => resize(caisson, 'width', mm)}
        />
        <DivisionStepper
          icon={Rows3}
          label="Étagères dans ce caisson"
          value={shelfCount}
          max={Math.max(shelvesSplit.maxParts, shelfCount ?? 1)}
          sizeLabel={shelfCount ? `Casiers de ${cm(partSize(caissonSize.height, shelfCount))} de haut` : undefined}
          reason={shelvesSplit.reason}
          blockedReason={shelvesGrid ? undefined : 'Ce caisson contient des groupes imbriqués : sélectionnez-en une colonne.'}
          onChange={(count) => apply(caisson, 'horizontal', count)}
        />
      </Accordion>

      <Accordion
        index={3}
        title="Hauteur des étagères & séparations"
        summary={`${shelfLabel} · ${Math.round(shelfSize.height)} mm · ${dividerCount ?? '–'} compartiment${(dividerCount ?? 0) > 1 ? 's' : ''}`}
        open={openStep === 3}
        onToggle={() => toggle(3)}
      >
        <p className="text-xs text-[#706F6C]">Cliquez sur une étagère du meuble pour la sélectionner.</p>
        <SizeField
          label={`Hauteur de l'${shelfLabel.toLowerCase()}`}
          icon={Rows3}
          valueMm={Math.round(shelfSize.height)}
          adjustable={canResizeZone(rootZone, shelf.id, 'height')}
          onChange={(mm) => resize(shelf, 'height', mm)}
        />
        <DivisionStepper
          icon={Columns3}
          label="Compartiments dans cette étagère"
          value={dividerCount}
          max={Math.max(dividersSplit.maxParts, dividerCount ?? 1)}
          sizeLabel={dividerCount ? `Compartiments de ${cm(partSize(shelfSize.width, dividerCount))} de large` : undefined}
          reason={dividersSplit.reason}
          onChange={(count) => apply(shelf, 'vertical', count)}
        />
      </Accordion>

      <Accordion
        index={4}
        title="Largeur des compartiments"
        summary={compartment ? `Compartiment ${compartmentIndex} · ${Math.round(compartmentSize.width)} mm` : 'Aucune séparation verticale'}
        open={openStep === 4}
        onToggle={() => toggle(4)}
      >
        {compartment ? (
          <>
            <p className="text-xs text-[#706F6C]">Cliquez sur un compartiment de l&apos;étagère pour le sélectionner.</p>
            <SizeField
              label={`Largeur du compartiment ${compartmentIndex}`}
              icon={Columns3}
              valueMm={Math.round(compartmentSize.width)}
              adjustable={canResizeZone(rootZone, compartment.id, 'width')}
              onChange={(mm) => resize(compartment, 'width', mm)}
            />
          </>
        ) : (
          <p className="text-xs text-[#706F6C]">
            Ajoutez d&apos;abord des compartiments dans une étagère (étape 3) pour régler leur largeur.
          </p>
        )}
      </Accordion>

      <p className="text-[11px] leading-relaxed text-[#706F6C]">
        Astuce : glissez les séparateurs sur le plan pour ajuster la taille des compartiments.
      </p>
    </div>
  );
}

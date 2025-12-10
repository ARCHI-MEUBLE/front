import { Rows3, Columns3, Archive, DoorOpen, Shirt } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ActionBarProps {
  selectedZoneId: string | null;
  disabled?: boolean;
  onSplitHorizontal: () => void;
  onSplitVertical: () => void;
  onAddDrawer: () => void;
  onAddDoor: () => void;
  onAddDressing: () => void;
}

const ACTIONS: { id: string; icon: LucideIcon; label: string; action: string }[] = [
  { id: 'horizontal', icon: Rows3, label: 'Étagères', action: 'onSplitHorizontal' },
  { id: 'vertical', icon: Columns3, label: 'Colonnes', action: 'onSplitVertical' },
  { id: 'drawer', icon: Archive, label: 'Tiroir', action: 'onAddDrawer' },
  { id: 'door', icon: DoorOpen, label: 'Porte', action: 'onAddDoor' },
  { id: 'dressing', icon: Shirt, label: 'Penderie', action: 'onAddDressing' },
];

export default function ActionBar({
  selectedZoneId,
  disabled = false,
  onSplitHorizontal,
  onSplitVertical,
  onAddDrawer,
  onAddDoor,
  onAddDressing,
}: ActionBarProps) {
  const actions: Record<string, () => void> = {
    onSplitHorizontal,
    onSplitVertical,
    onAddDrawer,
    onAddDoor,
    onAddDressing,
  };

  return (
    <div className="action-bar w-full border-t border-[#E8E6E3] bg-[#FAFAF9] px-4 py-3">
      {/* Indication zone sélectionnée */}
      {selectedZoneId && selectedZoneId !== 'root' && (
        <p className="mb-2 text-center text-xs text-[#706F6C]">
          Zone : <span className="font-mono text-[#1A1917]">{selectedZoneId}</span>
        </p>
      )}

      {/* Grille de boutons */}
      <div className="flex flex-wrap justify-center gap-2">
        {ACTIONS.map(({ id, icon: Icon, label, action }) => (
          <button
            key={id}
            type="button"
            onClick={actions[action]}
            disabled={disabled || !selectedZoneId}
            className="flex min-w-[100px] items-center justify-center gap-2 border border-[#E8E6E3] bg-white px-3 py-2.5 text-sm font-medium text-[#1A1917] transition-colors hover:border-[#1A1917] disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[120px] sm:px-4 sm:py-3"
            style={{ borderRadius: '2px' }}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Message si aucune zone */}
      {!selectedZoneId && (
        <p className="mt-2 text-center text-xs text-[#A8A7A5]">
          Sélectionnez une zone dans le plan
        </p>
      )}
    </div>
  );
}

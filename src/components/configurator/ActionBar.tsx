interface ActionBarProps {
  selectedZoneId: string | null;
}

export default function ActionBar({
  selectedZoneId,
}: ActionBarProps) {
  if (!selectedZoneId || selectedZoneId === 'root') {
    return null;
  }

  return (
    <div className="action-bar w-full border-t border-[#E8E6E3] bg-[#FAFAF9] px-4 py-3">
      <p className="text-center text-xs text-[#706F6C]">
        Zone : <span className="font-mono text-[#1A1917]">{selectedZoneId}</span>
      </p>
    </div>
  );
}

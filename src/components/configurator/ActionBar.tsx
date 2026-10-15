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
    <div className="action-bar w-full border-t border-black/10 bg-am-mist/15 px-4 py-3">
      <p className="text-center text-xs text-black/65">
        Zone : <span className="font-mono text-black">{selectedZoneId}</span>
      </p>
    </div>
  );
}

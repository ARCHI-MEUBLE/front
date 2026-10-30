import { MousePointerClick } from 'lucide-react';

interface ZoneEmptyStateProps {
  children: React.ReactNode;
}

export default function ZoneEmptyState({ children }: ZoneEmptyStateProps) {
  return (
    <div
      className="flex items-center gap-3 border border-dashed border-black/20 bg-am-mist/15 px-4 py-5 text-sm text-black/65"
      style={{ borderRadius: '2px' }}
    >
      <MousePointerClick className="h-5 w-5 flex-shrink-0 text-am-navy" />
      <p className="leading-snug">{children}</p>
    </div>
  );
}

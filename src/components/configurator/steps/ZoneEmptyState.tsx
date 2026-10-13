import { MousePointerClick } from 'lucide-react';

interface ZoneEmptyStateProps {
  children: React.ReactNode;
}

export default function ZoneEmptyState({ children }: ZoneEmptyStateProps) {
  return (
    <div
      className="flex items-center gap-3 border border-dashed border-[#C9C6BF] bg-[#FAFAF9] px-4 py-5 text-sm text-[#706F6C]"
      style={{ borderRadius: '2px' }}
    >
      <MousePointerClick className="h-5 w-5 flex-shrink-0 text-[#8B7355]" />
      <p className="leading-snug">{children}</p>
    </div>
  );
}

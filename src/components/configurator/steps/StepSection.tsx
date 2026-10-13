interface StepSectionProps {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}

export default function StepSection({ title, aside, children }: StepSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 border-b border-[#E8E6E3] pb-2">
        <h4 className="font-serif text-sm text-[#1A1917]">{title}</h4>
        {aside && <span className="text-right text-[10px] text-[#706F6C]">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

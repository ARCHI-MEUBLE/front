interface StepSectionProps {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}

export default function StepSection({ title, aside, children }: StepSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3 border-b border-black/10 pb-2">
        <h4 className="text-sm text-black">{title}</h4>
        {aside && <span className="text-right text-[10px] text-black/65">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

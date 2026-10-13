import type { StepDefinition } from './steps';

interface StepIntroProps {
  step: StepDefinition;
  total: number;
}

export default function StepIntro({ step, total }: StepIntroProps) {
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#706F6C]">
        Étape {pad(step.id)} / {pad(total)}
      </p>
      <h3 className="mt-1 font-serif text-lg text-[#1A1917]">{step.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-[#706F6C]">{step.hint}</p>
    </div>
  );
}

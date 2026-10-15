import type { StepDefinition } from './steps';

interface StepIntroProps {
  step: StepDefinition;
  total: number;
}

export default function StepIntro({ step, total }: StepIntroProps) {
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-black/65">
        Étape {pad(step.id)} / {pad(total)}
      </p>
      <h3 className="mt-1 font-serif text-lg text-black">{step.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-black/65">{step.hint}</p>
    </div>
  );
}

import { Check } from 'lucide-react';
import type { ConfigStep, StepDefinition } from './steps';

interface StepNavProps {
  steps: StepDefinition[];
  activeStep: ConfigStep;
  visited: ReadonlySet<ConfigStep>;
  onSelect: (step: ConfigStep) => void;
}

export default function StepNav({ steps, activeStep, visited, onSelect }: StepNavProps) {
  const activeIndex = Math.max(0, steps.findIndex((step) => step.id === activeStep));
  const inset = 50 / steps.length;
  const progress = steps.length > 1 ? (activeIndex / (steps.length - 1)) * 100 : 0;

  return (
    <nav aria-label="Étapes de configuration">
      <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        <span
          aria-hidden="true"
          className="absolute top-[15px] h-px bg-[#E8E6E3]"
          style={{ left: `${inset}%`, right: `${inset}%` }}
        >
          <span
            className="block h-full bg-[#1A1917] transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </span>

        {steps.map((step) => {
          const isActive = step.id === activeStep;
          const isDone = !isActive && (step.id < activeStep || visited.has(step.id));

          return (
            <li key={step.id} className="relative flex justify-center">
              <button
                type="button"
                onClick={() => onSelect(step.id)}
                aria-current={isActive ? 'step' : undefined}
                className="group flex w-full flex-col items-center gap-1.5 px-0.5 pb-1 outline-none"
              >
                <span
                  className={`relative z-10 flex h-[30px] w-[30px] items-center justify-center border font-mono text-[11px] transition-all duration-200 group-focus-visible:ring-2 group-focus-visible:ring-[#1A1917] group-focus-visible:ring-offset-2 ${
                    isActive
                      ? 'scale-110 border-[#1A1917] bg-[#1A1917] text-white shadow-sm'
                      : isDone
                        ? 'border-[#1A1917] bg-white text-[#1A1917]'
                        : 'border-[#E8E6E3] bg-white text-[#A8A7A5] group-hover:border-[#1A1917] group-hover:text-[#1A1917]'
                  }`}
                  style={{ borderRadius: '50%' }}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : step.id}
                </span>
                <span
                  className={`text-center text-[10px] leading-tight transition-colors sm:text-[11px] ${
                    isActive ? 'font-semibold text-[#1A1917]' : 'font-medium text-[#706F6C] group-hover:text-[#1A1917]'
                  }`}
                >
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

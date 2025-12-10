import { useCallback, useEffect, useState } from 'react';

interface DimensionInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  hint?: string;
}

function DimensionInput({ label, value, onChange, min, max, step, unit, hint }: DimensionInputProps) {
  const [inputValue, setInputValue] = useState(String(value));

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);
  };

  const handleInputBlur = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
      setInputValue(String(clamped));
    } else {
      setInputValue(String(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    onChange(newValue);
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[#1A1917]">{label}</label>
        <div className="flex items-center gap-1">
          <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="w-20 border border-[#E8E6E3] bg-white px-3 py-2 text-right font-mono text-sm text-[#1A1917] outline-none transition-colors hover:border-[#1A1917] focus:border-[#1A1917]"
            style={{ borderRadius: '2px' }}
          />
          <span className="text-sm text-[#706F6C]">{unit}</span>
        </div>
      </div>

      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          className="dimension-slider w-full"
        />
        <div
          className="pointer-events-none absolute top-1/2 left-0 h-1 -translate-y-1/2 bg-[#1A1917]"
          style={{ width: `${percentage}%`, borderRadius: '1px' }}
        />
      </div>

      {hint && (
        <p className="text-xs text-[#706F6C]">{hint}</p>
      )}

      <style jsx>{`
        .dimension-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          background: #E8E6E3;
          border-radius: 1px;
          cursor: pointer;
        }
        .dimension-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #1A1917;
          border: 2px solid #FFFFFF;
          border-radius: 2px;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          transition: transform 150ms ease;
        }
        .dimension-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        .dimension-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #1A1917;
          border: 2px solid #FFFFFF;
          border-radius: 2px;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .dimension-slider::-moz-range-track {
          height: 4px;
          background: transparent;
        }
      `}</style>
    </div>
  );
}

interface DimensionsPanelProps {
  width: number;
  depth: number;
  height: number;
  onWidthChange: (value: number) => void;
  onDepthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
}

export default function DimensionsPanel({
  width,
  depth,
  height,
  onWidthChange,
  onDepthChange,
  onHeightChange,
}: DimensionsPanelProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#E8E6E3] pb-4">
        <div>
          <h3 className="font-serif text-lg text-[#1A1917]">Dimensions</h3>
          <p className="mt-1 text-xs text-[#706F6C]">Ajustez les dimensions de votre meuble</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#706F6C]">
          <span className="font-mono">{width} × {depth} × {height}</span>
          <span>mm</span>
        </div>
      </div>

      <DimensionInput
        label="Largeur"
        value={width}
        onChange={onWidthChange}
        min={300}
        max={3000}
        step={10}
        unit="mm"
        hint="300 à 3000 mm"
      />

      <DimensionInput
        label="Profondeur"
        value={depth}
        onChange={onDepthChange}
        min={200}
        max={800}
        step={10}
        unit="mm"
        hint="200 à 800 mm"
      />

      <DimensionInput
        label="Hauteur"
        value={height}
        onChange={onHeightChange}
        min={300}
        max={2500}
        step={10}
        unit="mm"
        hint="300 à 2500 mm"
      />
    </div>
  );
}

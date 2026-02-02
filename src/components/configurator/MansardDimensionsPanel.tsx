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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-[#1A1917]">{label}</label>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="w-14 border-2 border-[#E8E6E3] bg-white px-1.5 py-0.5 text-right font-mono text-[11px] text-[#1A1917] outline-none transition-colors hover:border-[#1A1917] focus:border-[#1A1917]"
            style={{ borderRadius: '2px' }}
          />
          <span className="text-[10px] text-[#706F6C]">{unit}</span>
        </div>
      </div>

      <div className="relative py-1">
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
          style={{ width: `${percentage}%`, borderRadius: '2px' }}
        />
      </div>

      <style jsx>{`
        .dimension-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          background: #E8E6E3;
          border-radius: 2px;
          cursor: pointer;
        }
        .dimension-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          background: #1A1917;
          border: 2px solid #FFFFFF;
          border-radius: 3px;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
          transition: transform 150ms ease;
        }
        .dimension-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        .dimension-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #1A1917;
          border: 2px solid #FFFFFF;
          border-radius: 3px;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        }
        .dimension-slider::-moz-range-track {
          height: 6px;
          background: transparent;
        }
      `}</style>
    </div>
  );
}

interface MansardDimensionsPanelProps {
  width: number;
  depth: number;
  height: number;
  heightRight: number;
  onWidthChange: (value: number) => void;
  onDepthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onHeightRightChange: (value: number) => void;
}

export default function MansardDimensionsPanel({
  width,
  depth,
  height,
  heightRight,
  onWidthChange,
  onDepthChange,
  onHeightChange,
  onHeightRightChange,
}: MansardDimensionsPanelProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between border-b border-[#E8E6E3] pb-2">
        <h3 className="font-serif text-xs text-[#1A1917]">Dimensions du meuble Mansarde</h3>
        <span className="font-mono text-[10px] text-[#706F6C]">
          {width} × {depth} × {height}/{heightRight} mm
        </span>
      </div>

      <DimensionInput
        label="Largeur"
        value={width}
        onChange={onWidthChange}
        min={300}
        max={3000}
        step={10}
        unit="mm"
      />

      <DimensionInput
        label="Profondeur"
        value={depth}
        onChange={onDepthChange}
        min={200}
        max={800}
        step={10}
        unit="mm"
      />

      <DimensionInput
        label="Hauteur Gauche"
        value={height}
        onChange={onHeightChange}
        min={100}
        max={2500}
        step={10}
        unit="mm"
      />

      <DimensionInput
        label="Hauteur Droite"
        value={heightRight}
        onChange={onHeightRightChange}
        min={100}
        max={2500}
        step={10}
        unit="mm"
      />
    </div>
  );
}

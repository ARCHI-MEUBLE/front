// src/components/configurator/StylePresets.tsx

import Image from 'next/image'
import { stylePresets, StylePreset } from '@/utils/stylePresets'

interface StylePresetsProps {
  onSelectPreset: (preset: StylePreset) => void
  selectedPresetId?: string
}

export default function StylePresets({ onSelectPreset, selectedPresetId }: StylePresetsProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-4">Styles prédéfinis</h3>
      <p className="text-sm text-gray-600 mb-4">
        Choisissez un style pour appliquer automatiquement finitions, couleurs et configurations
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stylePresets.map(preset => (
          <div
            key={preset.id}
            className={`border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
              selectedPresetId === preset.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => onSelectPreset(preset)}
          >
            <div className="relative w-full h-32">
              <Image
                src={preset.thumbnail}
                alt={preset.name}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover"
              />
            </div>
            <div className="p-3">
              <h4 className="font-semibold text-sm">{preset.name}</h4>
              <p className="text-xs text-gray-500 mt-1">{preset.description}</p>
              
              <div className="mt-2 flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded border border-gray-300"
                  style={{ backgroundColor: preset.config.color }}
                  title={`Couleur: ${preset.config.color}`}
                />
                <span className="text-xs text-gray-600">
                  {preset.config.doors} porte{preset.config.doors > 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {preset.config.finish}
                </span>
                {preset.config.socle && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    avec socle
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

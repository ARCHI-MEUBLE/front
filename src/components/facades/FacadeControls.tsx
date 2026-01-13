import React, { useState, useEffect } from 'react';
import { FacadeConfig, FacadeDrilling, FacadeMaterial, DrillingType, HingeType, HingeCount, OpeningDirection } from '@/types/facade';

interface FacadeControlsProps {
  config: FacadeConfig;
  materials: FacadeMaterial[];
  onUpdateConfig: (config: Partial<FacadeConfig>) => void;
  onAddDrilling: (drilling: FacadeDrilling) => void;
  onRemoveDrilling: (id: string) => void;
}

type Step = 'dimensions' | 'material' | 'hinges';

export default function FacadeControls({
  config,
  materials,
  onUpdateConfig,
  onAddDrilling,
  onRemoveDrilling,
}: FacadeControlsProps) {
  const [currentStep, setCurrentStep] = useState<Step>('dimensions');
  const [pricingSettings, setPricingSettings] = useState({
    material_price_per_m2: 150,
    hinge_base_price: 34.20,
    hinge_coefficient: 0.05,
    hinge_edge_margin: 20,
    hinge_hole_diameter: 26,
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchPricingSettings();
  }, []);

  const fetchPricingSettings = async () => {
    try {
      const response = await fetch(`${apiUrl}/backend/api/facade-settings.php`);
      const data = await response.json();
      if (data.success) {
        const settings: Record<string, number> = {};
        data.data.forEach((s: any) => {
          if (['material_price_per_m2', 'hinge_base_price', 'hinge_coefficient', 'hinge_edge_margin', 'hinge_hole_diameter'].includes(s.setting_key)) {
            settings[s.setting_key] = parseFloat(s.setting_value);
          }
        });
        setPricingSettings({
          material_price_per_m2: settings.material_price_per_m2 || 150,
          hinge_base_price: settings.hinge_base_price || 34.20,
          hinge_coefficient: settings.hinge_coefficient || 0.05,
          hinge_edge_margin: settings.hinge_edge_margin || 20,
          hinge_hole_diameter: settings.hinge_hole_diameter || 26,
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres de tarification:', error);
    }
  };

  // Calculer le prix total selon la nouvelle formule
  const calculateTotalPrice = () => {
    // Surface en m² (largeur et hauteur sont en mm)
    const surfaceM2 = (config.width / 1000) * (config.height / 1000);
    
    // Prix de la surface (utiliser le prix au m² du matériau sélectionné)
    const surfacePrice = surfaceM2 * (config.material.price_per_m2 || pricingSettings.material_price_per_m2);
    
    // Prix des charnières (uniquement si des charnières sont choisies)
    const hingesPrice = config.hinges.type !== 'no-hole-no-hinge' 
      ? pricingSettings.hinge_base_price * config.hinges.count 
      : 0;
    
    // Prix de base avant supplément (sans le price_modifier qui n'est plus utilisé)
    const basePrice = surfacePrice + hingesPrice;
    
    // Supplément selon le nombre de charnières (coefficient × nb_charnières)
    const supplement = config.hinges.type !== 'no-hole-no-hinge'
      ? basePrice * (pricingSettings.hinge_coefficient * config.hinges.count)
      : 0;
    
    // Prix des perçages
    const drillingsPrice = config.drillings.reduce((sum: number, d: FacadeDrilling) => sum + (d.price || 0), 0);
    
    // Total
    return basePrice + supplement + drillingsPrice;
  };

  const steps: { id: Step; label: string; number: number }[] = [
    { id: 'dimensions', label: 'Dimensions', number: 1 },
    { id: 'material', label: 'Matériau', number: 2 },
    { id: 'hinges', label: 'Charnières', number: 3 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const currentStepData = steps[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-[#E8E6E3]">
      {/* Header with step indicator */}
      <div className="border-b border-[#E8E6E3] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[#706F6C]">
            ÉTAPE {currentStepData.number}/3
          </span>
          <span className="text-xs text-[#706F6C]">
            {currentStepIndex + 1} sur {steps.length}
          </span>
        </div>
        <h2 className="text-lg font-semibold text-[#1A1917]">
          {currentStepData.label}
        </h2>
        
        {/* Progress bar */}
        <div className="mt-3 h-1 bg-[#E8E6E3] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#1A1917] transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {currentStep === 'dimensions' && (
          <DimensionsPanel config={config} onUpdateConfig={onUpdateConfig} />
        )}
        {currentStep === 'material' && (
          <MaterialPanel
            config={config}
            materials={materials}
            onUpdateConfig={onUpdateConfig}
          />
        )}
        {currentStep === 'hinges' && (
          <HingesPanel 
            config={config} 
            onUpdateConfig={onUpdateConfig}
            onAddDrilling={onAddDrilling}
            onRemoveDrilling={onRemoveDrilling}
            pricingSettings={pricingSettings}
          />
        )}
      </div>

      {/* Navigation buttons */}
      <div className="border-t border-[#E8E6E3] p-4">
        <div className="flex gap-3">
          <button
            onClick={handlePrevious}
            disabled={currentStepIndex === 0}
            className="flex-1 px-4 py-3 border border-[#E8E6E3] rounded-lg hover:bg-[#FAFAF9] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Précédent
          </button>
          <button
            onClick={handleNext}
            disabled={currentStepIndex === steps.length - 1}
            className="flex-1 px-4 py-3 bg-[#1A1917] text-white rounded-lg hover:bg-[#2A2927] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suivant →
          </button>
        </div>
      </div>

      {/* Price Summary */}
      <div className="border-t border-[#E8E6E3] p-6 bg-[#FAFAF9]">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-[#706F6C]">Surface ({((config.width / 1000) * (config.height / 1000)).toFixed(2)} m²)</span>
          <span className="text-sm font-medium">
            {((config.width / 1000) * (config.height / 1000) * (config.material.price_per_m2 || pricingSettings.material_price_per_m2)).toFixed(2)} €
          </span>
        </div>
        {config.hinges.type !== 'no-hole-no-hinge' && (
          <>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-[#706F6C]">Charnières ({config.hinges.count}×)</span>
              <span className="text-sm font-medium">
                {(pricingSettings.hinge_base_price * config.hinges.count).toFixed(2)} €
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-[#706F6C]">Supplément charnières</span>
              <span className="text-sm font-medium">
                {(
                  (((config.width / 1000) * (config.height / 1000) * (config.material.price_per_m2 || pricingSettings.material_price_per_m2)) +
                  (pricingSettings.hinge_base_price * config.hinges.count)) *
                  (pricingSettings.hinge_coefficient * config.hinges.count)
                ).toFixed(2)} €
              </span>
            </div>
          </>
        )}
        {config.drillings.length > 0 && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-[#706F6C]">Perçages</span>
            <span className="text-sm font-medium">
              {config.drillings.reduce((sum: number, d: FacadeDrilling) => sum + (d.price || 0), 0).toFixed(2)} €
            </span>
          </div>
        )}
        <div className="flex justify-between items-center pt-4 border-t border-[#E8E6E3]">
          <span className="text-lg font-semibold text-[#1A1917]">Total</span>
          <span className="text-2xl font-bold text-[#1A1917]">
            {calculateTotalPrice().toFixed(2)} € TTC
          </span>
        </div>
      </div>
    </div>
  );
}

// Composant pour les dimensions
function DimensionsPanel({
  config,
  onUpdateConfig,
}: {
  config: FacadeConfig;
  onUpdateConfig: (config: Partial<FacadeConfig>) => void;
}) {
  // Conversion mm -> cm pour l'affichage
  const widthInCm = Math.round(config.width / 10);
  const heightInCm = Math.round(config.height / 10);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-[#1A1917] mb-2">
          Largeur (cm)
        </label>
        <input
          type="number"
          min="10"
          max="60"
          step="1"
          value={widthInCm}
          onChange={(e) => onUpdateConfig({ width: Number(e.target.value) * 10 })}
          className="w-full px-4 py-2 border border-[#E8E6E3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1917]"
        />
        <p className="text-xs text-[#706F6C] mt-1">Maximum : 60 cm</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1A1917] mb-2">
          Hauteur (cm)
        </label>
        <input
          type="number"
          min="50"
          max="230"
          step="1"
          value={heightInCm}
          onChange={(e) => onUpdateConfig({ height: Number(e.target.value) * 10 })}
          className="w-full px-4 py-2 border border-[#E8E6E3] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A1917]"
        />
        <p className="text-xs text-[#706F6C] mt-1">Maximum : 230 cm</p>
      </div>

      {/* Info épaisseur fixe */}
      <div className="p-4 bg-[#FAFAF9] rounded-lg border border-[#E8E6E3]">
        <p className="text-sm text-[#706F6C]">
          <span className="font-medium text-[#1A1917]">Épaisseur :</span> 19 mm (fixe)
        </p>
      </div>

      {/* Presets */}
      <div className="pt-4 border-t border-[#E8E6E3]">
        <p className="text-sm font-medium text-[#1A1917] mb-3">Dimensions prédéfinies</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() =>
              onUpdateConfig({ width: 400, height: 600 })
            }
            className="px-3 py-2 text-sm border border-[#E8E6E3] rounded-lg hover:bg-[#FAFAF9] transition-colors"
          >
            40×60 cm
          </button>
          <button
            onClick={() =>
              onUpdateConfig({ width: 500, height: 800 })
            }
            className="px-3 py-2 text-sm border border-[#E8E6E3] rounded-lg hover:bg-[#FAFAF9] transition-colors"
          >
            50×80 cm
          </button>
          <button
            onClick={() =>
              onUpdateConfig({ width: 600, height: 1000 })
            }
            className="px-3 py-2 text-sm border border-[#E8E6E3] rounded-lg hover:bg-[#FAFAF9] transition-colors"
          >
            60×100 cm
          </button>
          <button
            onClick={() =>
              onUpdateConfig({ width: 600, height: 2000 })
            }
            className="px-3 py-2 text-sm border border-[#E8E6E3] rounded-lg hover:bg-[#FAFAF9] transition-colors"
          >
            60×200 cm
          </button>
        </div>
      </div>
    </div>
  );
}

// Composant pour le matériau
function MaterialPanel({
  config,
  materials,
  onUpdateConfig,
}: {
  config: FacadeConfig;
  materials: FacadeMaterial[];
  onUpdateConfig: (config: Partial<FacadeConfig>) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#706F6C]">
        Sélectionnez le matériau et la couleur de votre façade
      </p>

      <div className="grid grid-cols-2 gap-3">
        {materials.map((material) => (
          <button
            key={material.id}
            onClick={() => onUpdateConfig({ material })}
            className={`relative flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
              config.material.id === material.id
                ? 'border-[#1A1917] bg-[#FAFAF9]'
                : 'border-[#E8E6E3] hover:border-[#706F6C]'
            }`}
          >
            <div
              className="w-16 h-16 rounded-lg mb-2 shadow-sm"
              style={{ backgroundColor: material.color_hex }}
            />
            <span className="text-xs font-medium text-center">
              {material.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Composant pour les charnières
function HingesPanel({
  config,
  onUpdateConfig,
  onAddDrilling,
  onRemoveDrilling,
  pricingSettings,
}: {
  config: FacadeConfig;
  onUpdateConfig: (config: Partial<FacadeConfig>) => void;
  onAddDrilling: (drilling: FacadeDrilling) => void;
  onRemoveDrilling: (id: string) => void;
  pricingSettings: {
    material_price_per_m2: number;
    hinge_base_price: number;
    hinge_coefficient: number;
    hinge_edge_margin: number;
    hinge_hole_diameter: number;
  };
}) {
  const getHingeIcon = (id: HingeType) => {
    switch(id) {
      case 'no-hole-no-hinge':
        return (
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            {/* Porte simple sans charnière */}
            <rect x="16" y="8" width="32" height="48" fill="#D1D5DB" stroke="#1A1917" strokeWidth="2" rx="2"/>
            <circle cx="40" cy="32" r="2" fill="#6B7280"/>
            {/* Croix pour indiquer "sans" */}
            <line x1="12" y1="12" x2="52" y2="52" stroke="#DC2626" strokeWidth="3" strokeLinecap="round"/>
            <line x1="52" y1="12" x2="12" y2="52" stroke="#DC2626" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        );
      case 'hole-with-applied-hinge':
        return (
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            {/* Montant du meuble */}
            <rect x="6" y="8" width="16" height="48" fill="#9CA3AF" stroke="#1A1917" strokeWidth="1.5"/>
            {/* Porte en applique (devant le montant) */}
            <rect x="20" y="12" width="28" height="40" fill="#E5E7EB" stroke="#1A1917" strokeWidth="2" rx="1"/>
            {/* Charnière visible (2 plaques reliées) */}
            <rect x="18" y="20" width="8" height="12" fill="#4B5563" stroke="#1A1917" strokeWidth="1" rx="1"/>
            <rect x="14" y="22" width="6" height="8" fill="#6B7280" stroke="#1A1917" strokeWidth="1" rx="1"/>
            {/* Vis de fixation */}
            <circle cx="22" cy="24" r="1.5" fill="#374151"/>
            <circle cx="22" cy="29" r="1.5" fill="#374151"/>
            <circle cx="17" cy="26" r="1.5" fill="#374151"/>
            {/* Poignée */}
            <circle cx="40" cy="32" r="2.5" fill="#6B7280" stroke="#1A1917" strokeWidth="1"/>
          </svg>
        );
      case 'hole-with-twin-hinge':
        return (
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            {/* Montant central */}
            <rect x="28" y="8" width="8" height="48" fill="#9CA3AF" stroke="#1A1917" strokeWidth="1.5"/>
            {/* Porte gauche */}
            <rect x="6" y="12" width="22" height="40" fill="#E5E7EB" stroke="#1A1917" strokeWidth="2" rx="1"/>
            {/* Porte droite */}
            <rect x="36" y="12" width="22" height="40" fill="#E5E7EB" stroke="#1A1917" strokeWidth="2" rx="1"/>
            {/* Charnière gauche */}
            <rect x="26" y="20" width="6" height="10" fill="#4B5563" stroke="#1A1917" strokeWidth="1" rx="1"/>
            <rect x="22" y="22" width="5" height="6" fill="#6B7280" stroke="#1A1917" strokeWidth="1" rx="1"/>
            {/* Charnière droite */}
            <rect x="32" y="20" width="6" height="10" fill="#4B5563" stroke="#1A1917" strokeWidth="1" rx="1"/>
            <rect x="37" y="22" width="5" height="6" fill="#6B7280" stroke="#1A1917" strokeWidth="1" rx="1"/>
            {/* Vis */}
            <circle cx="29" cy="24" r="1.2" fill="#374151"/>
            <circle cx="35" cy="24" r="1.2" fill="#374151"/>
            {/* Poignées */}
            <circle cx="20" cy="32" r="2" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8"/>
            <circle cx="44" cy="32" r="2" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8"/>
          </svg>
        );
      case 'hole-with-integrated-hinge':
        return (
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            {/* Montant du meuble (avec encastrement) */}
            <rect x="6" y="8" width="20" height="48" fill="#9CA3AF" stroke="#1A1917" strokeWidth="1.5"/>
            {/* Découpe pour encastrement */}
            <rect x="24" y="12" width="4" height="40" fill="#6B7280" stroke="#1A1917" strokeWidth="1"/>
            {/* Porte encastrée */}
            <rect x="26" y="12" width="28" height="40" fill="#E5E7EB" stroke="#1A1917" strokeWidth="2" rx="1"/>
            {/* Charnière encastrée (invisible, représentée par des trous) */}
            <circle cx="29" cy="22" r="3" fill="#4B5563" stroke="#1A1917" strokeWidth="1.5"/>
            <circle cx="29" cy="32" r="3" fill="#4B5563" stroke="#1A1917" strokeWidth="1.5"/>
            <circle cx="29" cy="42" r="3" fill="#4B5563" stroke="#1A1917" strokeWidth="1.5"/>
            {/* Bras de charnière (partie visible) */}
            <rect x="27" y="20" width="8" height="4" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8" rx="0.5"/>
            <rect x="27" y="30" width="8" height="4" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8" rx="0.5"/>
            <rect x="27" y="40" width="8" height="4" fill="#6B7280" stroke="#1A1917" strokeWidth="0.8" rx="0.5"/>
            {/* Flèche indiquant l'encastrement */}
            <path d="M 50 28 L 46 32 L 50 36" stroke="#1A1917" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Poignée */}
            <circle cx="45" cy="32" r="2.5" fill="#6B7280" stroke="#1A1917" strokeWidth="1"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const hingeTypes: { id: HingeType; label: string; price: number }[] = [
    { 
      id: 'no-hole-no-hinge', 
      label: 'Sans trou, sans charnière', 
      price: 0
    },
    { 
      id: 'hole-with-applied-hinge', 
      label: 'Trou + charnière fournie porte en applique', 
      price: 34.20
    },
    { 
      id: 'hole-with-twin-hinge', 
      label: 'Trou + charnière fournie porte jumelée', 
      price: 34.20
    },
    { 
      id: 'hole-with-integrated-hinge', 
      label: 'Trou + charnière fournie porte encastrée', 
      price: 34.20
    },
  ];

  const hingeCounts: HingeCount[] = [2, 3, 4, 5];

  const updateHinge = (field: keyof typeof config.hinges, value: any) => {
    const newHinges = { ...config.hinges, [field]: value };
    
    // Recalculer le prix basé sur le type sélectionné
    const selectedType = hingeTypes.find(t => t.id === newHinges.type);
    if (selectedType) {
      newHinges.price = selectedType.price * newHinges.count;
    }
    
    // Supprimer les anciens trous de charnières
    config.drillings
      .filter((d: FacadeDrilling) => d.typeName === 'Trous pour charnières')
      .forEach((d: FacadeDrilling) => onRemoveDrilling(d.id));
    
    // Ajouter les nouveaux trous si le type nécessite des trous
    if (newHinges.type !== 'no-hole-no-hinge') {
      const holes = generateHingeHoles(newHinges.count, newHinges.direction, config.height, pricingSettings.hinge_edge_margin, pricingSettings.hinge_hole_diameter);
      holes.forEach((pos, index) => {
        const drilling: FacadeDrilling = {
          id: `hinge-${index}-${Date.now()}`,
          type: 'circular',
          typeName: 'Trous pour charnières',
          x: pos.x,
          y: pos.y,
          diameter: pos.diameter,
          price: 0,
        };
        onAddDrilling(drilling);
      });
    }
    
    onUpdateConfig({ hinges: newHinges });
  };

  return (
    <div className="space-y-6">
      {/* Type de charnière */}
      <div>
        <p className="text-sm font-medium text-[#1A1917] mb-3">
          SÉLECTIONNEZ LES CHARNIÈRES POUR VOTRE FAÇADE
        </p>
        <div className="space-y-2">
          {hingeTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => updateHinge('type', type.id)}
              className={`w-full flex items-center justify-between p-4 border-2 rounded-lg transition-all ${
                config.hinges.type === type.id
                  ? 'border-[#1A1917] bg-[#FAFAF9]'
                  : 'border-[#E8E6E3] hover:border-[#706F6C]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">{getHingeIcon(type.id)}</div>
                <div className="text-left">
                  <p className="text-sm font-medium text-[#1A1917]">
                    {type.label}
                  </p>
                  <p className="text-xs text-[#706F6C] mt-1">
                    Prix unit. {type.price.toFixed(2)} € TTC
                  </p>
                </div>
              </div>
              {config.hinges.type === type.id && (
                <div className="w-5 h-5 rounded-full bg-[#1A1917] flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Nombre de charnières */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-sm font-medium text-[#1A1917]">
            NOMBRE DE CHARNIÈRES À PRÉVOIR PAR FAÇADE
          </p>
          <button className="w-5 h-5 rounded-full bg-[#1A1917] text-white flex items-center justify-center text-xs">
            ?
          </button>
        </div>
        <div className="flex gap-2">
          {hingeCounts.map((count) => (
            <button
              key={count}
              onClick={() => updateHinge('count', count)}
              className={`flex-1 px-4 py-3 border-2 rounded-lg font-medium transition-all ${
                config.hinges.count === count
                  ? 'border-[#1A1917] bg-[#1A1917] text-white'
                  : 'border-[#E8E6E3] text-[#706F6C] hover:border-[#1A1917]'
              }`}
            >
              {count} charnières
            </button>
          ))}
        </div>
      </div>

      {/* Sens d'ouverture */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-sm font-medium text-[#1A1917]">
            SENS D'OUVERTURE DE LA FAÇADE
          </p>
          <button className="w-5 h-5 rounded-full bg-[#1A1917] text-white flex items-center justify-center text-xs">
            ?
          </button>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => updateHinge('direction', 'right')}
            className={`flex-1 px-4 py-3 border-2 rounded-lg font-medium transition-all ${
              config.hinges.direction === 'right'
                ? 'border-[#1A1917] bg-[#1A1917] text-white'
                : 'border-[#E8E6E3] text-[#706F6C] hover:border-[#1A1917]'
            }`}
          >
            Droite
          </button>
          <button
            onClick={() => updateHinge('direction', 'left')}
            className={`flex-1 px-4 py-3 border-2 rounded-lg font-medium transition-all ${
              config.hinges.direction === 'left'
                ? 'border-[#1A1917] bg-[#1A1917] text-white'
                : 'border-[#E8E6E3] text-[#706F6C] hover:border-[#1A1917]'
            }`}
          >
            Gauche
          </button>
        </div>
      </div>
    </div>
  );
}



// Composant pour les perçages personnalisés
function DrillingPanel({
  config,
  drillingTypes,
  onAddDrilling,
  onRemoveDrilling,
  loading,
  pricingSettings,
}: {
  config: FacadeConfig;
  drillingTypes: DrillingType[];
  onAddDrilling: (drilling: FacadeDrilling) => void;
  onRemoveDrilling: (id: string) => void;
  loading: boolean;
  pricingSettings: {
    hinge_hole_diameter: number;
  };
}) {
  const [selectedType, setSelectedType] = useState<DrillingType | null>(null);
  
  // Filtrer les perçages personnalisés (pas les trous de charnières)
  const customDrillings = config.drillings.filter((d: FacadeDrilling) => d.typeName !== 'Trous pour charnières');

  const handleAddDrilling = (type: DrillingType) => {
    // Ajouter le perçage au centre de la façade
    const drilling: FacadeDrilling = {
      id: `drilling-${Date.now()}`,
      type: 'circular',
      typeName: type.name,
      drilling_type_id: type.id,
      x: 50, // Centre horizontal
      y: 50, // Centre vertical
      diameter: pricingSettings?.hinge_hole_diameter || 26, // Diamètre configurable
      price: type.price,
    };
    onAddDrilling(drilling);
    setSelectedType(null);
  };

  const handleRemoveDrilling = (drillingId: string) => {
    onRemoveDrilling(drillingId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A1917]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          💡 Sélectionnez un type de perçage ci-dessous, puis ajustez sa position sur l'aperçu 3D
        </p>
      </div>

      {/* Types de perçages disponibles */}
      <div>
        <p className="text-sm font-medium text-[#1A1917] mb-3">
          TYPES DE PERÇAGES DISPONIBLES
        </p>
        <div className="space-y-2">
          {drillingTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => handleAddDrilling(type)}
              className="w-full flex items-center justify-between p-4 border-2 border-[#E8E6E3] rounded-lg hover:border-[#1A1917] transition-all"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 flex items-center justify-center bg-[#FAFAF9] rounded-lg"
                  dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 24 24" class="w-8 h-8">${type.icon_svg}</svg>` }}
                />
                <div className="text-left">
                  <p className="text-sm font-medium text-[#1A1917]">
                    {type.name}
                  </p>
                  <p className="text-xs text-[#706F6C] mt-1">
                    {type.description}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#1A1917]">
                  +{type.price.toFixed(2)} €
                </p>
                <button
                  className="mt-1 px-3 py-1 bg-[#1A1917] text-white text-xs rounded hover:bg-[#2A2927] transition-colors"
                >
                  Ajouter
                </button>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Liste des perçages ajoutés */}
      {customDrillings.length > 0 && (
        <div className="pt-4 border-t border-[#E8E6E3]">
          <p className="text-sm font-medium text-[#1A1917] mb-3">
            PERÇAGES AJOUTÉS ({customDrillings.length})
          </p>
          <div className="space-y-2">
            {customDrillings.map((drilling: FacadeDrilling) => (
              <div
                key={drilling.id}
                className="flex items-center justify-between p-3 bg-[#FAFAF9] rounded-lg border border-[#E8E6E3]"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1A1917]">
                    {drilling.typeName}
                  </p>
                  <p className="text-xs text-[#706F6C] mt-1">
                    Position : {drilling.x.toFixed(0)}% × {drilling.y.toFixed(0)}%
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#1A1917]">
                    {drilling.price?.toFixed(2)} €
                  </span>
                  <button
                    onClick={() => handleRemoveDrilling(drilling.id)}
                    className="px-3 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                  >
                    Retirer
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Total des perçages */}
          <div className="mt-4 p-4 bg-white border border-[#E8E6E3] rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#706F6C]">
                Total perçages ({customDrillings.length})
              </span>
              <span className="text-lg font-semibold text-[#1A1917]">
                {customDrillings.reduce((sum: number, d: FacadeDrilling) => sum + (d.price || 0), 0).toFixed(2)} € TTC
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Message si aucun perçage */}
      {customDrillings.length === 0 && (
        <div className="p-6 text-center border-2 border-dashed border-[#E8E6E3] rounded-lg">
          <p className="text-sm text-[#706F6C]">
            Aucun perçage ajouté pour le moment
          </p>
          <p className="text-xs text-[#706F6C] mt-1">
            Sélectionnez un type ci-dessus pour commencer
          </p>
        </div>
      )}
    </div>
  );
}

// Fonction helper pour générer les positions des trous de charnières
function generateHingeHoles(count: HingeCount, direction: OpeningDirection, height: number, edgeMargin: number = 20, diameter: number = 26): Array<{x: number, y: number, diameter: number}> {
  const x = direction === 'left' ? 5 : 95; // 5% du bord gauche ou droit
  const holes = [];
  
  // Si 2 charnières ou moins : positionner aux extrémités à edgeMargin mm des bords
  if (count <= 2) {
    const marginPercent = (edgeMargin / height) * 100;
    
    holes.push({
      x,
      y: marginPercent, // Premier trou à edgeMargin mm du haut
      diameter: diameter
    });
    
    if (count === 2) {
      holes.push({
        x,
        y: 100 - marginPercent, // Deuxième trou à edgeMargin mm du bas
        diameter: diameter
      });
    }
  } else {
    // Si plus de 2 charnières : premier et dernier à edgeMargin mm, les autres répartis uniformément entre
    const marginPercent = (edgeMargin / height) * 100;
    const availableSpace = 100 - (2 * marginPercent); // Espace disponible entre les marges
    const spacing = availableSpace / (count - 1); // Espacement entre les trous intermédiaires
    
    for (let i = 0; i < count; i++) {
      holes.push({
        x,
        y: marginPercent + (spacing * i),
        diameter: diameter
      });
    }
  }
  
  return holes;
}

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Viewer from '@/components/configurator/Viewer';
import DimensionsPanel from '@/components/configurator/DimensionsPanel';
import ActionBar from '@/components/configurator/ActionBar';
import ZoneEditor, { Zone, ZoneContent } from '@/components/configurator/ZoneEditor';
import SocleSelector from '@/components/configurator/SocleSelector';
import MaterialSelector from '@/components/configurator/MaterialSelector';
import PriceDisplay from '@/components/configurator/PriceDisplay';
import AuthModal from '@/components/auth/AuthModal';
import { Header } from '@/components/Header';
import { apiClient, type FurnitureModel, type SampleType, type SampleColor, type FurnitureColors } from '@/lib/apiClient';
import { useCustomer } from '@/context/CustomerContext';
import { ChevronLeft, Settings, Palette, Box, Layers } from 'lucide-react';

const MATERIAL_ORDER = ['Aggloméré', 'MDF + revêtement (mélaminé)', 'Plaqué bois'];

const MATERIAL_LABEL_BY_KEY: Record<string, string> = {
  agglomere: 'Aggloméré',
  mdf_melamine: 'MDF + revêtement (mélaminé)',
  plaque_bois: 'Plaqué bois',
};

const MATERIAL_PRICE_BY_KEY: Record<string, number> = {
  agglomere: 0,
  mdf_melamine: 70,
  plaque_bois: 140,
};

const DEFAULT_COLOR_HEX = '#D8C7A1';

function normalizeMaterialKey(value: string | null | undefined): string {
  if (!value) return 'agglomere';
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (normalized.includes('agglom')) return 'agglomere';
  if (normalized.includes('mdf') || normalized.includes('melamine')) return 'mdf_melamine';
  if (normalized.includes('plaque') || normalized.includes('bois')) return 'plaque_bois';
  return 'agglomere';
}

function materialLabelFromKey(key: string): string {
  return MATERIAL_LABEL_BY_KEY[key] || key;
}

type ConfigTab = 'dimensions' | 'interior' | 'materials';

export default function ConfiguratorPage() {
  const router = useRouter();
  const { id } = router.query;
  const { customer, isAuthenticated } = useCustomer();

  // États de base
  const [model, setModel] = useState<FurnitureModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [dxfUrl, setDxfUrl] = useState<string | null>(null);
  const [editingConfigId, setEditingConfigId] = useState<number | null>(null);
  const [editingConfigName, setEditingConfigName] = useState<string>('');
  const [initialConfigApplied, setInitialConfigApplied] = useState(true);
  const [skipNextAutoGenerate, setSkipNextAutoGenerate] = useState(false);

  // Prompt template
  const [templatePrompt, setTemplatePrompt] = useState<string | null>(null);

  // Configuration
  const [width, setWidth] = useState(1500);
  const [height, setHeight] = useState(730);
  const [depth, setDepth] = useState(500);
  const [socle, setSocle] = useState('none');
  const [finish, setFinish] = useState('Aggloméré');
  const [color, setColor] = useState(DEFAULT_COLOR_HEX);
  const [colorLabel, setColorLabel] = useState('Aggloméré naturel');
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [selectedColorImage, setSelectedColorImage] = useState<string | null>(null);
  const [materialsMap, setMaterialsMap] = useState<Record<string, SampleType[]>>({});
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [price, setPrice] = useState(899);
  const [doorsOpen, setDoorsOpen] = useState(true);

  // Zones (mode par défaut)
  const [rootZone, setRootZone] = useState<Zone>({
    id: 'root',
    type: 'leaf',
    content: 'empty',
  });
  const [selectedZoneId, setSelectedZoneId] = useState<string>('root');

  // UI
  const [activeTab, setActiveTab] = useState<ConfigTab>('dimensions');
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Derived state
  const selectedMaterialKey = useMemo(() => normalizeMaterialKey(finish), [finish]);
  const selectedMaterialLabel = useMemo(() => materialLabelFromKey(selectedMaterialKey), [selectedMaterialKey]);

  const materialTypesForSelection = useMemo<SampleType[]>(() => {
    return materialsMap[selectedMaterialLabel] || [];
  }, [materialsMap, selectedMaterialLabel]);

  const colorsForMaterial = useMemo<SampleColor[]>(() => {
    const list: SampleColor[] = [];
    const seen = new Set<number>();
    for (const type of materialTypesForSelection) {
      for (const colorOption of type.colors || []) {
        if (seen.has(colorOption.id)) continue;
        seen.add(colorOption.id);
        list.push(colorOption);
      }
    }
    return list;
  }, [materialTypesForSelection]);

  const selectedColorOption = useMemo<SampleColor | null>(() => {
    if (selectedColorId == null) return null;
    return colorsForMaterial.find((option) => option.id === selectedColorId) || null;
  }, [colorsForMaterial, selectedColorId]);

  // Charger les matériaux
  useEffect(() => {
    let cancelled = false;
    const loadMaterials = async () => {
      try {
        setMaterialsLoading(true);
        const data = await apiClient.samples.listPublic();
        if (!cancelled) setMaterialsMap(data);
      } catch (error) {
        console.warn('Impossible de récupérer les matériaux', error);
      } finally {
        if (!cancelled) setMaterialsLoading(false);
      }
    };
    loadMaterials();
    return () => { cancelled = true; };
  }, []);

  // Synchroniser la couleur sélectionnée
  useEffect(() => {
    if (!colorsForMaterial.length) {
      if (selectedColorId !== null) setSelectedColorId(null);
      return;
    }
    if (selectedColorId !== null && colorsForMaterial.some((o) => o.id === selectedColorId)) return;
    const fallback = colorsForMaterial.find((o) => o.name?.toLowerCase() === colorLabel.toLowerCase());
    const nextColor = fallback || colorsForMaterial[0];
    setSelectedColorId(nextColor.id);
  }, [colorsForMaterial, selectedColorId, colorLabel]);

  useEffect(() => {
    if (selectedColorOption) {
      setColor(selectedColorOption.hex || DEFAULT_COLOR_HEX);
      setColorLabel(selectedColorOption.name || selectedMaterialLabel);
      setSelectedColorImage(selectedColorOption.image_url || null);
    } else {
      setColor(DEFAULT_COLOR_HEX);
      setColorLabel(selectedMaterialLabel);
    }
  }, [selectedColorOption, selectedMaterialLabel]);

  // Parse du prompt
  const parsePromptToConfig = useCallback((prompt: string) => {
    const dims = prompt.match(/\((\d+),(\d+),(\d+)\)/);
    if (dims) {
      setWidth(parseInt(dims[1]));
      setDepth(parseInt(dims[2]));
      setHeight(parseInt(dims[3]));
    }

    const compact = prompt.replace(/\s+/g, '');
    if (/S2/.test(compact)) setSocle('wood');
    else if (/S(?!\d)/.test(compact)) setSocle('metal');
    else setSocle('none');

    // Parse structure
    const hStruct = compact.match(/H(\d+)\(([^)]*)\)/);
    const vStruct = compact.match(/V(\d+)\(([^)]*)\)/);

    if (hStruct) {
      const inner = hStruct[2];
      const children = inner.split(',').map((content, idx) => ({
        id: `zone-${idx}`,
        type: 'leaf' as const,
        content: (content.includes('T') ? 'drawer' : content.includes('D') ? 'dressing' : 'empty') as ZoneContent,
      }));
      setRootZone({ id: 'root', type: 'horizontal', children });
    } else if (vStruct) {
      const inner = vStruct[2];
      const children = inner.split(',').map((content, idx) => ({
        id: `zone-${idx}`,
        type: 'leaf' as const,
        content: (content.includes('T') ? 'drawer' : content.includes('D') ? 'dressing' : 'empty') as ZoneContent,
      }));
      setRootZone({ id: 'root', type: 'vertical', children });
    }
  }, []);

  // Charger le modèle
  const loadModel = useCallback(async () => {
    try {
      if (id && !isNaN(Number(id))) {
        const modelData = await apiClient.models.getById(Number(id));
        setModel(modelData);
        if (modelData.prompt) {
          setTemplatePrompt(modelData.prompt);
          parsePromptToConfig(modelData.prompt);
        }
      } else {
        const qsPrompt = (router.query.prompt as string) || null;
        if (qsPrompt) {
          setTemplatePrompt(qsPrompt);
          parsePromptToConfig(qsPrompt);
          setModel({
            id: 0,
            name: `Template ${id}`,
            description: null,
            prompt: qsPrompt,
            price: 0,
            image_url: null,
            created_at: new Date().toISOString(),
          } as FurnitureModel);
        }
      }
    } catch (error) {
      console.error('Error loading model:', error);
    } finally {
      setLoading(false);
    }
  }, [id, router.query.prompt, parsePromptToConfig]);

  useEffect(() => {
    if (id) loadModel();
  }, [id, loadModel]);

  // Construction du prompt depuis l'arbre de zones
  const buildPromptFromZoneTree = useCallback((zone: Zone): string => {
    if (zone.type === 'leaf') {
      switch (zone.content) {
        case 'drawer': return 'T';
        case 'dressing': return 'D';
        default: return '';
      }
    }

    const childPrompts = zone.children?.map((c) => buildPromptFromZoneTree(c)) || [];
    const prefix = zone.type === 'horizontal' ? 'H' : 'V';

    if (zone.splitRatio !== undefined && zone.children?.length === 2) {
      const r1 = Math.round(zone.splitRatio);
      const r2 = 100 - r1;
      return `${prefix}[${r1},${r2}](${childPrompts.join(',')})`;
    }
    return `${prefix}${childPrompts.length}(${childPrompts.join(',')})`;
  }, []);

  // Calcul du prix
  const calculatePrice = useCallback((config: {
    width: number;
    height: number;
    depth: number;
    finish: string;
    socle: string;
    rootZone: Zone;
  }): number => {
    let p = 580;
    const modules = Math.max(1, Math.round(config.width / 500));
    p += modules * 150;
    const hauteurCm = Math.round(config.height / 10);
    if (hauteurCm > 60) p += (hauteurCm - 60) * 2;
    p += Math.round(config.depth / 10) * 3;
    p += MATERIAL_PRICE_BY_KEY[normalizeMaterialKey(config.finish)] || 0;

    const soclePrices: Record<string, number> = { none: 0, metal: 40, wood: 60 };
    p += soclePrices[config.socle] || 0;

    // Compter tiroirs et penderies dans les zones
    const countContent = (zone: Zone, type: ZoneContent): number => {
      if (zone.type === 'leaf') return zone.content === type ? 1 : 0;
      return (zone.children || []).reduce((sum, child) => sum + countContent(child, type), 0);
    };
    p += countContent(config.rootZone, 'drawer') * 35;

    return Math.round(p);
  }, []);

  // Génération du modèle 3D
  const generateModel = useCallback(async (prompt: string) => {
    setGenerating(true);
    try {
      const singleColor = selectedColorOption?.hex || undefined;
      const result = await apiClient.generate.generate(prompt, !doorsOpen, singleColor, undefined);

      let glbUrlAbsolute = result.glb_url;
      if (glbUrlAbsolute.startsWith('/')) {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        glbUrlAbsolute = `${API_URL}${glbUrlAbsolute}`;
      }
      setGlbUrl(glbUrlAbsolute);
      setDxfUrl(result.dxf_url || null);
    } catch (error) {
      console.error('Erreur génération:', error);
    } finally {
      setGenerating(false);
    }
  }, [doorsOpen, selectedColorOption]);

  // Effet de régénération
  useEffect(() => {
    if (!templatePrompt || !initialConfigApplied) return;
    if (skipNextAutoGenerate) {
      setSkipNextAutoGenerate(false);
      return;
    }

    // Construire le prompt
    const regex = /^(M[1-5])\(([^)]+)\)(.*)$/;
    const match = templatePrompt.match(regex);
    if (!match) return;

    const meubleType = match[1];
    let prompt = `${meubleType}(${width},${depth},${height})`;

    // Planches (E = enveloppe + b = bas + F = fond)
    prompt += 'EbF';

    // Socle
    if (socle === 'metal') prompt += 'S';
    else if (socle === 'wood') prompt += 'S2';

    // Structure de zones
    const zonePrompt = buildPromptFromZoneTree(rootZone);
    if (zonePrompt && zonePrompt.trim()) {
      prompt += zonePrompt;
    }

    // Calculer le prix
    setPrice(calculatePrice({ width, height, depth, finish, socle, rootZone }));

    // Générer
    const timer = setTimeout(() => generateModel(prompt), 300);
    return () => clearTimeout(timer);
  }, [templatePrompt, width, height, depth, socle, finish, rootZone, doorsOpen, initialConfigApplied, skipNextAutoGenerate, buildPromptFromZoneTree, calculatePrice, generateModel]);

  // Handlers
  const handleMaterialChange = (key: string) => {
    const label = materialLabelFromKey(key);
    setFinish(label);
    setSelectedColorId(null);
    setSelectedColorImage(null);
  };

  const handleColorChange = (option: SampleColor) => {
    setSelectedColorId(option.id);
    setColor(option.hex || DEFAULT_COLOR_HEX);
    setColorLabel(option.name || selectedMaterialLabel);
    setSelectedColorImage(option.image_url || null);
  };

  // Sauvegarde
  const saveConfiguration = async () => {
    if (!isAuthenticated || !customer) {
      const redirectTarget = encodeURIComponent(router.asPath || `/configurator/${id}`);
      router.push(`/auth/login?redirect=${redirectTarget}`);
      return;
    }

    const configNameInput = prompt('Nom de cette configuration :', editingConfigName || '');
    if (!configNameInput?.trim()) return;

    try {
      const regex = /^(M[1-5])\(([^)]+)\)(.*)$/;
      const match = templatePrompt?.match(regex);
      const meubleType = match?.[1] || 'M1';

      let fullPrompt = `${meubleType}(${width},${depth},${height})EbF`;
      if (socle === 'metal') fullPrompt += 'S';
      else if (socle === 'wood') fullPrompt += 'S2';
      fullPrompt += buildPromptFromZoneTree(rootZone);

      const configData = {
        dimensions: { width, depth, height },
        styling: {
          materialKey: selectedMaterialKey,
          materialLabel: selectedMaterialLabel,
          finish,
          color,
          colorLabel,
          colorId: selectedColorId,
          colorImage: selectedColorImage,
          socle,
        },
        features: { doorsOpen },
        advancedZones: rootZone,
      };

      const payload = {
        id: editingConfigId ?? undefined,
        name: configNameInput.trim(),
        model_id: model?.id || null,
        prompt: fullPrompt,
        config_data: configData,
        glb_url: glbUrl,
        dxf_url: dxfUrl,
        price,
        thumbnail_url: glbUrl,
      };

      const response = await fetch('/backend/api/configurations/save.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Erreur lors de la sauvegarde');

      const result = await response.json();
      setEditingConfigName(configNameInput.trim());

      if (result.configuration) {
        await fetch('/backend/api/cart/index.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ configuration_id: result.configuration.id, quantity: 1 }),
        });
        router.push('/cart');
      }
    } catch (err: unknown) {
      console.error('Erreur saveConfiguration:', err);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin border-2 border-[#1A1917] border-t-transparent" style={{ borderRadius: '50%' }} />
          <p className="mt-4 text-sm text-[#706F6C]">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9]">
        <div className="text-center">
          <h1 className="font-serif text-2xl text-[#1A1917]">Modèle non trouvé</h1>
          <button
            onClick={() => router.push('/')}
            className="mt-6 bg-[#1A1917] px-6 py-3 text-sm font-medium text-white"
            style={{ borderRadius: '2px' }}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  const TABS: { id: ConfigTab; label: string; icon: typeof Settings }[] = [
    { id: 'dimensions', label: 'Dimensions', icon: Settings },
    { id: 'interior', label: 'Aménagement', icon: Layers },
    { id: 'materials', label: 'Finitions', icon: Palette },
  ];

  return (
    <>
      <Head>
        <title>Configurateur - {model.name} | ArchiMeuble</title>
      </Head>

      <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
        {/* Header compact */}
        <header className="border-b border-[#E8E6E3] bg-white">
          <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <Link
                href="/models"
                className="flex h-10 w-10 items-center justify-center border border-[#E8E6E3] text-[#706F6C] transition-colors hover:border-[#1A1917] hover:text-[#1A1917]"
                style={{ borderRadius: '2px' }}
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="font-serif text-lg text-[#1A1917]">{model.name}</h1>
                <p className="text-xs text-[#706F6C]">Configurateur sur mesure</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isAuthenticated && customer && (
                <span className="text-xs text-[#706F6C]">
                  {customer.first_name} {customer.last_name}
                </span>
              )}
              <Link
                href="/"
                className="font-serif text-lg text-[#1A1917]"
              >
                ArchiMeuble
              </Link>
            </div>
          </div>
        </header>

        {/* Main content */}
        <div className="flex flex-1">
          {/* Viewer */}
          <div className="relative flex-1 bg-[#FAFAF9]">
            <div className="absolute inset-0">
              <Viewer glb={glbUrl || undefined} />
              {generating && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#FAFAF9]/80">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin border-2 border-[#1A1917] border-t-transparent" style={{ borderRadius: '50%' }} />
                    <p className="text-sm text-[#706F6C]">Génération du meuble 3D...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action bar overlay */}
            <div className="absolute bottom-0 left-0 right-0">
              <ActionBar
                doorsOpen={doorsOpen}
                onToggleDoors={() => setDoorsOpen(!doorsOpen)}
                generating={generating}
              />
            </div>
          </div>

          {/* Panel de configuration */}
          <div className="flex w-[420px] flex-col border-l border-[#E8E6E3] bg-white">
            {/* Tabs */}
            <div className="flex border-b border-[#E8E6E3]">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-[#1A1917] text-[#1A1917]'
                      : 'border-transparent text-[#706F6C] hover:text-[#1A1917]'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'dimensions' && (
                <div className="space-y-8">
                  <DimensionsPanel
                    width={width}
                    depth={depth}
                    height={height}
                    onWidthChange={setWidth}
                    onDepthChange={setDepth}
                    onHeightChange={setHeight}
                  />
                  <SocleSelector
                    value={socle}
                    onChange={setSocle}
                  />
                </div>
              )}

              {activeTab === 'interior' && (
                <ZoneEditor
                  rootZone={rootZone}
                  selectedZoneId={selectedZoneId}
                  onRootZoneChange={setRootZone}
                  onSelectedZoneIdChange={setSelectedZoneId}
                  width={width}
                  height={height}
                />
              )}

              {activeTab === 'materials' && (
                <MaterialSelector
                  materialsMap={materialsMap}
                  selectedMaterialKey={selectedMaterialKey}
                  selectedColorId={selectedColorId}
                  onMaterialChange={handleMaterialChange}
                  onColorChange={handleColorChange}
                  loading={materialsLoading}
                />
              )}
            </div>

            {/* Footer avec prix */}
            <div className="border-t border-[#E8E6E3] bg-white p-6">
              <PriceDisplay
                price={price}
                onAddToCart={saveConfiguration}
                isAuthenticated={isAuthenticated}
              />
            </div>
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setTimeout(() => saveConfiguration(), 500);
        }}
      />
    </>
  );
}

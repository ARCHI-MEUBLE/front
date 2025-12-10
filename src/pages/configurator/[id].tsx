import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Viewer from '@/components/configurator/Viewer';
import DimensionsPanel from '@/components/configurator/DimensionsPanel';
import ActionBar from '@/components/configurator/ActionBar';
import ZoneEditor, { Zone, ZoneContent } from '@/components/configurator/ZoneEditor';
import SocleSelector from '@/components/configurator/SocleSelector';
import MaterialSelector, { ComponentColors } from '@/components/configurator/MaterialSelector';
import PriceDisplay from '@/components/configurator/PriceDisplay';
import AuthModal from '@/components/auth/AuthModal';
import { Header } from '@/components/Header';
import { apiClient, type FurnitureModel, type SampleType, type SampleColor, type FurnitureColors } from '@/lib/apiClient';
import { useCustomer } from '@/context/CustomerContext';
import { ChevronLeft, Settings, Palette, Box } from 'lucide-react';

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

type ConfigTab = 'dimensions' | 'materials';

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

  // Mode multi-couleurs
  const [useMultiColor, setUseMultiColor] = useState(false);
  const [componentColors, setComponentColors] = useState<ComponentColors>({
    structure: { colorId: null, hex: null },
    drawers: { colorId: null, hex: null },
    doors: { colorId: null, hex: null },
    base: { colorId: null, hex: null },
  });

  // Zones (mode par défaut)
  const [rootZone, setRootZone] = useState<Zone>({
    id: 'root',
    type: 'leaf',
    content: 'empty',
  });
  const [selectedZoneId, setSelectedZoneId] = useState<string>('root');
  const [doors, setDoors] = useState(0);

  // Fonctions de manipulation des zones
  const findZone = useCallback((zone: Zone, targetId: string): Zone | null => {
    if (zone.id === targetId) return zone;
    if (zone.children) {
      for (const child of zone.children) {
        const found = findZone(child, targetId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const selectedZone = useMemo(() => findZone(rootZone, selectedZoneId), [rootZone, selectedZoneId, findZone]);

  const splitZone = useCallback((zoneId: string, direction: 'horizontal' | 'vertical', count: number = 2) => {
    const updateZone = (z: Zone): Zone => {
      if (z.id === zoneId) {
        return {
          ...z,
          type: direction,
          content: undefined,
          splitRatio: 50,
          children: Array.from({ length: count }, (_, i) => ({
            id: `${zoneId}-${i}`,
            type: 'leaf' as const,
            content: 'empty' as ZoneContent,
          })),
        };
      }
      if (z.children) {
        return { ...z, children: z.children.map(updateZone) };
      }
      return z;
    };
    setRootZone(updateZone(rootZone));
    setSelectedZoneId(`${zoneId}-0`);
  }, [rootZone]);

  const setZoneContent = useCallback((zoneId: string, content: ZoneContent) => {
    const updateZone = (z: Zone): Zone => {
      if (z.id === zoneId && z.type === 'leaf') {
        return { ...z, content };
      }
      if (z.children) {
        return { ...z, children: z.children.map(updateZone) };
      }
      return z;
    };
    setRootZone(updateZone(rootZone));
  }, [rootZone]);

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
    const childCount = zone.children?.length ?? 0;

    // Pour 2 enfants avec splitRatio
    if (zone.splitRatio !== undefined && childCount === 2) {
      const r1 = Math.round(zone.splitRatio);
      const r2 = 100 - r1;
      return `${prefix}[${r1},${r2}](${childPrompts.join(',')})`;
    }

    // Pour 3+ enfants avec splitRatios
    if (zone.splitRatios && zone.splitRatios.length === childCount && childCount > 2) {
      const ratiosStr = zone.splitRatios.map(r => Math.round(r)).join(',');
      return `${prefix}[${ratiosStr}](${childPrompts.join(',')})`;
    }

    return `${prefix}${childCount}(${childPrompts.join(',')})`;
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
      let singleColor: string | undefined;
      let furnitureColors: FurnitureColors | undefined;

      if (useMultiColor) {
        // Mode multi-couleurs : passer les couleurs par composant
        furnitureColors = {
          structure: componentColors.structure.hex || DEFAULT_COLOR_HEX,
          drawers: componentColors.drawers.hex || DEFAULT_COLOR_HEX,
          doors: componentColors.doors.hex || DEFAULT_COLOR_HEX,
          base: componentColors.base.hex || DEFAULT_COLOR_HEX,
        };
      } else {
        // Mode couleur unique
        singleColor = selectedColorOption?.hex || undefined;
      }

      const result = await apiClient.generate.generate(prompt, !doorsOpen, singleColor, furnitureColors);

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
  }, [doorsOpen, selectedColorOption, useMultiColor, componentColors]);

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
  }, [templatePrompt, width, height, depth, socle, finish, rootZone, doorsOpen, initialConfigApplied, skipNextAutoGenerate, buildPromptFromZoneTree, calculatePrice, generateModel, useMultiColor, componentColors]);

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

  const handleComponentColorChange = (component: keyof ComponentColors, colorId: number, hex: string) => {
    setComponentColors((prev) => ({
      ...prev,
      [component]: { colorId, hex },
    }));
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
    { id: 'materials', label: 'Finitions', icon: Palette },
  ];

  return (
    <>
      <Head>
        <title>Configurateur - {model.name} | ArchiMeuble</title>
      </Head>

      <div className="flex h-screen flex-col overflow-hidden bg-[#FAFAF9]">
        {/* Header compact */}
        <header className="flex-shrink-0 border-b border-[#E8E6E3] bg-white">
          <div className="mx-auto flex h-14 items-center justify-between px-4 lg:h-16 lg:max-w-screen-2xl lg:px-6">
            <div className="flex items-center gap-3 lg:gap-4">
              <Link
                href="/models"
                className="flex h-9 w-9 items-center justify-center border border-[#E8E6E3] text-[#706F6C] transition-colors hover:border-[#1A1917] hover:text-[#1A1917] lg:h-10 lg:w-10"
                style={{ borderRadius: '2px' }}
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="font-serif text-base text-[#1A1917] lg:text-lg">{model.name}</h1>
                <p className="hidden text-xs text-[#706F6C] sm:block">Configurateur sur mesure</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isAuthenticated && customer && (
                <span className="hidden text-xs text-[#706F6C] md:block">
                  {customer.first_name} {customer.last_name}
                </span>
              )}
              <Link
                href="/"
                className="font-serif text-base text-[#1A1917] lg:text-lg"
              >
                ArchiMeuble
              </Link>
            </div>
          </div>
        </header>

        {/* Main content - Desktop: side by side, Mobile: stacked */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Viewer - Mobile: fixed height, Desktop: flex-1 */}
          <div className="viewer-section relative flex flex-col bg-[#FAFAF9] lg:flex-1">
            {/* Viewer wrapper - prend l'espace disponible */}
            <div className="viewer-wrapper relative h-[35vh] min-h-[240px] flex-1 lg:h-auto">
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
            </div>

            {/* Action bar - sous le viewer */}
            <div className="hidden flex-shrink-0 lg:block">
              <ActionBar
                selectedZoneId={selectedZone?.type === 'leaf' ? selectedZoneId : null}
                disabled={generating}
                onSplitHorizontal={() => {
                  if (selectedZone?.type === 'leaf') {
                    splitZone(selectedZoneId, 'horizontal', 2);
                  }
                }}
                onSplitVertical={() => {
                  if (selectedZone?.type === 'leaf') {
                    splitZone(selectedZoneId, 'vertical', 2);
                  }
                }}
                onAddDrawer={() => {
                  if (selectedZone?.type === 'leaf') {
                    setZoneContent(selectedZoneId, 'drawer');
                  }
                }}
                onAddDoor={() => setDoors(doors + 1)}
                onAddDressing={() => {
                  if (selectedZone?.type === 'leaf') {
                    setZoneContent(selectedZoneId, 'dressing');
                  }
                }}
              />
            </div>
          </div>

          {/* Panel de configuration - Mobile: scrollable, Desktop: fixed width 620px pour contenir le grand canvas */}
          <div className="flex min-h-0 flex-1 flex-col border-t border-[#E8E6E3] bg-white lg:w-[620px] lg:flex-none lg:border-l lg:border-t-0">
            {/* Tabs - Toujours visibles avec labels */}
            <div className="flex flex-shrink-0 border-b border-[#E8E6E3]">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-3 text-xs font-medium transition-colors sm:gap-2 sm:py-4 sm:text-sm ${
                    activeTab === tab.id
                      ? 'border-[#1A1917] text-[#1A1917]'
                      : 'border-transparent text-[#706F6C] hover:text-[#1A1917]'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Content - Scrollable */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              {activeTab === 'dimensions' && (
                <div className="space-y-4 pb-24 lg:pb-0">
                  <ZoneEditor
                    rootZone={rootZone}
                    selectedZoneId={selectedZoneId}
                    onRootZoneChange={setRootZone}
                    onSelectedZoneIdChange={setSelectedZoneId}
                    width={width}
                    height={height}
                  />
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

              {activeTab === 'materials' && (
                <div className="pb-24 lg:pb-0">
                  <MaterialSelector
                    materialsMap={materialsMap}
                    selectedMaterialKey={selectedMaterialKey}
                    selectedColorId={selectedColorId}
                    onMaterialChange={handleMaterialChange}
                    onColorChange={handleColorChange}
                    loading={materialsLoading}
                    useMultiColor={useMultiColor}
                    onUseMultiColorChange={setUseMultiColor}
                    componentColors={componentColors}
                    onComponentColorChange={handleComponentColorChange}
                  />
                </div>
              )}
            </div>

            {/* Footer avec prix - Desktop: dans le panel */}
            <div className="hidden flex-shrink-0 border-t border-[#E8E6E3] bg-white px-6 py-4 lg:block">
              <PriceDisplay
                price={price}
                onAddToCart={saveConfiguration}
                isAuthenticated={isAuthenticated}
              />
            </div>
          </div>
        </div>

        {/* Mobile bottom bar - Fixed with price and CTA */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E8E6E3] bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            {/* Prix compact */}
            <div className="flex-shrink-0">
              <span className="text-[10px] uppercase tracking-wide text-[#706F6C]">Prix</span>
              <div className="font-serif text-xl text-[#1A1917]">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(price)}
              </div>
            </div>
            {/* Toggle portes */}
            <button
              type="button"
              onClick={() => setDoorsOpen(!doorsOpen)}
              className={`flex items-center gap-1.5 border px-3 py-2 text-xs transition-colors ${doorsOpen ? 'border-[#1A1917] bg-[#1A1917] text-white' : 'border-[#E8E6E3] bg-white text-[#706F6C]'}`}
              style={{ borderRadius: '2px' }}
            >
              <span>{doorsOpen ? '🚪' : '📦'}</span>
              <span className="hidden sm:inline">{doorsOpen ? 'Ouvert' : 'Fermé'}</span>
            </button>
            {/* CTA */}
            <button
              type="button"
              onClick={saveConfiguration}
              className="flex h-11 flex-1 max-w-[160px] items-center justify-center gap-2 bg-[#1A1917] text-sm font-medium text-white transition-colors hover:bg-[#2A2927]"
              style={{ borderRadius: '2px' }}
            >
              <Box className="h-4 w-4" />
              <span>Ajouter</span>
            </button>
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

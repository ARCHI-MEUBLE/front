import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Viewer from '@/components/configurator/Viewer';
import Controls from '@/components/configurator/Controls';
import Price from '@/components/configurator/Price';
import AuthModal from '@/components/auth/AuthModal';
import { apiClient, type FurnitureModel, type SampleType, type SampleColor } from '@/lib/apiClient';
import { useCustomer } from '@/context/CustomerContext';

const MATERIAL_ORDER = [
  'Aggloméré',
  'MDF + revêtement (mélaminé)',
  'Plaqué bois'
];

const MATERIAL_LABEL_BY_KEY: Record<string, string> = {
  agglomere: 'Aggloméré',
  mdf_melamine: 'MDF + revêtement (mélaminé)',
  plaque_bois: 'Plaqué bois'
};

const MATERIAL_ABBR_BY_KEY: Record<string, string> = {
  agglomere: 'Ag',
  mdf_melamine: 'Mm',
  plaque_bois: 'Pl'
};

const BESTSELLER_COLOR_LABELS = new Set([
  'Blanc',
  'Blanc | Bord contreplaqué',
  'Chêne'
]);

const MATERIAL_PRICE_BY_KEY: Record<string, number> = {
  agglomere: 0,
  mdf_melamine: 70,
  plaque_bois: 140
};

const DEFAULT_COLOR_HEX = '#D8C7A1';

function normalizeMaterialKey(value: string | null | undefined): string {
  if (!value) {
    return 'agglomere';
  }

  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (normalized.includes('agglom')) {
    return 'agglomere';
  }
  if (normalized.includes('mdf') || normalized.includes('melamine')) {
    return 'mdf_melamine';
  }
  if (normalized.includes('plaque') || normalized.includes('bois')) {
    return 'plaque_bois';
  }
  if (normalized.includes('brillant') || normalized.includes('satin')) {
    return 'mdf_melamine';
  }
  if (normalized.includes('mat')) {
    return 'agglomere';
  }

  return 'agglomere';
}

function materialLabelFromKey(key: string): string {
  return MATERIAL_LABEL_BY_KEY[key] || key;
}

export default function ConfiguratorPage() {
  const router = useRouter();
  const { id } = router.query;
  const { customer, isAuthenticated } = useCustomer();

  const [model, setModel] = useState<FurnitureModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [editingConfigId, setEditingConfigId] = useState<number | null>(null);
  const [editingConfigName, setEditingConfigName] = useState<string>('');
  const [initialConfigApplied, setInitialConfigApplied] = useState(true);
  const [skipNextAutoGenerate, setSkipNextAutoGenerate] = useState(false);
  const isEditing = Boolean(editingConfigId);

  // Prompt du template (comme dans configurator.js)
  const [templatePrompt, setTemplatePrompt] = useState<string | null>(null);

  // Configuration state - valeurs par défaut depuis le prompt du modèle
  const [modules, setModules] = useState(3);
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
  const [doorsOpen, setDoorsOpen] = useState(true); // true = avec portes, false = sans portes
  
  // Mode EZ/Expert
  const [isExpertMode, setIsExpertMode] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(''); // Pour le mode Expert

  // Nouvelles options Mode EZ
  const [shelves, setShelves] = useState(2); // Nombre d'étagères
  const [drawers, setDrawers] = useState(1); // Nombre de tiroirs
  const [doors, setDoors] = useState(2); // Nombre de portes
  const [hasDressing, setHasDressing] = useState(false); // Penderie (tringle)

  // Système de zones/compartiments pour gestion avancée
  type ZoneContent = 'empty' | 'drawer' | 'dressing' | 'shelf';
  type Zone = {
    id: string;
    type: 'leaf' | 'horizontal' | 'vertical'; // leaf = pas de subdivision
    content?: ZoneContent; // Seulement pour les leaf
    children?: Zone[]; // Seulement pour horizontal/vertical
    height?: number; // Hauteur relative de la zone (pour dressing)
    splitRatio?: number; // Pourcentage de division (0-100) pour le premier enfant
  };

  const [useAdvancedMode, setUseAdvancedMode] = useState(false); // Toggle simple/avancé
  const [rootZone, setRootZone] = useState<Zone>({
    id: 'root',
    type: 'leaf',
    content: 'empty'
  });

  // Contrôles de la base (planches principales)
  const [basePlanches, setBasePlanches] = useState({
    b: false,  // Bas (désactivé par défaut)
    h: true,  // Haut
    g: true,  // Gauche
    d: true,  // Droite
    f: false,  // Fond (désactivé par défaut)
  });

  const orderedMaterialLabels = useMemo(() => {
    const collected = new Set<string>();
    const ordered: string[] = [];

    for (const label of MATERIAL_ORDER) {
      if (!collected.has(label)) {
        ordered.push(label);
        collected.add(label);
      }
    }

    Object.keys(materialsMap)
      .filter((label) => !collected.has(label))
      .sort((a, b) => a.localeCompare(b, 'fr'))
      .forEach((label) => {
        ordered.push(label);
        collected.add(label);
      });

    return ordered;
  }, [materialsMap]);

  const selectedMaterialKey = useMemo(() => normalizeMaterialKey(finish), [finish]);

  const selectedMaterialLabel = useMemo(
    () => materialLabelFromKey(selectedMaterialKey),
    [selectedMaterialKey]
  );

  const materialTypesForSelection = useMemo<SampleType[]>(() => {
    if (!selectedMaterialLabel) {
      return [];
    }
    return materialsMap[selectedMaterialLabel] || [];
  }, [materialsMap, selectedMaterialLabel]);

  const colorsForMaterial = useMemo<SampleColor[]>(() => {
    const list: SampleColor[] = [];
    const seen = new Set<number>();
    for (const type of materialTypesForSelection) {
      for (const colorOption of type.colors || []) {
        if (seen.has(colorOption.id)) {
          continue;
        }
        seen.add(colorOption.id);
        list.push(colorOption);
      }
    }
    return list;
  }, [materialTypesForSelection]);

  const selectedColorOption = useMemo<SampleColor | null>(() => {
    if (selectedColorId == null) {
      return null;
    }
    return colorsForMaterial.find((option) => option.id === selectedColorId) || null;
  }, [colorsForMaterial, selectedColorId]);

  useEffect(() => {
    if (!colorsForMaterial.length) {
      if (selectedColorId !== null) {
        setSelectedColorId(null);
      }
      return;
    }

    if (selectedColorId !== null && colorsForMaterial.some((option) => option.id === selectedColorId)) {
      return;
    }

    const fallback = colorsForMaterial.find((option) => option.name && option.name.toLowerCase() === colorLabel.toLowerCase());
    const nextColor = fallback || colorsForMaterial[0];
    setSelectedColorId(nextColor.id);
  }, [colorsForMaterial, selectedColorId, colorLabel]);

  useEffect(() => {
    if (selectedColorOption) {
      setColor(selectedColorOption.hex || DEFAULT_COLOR_HEX);
      setColorLabel(selectedColorOption.name || selectedMaterialLabel);
      setSelectedColorImage(selectedColorOption.image_url || null);
      return;
    }

    // Aucun échantillon sélectionné : conserver la couleur actuelle mais mettre à jour l'étiquette matériau
    setColor(DEFAULT_COLOR_HEX);
    setColorLabel(selectedMaterialLabel);
    if (!colorsForMaterial.length) {
      setSelectedColorImage(null);
    }
  }, [selectedColorOption, colorsForMaterial.length, selectedMaterialLabel]);

  // Auth modal
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Vérifier si l'utilisateur est admin au chargement
  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const response = await fetch('/api/admin/session');
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(!!data.admin);
        }
      } catch (error) {
        // Pas admin ou erreur
        setIsAdmin(false);
      }
    };
    checkAdminSession();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMaterials = async () => {
      try {
        setMaterialsLoading(true);
        const data = await apiClient.samples.listPublic();
        if (cancelled) {
          return;
        }
        setMaterialsMap(data);
      } catch (error) {
        if (!cancelled) {
          console.warn('Impossible de récupérer les matériaux disponibles', error);
        }
      } finally {
        if (!cancelled) {
          setMaterialsLoading(false);
        }
      }
    };

    loadMaterials();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const modeParam = Array.isArray(router.query.mode) ? router.query.mode[0] : router.query.mode;
    const configIdParam = Array.isArray(router.query.configId) ? router.query.configId[0] : router.query.configId;

    if (modeParam === 'edit' && configIdParam) {
      const parsedId = Number(configIdParam);
      if (!Number.isNaN(parsedId)) {
        setEditingConfigId(parsedId);
        setInitialConfigApplied(false);
        setSkipNextAutoGenerate(false);
      }
    } else {
      setEditingConfigId(null);
      setEditingConfigName('');
      setInitialConfigApplied(true);
      setSkipNextAutoGenerate(false);
    }
  }, [router.isReady, router.query.mode, router.query.configId]);

  // loadModel: récupère un modèle depuis l'API si id numérique,
  // sinon utilise le paramètre prompt fourni (par ex. depuis la page /configurator/select)
  const loadModel = useCallback(async () => {
    try {
      // Si id est numérique -> fetch modèle existant
      if (id && !isNaN(Number(id))) {
        const modelData = await apiClient.models.getById(Number(id));
        setModel(modelData);

        if (modelData.prompt) {
          setTemplatePrompt(modelData.prompt);
          parsePromptToConfig(modelData.prompt);
        }

          if (modelData.prompt) {
            // modelData.prompt will be handled by the top-level generateModel
          }
    } else {
        // id non numérique : lecture du prompt depuis la query string
        const qsPrompt = (router.query.prompt as string) || null;
        if (qsPrompt) {
          setTemplatePrompt(qsPrompt);
          parsePromptToConfig(qsPrompt);
          // ne crée pas d'objet model depuis API, créer un modèle temporaire pour UI
          setModel({
            id: 0,
            name: `Template ${id}`,
            description: null,
            prompt: qsPrompt,
            price: 0,
            image_url: null,
            created_at: new Date().toISOString(),
          } as any);
          // top-level generateModel will be invoked after loadModel via effect
        }
      }
    } catch (error) {
      console.error('Error loading model:', error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (id) {
      loadModel();
    }
  }, [id, loadModel]);

  const parsePromptToConfig = useCallback((prompt: string) => {
    // Format attendu (exemples):
    // M2(2000,450,700)EbFP2H3(T,,)D, S2, etc.
    // 1) Dimensions
    const dims = prompt.match(/\((\d+),(\d+),(\d+)\)/);
    if (dims) {
      const largeur = parseInt(dims[1]);
      const profondeur = parseInt(dims[2]);
      const hauteur = parseInt(dims[3]);
      setModules(Math.max(1, Math.round(largeur / 500)));
      setDepth(profondeur);
      setHeight(hauteur);
    }

    // 2) Planches de base: EbF = toutes, sinon lettres individuelles
    const compact = prompt.replace(/\s+/g, '');
    if (compact.includes('EbF')) {
      setBasePlanches({ b: true, h: true, g: true, d: true, f: true });
    } else {
      setBasePlanches({
        b: /b/.test(compact),
        h: /h/.test(compact),
        g: /g/.test(compact),
        d: /d/.test(compact),
        f: /F/.test(compact),
      });
    }

    // 3) Socle: S (metal) / S2 (wood)
    if (/S2/.test(compact)) setSocle('wood');
    else if (/S(?!\d)/.test(compact)) setSocle('metal');
    else setSocle('none');

    // 4) Portes: P / P2
    if (/P2/.test(compact)) setDoors(2);
    else if (/P(?!\d)/.test(compact)) setDoors(1);
    else setDoors(0);

    // 5) Structure Hn(...): shelves et drawers (T)
    const hStruct = compact.match(/H(\d+)\(([^)]*)\)/);
    if (hStruct) {
      const n = parseInt(hStruct[1]);
      const inner = hStruct[2];
      const drawersCount = (inner.match(/T/g) || []).length;
      setDrawers(drawersCount);
      setShelves(Math.max(0, n - 1));
    } else {
      setShelves(0);
      setDrawers(0);
    }

    // 6) Penderie/Dressing
    setHasDressing(/D/.test(compact));
  }, []);

  useEffect(() => {
    if (!router.isReady || !editingConfigId) {
      return;
    }

    let cancelled = false;

    const resolveGlbUrl = (url: string | null | undefined) => {
      if (!url || typeof url !== 'string') {
        return null;
      }

      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      return `${baseUrl}/${url}`;
    };

    const loadSavedConfiguration = async () => {
      let configuration: any = null;

      if (typeof window !== 'undefined') {
        const stored =
          window.localStorage.getItem(`archimeuble:configuration:${editingConfigId}`) ??
          window.localStorage.getItem('archimeuble:configuration:last');

        if (stored) {
          try {
            configuration = JSON.parse(stored);
          } catch (error) {
            console.warn('Impossible de parser la configuration stockée', error);
          }
        }
      }

      if (!configuration) {
        try {
          const response = await fetch(`http://localhost:8000/backend/api/configurations/list.php?id=${editingConfigId}`, {
            credentials: 'include'
          });

          if (response.ok) {
            const payload = await response.json();
            configuration = payload.configuration ?? null;
          }
        } catch (error) {
          console.error('Erreur lors du chargement de la configuration existante:', error);
        }
      }

      if (!configuration) {
        setInitialConfigApplied(true);
        return;
      }

      if (cancelled) {
        return;
      }

      let configData = configuration.config_data ?? null;
      if (!configData && configuration.config_string) {
        try {
          configData = JSON.parse(configuration.config_string);
        } catch (error) {
          console.warn('Configuration config_string invalide', error);
        }
      }

      const promptSource = configuration.prompt || (typeof router.query.prompt === 'string' ? router.query.prompt : null);
      if (promptSource) {
        setTemplatePrompt(promptSource);
        parsePromptToConfig(promptSource);
      }

      if (cancelled) {
        return;
      }

      if (configData && typeof configData === 'object') {
        if (configData.dimensions) {
          if (typeof configData.dimensions.modules === 'number' && configData.dimensions.modules > 0) {
            setModules(configData.dimensions.modules);
          } else if (typeof configData.dimensions.width === 'number') {
            setModules(Math.max(1, Math.round(configData.dimensions.width / 500)));
          }

          if (typeof configData.dimensions.depth === 'number') {
            setDepth(configData.dimensions.depth);
          }

          if (typeof configData.dimensions.height === 'number') {
            setHeight(configData.dimensions.height);
          }
        }

        if (configData.styling) {
          const savedMaterialKey = normalizeMaterialKey(
            (configData.styling as any).materialKey ||
            (configData.styling as any).material ||
            configData.styling.finish ||
            null
          );
          const savedMaterialLabel = typeof (configData.styling as any).materialLabel === 'string'
            ? (configData.styling as any).materialLabel
            : materialLabelFromKey(savedMaterialKey);
          setFinish(savedMaterialLabel);

          if (configData.styling.colorId !== undefined && configData.styling.colorId !== null) {
            const numericColorId = Number(configData.styling.colorId);
            if (!Number.isNaN(numericColorId)) {
              setSelectedColorId(numericColorId);
            }
          }

          if (typeof configData.styling.color === 'string') {
            setColor(configData.styling.color);
          }

          if (typeof configData.styling.colorLabel === 'string') {
            setColorLabel(configData.styling.colorLabel);
          } else {
            setColorLabel(savedMaterialLabel);
          }

          if (typeof (configData.styling as any).colorImage === 'string') {
            setSelectedColorImage((configData.styling as any).colorImage);
          }

          if (typeof configData.styling.socle === 'string') {
            setSocle(configData.styling.socle);
          }
        }

        if (configData.features) {
          if (typeof configData.features.doorsOpen === 'boolean') {
            setDoorsOpen(configData.features.doorsOpen);
          }
          if (typeof configData.features.doors === 'number') {
            setDoors(configData.features.doors);
          }
          if (typeof configData.features.drawers === 'number') {
            setDrawers(configData.features.drawers);
          }
          if (typeof configData.features.shelves === 'number') {
            setShelves(configData.features.shelves);
          }
          if (typeof configData.features.hasDressing === 'boolean') {
            setHasDressing(configData.features.hasDressing);
          }
        }

        const defaultBasePlanches = { b: false, h: true, g: true, d: true, f: false };
        if (configData.basePlanches) {
          setBasePlanches({
            b: typeof configData.basePlanches.b === 'boolean' ? configData.basePlanches.b : defaultBasePlanches.b,
            h: typeof configData.basePlanches.h === 'boolean' ? configData.basePlanches.h : defaultBasePlanches.h,
            g: typeof configData.basePlanches.g === 'boolean' ? configData.basePlanches.g : defaultBasePlanches.g,
            d: typeof configData.basePlanches.d === 'boolean' ? configData.basePlanches.d : defaultBasePlanches.d,
            f: typeof configData.basePlanches.f === 'boolean' ? configData.basePlanches.f : defaultBasePlanches.f
          });
        } else {
          setBasePlanches(defaultBasePlanches);
        }

        if (configData.mode) {
          setIsExpertMode(!!configData.mode.isExpertMode);
          setUseAdvancedMode(!!configData.mode.useAdvancedMode);

          if (configData.mode.isExpertMode && promptSource) {
            setCustomPrompt(promptSource);
          }
        } else {
          setIsExpertMode(false);
          setUseAdvancedMode(false);
        }

        if (configData.advancedZones) {
          setRootZone(configData.advancedZones);
        } else {
          setRootZone({
            id: 'root',
            type: 'leaf',
            content: 'empty'
          });
        }
      }

        if (cancelled) {
          return;
        }

      if (typeof configuration.price !== 'undefined') {
        setPrice(Number(configuration.price));
      }

      const derivedName = (configData && configData.name) ? String(configData.name) : (configuration.name ?? `Configuration #${configuration.id}`);
      setEditingConfigName(derivedName);

      const resolvedGlb = resolveGlbUrl(configuration.glb_url ?? (configData ? configData.thumbnail_url : null));
      setGlbUrl(resolvedGlb);

      if (!cancelled && resolvedGlb) {
        setSkipNextAutoGenerate(true);
      }

      if (!cancelled) {
        setInitialConfigApplied(true);
      }
    };

    loadSavedConfiguration();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query.prompt, editingConfigId, parsePromptToConfig]);

  // ========== FONCTIONS DE GESTION DES ZONES/COMPARTIMENTS ==========
  
  // Générer un prompt à partir de l'arbre de zones
  const buildPromptFromZoneTree = useCallback((zone: Zone): string => {
    if (zone.type === 'leaf') {
      // Zone feuille : contenu direct
      switch (zone.content) {
        case 'drawer': return 'T';
        case 'dressing': return 'D';
        case 'shelf': return ''; // Étagère = zone vide
        case 'empty': return '';
        default: return '';
      }
    } else if (zone.type === 'horizontal') {
      // Division horizontale : H[prop1,prop2,...](seq1,seq2,...)
      const childPrompts = zone.children?.map(c => buildPromptFromZoneTree(c)) || [];
      
      // Si splitRatio est défini, calculer les proportions
      let proportions = '';
      if (zone.splitRatio !== undefined && zone.children && zone.children.length === 2) {
        const ratio1 = Math.round(zone.splitRatio);
        const ratio2 = 100 - ratio1;
        proportions = `[${ratio1},${ratio2}]`;
      } else {
        proportions = `${childPrompts.length}`; // Division égale par défaut
      }
      
      return `H${proportions}(${childPrompts.join(',')})`;
    } else if (zone.type === 'vertical') {
      // Division verticale : V[prop1,prop2,...](seq1,seq2,...)
      const childPrompts = zone.children?.map(c => buildPromptFromZoneTree(c)) || [];
      
      // Si splitRatio est défini, calculer les proportions
      let proportions = '';
      if (zone.splitRatio !== undefined && zone.children && zone.children.length === 2) {
        const ratio1 = Math.round(zone.splitRatio);
        const ratio2 = 100 - ratio1;
        proportions = `[${ratio1},${ratio2}]`;
      } else {
        proportions = `${childPrompts.length}`; // Division égale par défaut
      }
      
      return `V${proportions}(${childPrompts.join(',')})`;
    }
    return '';
  }, []);

  // Diviser une zone en sous-zones
  const splitZone = (zoneId: string, direction: 'horizontal' | 'vertical', count: number = 2) => {
    const updateZone = (z: Zone): Zone => {
      if (z.id === zoneId) {
        return {
          ...z,
          type: direction,
          content: undefined,
          splitRatio: 50, // 50% par défaut (division égale)
          children: Array.from({ length: count }, (_, i) => ({
            id: `${zoneId}-${i}`,
            type: 'leaf' as const,
            content: 'empty' as ZoneContent
          }))
        };
      }
      if (z.children) {
        return { ...z, children: z.children.map(updateZone) };
      }
      return z;
    };
    setRootZone(updateZone(rootZone));
  };

  // Modifier le contenu d'une zone
  const setZoneContent = (zoneId: string, content: ZoneContent) => {
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
  };

  // Supprimer les subdivisions d'une zone (revenir à leaf)
  const resetZone = (zoneId: string) => {
    const updateZone = (z: Zone): Zone => {
      if (z.id === zoneId) {
        return {
          ...z,
          type: 'leaf',
          content: 'empty',
          children: undefined,
          splitRatio: undefined
        };
      }
      if (z.children) {
        return { ...z, children: z.children.map(updateZone) };
      }
      return z;
    };
    setRootZone(updateZone(rootZone));
  };

  // Modifier le ratio de division d'une zone
  const setSplitRatio = (zoneId: string, ratio: number) => {
    const updateZone = (z: Zone): Zone => {
      if (z.id === zoneId && (z.type === 'horizontal' || z.type === 'vertical')) {
        return { ...z, splitRatio: ratio };
      }
      if (z.children) {
        return { ...z, children: z.children.map(updateZone) };
      }
      return z;
    };
    setRootZone(updateZone(rootZone));
  };

  // ========== FIN GESTION DES ZONES ==========

  // Fonction pour modifier uniquement les dimensions du prompt (comme modifyPromptDimensions)
  const modifyPromptDimensions = (prompt: string, largeur: number, profondeur: number, hauteur: number): string => {
    const regex = /^(M[1-5])\((\d+),(\d+),(\d+)\)(.*)$/;
    const match = prompt.match(regex);

    if (match) {
      const meubleType = match[1];
      const reste = match[5];
      return `${meubleType}(${largeur},${profondeur},${hauteur})${reste}`;
    }

    console.warn('Impossible de parser le prompt:', prompt);
    return prompt;
  };

  // Fonction pour construire un prompt complet avec toutes les options (tiroirs, portes, étagères, socle)
  const buildPromptFromConfig = (basePrompt: string, config: {
    shelves: number;
    drawers: number;
    doors: number;
    socle: string;
    basePlanches?: { b: boolean; h: boolean; g: boolean; d: boolean; f: boolean };
    hasDressing?: boolean;
  }): string => {
    console.log('🔍 buildPromptFromConfig INPUT:', { basePrompt, config });
    
    // Extraire le type de meuble et les dimensions du prompt de base
    const regex = /^(M[1-5])\(([^)]+)\)(.*)$/;
    const match = basePrompt.match(regex);

    if (!match) {
      console.warn('Format de prompt invalide:', basePrompt);
      return basePrompt;
    }

    const meubleType = match[1];
    const dimensions = match[2];
    const resteDuPrompt = match[3] || '';

    // Construire le nouveau prompt avec la syntaxe Python attendue
    // Format de base: M1(dimensions) + planches de base
    let prompt = `${meubleType}(${dimensions})`;
    
    // Ajouter les planches de base (b, h, g, d, F)
    // Si basePlanches fourni, utiliser les valeurs, sinon mettre E (toutes les planches)
    if (config.basePlanches) {
      const planches = [];
      if (config.basePlanches.b) planches.push('b');
      if (config.basePlanches.h) planches.push('h');
      if (config.basePlanches.g) planches.push('g');
      if (config.basePlanches.d) planches.push('d');
      if (config.basePlanches.f) planches.push('F'); // F majuscule pour le fond
      
      console.log('🔍 Planches sélectionnées:', planches);
      
      // Ajouter les planches une par une ou utiliser E si toutes sélectionnées
      if (planches.length === 5) {
        prompt += 'EbF'; // E = droite+gauche+haut, b = bas, F = fond
        console.log('🔍 Utilisation de EbF (toutes les planches)');
      } else if (planches.length > 0) {
        prompt += planches.join(''); // Ex: bdgF
        console.log('🔍 Planches individuelles:', planches.join(''));
      } else {
        prompt += 'E'; // Par défaut, au moins E
        console.log('🔍 Aucune planche sélectionnée, utilisation de E par défaut');
      }
    } else {
      prompt += 'EbF'; // Par défaut toutes les planches
      console.log('🔍 basePlanches non fourni, utilisation de E par défaut');
    }

    // Ajouter le socle si nécessaire (S ou S2)
    if (config.socle !== 'none') {
      prompt += 'S'; // S = socle simple
      if (config.socle === 'wood') {
        prompt += '2'; // S2 = socle avec côtés
      }
    }

    // IMPORTANT: Les portes doivent être ajoutées AVANT les structures H/V
    // Sinon elles s'appliquent uniquement à la dernière sous-zone
    // Ordre correct: M1(dims) + planches + S + P + H (pas M1(dims) + planches + S + H + P)
    
    // Ajouter les portes AVANT la structure (si on a des étagères ou tiroirs)
    const hasStructure = config.shelves > 0 || config.drawers > 0;
    if (hasStructure && config.doors > 0) {
      if (config.doors === 2 || config.doors > 2) {
        prompt += 'P2'; // 2 portes
      } else if (config.doors === 1) {
        prompt += 'P'; // 1 porte
      }
    }

    // Cas 1: étagères + tiroirs
    if (config.shelves > 0) {
      // H[n] crée n zones horizontales
      const nbZones = config.shelves + 1;
      prompt += `H${nbZones}`;
      
      // Créer les sous-séquences pour chaque zone
      // Les tiroirs vont dans les zones du bas
      const zones: string[] = [];
      for (let i = 0; i < nbZones; i++) {
        if (i < config.drawers) {
          zones.push('T'); // Zone avec tiroir
        } else {
          zones.push(''); // Zone vide (étagère simple)
        }
      }
      
      // Ajouter les sous-séquences
      prompt += `(${zones.join(',')})`;
    } 
    // Cas 2: tiroirs uniquement (sans étagères)
    else if (config.drawers > 0) {
      prompt += `H${config.drawers}`;
      const zones = Array(config.drawers).fill('T');
      prompt += `(${zones.join(',')})`;
    }
    // Cas 3: portes uniquement (sans étagères ni tiroirs)
    else if (config.doors > 0) {
      if (config.doors === 2 || config.doors > 2) {
        prompt += 'P2';
      } else if (config.doors === 1) {
        prompt += 'P';
      }
    }

    // Ajouter la penderie/dressing si activée (caractère D)
    if (config.hasDressing) {
      prompt += 'D';
    }

    console.log('🔍 buildPromptFromConfig OUTPUT:', prompt);
    return prompt;
  };

  // Fonction pour calculer le prix (comme calculatePrice)
  const calculatePrice = (config: any): number => {
    let price = 580; // Prix de base incluant EbF

    // Ajouter le prix des modules (150€ par module)
    price += config.modules * 150;

    // Ajouter le prix de la hauteur (2€ par cm au-dessus de 60cm)
    const hauteurCm = Math.round(config.height / 10);
    if (hauteurCm > 60) {
      price += (hauteurCm - 60) * 2;
    }

    // Ajouter le prix de la profondeur (3€ par cm)
    const profondeurCm = Math.round(config.depth / 10);
    price += profondeurCm * 3;

    // Ajouter le prix du matériau sélectionné
    const materialKey = normalizeMaterialKey(config.finish);
    price += MATERIAL_PRICE_BY_KEY[materialKey] || 0;

    // Ajouter le prix du socle (CORRIGÉ)
    const soclePrices: { [key: string]: number } = {
      'none': 0,
      'metal': 40,
      'wood': 60
    };
    price += soclePrices[config.socle] || 0;

    // Ajouter le prix des étagères (15€ par étagère)
    if (config.shelves) {
      price += config.shelves * 15;
    }

    // Ajouter le prix des tiroirs (35€ par tiroir)
    if (config.drawers) {
      price += config.drawers * 35;
    }

    // Ajouter le prix des portes (45€ par porte)
    if (config.doors) {
      price += config.doors * 45;
    }

    return Math.round(price);
  };

  // Génère le modèle 3D avec le prompt (utilisée par les effets et loadModel)
  const generateModel = useCallback(async (prompt: string) => {
    console.log('🚀 Génération du modèle 3D avec prompt:', prompt, 'doorsOpen:', doorsOpen);
    console.log('🔍 Planches dans le prompt:', {
      hasB: prompt.includes('b'),
      hasH: prompt.includes('h'),
      hasG: prompt.includes('g'),
      hasD: prompt.includes('d'),
      hasFond: prompt.includes('F'),
      hasE: prompt.includes('E')
    });
    setGenerating(true);

    try {
      const result = await apiClient.generate.generate(prompt, !doorsOpen); // closed = !doorsOpen
      console.log('✓ Modèle 3D généré:', result.glb_url);

      // Si l'URL est relative, la convertir en URL absolue vers le backend
      let glbUrlAbsolute = result.glb_url;
      if (glbUrlAbsolute.startsWith('/')) {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        glbUrlAbsolute = `${API_URL}${glbUrlAbsolute}`;
      }

      setGlbUrl(glbUrlAbsolute);
    } catch (error) {
      console.error('❌ Erreur lors de la génération:', error);
      alert('Erreur lors de la génération du meuble 3D');
    } finally {
      setGenerating(false);
    }
  }, [doorsOpen]);
  // NOTE: generateModel is declared below (moved) to avoid hook dependency issues

  // useEffect pour régénérer quand la configuration change (MODE EZ)
  useEffect(() => {
    console.log('� useEffect MODE EZ déclenché');
    console.log('🔍 basePlanches actuel:', JSON.stringify(basePlanches));
    console.log('🔍 useAdvancedMode:', useAdvancedMode);
    console.log('🔍 isExpertMode:', isExpertMode);
    
    if (!templatePrompt || isExpertMode || !initialConfigApplied) return; // Ne pas régénérer tant que la configuration initiale n'est pas appliquée

    if (skipNextAutoGenerate) {
      setSkipNextAutoGenerate(false);
      return;
    }

    // Construire le prompt complet avec toutes les options
    const largeur = modules * 500; // 500mm par module
    const basePrompt = modifyPromptDimensions(templatePrompt, largeur, depth, height);
    
    let fullPrompt: string;
    
    if (useAdvancedMode) {
      // Mode avancé : utiliser l'arbre de zones
      const regex = /^(M[1-5])\(([^)]+)\)(.*)$/;
      const match = basePrompt.match(regex);
      if (!match) {
        console.warn('Format de prompt invalide:', basePrompt);
        return;
      }
      const meubleType = match[1];
      const dimensions = match[2];
      
      // Construire avec planches + socle + portes + structure de zones
      let prompt = `${meubleType}(${dimensions})`;
      
      // Planches de base
      if (basePlanches) {
        const planches = [];
        if (basePlanches.b) planches.push('b');
        if (basePlanches.h) planches.push('h');
        if (basePlanches.g) planches.push('g');
        if (basePlanches.d) planches.push('d');
        if (basePlanches.f) planches.push('F'); // F majuscule pour le fond
        prompt += planches.length === 5 ? 'EbF' : (planches.join('') || 'E');
      } else {
        prompt += 'EbF';
      }
      
      // Socle
      if (socle !== 'none') {
        prompt += 'S';
        if (socle === 'wood') prompt += '2';
      }
      
      // Portes (avant structure)
      if (doors > 0) {
        prompt += doors >= 2 ? 'P2' : 'P';
      }
      
      // Structure de zones
      const zonePrompt = buildPromptFromZoneTree(rootZone);
      if (zonePrompt) {
        prompt += zonePrompt;
      }
      
      fullPrompt = prompt;
      console.log('🏗️ Mode Avancé - Prompt généré:', fullPrompt);
    } else {
      // Mode simple : ancien système avec sliders
      fullPrompt = buildPromptFromConfig(basePrompt, {
        shelves,
        drawers,
        doors,
        socle,
        basePlanches,
        hasDressing
      });
      console.log('📊 Mode Simple - Prompt généré:', fullPrompt);
    }

    // Calculer le prix (inclut socle, étagères, tiroirs, portes)
    const newPrice = calculatePrice({ 
      modules, 
      height, 
      depth, 
      finish, 
      socle,
      shelves,
      drawers,
      doors
    });
    setPrice(newPrice);

    // Générer le modèle 3D avec un délai pour debounce
    const timer = setTimeout(() => {
      generateModel(fullPrompt);
    }, 300);

    return () => clearTimeout(timer);
  }, [templatePrompt, modules, height, depth, socle, finish, shelves, drawers, doors, basePlanches, hasDressing, useAdvancedMode, rootZone, isExpertMode, generateModel, buildPromptFromZoneTree, initialConfigApplied, skipNextAutoGenerate]); // Dépendances
  
  // useEffect séparé pour le mode EXPERT (régénération manuelle du customPrompt)
  useEffect(() => {
  if (!isExpertMode || !customPrompt || !initialConfigApplied) return;

    // En mode Expert, utiliser directement le customPrompt
    const newPrice = calculatePrice({ 
      modules, 
      height, 
      depth, 
      finish, 
      socle,
      shelves,
      drawers,
      doors
    });
    setPrice(newPrice);

    // Générer le modèle 3D avec le prompt personnalisé
    const timer = setTimeout(() => {
      console.log('🔧 Mode Expert: génération avec prompt personnalisé:', customPrompt);
      generateModel(customPrompt);
    }, 300);

    return () => clearTimeout(timer);
  }, [customPrompt, isExpertMode, modules, height, depth, finish, socle, shelves, drawers, doors, generateModel, initialConfigApplied]); // Dépendances mode Expert

  // Handlers pour les changements de contrôles
  const handleModulesChange = (newModules: number) => {
    setModules(newModules);
  };

  const handleHeightChange = (newHeight: number) => {
    setHeight(newHeight);
  };

  const handleDepthChange = (newDepth: number) => {
    setDepth(newDepth);
  };

  const handleSocleChange = (newSocle: string) => {
    setSocle(newSocle);
  };

  const handleFinishChange = (newFinish: string) => {
    const label = materialLabelFromKey(newFinish);
    setFinish(label);
    setColor(DEFAULT_COLOR_HEX);
    setColorLabel(label);
  };

  const toggleDoors = () => {
    setDoorsOpen(!doorsOpen);
  };

  const handleSelectColorOption = (option: SampleColor) => {
    setSelectedColorId(option.id);
    setColor(option.hex || DEFAULT_COLOR_HEX);
    setColorLabel(option.name || selectedMaterialLabel);
    setSelectedColorImage(option.image_url || null);
  };

  // Enregistrer la configuration (création d'une Configuration côté backend)
  const saveConfiguration = async () => {
    // Vérifier l'authentification
    if (!isAuthenticated || !customer) {
      // Rediriger vers la page de connexion avec retour au configurateur
      const redirectTarget = encodeURIComponent(router.asPath || `/configurator/${id}`);
      router.push(`/auth/login?redirect=${redirectTarget}`);
      return;
    }

    // Demander un nom pour la configuration
    const isEdit = !!editingConfigId;
    const promptLabel = isEdit ? 'Mettre à jour le nom de cette configuration :' : 'Nom de cette configuration :';
    const configNameInput = prompt(promptLabel, editingConfigName || '');
    if (configNameInput === null) {
      return;
    }

    const configName = configNameInput.trim();
    if (!configName) {
      alert('❌ Le nom de la configuration ne peut pas être vide.');
      return;
    }

    try {
      const largeur = modules * 500;
      const basePrompt = templatePrompt ? modifyPromptDimensions(templatePrompt, largeur, depth, height) : `M1(${largeur},${depth},${height})`;
      
      // Construire le prompt complet basé sur le mode
      let fullPrompt: string;
      if (useAdvancedMode) {
        const regex = /^(M[1-5])\(([^)]+)\)(.*)$/;
        const match = basePrompt.match(regex);
        if (!match) {
          alert('Erreur: format de prompt invalide');
          return;
        }
        const meubleType = match[1];
        const dimensions = match[2];
        
        let prompt = `${meubleType}(${dimensions})`;
        
        // Planches de base
        const planches = [];
        if (basePlanches.b) planches.push('b');
        if (basePlanches.h) planches.push('h');
        if (basePlanches.g) planches.push('g');
        if (basePlanches.d) planches.push('d');
        if (basePlanches.f) planches.push('F');
        prompt += planches.length === 5 ? 'EbF' : (planches.join('') || 'E');
        
        // Socle
        if (socle !== 'none') {
          prompt += 'S';
          if (socle === 'wood') prompt += '2';
        }
        
        // Portes
        if (doors > 0) {
          prompt += doors >= 2 ? 'P2' : 'P';
        }
        
        // Structure de zones
        const zonePrompt = buildPromptFromZoneTree(rootZone);
        if (zonePrompt) {
          prompt += zonePrompt;
        }
        
        fullPrompt = prompt;
      } else {
        fullPrompt = buildPromptFromConfig(basePrompt, {
          shelves,
          drawers,
          doors,
          socle,
          basePlanches,
          hasDressing
        });
      }

      // Configuration complète pour l'API
      const configData = {
        dimensions: {
          modules,
          width: largeur,
          depth,
          height
        },
        styling: {
          materialKey: selectedMaterialKey,
          materialLabel: selectedMaterialLabel,
          finish,
          color,
          colorLabel,
          colorId: selectedColorId,
          colorImage: selectedColorImage,
          socle
        },
        features: {
          doorsOpen,
          doors,
          drawers,
          shelves,
          hasDressing
        },
        mode: {
          isExpertMode,
          useAdvancedMode
        },
        basePlanches: { ...basePlanches },
        advancedZones: useAdvancedMode ? rootZone : null
      };

      const payload: Record<string, any> = {
        id: editingConfigId ?? undefined,
        name: configName,
        model_id: model?.id || null,
        prompt: fullPrompt,
        config_data: configData,
        glb_url: glbUrl,
        price: price,
        thumbnail_url: glbUrl
      };

      // Appel à l'API
      const response = await fetch('http://localhost:8000/backend/api/configurations/save.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorMessage = 'Erreur lors de la sauvegarde';
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch (_) {
          // ignore parsing errors
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      setEditingConfigName(configName);

      if (typeof window !== 'undefined' && result.configuration) {
        try {
          const enrichedConfiguration = {
            ...result.configuration
          };

          if (enrichedConfiguration.config_string && !enrichedConfiguration.config_data) {
            try {
              enrichedConfiguration.config_data = JSON.parse(enrichedConfiguration.config_string);
            } catch (parseError) {
              console.warn('Impossible de parser la configuration retournée', parseError);
            }
          }

          const serialized = JSON.stringify(enrichedConfiguration);
          window.localStorage.setItem(`archimeuble:configuration:${result.configuration.id}`, serialized);
          window.localStorage.setItem('archimeuble:configuration:last', serialized);
        } catch (storageError) {
          console.warn('Impossible de mettre à jour la configuration stockée', storageError);
        }
      }

      alert(`✅ Configuration "${configName}" ${isEdit ? 'mise à jour' : 'enregistrée'}`);
      router.push('/my-configurations');
    } catch (err: any) {
      console.error('Erreur saveConfiguration:', err);
  alert(`❌ Erreur lors de l'enregistrement:\n${err.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '24px', color: '#6B6B6B' }}>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!model) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#2C2C2C' }}>Modèle non trouvé</h1>
          <button
            onClick={() => router.push('/')}
            className="btn btn-primary"
            style={{ marginTop: '24px' }}
          >
            Retour à l&apos;accueil
          </button>
        </div>
      </div>
    );
  }

  // ========== COMPOSANT ZONE EDITOR (gestion récursive des compartiments) ==========
  const ZoneEditor = ({ zone, onSplit, onSetContent, onReset, onSetRatio, depth = 0 }: {
    zone: Zone;
    onSplit: (zoneId: string, direction: 'horizontal' | 'vertical', count: number) => void;
    onSetContent: (zoneId: string, content: ZoneContent) => void;
    onReset: (zoneId: string) => void;
    onSetRatio: (zoneId: string, ratio: number) => void;
    depth?: number;
  }) => {
    const indent = depth * 20;
    const isLeaf = zone.type === 'leaf';

    return (
      <div className="mb-3 p-3 bg-white rounded-lg border border-gray-300" style={{ marginLeft: `${indent}px` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium text-gray-800">
            {isLeaf ? '📦 Zone' : zone.type === 'horizontal' ? '↔️ Division Horizontale' : '↕️ Division Verticale'}
            <span className="text-xs text-gray-500 ml-2">ID: {zone.id}</span>
          </div>
          {!isLeaf && (
            <button
              onClick={() => onReset(zone.id)}
              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              🔄 Réinitialiser
            </button>
          )}
        </div>

        {/* Slider de proportion pour les divisions */}
        {!isLeaf && zone.children && zone.children.length === 2 && (
          <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-200">
            <label className="text-xs text-gray-700 block mb-1 font-medium">
              📊 Proportion de division: {zone.splitRatio || 50}% / {100 - (zone.splitRatio || 50)}%
            </label>
            <input
              type="range"
              min="10"
              max="90"
              value={zone.splitRatio || 50}
              onChange={(e) => onSetRatio(zone.id, parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>⬅️ Plus petit</span>
              <span>50/50</span>
              <span>Plus grand ➡️</span>
            </div>
          </div>
        )}

        {isLeaf && (
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Contenu:</label>
              <select
                value={zone.content || 'empty'}
                onChange={(e) => onSetContent(zone.id, e.target.value as ZoneContent)}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              >
                <option value="empty">🔳 Vide (étagère)</option>
                <option value="drawer">🗄️ Tiroir</option>
                <option value="dressing">👔 Penderie</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onSplit(zone.id, 'horizontal', 2)}
                className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                ↔️ Diviser H.
              </button>
              <button
                onClick={() => onSplit(zone.id, 'vertical', 2)}
                className="flex-1 px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600"
              >
                ↕️ Diviser V.
              </button>
            </div>
          </div>
        )}

        {!isLeaf && zone.children && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-600 mb-2">
              {zone.children.length} compartiment{zone.children.length > 1 ? 's' : ''}:
            </p>
            {zone.children.map((child) => (
              <ZoneEditor
                key={child.id}
                zone={child}
                onSplit={onSplit}
                onSetContent={onSetContent}
                onReset={onReset}
                onSetRatio={onSetRatio}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Configurateur - {model.name} | ArchiMeuble</title>
      </Head>

      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo">
            <Link href="/">ArchiMeuble</Link>
          </div>
          <ul className="nav-links">
            <li><Link href="/">Accueil</Link></li>
            <li><a href="#" className="active">Configurer</a></li>
          </ul>
        </div>
      </nav>

      {/* Configurator Container */}
      <div className="configurator-container">
        {/* Left: 3D Viewer */}
        <div className="viewer-section">
          <div className="viewer-wrapper">
            <Viewer glb={glbUrl || '/models/default.glb'} />
            {generating && (
              <div className="loading-overlay" id="loading-overlay">
                <div className="spinner"></div>
                <p>Génération du meuble 3D...</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Configuration Panel */}
        <div className="config-panel">
          <div className="panel-header">
            <h1>Personnalisez votre meuble</h1>
            <p className="subtitle">Configurez chaque détail selon vos préférences</p>
            
            {/* Indicateur de connexion */}
            {userEmail && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                ✓ Connecté en tant que <strong>{userEmail}</strong>
              </div>
            )}

            {/* Mode Toggle */}
            <div className="mt-4 flex items-center justify-between bg-gray-100 p-3 rounded-lg">
              <span className="text-sm font-medium text-gray-700">
                {isExpertMode ? '🔧 Mode Expert' : '✨ Mode EZ (Simplifié)'}
              </span>
              <button
                className={`px-4 py-2 rounded-md font-medium transition ${
                  isExpertMode 
                    ? 'bg-orange-500 text-white hover:bg-orange-600' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
                onClick={() => setIsExpertMode(!isExpertMode)}
              >
                {isExpertMode ? 'Passer en mode EZ' : 'Passer en mode Expert'}
              </button>
            </div>
          </div>

          <div className="panel-content">
            {/* Mode Expert: Éditeur de Prompt */}
            {isExpertMode && (
              <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-300">
                <h3 className="text-lg font-bold mb-2">Éditeur de Prompt (Expert)</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Modifiez directement le prompt pour un contrôle total.
                  Format: <code className="bg-gray-200 px-1">M1(width,depth,height)finishCode...</code>
                </p>
                <textarea
                  className="w-full h-32 p-3 border border-gray-300 rounded font-mono text-sm"
                  value={customPrompt || templatePrompt || ''}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Ex: M1(1500,400,800)M,#8B4513,D2,socle"
                />
                <div className="flex gap-2">
                  <button
                    className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex-1"
                    onClick={() => {
                      if (customPrompt) {
                        // Déclencher la régénération immédiate en forçant un changement
                        console.log('🔧 Application du prompt Expert:', customPrompt);
                        generateModel(customPrompt);
                      }
                    }}
                  >
                    🚀 Générer avec ce prompt
                  </button>
                  <button
                    className="mt-2 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                    onClick={() => {
                      setCustomPrompt(templatePrompt || '');
                    }}
                  >
                    Réinitialiser
                  </button>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <strong>Documentation:</strong>
                  <ul className="list-disc ml-5 mt-1">
                    <li>M1-M5: Type de meuble</li>
                    <li>(width,depth,height): Dimensions en mm</li>
                    <li>Finish: M=Mat, B=Brillant, S=Satiné</li>
                    <li>Color: Code hex (#FFFFFF)</li>
                    <li>D[n]: Nombre de portes</li>
                    <li>socle/nosocle: Avec ou sans socle</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Toggle Mode Avancé (Gestion de zones) - Visible uniquement en mode EZ */}
            {!isExpertMode && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAdvancedMode}
                    onChange={(e) => setUseAdvancedMode(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <div>
                    <span className="font-bold text-blue-900">🏗️ Mode Construction Avancée</span>
                    <p className="text-xs text-blue-700 mt-1">
                      Diviser le meuble en compartiments et placer précisément chaque élément (tiroir, penderie, étagère)
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Interface de Gestion des Zones - Visible en mode avancé uniquement */}
            {!isExpertMode && useAdvancedMode && (
              <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-300">
                <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <span>🎯</span>
                  <span>Construction par Compartiments</span>
                </h3>
                
                {/* Composant récursif pour afficher et gérer l'arbre de zones */}
                <ZoneEditor 
                  zone={rootZone} 
                  onSplit={splitZone}
                  onSetContent={setZoneContent}
                  onReset={resetZone}
                  onSetRatio={setSplitRatio}
                />
              </div>
            )}

            {/* Controls Section (dimensions sliders) - Visible dans les deux modes */}
            <Controls width={modules * 500} depth={depth} height={height} setWidth={(w) => handleModulesChange(Math.max(1, Math.round(w / 500)))} setDepth={handleDepthChange} setHeight={handleHeightChange} />

            {/* Socle Section */}
            <div className="control-group">
              <label className="control-label" htmlFor="socle-select">Socle</label>
              <select
                id="socle-select"
                className="select-input"
                value={socle}
                onChange={(e) => handleSocleChange(e.target.value)}
              >
                <option value="none">Sans socle</option>
                <option value="metal">Métal</option>
                <option value="wood">Bois</option>
              </select>
            </div>

            {/* Planches de Base (Structure) - Visible uniquement en mode simple */}
            {!isExpertMode && !useAdvancedMode && (
              <div className="control-group">
                <label className="control-label">Structure de Base (Planches)</label>
                <p className="text-xs text-gray-500 mb-2">
                  Sélectionnez les planches qui composent la structure du meuble
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'b' as const, label: 'Bas', icon: '⬇️', desc: 'Planche du bas' },
                    { key: 'h' as const, label: 'Haut', icon: '⬆️', desc: 'Planche du haut' },
                    { key: 'g' as const, label: 'Gauche', icon: '⬅️', desc: 'Côté gauche' },
                    { key: 'd' as const, label: 'Droite', icon: '➡️', desc: 'Côté droit' },
                    { key: 'f' as const, label: 'Fond', icon: '🔲', desc: 'Planche arrière' }
                  ].map((planche) => (
                    <label 
                      key={planche.key}
                      className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition ${
                        basePlanches[planche.key]
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                      title={planche.desc}
                    >
                      <input
                        type="checkbox"
                        checked={basePlanches[planche.key]}
                        onChange={(e) => {
                          const newValue = e.target.checked;
                          console.log('🔧 Changement planche', planche.key, ':', newValue);
                          console.log('🔧 État AVANT:', JSON.stringify(basePlanches));
                          const newState = {
                            ...basePlanches,
                            [planche.key]: newValue
                          };
                          console.log('🔧 État APRÈS:', JSON.stringify(newState));
                          setBasePlanches(newState);
                        }}
                        className="w-5 h-5"
                      />
                      <span className="text-2xl">{planche.icon}</span>
                      <span className="font-medium">{planche.label}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      console.log('🔧 Tout sélectionner');
                      setBasePlanches({ b: true, h: true, g: true, d: true, f: true });
                    }}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    ✅ Tout sélectionner
                  </button>
                  <button
                    onClick={() => {
                      console.log('🔧 Tout désélectionner');
                      setBasePlanches({ b: false, h: false, g: false, d: false, f: false });
                    }}
                    className="flex-1 px-3 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                  >
                    ❌ Tout désélectionner
                  </button>
                </div>
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <p className="text-yellow-800">
                    💡 <strong>Astuce:</strong> Décochez des planches pour créer des meubles ouverts.
                    Par exemple, sans fond (f) pour un meuble encastré, ou sans haut (h) pour une étagère ouverte.
                  </p>
                </div>
              </div>
            )}

            {/* Matériaux Section */}
            <div className="control-group">
              <label className="control-label">Matériaux</label>
              <p className="text-xs text-gray-500 mb-3">
                Sélectionnez d&apos;abord la structure. Les teintes disponibles s&apos;adapteront automatiquement.
              </p>
              <div className="flex flex-wrap gap-2">
                {orderedMaterialLabels.length === 0 && (
                  <span className="col-span-full text-xs text-gray-500">Aucun matériau disponible pour le moment.</span>
                )}
                {orderedMaterialLabels.map((label) => {
                  const key = normalizeMaterialKey(label);
                  const isActive = selectedMaterialKey === key;
                  const abbr = MATERIAL_ABBR_BY_KEY[key] || label.split(' ').map((word) => word.charAt(0)).join('').slice(0, 3).toUpperCase();
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        if (selectedMaterialKey !== key) {
                          handleFinishChange(key);
                          setSelectedColorId(null);
                          setSelectedColorImage(null);
                        }
                      }}
                      className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition ${
                        isActive
                          ? 'border-amber-500 bg-white text-ink shadow-sm'
                          : 'border-[#E3E3E3] bg-[#F7F7F7] text-ink/70 hover:border-amber-300'
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                          isActive ? 'border-amber-400 bg-white text-ink/80' : 'border-[#DDDDDD] bg-white text-ink/60'
                        } text-[11px] font-semibold uppercase`}
                      >
                        {abbr}
                      </span>
                      <span className="leading-snug text-[13px] font-semibold text-ink">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Couleurs / Teintes Section */}
            <div className="control-group">
              <label className="control-label">Couleurs</label>
              <p className="text-xs text-gray-500 mb-3">
                Choisissez ensuite la finition précise correspondant au matériau sélectionné.
              </p>

              {materialsLoading ? (
                <div className="text-sm text-gray-500">Chargement des échantillons…</div>
              ) : colorsForMaterial.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                  Aucune teinte n&apos;est encore disponible pour {selectedMaterialLabel}.
                </div>
              ) : (
                <div className="flex flex-col gap-6 md:flex-row md:items-start">
                  <div className="flex flex-1 flex-wrap gap-2">
                    {colorsForMaterial.map((option) => {
                      const isActive = selectedColorId === option.id;
                      const isBestseller = option.name ? BESTSELLER_COLOR_LABELS.has(option.name.trim()) : false;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleSelectColorOption(option)}
                          className={`group flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-left text-sm transition ${
                            isActive ? 'border-amber-500 bg-white text-ink shadow-sm' : 'border-[#E3E3E3] bg-[#F7F7F7] text-ink/80 hover:border-amber-300'
                          }`}
                        >
                          <span
                            className="inline-flex h-7 w-7 flex-shrink-0 overflow-hidden rounded-full border border-[#D8D8D8]"
                            style={{ backgroundColor: option.image_url ? undefined : (option.hex || DEFAULT_COLOR_HEX) }}
                          >
                            {option.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={option.image_url}
                                alt={option.name || 'Échantillon matériau'}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </span>
                          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                            {option.name || 'Teinte personnalisée'}
                            {isBestseller && (
                              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Bestseller</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedColorOption && (
                    <div className="w-full max-w-xs rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Sélectionné</p>
                      <h4 className="mt-1 text-sm font-semibold text-ink">
                        {selectedColorOption.name || colorLabel}
                      </h4>
                      <p className="text-xs text-gray-500">{selectedMaterialLabel}</p>
                      <div
                        className="mt-3 h-36 w-full overflow-hidden rounded-xl border border-gray-100"
                        style={{ backgroundColor: selectedColorOption.image_url ? undefined : (selectedColorOption.hex || DEFAULT_COLOR_HEX) }}
                      >
                        {selectedColorOption.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={selectedColorOption.image_url} alt={selectedColorOption.name || colorLabel} className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="mt-4 w-full rounded-md border border-gray-200 px-3 py-2 text-xs font-medium text-ink/80 transition hover:border-ink/40 hover:text-ink"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            window.open('/samples', '_blank');
                          }
                        }}
                      >
                        Besoin d&apos;aide ? Voir tous les échantillons
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Nombre de Portes */}
            {!isExpertMode && (
              <div className="control-group">
                <label className="control-label" htmlFor="doors-count">
                  Nombre de Portes
                  <span className="ml-2 text-sm text-gray-500">({doors} porte{doors > 1 ? 's' : ''})</span>
                </label>
                <input
                  type="range"
                  id="doors-count"
                  min="0"
                  max="6"
                  value={doors}
                  onChange={(e) => setDoors(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0</span>
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                  <span>6</span>
                </div>
              </div>
            )}

            {/* Nombre de Tiroirs */}
            {!isExpertMode && (
              <div className="control-group">
                <label className="control-label" htmlFor="drawers-count">
                  Nombre de Tiroirs
                  <span className="ml-2 text-sm text-gray-500">({drawers} tiroir{drawers > 1 ? 's' : ''})</span>
                </label>
                <input
                  type="range"
                  id="drawers-count"
                  min="0"
                  max="4"
                  value={drawers}
                  onChange={(e) => setDrawers(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0</span>
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                </div>
              </div>
            )}

            {/* Nombre d'Étagères */}
            {!isExpertMode && (
              <div className="control-group">
                <label className="control-label" htmlFor="shelves-count">
                  Nombre d&apos;Étagères
                  <span className="ml-2 text-sm text-gray-500">({shelves} étagère{shelves > 1 ? 's' : ''})</span>
                </label>
                <input
                  type="range"
                  id="shelves-count"
                  min="0"
                  max="8"
                  value={shelves}
                  onChange={(e) => setShelves(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0</span>
                  <span>2</span>
                  <span>4</span>
                  <span>6</span>
                  <span>8</span>
                </div>
              </div>
            )}

            {/* Penderie / Dressing */}
            {!isExpertMode && (
              <div className="control-group">
                <label className="control-label flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasDressing}
                    onChange={(e) => setHasDressing(e.target.checked)}
                    className="w-5 h-5"
                  />
                  <span className="flex items-center gap-2">
                    <span className="text-2xl">👔</span>
                    <span>Penderie (tringle)</span>
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-8">
                  Ajoute une barre horizontale pour suspendre les vêtements
                </p>
              </div>
            )}

            {/* État Portes/Tiroirs */}
            <div className="control-group">
              <label className="control-label">État d&apos;Affichage</label>
              <div className="button-group">
                <button
                  className={`toggle-btn ${doorsOpen ? 'active' : ''}`}
                  onClick={toggleDoors}
                  title="Afficher avec portes et tiroirs ouverts"
                >
                  🔓 Ouverts
                </button>
                <button
                  className={`toggle-btn ${!doorsOpen ? 'active' : ''}`}
                  onClick={toggleDoors}
                  title="Masquer les portes et fermer les tiroirs"
                >
                  🔒 Fermés
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="divider"></div>

            {/* Prix Section */}
            <div className="price-section">
              <Price base={580} modules={modules} height={height} depth={depth} />
            </div>

            {/* Actions */}
            <div className="actions space-y-2">
              {/* Bouton Enregistrer la configuration */}
              <button
                className="btn btn-primary"
                onClick={saveConfiguration}
                title={isEditing ? 'Mettre à jour cette configuration' : 'Enregistrer cette configuration dans Mes configurations'}
              >
                {isEditing ? '💾 Mettre à jour la configuration' : '📝 Enregistrer la configuration'}
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => router.push('/')}
              >
                Retour à l&apos;accueil
              </button>
              
              {/* Bouton admin uniquement */}
              {isAdmin && (
                <button
                  className="btn btn-outline"
                  onClick={async () => {
                    try {
                      const largeur = modules * 500;
                      const promptToPublish = templatePrompt ? modifyPromptDimensions(templatePrompt, largeur, depth, height) : `M1(${largeur},${depth},${height})`;
                      const res = await apiClient.models.create({ name: `Template ${id || 'custom'}`, prompt: promptToPublish, price });
                      if (res && res.success) {
                        alert('Template publié (id: ' + res.id + ')');
                      }
                    } catch (err: any) {
                      if (err && err.statusCode === 401) {
                        alert('Action réservée aux administrateurs. Veuillez vous connecter.');
                      } else {
                        console.error(err);
                        alert('Erreur lors de la publication du template.');
                      }
                    }
                  }}
                >
                  Publier le template (admin)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'authentification */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(email) => {
          setUserEmail(email);
          // Sauvegarder automatiquement après connexion
          setTimeout(() => saveConfiguration(), 500);
        }}
      />

    </>
  );
}

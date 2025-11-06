import { useEffect, useState, useCallback, useMemo } from 'react';
import type { SyntheticEvent, KeyboardEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Viewer from '@/components/configurator/Viewer';
import Controls from '@/components/configurator/Controls';
import Price from '@/components/configurator/Price';
import AuthModal from '@/components/auth/AuthModal';
import { apiClient, type FurnitureModel, type SampleType, type SampleColor, type FurnitureColors } from '@/lib/apiClient';
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

    // Multi-couleurs par composant
    const [useMultiColor, setUseMultiColor] = useState(false);
    const [componentColors, setComponentColors] = useState<{
        structure: { colorId: number | null; hex: string | null };
        drawers: { colorId: number | null; hex: string | null };
        doors: { colorId: number | null; hex: string | null };
        base: { colorId: number | null; hex: string | null };
    }>({
        structure: { colorId: null, hex: null },
        drawers: { colorId: null, hex: null },
        doors: { colorId: null, hex: null },
        base: { colorId: null, hex: null },
    });

    // Mode EZ/Expert
    const [isExpertMode, setIsExpertMode] = useState(false);
    const [customPrompt, setCustomPrompt] = useState(''); // Pour le mode Expert

    // Nouvelles options Mode EZ
    const [shelves, setShelves] = useState(2); // Nombre d'étagères
    const [drawers, setDrawers] = useState(1); // Nombre de tiroirs
    const [doors, setDoors] = useState(2); // Nombre de portes
    const [hasDressing, setHasDressing] = useState(false); // Penderie (tringle)

    // Valeurs initiales du template (pour détecter si l'utilisateur a modifié)
    const [initialSliderValues, setInitialSliderValues] = useState<{
        shelves: number;
        drawers: number;
        doors: number;
    } | null>(null);

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
    const [selectedZoneId, setSelectedZoneId] = useState<string>('root');

    useEffect(() => {
        if (useAdvancedMode) {
            setSelectedZoneId('root');
        }
    }, [useAdvancedMode]);

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

        // 2) Planches de base: E = enveloppe (h, g, d), F = fond, b = base
        const compact = prompt.replace(/\s+/g, '');
        const hasE = /E/.test(compact); // Enveloppe = h + g + d
        const hasF = /F/.test(compact); // Fond
        const hasB = /b/.test(compact); // Base

        if (hasE && hasF && hasB) {
            // E + F + b = toutes les planches
            setBasePlanches({ b: true, h: true, g: true, d: true, f: true });
        } else {
            // Parser individuellement
            setBasePlanches({
                b: hasB,
                h: hasE || /h/.test(compact), // E inclut h, g, d
                g: hasE || /g/.test(compact),
                d: hasE || /d/.test(compact),
                f: hasF,
            });
        }

        // 3) Socle: S (metal) / S2 (wood)
        if (/S2/.test(compact)) setSocle('wood');
        else if (/S(?!\d)/.test(compact)) setSocle('metal');
        else setSocle('none');

        // 4) Portes: P / P2
        const doorsCount = /P2/.test(compact) ? 2 : (/P(?!\d)/.test(compact) ? 1 : 0);
        setDoors(doorsCount);

        // 5) Structure Hn(...) ou Vn(...): shelves et drawers (T)
        const hStruct = compact.match(/H(\d+)\(([^)]*)\)/);
        const vStruct = compact.match(/V(\d+)\(([^)]*)\)/);

        if (hStruct) {
            const n = parseInt(hStruct[1]);
            const inner = hStruct[2];
            const drawersCount = (inner.match(/T/g) || []).length;
            const shelvesCount = Math.max(0, n - 1);

            setDrawers(drawersCount);
            setShelves(shelvesCount);

            // Stocker les valeurs initiales du template
            setInitialSliderValues({
                shelves: shelvesCount,
                drawers: drawersCount,
                doors: doorsCount
            });

            // Créer l'arbre de zones pour le mode avancé (horizontal)
            const children = inner.split(',').map((content, idx) => ({
                id: `zone-${idx}`,
                type: 'leaf' as const,
                content: (content.includes('T') ? 'drawer' : content.includes('D') ? 'dressing' : 'empty') as ZoneContent
            }));

            setRootZone({
                id: 'root',
                type: 'horizontal',
                children
            });
        } else if (vStruct) {
            const n = parseInt(vStruct[1]);
            const inner = vStruct[2];
            const drawersCount = (inner.match(/T/g) || []).length;
            const shelvesCount = 0;

            setDrawers(drawersCount);
            setShelves(shelvesCount); // Pas d'étagères horizontales pour V

            // Stocker les valeurs initiales du template
            setInitialSliderValues({
                shelves: shelvesCount,
                drawers: drawersCount,
                doors: doorsCount
            });

            // Créer l'arbre de zones pour le mode avancé (vertical)
            const children = inner.split(',').map((content, idx) => ({
                id: `zone-${idx}`,
                type: 'leaf' as const,
                content: (content.includes('T') ? 'drawer' : content.includes('D') ? 'dressing' : 'empty') as ZoneContent
            }));

            setRootZone({
                id: 'root',
                type: 'vertical',
                children
            });
        } else {
            setShelves(0);
            setDrawers(0);

            // Stocker les valeurs initiales du template
            setInitialSliderValues({
                shelves: 0,
                drawers: 0,
                doors: doorsCount
            });
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

    const findZoneWithParent = useCallback((current: Zone, targetId: string, parent: Zone | null = null): { zone: Zone; parent: Zone | null } | null => {
        if (current.id === targetId) {
            return { zone: current, parent };
        }

        if (!current.children) {
            return null;
        }

        for (const child of current.children) {
            const result = findZoneWithParent(child, targetId, current);
            if (result) {
                return result;
            }
        }

        return null;
    }, []);

    const selectedZoneInfo = useMemo(() => findZoneWithParent(rootZone, selectedZoneId), [findZoneWithParent, rootZone, selectedZoneId]);

    useEffect(() => {
        if (!selectedZoneInfo) {
            setSelectedZoneId('root');
        }
    }, [selectedZoneInfo]);

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
    const splitZone = useCallback((zoneId: string, direction: 'horizontal' | 'vertical', count: number = 2) => {
        setRootZone((previous) => {
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
                            content: 'empty' as ZoneContent
                        }))
                    };
                }
                if (z.children) {
                    return { ...z, children: z.children.map(updateZone) };
                }
                return z;
            };

            return updateZone(previous);
        });

        setSelectedZoneId(`${zoneId}-0`);
    }, []);

    // Modifier le contenu d'une zone
    const setZoneContent = useCallback((zoneId: string, content: ZoneContent) => {
        setRootZone((previous) => {
            const updateZone = (z: Zone): Zone => {
                if (z.id === zoneId && z.type === 'leaf') {
                    return { ...z, content };
                }
                if (z.children) {
                    return { ...z, children: z.children.map(updateZone) };
                }
                return z;
            };

            return updateZone(previous);
        });

        setSelectedZoneId(zoneId);
    }, []);

    // Supprimer les subdivisions d'une zone (revenir à leaf)
    const resetZone = useCallback((zoneId: string) => {
        setRootZone((previous) => {
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

            return updateZone(previous);
        });

        setSelectedZoneId(zoneId);
    }, []);

    // Modifier le ratio de division d'une zone
    const setSplitRatio = useCallback((zoneId: string, ratio: number) => {
        setRootZone((previous) => {
            const updateZone = (z: Zone): Zone => {
                if (z.id === zoneId && (z.type === 'horizontal' || z.type === 'vertical')) {
                    return { ...z, splitRatio: ratio };
                }
                if (z.children) {
                    return { ...z, children: z.children.map(updateZone) };
                }
                return z;
            };

            return updateZone(previous);
        });
    }, []);

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
            let colors: FurnitureColors | undefined;
            let singleColor: string | undefined;

            if (useMultiColor) {
                // Mode multi-couleurs : construire l'objet colors
                colors = {};
                if (componentColors.structure.hex) colors.structure = componentColors.structure.hex;
                if (componentColors.drawers.hex) colors.drawers = componentColors.drawers.hex;
                if (componentColors.doors.hex) colors.doors = componentColors.doors.hex;
                if (componentColors.base.hex) colors.base = componentColors.base.hex;

                console.log('🎨 Couleurs multi-composants:', colors);
            } else {
                // Mode couleur unique
                singleColor = selectedColorOption?.hex || undefined;
                console.log('🎨 Couleur unique:', singleColor);
            }

            const result = await apiClient.generate.generate(
                prompt,
                !doorsOpen, // closed = !doorsOpen
                singleColor,
                colors
            );
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
    }, [doorsOpen, selectedColorOption, useMultiColor, componentColors]);
    // NOTE: generateModel is declared below (moved) to avoid hook dependency issues

    // useEffect pour régénérer quand la configuration change (MODE EZ)
    useEffect(() => {
        console.log('  useEffect MODE EZ déclenché');
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
            const zonePrompt = buildPromptFromZoneTree(rootZone);

            // Si l'arbre de zones est vide (pas encore configuré), utiliser le prompt original
            if (!zonePrompt || zonePrompt.trim() === '') {
                fullPrompt = templatePrompt;
                console.log('🏗️ Mode Avancé - Zones vides, utilisation du prompt original:', fullPrompt);
            } else {
                // L'utilisateur a configuré des zones, construire le prompt
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
                prompt += zonePrompt;

                fullPrompt = prompt;
                console.log('🏗️ Mode Avancé - Prompt généré avec zones:', fullPrompt);
            }
        } else {
            // Mode simple : utiliser le prompt original du modèle s'il existe
            // et que les sliders n'ont pas été modifiés depuis le chargement du template
            const slidersUnchanged = initialSliderValues &&
                shelves === initialSliderValues.shelves &&
                drawers === initialSliderValues.drawers &&
                doors === initialSliderValues.doors;

            if (templatePrompt && slidersUnchanged) {
                // Utiliser le prompt original de la BDD qui contient la structure complète (V3, H4, etc.)
                fullPrompt = templatePrompt;
                console.log('📄 Mode Simple - Sliders inchangés, utilisation du prompt original:', fullPrompt);
            } else {
                // L'utilisateur a modifié les sliders, reconstruire le prompt
                fullPrompt = buildPromptFromConfig(basePrompt, {
                    shelves,
                    drawers,
                    doors,
                    socle,
                    basePlanches,
                    hasDressing
                });
                console.log('📊 Mode Simple - Sliders modifiés, prompt généré:', fullPrompt);
            }
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

    // ========== COMPOSANTS D'INTERFACE POUR LES ZONES ==========
    const zoneContentMeta: Record<ZoneContent, { label: string; shortLabel: string; icon: string; badge: { text: string; className: string } }> = {
        empty: {
            label: 'Compartiment libre',
            shortLabel: 'Vide',
            icon: '📦',
            badge: { text: 'Vide', className: 'bg-emerald-100 text-emerald-700' }
        },
        drawer: {
            label: 'Tiroir',
            shortLabel: 'Tiroir',
            icon: '🗄️',
            badge: { text: 'Tiroir', className: 'bg-blue-100 text-blue-700' }
        },
        dressing: {
            label: 'Penderie',
            shortLabel: 'Penderie',
            icon: '👔',
            badge: { text: 'Penderie', className: 'bg-purple-100 text-purple-700' }
        },
        shelf: {
            label: 'Étagère',
            shortLabel: 'Étagère',
            icon: '🪵',
            badge: { text: 'Étagère', className: 'bg-amber-100 text-amber-700' }
        }
    };

    const zoneContentOptions: Array<{ value: ZoneContent; label: string; helper: string }> = [
        { value: 'empty', label: 'Espace libre', helper: 'Laisser la zone vide ou avec des étagères' },
        { value: 'drawer', label: 'Tiroir', helper: 'Ajoute un module coulissant' },
        { value: 'dressing', label: 'Penderie', helper: 'Ajoute une tringle de penderie' }
    ];

    const getContentMeta = (content?: ZoneContent) => zoneContentMeta[content ?? 'empty'];

    const getZoneTitle = (zone: Zone) => {
        if (zone.type === 'leaf') {
            return getContentMeta(zone.content).label;
        }
        return zone.type === 'horizontal' ? 'Division horizontale' : 'Division verticale';
    };

    const getZoneSubtitle = (zone: Zone) => {
        if (zone.type === 'leaf') {
            switch (zone.content) {
                case 'drawer':
                    return 'Ajoutez ou retirez un tiroir pour ce compartiment.';
                case 'dressing':
                    return 'Transformez cette zone en penderie avec tringle.';
                case 'shelf':
                    return 'Zone dédiée aux étagères fixes.';
                default:
                    return 'Laissez vide pour une niche ouverte ou ajoutez un élément.';
            }
        }
        const childCount = zone.children?.length ?? 0;
        if (zone.type === 'horizontal') {
            return childCount > 0 ? `${childCount} étage${childCount > 1 ? 's' : ''}` : 'Division horizontale';
        }
        return childCount > 0 ? `${childCount} colonne${childCount > 1 ? 's' : ''}` : 'Division verticale';
    };

    type ZoneNodeProps = {
        zone: Zone;
        selectedZoneId: string;
        onSelect: (zoneId: string) => void;
    };

    const ZoneNode = ({ zone, selectedZoneId, onSelect }: ZoneNodeProps) => {
        const isSelected = zone.id === selectedZoneId;

        const handleClick = (event: SyntheticEvent) => {
            event.stopPropagation();
            onSelect(zone.id);
        };

        if (zone.type === 'leaf') {
            const meta = getContentMeta(zone.content);
            return (
                <button
                    type="button"
                    onClick={handleClick}
                    className={`flex h-full w-full items-center justify-center rounded-[14px] border border-[#E4C792] bg-white px-3 text-[12px] font-semibold text-[#61451C] transition ${
                        isSelected ? 'border-[#DFA94C] shadow-[0_4px_14px_rgba(223,169,76,0.18)]' : 'hover:border-[#DFA94C] hover:text-[#7B571F]'
                    }`}
                >
                    {meta.shortLabel}
                </button>
            );
        }

        const orientationLabel = zone.type === 'horizontal' ? 'Division horizontale' : 'Division verticale';
        const children = zone.children ?? [];
        const weights = children.length === 2 && zone.splitRatio !== undefined
            ? [Math.max(1, zone.splitRatio), Math.max(1, 100 - zone.splitRatio)]
            : children.map(() => 1);
        const totalWeight = weights.reduce((sum, value) => sum + value, 0);
        const showPercentages = isSelected && children.length === 2;

        const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(zone.id);
            }
        };

        return (
            <div
                role="button"
                tabIndex={0}
                onClick={handleClick}
                onKeyDown={handleKeyDown}
                className={`relative flex h-full w-full gap-[4px] rounded-[16px] border border-[#E4C792] bg-white p-[6px] transition ${
                    isSelected ? 'border-[#DFA94C] ring-1 ring-[#F2C878]' : 'hover:border-[#DFA94C]'
                }`}
                style={{ flexDirection: zone.type === 'horizontal' ? 'column' : 'row' }}
                aria-label={orientationLabel}
            >
                {children.map((child, index) => (
                    <div
                        key={child.id}
                        className="relative flex flex-1"
                        style={{ flexGrow: weights[index] ?? 1, flexBasis: 0 }}
                    >
                        <ZoneNode zone={child} selectedZoneId={selectedZoneId} onSelect={onSelect} />
                        {showPercentages ? (
                            <span className="pointer-events-none absolute bottom-1 right-1 rounded-full border border-[#EDD5AA] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#7A4D00]">
                {Math.round((weights[index] / totalWeight) * 100)}%
              </span>
                        ) : null}
                    </div>
                ))}
            </div>
        );
    };
    const ZoneCanvas = ({ zone, selectedZoneId, onSelect }: { zone: Zone; selectedZoneId: string; onSelect: (zoneId: string) => void }) => (
        <div className="relative w-full overflow-hidden rounded-[26px] border border-[#E8D7BB] bg-[#FFFDF8] p-4">
            <div className="relative h-[200px] w-full">
                <ZoneNode zone={zone} selectedZoneId={selectedZoneId} onSelect={onSelect} />
            </div>
        </div>
    );

    const selectedZone = selectedZoneInfo?.zone ?? rootZone;
    const parentZone = selectedZoneInfo?.parent ?? null;
    const canSplitSelected = selectedZone.type === 'leaf';
    // Permettre l'ajustement soit sur la division sélectionnée, soit sur la division parente si la zone courante est une feuille
    const divisionCandidate = selectedZone.type !== 'leaf' ? selectedZone : (parentZone && parentZone.type !== 'leaf' ? parentZone : null);
    const adjustTarget = divisionCandidate && (divisionCandidate.children?.length ?? 0) === 2 ? divisionCandidate : null;
    const canAdjustRatio = !!adjustTarget;
    const sliderRatio = adjustTarget?.splitRatio ?? 50;
    const selectedZoneMeta = getContentMeta(selectedZone.content);

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
                            <div className="mb-6 rounded-xl border border-[#E4D6C0] bg-[#FFFBF4] p-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <span className="font-bold text-[#2F2817]">🏗️ Mode Construction Avancée</span>
                                        <p className="text-xs text-[#6A5A3D] mt-1">
                                            Diviser le meuble en compartiments et placer précisément chaque élément (tiroir, penderie, étagère)
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={useAdvancedMode}
                                        onClick={() => setUseAdvancedMode(!useAdvancedMode)}
                                        className={`relative inline-flex h-9 w-16 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E2B66B] ${
                                            useAdvancedMode ? 'bg-[#E2B66B]' : 'bg-gray-300'
                                        }`}
                                    >
                                        <span className="sr-only">Basculer le mode Construction Avancée</span>
                                        <span
                                            className={`inline-block h-7 w-7 transform rounded-full bg-white shadow transition-transform duration-200 ${
                                                useAdvancedMode ? 'translate-x-7' : 'translate-x-1'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Interface de Gestion des Zones - Visible en mode avancé uniquement */}
                        {!isExpertMode && useAdvancedMode && (() => {
                            const getZoneStats = (zone: Zone): { depth: number; leaves: number } => {
                                if (!zone.children || zone.children.length === 0) {
                                    return { depth: 1, leaves: 1 };
                                }
                                const childStats = zone.children.map((child) => getZoneStats(child));
                                const depth = 1 + Math.max(...childStats.map((stat) => stat.depth));
                                const leaves = childStats.reduce((total, stat) => total + stat.leaves, 0);
                                return { depth, leaves };
                            };

                            const { depth, leaves } = getZoneStats(rootZone);
                            // Hauteur initiale plus petite; croissance maintenue quand on ajoute des divisions
                            const baseHeight = 140;
                            const dynamicHeight = Math.min(
                                700,
                                baseHeight + Math.max(0, depth - 1) * 100 + Math.max(0, leaves - 1) * 12
                            );

                            // Calcule la taille réelle (mm) de la zone sélectionnée suivant l'axe de sa division
                            const getSelectedZoneAxisSizeMM = (): { sizeMM: number; axis: 'width' | 'height' } => {
                                const axis: 'width' | 'height' = selectedZone.type === 'vertical' ? 'width' : 'height';
                                const targetId = selectedZone.id;

                                // Parcours pour récupérer le chemin root -> selectedZone avec l'index du child
                                const findPath = (node: Zone, acc: Array<{ node: Zone; childIndex: number | null }>): Array<{ node: Zone; childIndex: number | null }> | null => {
                                    if (node.id === targetId) return [...acc, { node, childIndex: null }];
                                    if (!node.children || node.children.length === 0) return null;
                                    for (let i = 0; i < node.children.length; i++) {
                                        const child = node.children[i];
                                        const res = findPath(child, [...acc, { node, childIndex: i }]);
                                        if (res) return res;
                                    }
                                    return null;
                                };

                                const path = findPath(rootZone, []);
                                let sizeMM = axis === 'width' ? modules * 500 : height; // largeur en mm (modules*500) ou hauteur en mm
                                if (!path) return { sizeMM, axis };

                                // Multiplie par les ratios rencontrés sur le chemin, seulement quand l'orientation correspond à l'axe
                                for (let i = 0; i < path.length - 1; i++) {
                                    const { node, childIndex } = path[i];
                                    if (childIndex == null) continue;
                                    const affectsAxis = (axis === 'width' && node.type === 'vertical') || (axis === 'height' && node.type === 'horizontal');
                                    if (!affectsAxis) continue;
                                    const childCount = node.children?.length ?? 0;
                                    if (childCount === 0) continue;
                                    if (childCount === 2 && typeof node.splitRatio === 'number') {
                                        const first = Math.max(1, node.splitRatio);
                                        const second = Math.max(1, 100 - node.splitRatio);
                                        const fractions = [first / (first + second), second / (first + second)];
                                        sizeMM *= fractions[childIndex] ?? 0.5;
                                    } else {
                                        sizeMM *= 1 / childCount; // fallback divisions égales
                                    }
                                }

                                return { sizeMM, axis };
                            };

                            const renderSimpleZone = (zone: Zone): JSX.Element => {
                                const isLeaf = zone.type === 'leaf';
                                const isSelected = zone.id === selectedZoneId;

                                const handleSelect = (event: SyntheticEvent) => {
                                    event.stopPropagation();
                                    setSelectedZoneId(zone.id);
                                };

                                if (isLeaf) {
                                    const meta = getContentMeta(zone.content);
                                    return (
                                        <button
                                            type="button"
                                            onClick={handleSelect}
                                            className={`flex h-full w-full items-center justify-center rounded-[14px] border text-[13px] font-semibold transition ${
                                                isSelected
                                                    ? 'border-[#E2B66B] bg-[#FFF4DC] text-[#6E4B0A] shadow-[0_4px_12px_rgba(226,182,107,0.22)]'
                                                    : 'border-[#E8DCC5] bg-white text-[#6C5634] hover:border-[#E2B66B] hover:text-[#7B5F24]'
                                            }`}
                                        >
                                            {meta.shortLabel}
                                        </button>
                                    );
                                }

                                const isHorizontal = zone.type === 'horizontal';
                                const direction = isHorizontal ? 'column' : 'row';
                                const children = zone.children ?? [];
                                const rawWeights = children.length === 2 && zone.splitRatio !== undefined
                                    ? [Math.max(1, zone.splitRatio), Math.max(1, 100 - zone.splitRatio)]
                                    : children.map(() => 1);
                                // Fix inversion haut/bas: inverser l'ordre d'affichage pour les divisions horizontales
                                const orderedChildren = isHorizontal ? [...children].reverse() : children;
                                const orderedWeights = isHorizontal ? [...rawWeights].reverse() : rawWeights;

                                const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        setSelectedZoneId(zone.id);
                                    }
                                };

                                return (
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={handleSelect}
                                        onKeyDown={handleKeyDown}
                                        className={`flex flex-1 rounded-[18px] ${isSelected ? 'ring-1 ring-[#E2B66B] bg-[#FFF7EB]' : ''}`}
                                        style={{ flexDirection: direction, gap: '6px', padding: '6px', cursor: 'pointer' }}
                                    >
                                        {orderedChildren.map((child, index) => (
                                            <div
                                                key={child.id}
                                                style={{ flexGrow: orderedWeights[index] ?? 1, flexBasis: 0, display: 'flex' }}
                                            >
                                                {renderSimpleZone(child)}
                                            </div>
                                        ))}
                                    </div>
                                );
                            };

                            return (
                                <div className="mb-6 rounded-[28px] border border-[#E9DFCE] bg-white p-6 shadow-[0_16px_36px_rgba(212,196,167,0.28)]">
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="flex items-center gap-2 text-lg font-semibold text-[#2F2817]">
                                                <span>🎯</span>
                                                <span>Construction par Compartiments</span>
                                            </h3>
                                            <p className="mt-1 text-sm text-[#6A5A3D]">
                                                Sélectionnez une zone sur le plan, puis ajustez son contenu ci-dessous.
                                            </p>
                                        </div>

                                        <div className="rounded-[22px] border border-[#E4D6C0] bg-[#FFFBF4] p-4">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B48A3C]">Plan du meuble</p>
                                                <div className="relative group inline-block">
                                                    <button
                                                        type="button"
                                                        aria-label="Afficher l'astuce de construction"
                                                        className="h-7 w-7 rounded-full border border-[#E4D6C0] bg-white text-[#A06A14] font-bold leading-none flex items-center justify-center hover:bg-[#FFF3DB]"
                                                    >
                                                        i
                                                    </button>
                                                    <div className="pointer-events-none absolute right-0 top-full z-10 mt-2 w-72 rounded-lg border border-[#EADFCB] bg-white p-3 text-xs text-[#5B4A30] shadow-[0_8px_18px_rgba(0,0,0,0.08)] opacity-0 invisible transition-opacity duration-150 group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible">
                                                        <p className="font-semibold text-[#2F2817] mb-1">Astuce</p>
                                                        <p>
                                                            Divisez d’abord la zone racine, puis sélectionnez chaque sous-zone pour placer tiroir,
                                                            penderie ou espace libre.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <div className="rounded-[22px] border border-[#F0DEC4] bg-white p-5">
                                                    <div className="flex h-full w-full" style={{ height: dynamicHeight }}>
                                                        {renderSimpleZone(rootZone)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Info tip moved to hover next to the title above */}

                                        <div className="rounded-[24px] border border-[#E1D4C0] bg-[#FFFBF4] p-5 space-y-4">
                                            <div className="border-b border-[#EADFCB] pb-4">
                                                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B48A3C]">Compartiment actif</p>
                                                <h4 className="text-[16px] font-semibold text-[#2F2817]">{getZoneTitle(selectedZone)}</h4>
                                                <p className="text-xs text-[#877050]">ID: {selectedZone.id}</p>
                                                <p className="text-[13px] leading-relaxed text-[#5B4A30]">{getZoneSubtitle(selectedZone)}</p>
                                            </div>

                                            {canSplitSelected && (
                                                <div className="border-b border-[#EADFCB] pb-4">
                                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B48A3C]">Contenu de la zone</p>
                                                    <div className="mt-3 grid grid-cols-1 gap-2">
                                                        {zoneContentOptions.map((option) => {
                                                            const meta = getContentMeta(option.value);
                                                            const isActive = (selectedZone.content || 'empty') === option.value;
                                                            return (
                                                                <button
                                                                    key={option.value}
                                                                    type="button"
                                                                    onClick={() => setZoneContent(selectedZone.id, option.value)}
                                                                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                                                        isActive
                                                                            ? 'border-[#F2B84B] bg-[#FFF3DB] text-[#704909] shadow-sm'
                                                                            : 'border-[#E5D8C3] bg-white text-[#5B4A30] hover:border-[#F2B84B] hover:bg-[#FFF7E8]'
                                                                    }`}
                                                                >
                                <span className="flex items-center gap-2">
                                  <span className="text-lg">{meta.icon}</span>
                                    {option.label}
                                </span>
                                                                    <span className="max-w-[150px] text-[10px] font-normal leading-snug text-[#8C7B60]">{option.helper}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    {(() => {
                                                        const parentHasAdjustable = parentZone && parentZone.type !== 'leaf' && (parentZone.children?.length ?? 0) === 2;
                                                        return parentHasAdjustable ? (
                                                            <div className="mt-3">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => parentZone && setSelectedZoneId(parentZone.id)}
                                                                    className="inline-flex items-center gap-2 rounded-lg border border-[#E2B66B] bg-[#FFF7EB] px-3 py-1.5 text-[12px] font-semibold text-[#704909] shadow-sm hover:bg-[#FFF2DB]"
                                                                    title="Régler précisément la position de la division en pourcentage ou en centimètres"
                                                                >
                                                                    <span>🎚️</span>
                                                                    <span>Régler la division parente</span>
                                                                    <span className="text-[11px] font-normal text-[#8C7B60]">(% / cm)</span>
                                                                </button>
                                                            </div>
                                                        ) : null;
                                                    })()}
                                                </div>
                                            )}

                                            <div className="border-b border-[#EADFCB] pb-4">
                                                {canSplitSelected ? (
                                                    <div>
                                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B48A3C]">Diviser cette zone</p>
                                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => splitZone(selectedZone.id, 'vertical', 2)}
                                                                className="flex items-center justify-center gap-2 rounded-xl border border-[#E5D8C3] bg-[#FFF9EF] px-3 py-2 text-[13px] font-semibold hover:border-[#F2B84B] hover:bg-[#FFF2DB]"
                                                            >
                                                                ↔️ Colonnes
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => splitZone(selectedZone.id, 'horizontal', 2)}
                                                                className="flex items-center justify-center gap-2 rounded-xl border border-[#E5D8C3] bg-[#FFF9EF] px-3 py-2 text-[13px] font-semibold hover:border-[#F2B84B] hover:bg-[#FFF2DB]"
                                                            >
                                                                ↕️ Étagères
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#B48A3C]">Réglage de la division</p>
                                                        {canAdjustRatio ? (
                                                            <div className="mt-3 space-y-2 text-[#5B4A30]">
                                                                {(() => {
                                                                    const { sizeMM, axis } = getSelectedZoneAxisSizeMM();
                                                                    const totalCm = Math.max(1, Math.round(sizeMM / 10));
                                                                    const currentCm = Math.min(
                                                                        Math.max(1, Math.round(((sliderRatio / 100) * sizeMM) / 10)),
                                                                        Math.max(1, totalCm - 1)
                                                                    );
                                                                    const maxCm = Math.max(1, totalCm - 1);
                                                                    return (
                                                                        <>
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="text-xs font-semibold">0 cm</span>
                                                                                <input
                                                                                    type="range"
                                                                                    min={1}
                                                                                    max={maxCm}
                                                                                    step={1}
                                                                                    value={currentCm}
                                                                                    onChange={(e) => {
                                                                                        const cm = Number(e.target.value);
                                                                                        const percent = (cm * 10 / sizeMM) * 100;
                                                                                        adjustTarget && setSplitRatio(
                                                                                            adjustTarget.id,
                                                                                            Math.max(1, Math.min(99, Math.round(percent)))
                                                                                        );
                                                                                    }}
                                                                                    className="flex-1 accent-[#F2B84B]"
                                                                                />
                                                                                <span className="text-xs font-semibold">{totalCm} cm</span>
                                                                            </div>
                                                                            <div className="flex items-center justify-between text-[11px] text-[#8C7B60]">
                                                                                <span>Position {axis === 'width' ? '↔︎' : '↕︎'}</span>
                                                                                <span>{currentCm} cm / total {totalCm} cm</span>
                                                                            </div>
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                        ) : (
                                                            <p className="mt-3 text-[11px] text-[#8C7B60]">Division égale.</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="pt-1 space-y-2">
                                                {selectedZone.type !== 'leaf' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => resetZone(selectedZone.id)}
                                                        className="w-full rounded-xl border border-[#F0B4B4] bg-[#FFECEC] px-3 py-2 text-[13px] font-semibold text-[#B43B3B]"
                                                    >
                                                        🗑️ Supprimer cette division
                                                    </button>
                                                )}
                                                {parentZone && (
                                                    <button
                                                        type="button"
                                                        onClick={() => resetZone(parentZone.id)}
                                                        className="w-full rounded-xl border border-[#F2D0A8] bg-[#FFF3E2] px-3 py-2 text-[13px] font-semibold text-[#9B6513]"
                                                    >
                                                        ↩️ Supprimer la division parente
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}


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

                        {/* Toggle Multi-couleurs */}
                        <div className="control-group">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <label className="control-label">Mode de coloration</label>
                                    <p className="text-xs text-gray-500">
                                        {useMultiColor
                                            ? 'Couleurs personnalisées par composant'
                                            : 'Couleur unique pour tout le meuble'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setUseMultiColor(!useMultiColor)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                        useMultiColor ? 'bg-amber-500' : 'bg-gray-300'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                            useMultiColor ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Couleurs / Teintes Section */}
                        <div className="control-group">
                            <label className="control-label">
                                {useMultiColor ? 'Couleurs par composant' : 'Couleurs'}
                            </label>
                            <p className="text-xs text-gray-500 mb-3">
                                {useMultiColor
                                    ? 'Sélectionnez une couleur différente pour chaque partie du meuble'
                                    : 'Choisissez ensuite la finition précise correspondant au matériau sélectionné.'}
                            </p>

                            {materialsLoading ? (
                                <div className="text-sm text-gray-500">Chargement des échantillons…</div>
                            ) : colorsForMaterial.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                                    Aucune teinte n&apos;est encore disponible pour {selectedMaterialLabel}.
                                </div>
                            ) : useMultiColor ? (
                                /* MODE MULTI-COULEURS : Sélecteurs par composant */
                                <div className="space-y-6">
                                    {[
                                        { key: 'structure' as const, label: 'Structure', icon: '🏗️', desc: 'Corps du meuble' },
                                        { key: 'drawers' as const, label: 'Tiroirs', icon: '📦', desc: 'Façades de tiroirs' },
                                        { key: 'doors' as const, label: 'Portes', icon: '🚪', desc: 'Portes battantes' },
                                        { key: 'base' as const, label: 'Socle', icon: '⬛', desc: 'Base du meuble' },
                                    ].map(({ key, label, icon, desc }) => (
                                        <div key={key} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                            <div className="mb-3 flex items-center gap-2">
                                                <span className="text-xl">{icon}</span>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-ink">{label}</h4>
                                                    <p className="text-xs text-gray-500">{desc}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {colorsForMaterial.map((option) => {
                                                    const isActive = componentColors[key].colorId === option.id;
                                                    return (
                                                        <button
                                                            key={option.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setComponentColors(prev => ({
                                                                    ...prev,
                                                                    [key]: { colorId: option.id, hex: option.hex }
                                                                }));
                                                            }}
                                                            className={`group flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-left text-xs transition ${
                                                                isActive ? 'border-amber-500 bg-white text-ink shadow-sm' : 'border-gray-300 bg-white text-ink/70 hover:border-amber-300'
                                                            }`}
                                                        >
                                                            <span
                                                                className="inline-flex h-6 w-6 flex-shrink-0 overflow-hidden rounded-full border border-gray-300"
                                                                style={{ backgroundColor: option.image_url ? undefined : (option.hex || DEFAULT_COLOR_HEX) }}
                                                            >
                                                                {option.image_url && (
                                                                    <img src={option.image_url} alt={option.name || ''} className="h-full w-full object-cover" />
                                                                )}
                                                            </span>
                                                            <span className="text-xs font-medium">{option.name}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* MODE COULEUR UNIQUE : Sélecteur classique */
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
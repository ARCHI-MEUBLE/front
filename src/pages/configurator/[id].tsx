import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Link from 'next/link';
import { adminUrl } from '@/lib/adminPath';

const ThreeViewer = dynamic(() => import('@/components/configurator/ThreeViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-am-paper" style={{ minHeight: '500px' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-am-navy border-t-transparent" />
        <p className="text-sm font-medium text-black/65">Chargement du studio 3D...</p>
      </div>
    </div>
  ),
});
import DimensionsPanel from '@/components/configurator/DimensionsPanel';
import StepNav from '@/components/configurator/steps/StepNav';
import StepIntro from '@/components/configurator/steps/StepIntro';
import StepSection from '@/components/configurator/steps/StepSection';
import DivisionSteps, { zoneAtLevel, type DivisionLevel } from '@/components/configurator/steps/DivisionSteps';
import ZoneQuickMenu from '@/components/configurator/steps/ZoneQuickMenu';
import ZoneEmptyState from '@/components/configurator/steps/ZoneEmptyState';
import ConfigRecap from '@/components/configurator/steps/ConfigRecap';
import ArViewSection from '@/components/configurator/ArViewSection';
import type { ThreeViewerProps } from '@/components/configurator/ThreeViewer';
import MountingStyleSelector from '@/components/configurator/steps/MountingStyleSelector';
import {
  CONFIG_STEPS,
  LAST_STEP,
  STEP,
  type ConfigStep,
} from '@/components/configurator/steps/steps';
import ZoneEditor, { Zone, ZoneContent, ZoneColor, stringToPanelId, PANEL_META } from '@/components/configurator/ZoneEditor';
import ZoneColorPicker from '@/components/configurator/ZoneColorPicker';
import SocleSelector from '@/components/configurator/SocleSelector';
import MaterialSelector, { ComponentColors, type ColorComponent } from '@/components/configurator/MaterialSelector';
import PriceDisplay from '@/components/configurator/PriceDisplay';
import ShareButton from '@/components/configurator/ShareButton';
import ProjectRequestDialog from '@/components/configurator/ProjectRequestDialog';
import {
  SHARE_QUERY_PARAM,
  configDataToRestore,
  configurationShareUrl,
  createConfigurationShare,
  fetchConfigurationShare,
} from '@/lib/configurator/share';
import { apiClient, type FurnitureModel, type SampleType, type SampleColor, type FurnitureColors } from '@/lib/apiClient';
import { useCustomer } from '@/context/CustomerContext';
import { ArrowLeft, ArrowRight, ChevronLeft, Box, DoorClosed, DoorOpen, EyeOff, RotateCcw, Sparkles, Undo2, Redo2, Sofa, BedDouble, Square, Lightbulb, LightbulbOff } from 'lucide-react';
import { ROOM_SCENES, type RoomScene } from '@/components/configurator/scene/Room';
import {
  IconInfoCircle,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconX as IconTablerX
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { useHistory } from '@/hooks/useHistory';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast, { Toaster } from 'react-hot-toast';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  DEFAULT_COLOR_HEX,
  HANDLE_TYPE_CODE,
  normalizeMaterialKey,
} from '@/lib/configurator/materials';
import { normalizeZoneSplitRatios } from '@/lib/configurator/zoneUtils';
import { ConfigurationSummary } from '@/components/configurator/ConfigurationSummary';
import { computeZoneStats, findParentZone, getZoneSize, listLeafZones } from '@/lib/configurator/zoneStats';
import { nicheDefaultColor } from '@/lib/configurator/niche';
import { findConstraintIssues, type IssueKind } from '@/lib/configurator/constraints';
import { setZoneFacade } from '@/lib/configurator/zoneFacades';
import { extendSelection, groupSelection, selectableNeighborIds } from '@/lib/configurator/zoneSelection';
import { removeSection, removeSeparators } from '@/lib/configurator/zoneRemoval';
import { applySplitRatios } from '@/lib/configurator/zoneResize';

// Pièce choisie pour la vue 3D, retenue d'une visite à l'autre
const ROOM_SCENE_KEY = 'archimeuble:room-scene';

// Au-delà de cette largeur (mm), un meuble vierge est automatiquement scindé en 2 caissons
// côte à côte — même règle et même seuil que CAISSON_LARGEUR_MAX_MM dans procedure_real.py.
const CAISSON_WIDTH_THRESHOLD_MM = 1000;

// Si l'utilisateur repasse sous le seuil dans ce délai (ms) sans avoir touché au caisson
// auto-créé, celui-ci est retiré automatiquement. Passé ce délai, il devient définitif.
const CAISSON_AUTO_REMOVE_GRACE_MS = 20000;

// Construit récursivement des caissons de ≤ CAISSON_WIDTH_THRESHOLD_MM chacun — si une moitié
// est encore trop large après la coupe, elle est recoupée à son tour (même logique que
// decouper_en_caissons dans procedure_real.py). `isCaisson` marque les divisions créées ici,
// pour que ThreeCanvas sache lesquelles doubler sans deviner via l'id ou le nombre d'enfants.
function buildCaissonTree(id: string, widthMm: number): Zone {
  if (widthMm <= CAISSON_WIDTH_THRESHOLD_MM) {
    return { id, type: 'leaf', content: 'empty' };
  }
  return {
    id,
    type: 'vertical',
    splitRatio: 50,
    children: [
      buildCaissonTree(`${id}-0`, widthMm / 2),
      buildCaissonTree(`${id}-1`, widthMm / 2),
    ],
  };
}

// Vrai si `zone` est exactement ce que buildCaissonTree produirait — c'est-à-dire si rien n'a
// encore été configuré dedans (condition pour le retrait automatique pendant le délai de grâce).
function isUntouchedCaissonTree(zone: Zone): boolean {
  if (zone.type === 'leaf') {
    return zone.content === 'empty' && !zone.children;
  }
  return zone.type === 'vertical'
    && zone.children?.length === 2
    && zone.children.every(isUntouchedCaissonTree);
}

// Une seule façade par endroit : prévient quand une porte ou un tiroir superposé a été retiré
function notifyRemovedFacades(removed: number) {
  if (removed === 1) toast('La porte ou le tiroir qui se superposait a été retiré.');
  else if (removed > 1) toast(`${removed} portes ou tiroirs qui se superposaient ont été retirés.`);
}

export default function ConfiguratorPage() {
  const router = useRouter();
  const { id, mode, configId: queryConfigId, adminMode, modelId, fromAdmin } = router.query;
  const { customer, isAuthenticated } = useCustomer();
  const [isAdmin, setIsAdmin] = useState(false);
  const isAdminCreateModel = adminMode === 'createModel';
  const isAdminEditModel = adminMode === 'editModel';
  const isMobile = useIsMobile();

  const [isCreateModelDialogOpen, setIsCreateModelDialogOpen] = useState(false);
  const [showModelCreatedModal, setShowModelCreatedModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [, setIsSavingModel] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);


  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/backend/api/categories.php?active=true');
        if (response.ok) {
          const data = await response.json();
          if (data.categories) {
            setAvailableCategories(data.categories);
            if (isAdminCreateModel && data.categories.length > 0 && !modelForm.category) {
              setModelForm(prev => ({ ...prev, category: data.categories[0].slug }));
            }
          }
        }
      } catch (error) {
        console.error("Erreur chargement categories configurateur:", error);
      }
    };
    fetchCategories();
  }, [isAdminCreateModel]);

  const [modelForm, setModelForm] = useState({
    name: '',
    description: '',
    category: 'dressing',
    price: 890,
    imageUrl: ''
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      setIsUploading(true);
      console.log('📤 Début de l\'upload de l\'image...', file.name);
      const response = await fetch('/api/admin/upload-model-image', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      console.log('📥 Réponse du serveur (status):', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur serveur upload:', errorText);
        throw new Error('Erreur lors de l\'upload');
      }

      const data = await response.json();
      console.log('✅ Données upload reçues:', data);
      if (data.success) {
        setModelForm({ ...modelForm, imageUrl: data.url });
        toast.success('Image mise en ligne !');
      }
    } catch (err) {
      console.error('💥 Exception upload:', err);
      toast.error('Échec de l\'upload de l\'image');
    } finally {
      setIsUploading(false);
    }
  };

  const isEditMode = mode === 'edit' && queryConfigId;
  const isViewMode = mode === 'view' && queryConfigId;
  const configIdToEdit = queryConfigId ? Number(queryConfigId) : null;

  useEffect(() => {
    const checkAdmin = async () => {
      if (fromAdmin === 'true') {
        setIsAdmin(true);
        console.log('👑 Accès depuis le dashboard admin (fromAdmin=true)');
        return;
      }

      try {
        console.log('🔍 Vérification session admin...');
        const data = await apiClient.adminAuth.getSession();
        console.log('🔍 Réponse getSession:', data);
        if (data.admin) {
          setIsAdmin(true);
          console.log('👑 Session administrateur détectée');
        } else {
          console.log('❌ Pas de session admin (data.admin = false ou undefined)');
        }
      } catch (e) {
        if (e instanceof Error && 'statusCode' in e && e.statusCode === 401) {
          console.info('ℹ️ Aucune session administrateur active');
        } else {
          console.error('❌ Erreur lors de la vérification admin:', e);
        }
      }
    };
    checkAdmin();
  }, [fromAdmin]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('configurator-sticky');
    return () => root.classList.remove('configurator-sticky');
  }, []);

  const localStorageKey = useMemo(() => `configurator_config_${id}`, [id]);

  const [initialConfig, setInitialConfig] = useState<{
    width: number;
    height: number;
    depth: number;
    socle: string;
    rootZone: Zone;
    finish: string;
    doorType?: 'none' | 'single' | 'double';
    doorSide?: 'left' | 'right';
  } | null>(null);

  const [model, setModel] = useState<FurnitureModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingConfiguration, setEditingConfiguration] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [pendingRestoreConfig, setPendingRestoreDialog] = useState<any>(null);
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [dxfUrl, setDxfUrl] = useState<string | null>(null);
  const [editingConfigId, setEditingConfigId] = useState<number | null>(null);
  const [editingConfigName, setEditingConfigName] = useState<string>('');
  const [initialConfigApplied, setInitialConfigApplied] = useState(false);
  const [skipNextAutoGenerate, setSkipNextAutoGenerate] = useState(false);

  const [templatePrompt, setTemplatePrompt] = useState<string | null>(null);

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

  useEffect(() => {
    if (isCreateModelDialogOpen && price > 0) {
      setModelForm(prev => ({ ...prev, price: Math.round(price) }));
    }
  }, [isCreateModelDialogOpen, price]);

  const [pricingParams, setPricingParams] = useState<any>(null);

  const [doorsOpen, setDoorsOpen] = useState(true);
  const [showDecorations, setShowDecorations] = useState(true);
  // Affichage seulement (non enregistré) : sans les tiroirs, on voit mieux les séparations
  const [hideFacades, setHideFacades] = useState(false);
  // Pièce de la vue 3D : préférence d'affichage du visiteur, gardée dans son navigateur (pas dans la config)
  const [roomScene, setRoomScene] = useState<RoomScene>('neutral');
  // Salon, Chambre : lampes allumées (ambiance du soir) ou éteintes (lumière du jour)
  const [roomLightsOn, setRoomLightsOn] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(ROOM_SCENE_KEY);
      if (ROOM_SCENES.some((s) => s.id === saved)) setRoomScene(saved as RoomScene);
    } catch {}
  }, []);
  const chooseRoomScene = useCallback((scene: RoomScene) => {
    setRoomScene(scene);
    try {
      localStorage.setItem(ROOM_SCENE_KEY, scene);
    } catch {}
  }, []);
  const doorsOpenRef = useRef(doorsOpen);
  const [doorType, setDoorType] = useState<'none' | 'single' | 'double'>('none');
  const [doorSide, setDoorSide] = useState<'left' | 'right'>('left');
  const [mountingStyle, setMountingStyle] = useState<'applique' | 'encastre'>('applique');

  useEffect(() => {
    doorsOpenRef.current = doorsOpen;
  }, [doorsOpen]);

  const [useMultiColor, setUseMultiColor] = useState(false);
  const [componentColors, setComponentColors] = useState<ComponentColors>({
    structure: { colorId: null, hex: null },
    drawers: { colorId: null, hex: null },
    doors: { colorId: null, hex: null },
    shelves: { colorId: null, hex: null },
    back: { colorId: null, hex: null },
    base: { colorId: null, hex: null },
  });

  const {
    state: rootZone,
    setState: setRootZone,
    undo: undoZone,
    redo: redoZone,
    canUndo: canUndoZone,
    canRedo: canRedoZone,
  } = useHistory<Zone>({
    id: 'root',
    type: 'leaf',
    content: 'empty',
  }, { maxHistory: 30 });

  // Au-delà de cette largeur (mm), un meuble encore vierge (jamais configuré) est
  // automatiquement scindé en 2 caissons côte à côte — même règle et même seuil que
  // CAISSON_LARGEUR_MAX_MM dans procedure_real.py.
  // Pendant CAISSON_AUTO_REMOVE_GRACE_MS après cette création automatique, si l'utilisateur
  // repasse sous le seuil sans avoir touché au caisson (toujours 2 colonnes vides), il est
  // retiré automatiquement. Passé ce délai, il devient définitif.
  const autoCaissonPendingRef = useRef(false);
  const caissonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isBlankLeaf = rootZone.type === 'leaf' && rootZone.content === 'empty' && !rootZone.children;
    const isUntouchedAutoCaisson = isUntouchedCaissonTree(rootZone) && rootZone.type === 'vertical';

    if (width > CAISSON_WIDTH_THRESHOLD_MM && isBlankLeaf) {
      setRootZone(buildCaissonTree('root', width));
      autoCaissonPendingRef.current = true;
      if (caissonTimerRef.current) clearTimeout(caissonTimerRef.current);
      caissonTimerRef.current = setTimeout(() => {
        autoCaissonPendingRef.current = false;
        caissonTimerRef.current = null;
      }, CAISSON_AUTO_REMOVE_GRACE_MS);
      return;
    }

    if (width <= CAISSON_WIDTH_THRESHOLD_MM && autoCaissonPendingRef.current && isUntouchedAutoCaisson) {
      setRootZone({ id: 'root', type: 'leaf', content: 'empty' });
      autoCaissonPendingRef.current = false;
      if (caissonTimerRef.current) {
        clearTimeout(caissonTimerRef.current);
        caissonTimerRef.current = null;
      }
    }
  }, [width, rootZone, setRootZone]);

  useEffect(() => () => {
    if (caissonTimerRef.current) clearTimeout(caissonTimerRef.current);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndoZone) undoZone();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedoZone) redoZone();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndoZone, canRedoZone, undoZone, redoZone]);

  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>(['root']);

  const [selectedPanelIds, setSelectedPanelIds] = useState<Set<string>>(new Set());
  const [deletedPanelIds, setDeletedPanelIds] = useState<Set<string>>(new Set());

  // Le menu sur clic n'existe que sur grand écran : en dessous, les planches ne se choisissent pas
  const [wideViewer, setWideViewer] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const update = () => setWideViewer(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const toggleSelectedPanelsDeleted = useCallback((action: 'delete' | 'restore') => {
    // Une planche intérieure retirée réunit les deux sections qu'elle séparait (au lieu d'être seulement
    // cachée) ; les panneaux extérieurs, eux, restent simplement masqués
    const separatorIds = Array.from(selectedPanelIds).filter(id => id.startsWith('separator-'));
    if (action === 'delete' && separatorIds.length > 0) {
      const result = removeSeparators(rootZone, separatorIds);
      if (result.removed > 0) {
        setRootZone(result.root);
        toast.success(result.removed > 1 ? 'Planches retirées : les sections sont réunies' : 'Planche retirée : les deux sections sont réunies');
      }
      if (result.blocked > 0) {
        toast.error("Cette planche sépare deux zones elles-mêmes découpées : supprimez d'abord les sections de l'une d'elles.");
      }
    }

    setDeletedPanelIds(prev => {
      const next = new Set(prev);
      selectedPanelIds.forEach(panelId => {
        if (action === 'delete') {
          if (!panelId.startsWith('separator-')) next.add(panelId);
        } else {
          next.delete(panelId);
        }
      });
      return next;
    });
    if (action === 'delete') setSelectedPanelIds(new Set());
  }, [selectedPanelIds, rootZone, setRootZone]);

  // Configurations enregistrées avant ce changement : une planche intérieure « retirée » y était seulement
  // cachée. On réunit ses deux sections une fois la configuration chargée.
  // Une planche entre deux zones découpées ne peut pas être fusionnée : elle reste cachée comme avant.
  useEffect(() => {
    const legacySeparators = Array.from(deletedPanelIds).filter(id => id.startsWith('separator-'));
    if (legacySeparators.length === 0) return;
    const result = removeSeparators(rootZone, legacySeparators);
    const kept = new Set(result.blockedIds);
    const dropped = legacySeparators.filter(id => !kept.has(id));
    if (dropped.length === 0) return;
    if (result.removed > 0) setRootZone(result.root);
    setDeletedPanelIds(prev => new Set(Array.from(prev).filter(id => !dropped.includes(id))));
  }, [deletedPanelIds, rootZone, setRootZone]);

  // Cloison ou étagère glissée dans la vue 3D (relâchement de la poignée) : une seule étape d'historique
  const handleDividerResize = useCallback((zoneId: string, ratios: number[]) => {
    setRootZone(prev => applySplitRatios(prev, zoneId, ratios));
  }, [setRootZone]);

  // Clic sur une planche dans la vue 3D : elle seule est choisie, son menu remplace celui de la zone
  const handlePanelSelect = useCallback((panelId: string | null) => {
    setSelectedPanelIds(panelId ? new Set([panelId]) : new Set());
    if (panelId) setSelectedZoneIds([]);
  }, []);

  const hasZoneSpecificDoors = useMemo(() => {
    const checkZone = (zone: Zone): boolean => {
      if (zone.type === 'leaf' && (zone.content === 'door' || zone.content === 'door_right' || zone.content === 'door_double')) {
        return true;
      }
      if (zone.children) {
        return zone.children.some(child => checkZone(child));
      }
      return false;
    };
    return checkZone(rootZone);
  }, [rootZone]);

  const findZone = useCallback((zone: Zone, targetId: string | null): Zone | null => {
    if (!targetId) return null;
    if (zone.id === targetId) return zone;
    if (zone.children) {
      for (const child of zone.children) {
        const found = findZone(child, targetId);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const selectedZone = useMemo(() => findZone(rootZone, selectedZoneIds[0] || null), [rootZone, selectedZoneIds, findZone]);

  const setZoneContent = useCallback((zoneId: string, content: ZoneContent) => {
    const { root, removed } = setZoneFacade(rootZone, zoneId, content);
    setRootZone(root);
    notifyRemovedFacades(removed);
  }, [rootZone]);

  const toggleZoneLight = useCallback((zoneId: string) => {
    const updateZone = (z: Zone): Zone => {
      if (z.id === zoneId && z.type === 'leaf') {
        return { ...z, hasLight: !z.hasLight };
      }
      if (z.children) {
        return { ...z, children: z.children.map(updateZone) };
      }
      return z;
    };
    setRootZone(updateZone(rootZone));
  }, [rootZone]);

  const toggleZoneCableHole = useCallback((zoneId: string) => {
    const updateZone = (z: Zone): Zone => {
      if (z.id === zoneId && z.type === 'leaf') {
        return { ...z, hasCableHole: !z.hasCableHole };
      }
      if (z.children) {
        return { ...z, children: z.children.map(updateZone) };
      }
      return z;
    };
    setRootZone(updateZone(rootZone));
  }, [rootZone]);

  const toggleZoneDressing = useCallback((zoneId: string) => {
    const updateZone = (z: Zone): Zone => {
      if (z.id === zoneId && z.type === 'leaf') {
        return { ...z, hasDressing: !z.hasDressing };
      }
      if (z.children) {
        return { ...z, children: z.children.map(updateZone) };
      }
      return z;
    };
    setRootZone(updateZone(rootZone));
  }, [rootZone]);

  const groupZones = useCallback((zoneIds: string[], forceContent?: ZoneContent) => {
    if (zoneIds.length <= 1) return;

    const result = groupSelection(rootZone, zoneIds, forceContent);
    if (result.error) {
      toast.error("Ces compartiments ne peuvent pas recevoir une porte commune.");
      return;
    }

    setRootZone(result.root);
    setSelectedZoneIds(result.groupId ? [result.groupId] : []);
    toast.success(forceContent ? "Porte ajoutée sur l'ensemble sélectionné" : 'Zones groupées avec succès');
    notifyRemovedFacades(result.removed);
  }, [rootZone]);

  // Supprimer une section : sa voisine (au-dessus ou à gauche, sinon en dessous ou à droite) prend sa place
  const deleteSection = useCallback((zoneId: string) => {
    const result = removeSection(rootZone, zoneId);
    if (!result.root) return;
    setRootZone(result.root);
    setSelectedZoneIds([result.keptId]);
    setSelectedPanelIds(new Set());
    toast.success('Section supprimée (Ctrl+Z pour annuler)');
  }, [rootZone, setRootZone]);

  const setZoneDoorContent = useCallback((zoneId: string, content: ZoneContent) => {
    const { root, removed } = setZoneFacade(rootZone, zoneId, content);
    setRootZone(root);
    notifyRemovedFacades(removed);
  }, [rootZone]);

  const setZoneHandleType = useCallback((zoneId: string, handleType: 'vertical_bar' | 'horizontal_bar' | 'knob' | 'recessed') => {
    const updateZone = (z: Zone): Zone => {
      if (z.id === zoneId) {
        return { ...z, handleType };
      }
      if (z.children) {
        return { ...z, children: z.children.map(updateZone) };
      }
      return z;
    };
    setRootZone(updateZone(rootZone));
  }, [rootZone]);

  const setZoneColor = useCallback((zoneId: string, zoneColor: ZoneColor) => {
    const updateZone = (z: Zone): Zone => {
      if (z.id === zoneId) {
        if (!zoneColor.hex) {
          const { zoneColor: _, ...rest } = z;
          return rest as Zone;
        }
        return { ...z, zoneColor };
      }
      if (z.children) {
        return { ...z, children: z.children.map(updateZone) };
      }
      return z;
    };
    setRootZone(updateZone(rootZone));
  }, [rootZone]);

  const isSelectedZoneColorizable = useMemo(() => {
    if (!selectedZone) return false;

    const colorableContents = ['drawer', 'push_drawer', 'door', 'door_right', 'door_double', 'push_door', 'push_door_right', 'mirror_door', 'mirror_door_right', 'niche'];

    if (selectedZone.type === 'leaf' && colorableContents.includes(selectedZone.content || '')) {
      return true;
    }

    if (selectedZone.doorContent && colorableContents.includes(selectedZone.doorContent as string)) {
      return true;
    }

    return false;
  }, [selectedZone]);

  const shelfCount = useMemo(() => {
    if (!rootZone || !rootZone.children) return 0;
    const countHorizontalDivisions = (zone: Zone): number => {
      if (zone.type === 'horizontal' && zone.children) {
        return zone.children.length - 1;
      }
      if (zone.children) {
        return zone.children.reduce((sum, child) => sum + countHorizontalDivisions(child), 0);
      }
      return 0;
    };
    return countHorizontalDivisions(rootZone);
  }, [rootZone]);

  const furnitureStructure = useMemo(() => {
    if (!glbUrl) return null;
    
    const isBuffet = templatePrompt?.startsWith('M2') || templatePrompt?.startsWith('M3');
    
    return {
      isBuffet,
      shelfCount: shelfCount,
    };
  }, [glbUrl, templatePrompt, shelfCount]);

  // Meuble exporté pour la réalité augmentée (section « Voir chez moi ») : celui de la vue 3D, sans pièce ni sélection
  const arFurniture = useMemo<ThreeViewerProps>(() => ({
    width,
    height,
    depth,
    color,
    imageUrl: selectedColorImage,
    hasSocle: socle !== 'none',
    socle,
    rootZone,
    isBuffet: templatePrompt?.startsWith('M2') || templatePrompt?.startsWith('M3'),
    componentColors,
    useMultiColor,
    doorType,
    doorSide,
    mountingStyle,
    deletedPanelIds,
  }), [width, height, depth, color, selectedColorImage, socle, rootZone, templatePrompt, componentColors, useMultiColor, doorType, doorSide, mountingStyle, deletedPanelIds]);
  const arConfigKey = useMemo(
    () => JSON.stringify({ ...arFurniture, deletedPanelIds: Array.from(deletedPanelIds) }),
    [arFurniture, deletedPanelIds]
  );

  const [activeStep, setActiveStep] = useState<ConfigStep>(1);
  const [visitedSteps, setVisitedSteps] = useState<ReadonlySet<ConfigStep>>(() => new Set<ConfigStep>([1]));
  // Vue du viewer : 3D par défaut ; le plan 2D s'ouvre de lui-même à l'étape Division tant que
  // l'utilisateur n'a pas choisi sa vue
  // Faux tant qu'aucune zone n'a été choisie : la sélection du meuble entier est alors celle par défaut
  const [zoneTouched, setZoneTouched] = useState(false);
  const [show3DView, setShow3DView] = useState(true);
  const [viewLocked, setViewLocked] = useState(false);
  const chooseView = useCallback((view3D: boolean) => {
    setShow3DView(view3D);
    setViewLocked(true);
  }, []);

  // Les planches ne se choisissent qu'en 3D : au passage au plan 2D, la planche choisie est oubliée
  useEffect(() => {
    if (!show3DView) setSelectedPanelIds(new Set());
  }, [show3DView]);

  const stepContentRef = useRef<HTMLDivElement>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const selectedMaterialKey = useMemo(() => normalizeMaterialKey(finish), [finish]);
  
  const selectedMaterialLabel = useMemo(() => {
    if (!finish) return '';
    if (materialsMap[finish]) return finish;
    
    const keys = Object.keys(materialsMap);
    const normalizedFinish = finish.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const match = keys.find(k => k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() === normalizedFinish);
    
    return match || finish;
  }, [materialsMap, finish]);

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

  // ── Parcours en étapes ─────────────────────────────────────────────
  const goToStep = useCallback((step: ConfigStep) => {
    setActiveStep(step);
    setVisitedSteps((prev) => (prev.has(step) ? prev : new Set(prev).add(step)));
    if (!viewLocked) setShow3DView(CONFIG_STEPS[step - 1].view !== 'plan');
    stepContentRef.current?.scrollTo({ top: 0 });
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Les étapes Portes et Finitions agissent sur un compartiment précis : on en présélectionne un
    const firstLeafId = (zone: Zone | null) => (zone ? listLeafZones(zone)[0]?.id : undefined);
    if (step === STEP.DOORS) {
      const keepSelection =
        selectedZoneIds.length > 1 ||
        (selectedZone !== null && !(selectedZone.id === 'root' && selectedZone.type !== 'leaf'));
      if (!keepSelection) {
        const leafId = firstLeafId(rootZone);
        if (leafId) {
          setSelectedZoneIds([leafId]);
          setZoneTouched(true);
        }
      }
    } else if (step === STEP.FINISHES) {
      if (!(selectedZoneIds.length === 1 && selectedZone?.type === 'leaf')) {
        const leafId = firstLeafId(selectedZone ?? rootZone);
        if (leafId) {
          setSelectedZoneIds([leafId]);
          setZoneTouched(true);
        }
      }
    }
  }, [rootZone, selectedZone, selectedZoneIds, viewLocked]);

  // Sur clic : une seule zone à la fois, sauf à l'étape Portes où cliquer un compartiment voisin
  // (de côté, au-dessus ou en dessous, dans le même caisson) l'ajoute à la sélection pour lui poser une porte commune
  const handleZoneClick = useCallback((zoneId: string | null) => {
    setSelectedPanelIds(new Set());
    if (zoneId && activeStep === STEP.DOORS) {
      const extended = extendSelection(rootZone, selectedZoneIds, zoneId);
      if (extended) {
        setSelectedZoneIds(extended.ids);
        setZoneTouched(true);
        return;
      }
    }
    setSelectedZoneIds(zoneId ? [zoneId] : []);
    if (zoneId) setZoneTouched(true);
  }, [activeStep, rootZone, selectedZoneIds]);

  // Voisins que l'on peut ajouter à la sélection : signalés dans la vue 3D
  const neighborZoneIds = useMemo(
    () => (activeStep === STEP.DOORS && !isViewMode ? selectableNeighborIds(rootZone, selectedZoneIds) : []),
    [activeStep, isViewMode, rootZone, selectedZoneIds]
  );

  // Étape Division : le volet ouvert fixe le type d'élément sélectionnable (meuble, caisson, étagère, compartiment)
  const [divisionLevel, setDivisionLevel] = useState<DivisionLevel | null>(1);
  useEffect(() => {
    if (activeStep !== STEP.DIVISION || divisionLevel === null) return;
    // Une planche est choisie : pas de zone tant que son menu est ouvert
    if (selectedPanelIds.size > 0) return;
    const current = selectedZoneIds[0] ?? 'root';
    const target = zoneAtLevel(rootZone, current, divisionLevel).id;
    if (selectedZoneIds.length !== 1 || current !== target) setSelectedZoneIds([target]);
  }, [activeStep, divisionLevel, rootZone, selectedZoneIds, selectedPanelIds]);

  const leafZones = useMemo(() => listLeafZones(rootZone), [rootZone]);
  const zoneStats = useMemo(() => computeZoneStats(rootZone), [rootZone]);

  // Une porte ou un tiroir ajouté pendant qu'ils sont cachés doit se voir : on les réaffiche
  const facadeCount = zoneStats.drawers + zoneStats.doors;
  const facadeCountRef = useRef(facadeCount);
  useEffect(() => {
    if (facadeCount > facadeCountRef.current) setHideFacades(false);
    facadeCountRef.current = facadeCount;
  }, [facadeCount]);
  const canHideFacades = show3DView && facadeCount > 0;

  // Limites physiques non respectées : le meuble ne peut pas être fabriqué (et le générateur 3D peut
  // échouer), on ne l'envoie donc pas au backend et on ne l'enregistre pas tant que ce n'est pas corrigé
  const constraintIssues = useMemo(
    () => findConstraintIssues(rootZone, { width, height, depth }),
    [rootZone, width, height, depth]
  );
  const hasZoneIssues = constraintIssues.length > 0;

  // Ouvre l'étape où se corrige le premier problème, avec la zone concernée sélectionnée
  const focusZoneIssue = useCallback(() => {
    const issue = constraintIssues[0];
    if (!issue) return;
    const stepByKind: Record<IssueKind, ConfigStep> = {
      dimensions: STEP.DIMENSIONS,
      division: STEP.DIVISION,
      facade: STEP.DOORS,
      accessory: STEP.FINISHES,
    };
    goToStep(stepByKind[issue.kind]);
    if (issue.zoneId) setSelectedZoneIds([issue.zoneId]);
  }, [constraintIssues, goToStep]);

  // Menu de la zone sélectionnée : son titre, sa taille, ses voisines et son groupe parent
  const quickMenu = useMemo(() => {
    if (selectedZoneIds.length === 0 || !selectedZone) return null;

    const isMulti = selectedZoneIds.length > 1;
    const parent = findParentZone(rootZone, selectedZone.id);
    const leafIndex = !isMulti && selectedZone.type === 'leaf' ? leafZones.findIndex((z) => z.id === selectedZone.id) : -1;

    let title = 'Meuble entier';
    if (isMulti) {
      title = `${selectedZoneIds.length} compartiments`;
    } else if (selectedZone.type === 'leaf') {
      if (leafZones.length > 1) title = `Compartiment ${leafIndex + 1} sur ${leafZones.length}`;
    } else if (selectedZone.id !== 'root') {
      title = `Groupe · ${selectedZone.children?.length ?? 0} ${selectedZone.type === 'horizontal' ? 'niveaux' : 'colonnes'}`;
    }

    // Zone voisine : un compartiment passe au suivant dans l'ordre du plan, un groupe à son voisin direct
    let neighbours: { prev: string; next: string } | null = null;
    if (!isMulti && leafIndex >= 0 && leafZones.length > 1) {
      neighbours = {
        prev: leafZones[(leafIndex - 1 + leafZones.length) % leafZones.length].id,
        next: leafZones[(leafIndex + 1) % leafZones.length].id,
      };
    } else if (!isMulti && selectedZone.type !== 'leaf' && parent?.children && parent.children.length > 1) {
      const siblings = parent.children;
      const index = siblings.findIndex((z) => z.id === selectedZone.id);
      neighbours = {
        prev: siblings[(index - 1 + siblings.length) % siblings.length].id,
        next: siblings[(index + 1) % siblings.length].id,
      };
    }

    return {
      title,
      size: isMulti ? null : getZoneSize(rootZone, selectedZone.id, width, height),
      neighbours,
      parentId: parent?.id ?? null,
      canDelete: !isMulti && !!parent,
    };
  }, [selectedZone, selectedZoneIds, leafZones, rootZone, width, height]);

  // Menu de la planche choisie dans la vue 3D : son nom et de quoi la retirer (ou la remettre)
  const panelMenu = useMemo(() => {
    if (selectedPanelIds.size !== 1) return null;
    const panelId = Array.from(selectedPanelIds)[0];
    const deleted = deletedPanelIds.has(panelId);

    // Étagère ou cloison : la retirer réunit les deux sections qu'elle séparait
    if (panelId.startsWith('separator-')) {
      return {
        title: panelId.startsWith('separator-h-') ? 'Étagère' : 'Cloison',
        subtitle: deleted ? 'Planche retirée' : 'Les deux sections seront réunies',
        deleted,
      };
    }
    const panelInfo = stringToPanelId(panelId);
    return {
      title: (panelInfo && PANEL_META[panelInfo.type]?.label) || 'Planche',
      subtitle: deleted ? 'Planche retirée' : 'Panneau extérieur',
      deleted,
    };
  }, [selectedPanelIds, deletedPanelIds]);

  // Hauteur disponible pour le plan 2D : il remplit le viewer au lieu d'être plafonné, ce qui laisse
  // assez de place aux meubles très divisés
  const planViewportRef = useRef<HTMLDivElement>(null);
  const [planViewportHeight, setPlanViewportHeight] = useState(0);
  useEffect(() => {
    const element = planViewportRef.current;
    if (!element) return;
    const update = () => setPlanViewportHeight(element.clientHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [show3DView, loading, model]);

  // Choisit une zone depuis le menu (voisine ou groupe parent)
  const selectZoneFromMenu = useCallback((zoneId: string) => {
    setSelectedPanelIds(new Set());
    setSelectedZoneIds([zoneId]);
    setZoneTouched(true);
  }, []);

  // Zones mises en évidence dans la vue 3D. La sélection par défaut (le meuble entier, jamais choisie par
  // l'utilisateur) n'en fait pas partie : elle teinterait tout le meuble dès le chargement.
  const highlightedZoneIds = useMemo(
    () =>
      isViewMode || (!zoneTouched && selectedZoneIds.length === 1 && selectedZoneIds[0] === 'root') ? [] : selectedZoneIds,
    [isViewMode, zoneTouched, selectedZoneIds]
  );

  // Le menu reste affiché à toutes les étapes, sauf pour la sélection par défaut (meuble entier) aux étapes
  // Dimensions et Matières où il n'apporte rien tant qu'aucune zone n'a été choisie
  const showQuickMenu =
    !!quickMenu &&
    !panelMenu &&
    !(
      !zoneTouched &&
      selectedZoneIds.length === 1 &&
      selectedZoneIds[0] === 'root' &&
      (activeStep === STEP.DIMENSIONS || activeStep === STEP.MATERIALS)
    );

  // Couleur de chaque partie du meuble telle qu'affichée : en couleur unique, toutes les parties la partagent
  const singleColorEntry = { colorId: selectedColorId, hex: color || DEFAULT_COLOR_HEX, imageUrl: selectedColorImage };
  const displayedComponentColors: ComponentColors = useMultiColor
    ? componentColors
    : {
        structure: singleColorEntry,
        doors: singleColorEntry,
        drawers: singleColorEntry,
        shelves: singleColorEntry,
        back: singleColorEntry,
        base: singleColorEntry,
      };

  // Couleur « par défaut » de la façade sélectionnée : celle de la partie du meuble (portes ou tiroirs),
  // qui peut différer de la structure
  const selectedFacadeDefault =
    displayedComponentColors[
      selectedZone?.content === 'drawer' || selectedZone?.content === 'push_drawer' ? 'drawers' : 'doors'
    ];
  const selectedFacadeDefaultName =
    colorsForMaterial.find((option) => option.id === selectedFacadeDefault.colorId)?.name ?? null;
  // Une niche, elle, prend par défaut le fond du meuble en plus sombre
  const selectedIsNiche = selectedZone?.content === 'niche';

  // Récapitulatif : couleur des façades seulement si elle diffère de la structure
  const facadeSameAsStructure =
    !useMultiColor ||
    (componentColors.doors.colorId === componentColors.structure.colorId &&
      componentColors.drawers.colorId === componentColors.structure.colorId);
  const facadeColorLabel = facadeSameAsStructure
    ? null
    : colorsForMaterial.find((option) => option.id === componentColors.doors.colorId)?.name || 'Personnalisée';

  const priceDisplaySettings = useMemo(() => {
    const displayConfig = pricingParams?.display?.price;
    return {
      mode: Number(displayConfig?.display_mode) || 0,
      range: Number(displayConfig?.deviation_range) || 0
    };
  }, [pricingParams]);

  useEffect(() => {
    if (!id || loading || isViewMode || !initialConfigApplied || showRestoreDialog) return;

    const configToSave = {
      width,
      height,
      depth,
      socle,
      rootZone,
      finish,
      color,
      colorLabel,
      colorImage: selectedColorImage,
      selectedColorId,
      useMultiColor,
      componentColors,
      doorType,
      doorSide,
      mountingStyle,
      doorsOpen,
      showDecorations,
      deletedPanelIds: Array.from(deletedPanelIds),
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(localStorageKey, JSON.stringify(configToSave));
    } catch (e) {
      console.warn('❌ Impossible de sauvegarder dans localStorage', e);
    }
  }, [id, loading, width, height, depth, socle, rootZone, finish, selectedColorId, useMultiColor, componentColors, doorType, doorSide, mountingStyle, color, localStorageKey, isViewMode, initialConfigApplied, showRestoreDialog, doorsOpen, showDecorations, deletedPanelIds]);

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

  useEffect(() => {
    const materialKeys = Object.keys(materialsMap);
    if (materialKeys.length === 0) return;

    const currentFinish = finish || '';
    const normalizedCurrent = currentFinish.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    
    const exactMatch = materialKeys.find(k => k === currentFinish);
    const caseMatch = materialKeys.find(k => k.toLowerCase() === currentFinish.toLowerCase());
    const normalizedMatch = materialKeys.find(k => k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() === normalizedCurrent);
    
    const bestMatch = exactMatch || caseMatch || normalizedMatch;

    if (!bestMatch) {
      const firstMaterial = materialKeys[0];
      console.log('[DEBUG] Matériau actuel non trouvé, sélection du premier disponible:', firstMaterial);
      setFinish(firstMaterial);
    } else if (bestMatch !== finish) {
      console.log('[DEBUG] Alignement du matériau sur la clé API:', bestMatch);
      setFinish(bestMatch);
    }
  }, [materialsMap, finish]);

  useEffect(() => {
    let cancelled = false;
    const loadPricing = async () => {
      try {
        const paramsResponse = await fetch('/backend/api/pricing-config/index.php');
        const paramsData = await paramsResponse.json();

        if (!cancelled && paramsData.success && paramsData.data) {
          const params: any = {
            materials: {},
            drawers: {},
            shelves: {},
            lighting: {},
            cables: {},
            bases: {},
            hinges: {},
            doors: {},
            columns: {},
            casing: {},
            wardrobe: {},
            handles: {},
          };

          paramsData.data.forEach((param: any) => {
            if (!params[param.category]) params[param.category] = {};
            if (!params[param.category][param.item_type]) {
              params[param.category][param.item_type] = {};
            }
            params[param.category][param.item_type][param.param_name] = param.param_value;
          });

          setPricingParams(params);
          console.log('✅ Paramètres de pricing chargés:', params);
        }
      } catch (error) {
        console.warn('Impossible de récupérer les paramètres de pricing, utilisation des valeurs par défaut', error);
      }
    };
    loadPricing();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!colorsForMaterial.length || !initialConfigApplied) {
      return;
    }
    if (selectedColorId !== null && colorsForMaterial.some((o) => o.id === selectedColorId)) return;
    const fallback = colorsForMaterial.find((o) => o.name?.toLowerCase() === colorLabel.toLowerCase());
    const nextColor = fallback || colorsForMaterial[0];
    setSelectedColorId(nextColor.id);
  }, [colorsForMaterial, selectedColorId, colorLabel, initialConfigApplied]);

  const samplePricesMap = useMemo(() => {
    const map: Record<number, number> = {};
    Object.values(materialsMap).forEach(types => {
      types.forEach(type => {
        type.colors?.forEach(color => {
          if (color.id !== null && color.id !== undefined) {
            map[color.id] = color.price_per_m2 || 0;
          }
        });
      });
    });
    return map;
  }, [materialsMap]);

  useEffect(() => {
    if (!initialConfigApplied || !colorsForMaterial.length) return;
    
    if (selectedColorOption) {
      setColor(selectedColorOption.hex || DEFAULT_COLOR_HEX);
      setColorLabel(selectedColorOption.name || selectedMaterialLabel);
      setSelectedColorImage(selectedColorOption.image_url || null);
    } else {
      if (selectedColorId === null && !useMultiColor) {
        setColor(DEFAULT_COLOR_HEX);
        setColorLabel(selectedMaterialLabel);
      }
    }
  }, [selectedColorOption, selectedMaterialLabel, initialConfigApplied, colorsForMaterial.length, selectedColorId, useMultiColor]);

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

    const flagsPart = compact.match(/M\d+\([^)]+\)([A-Za-z0-9]*)/)?.[1] || '';
    if (/P2/.test(flagsPart)) setDoorType('double');
    else if (/P/.test(flagsPart)) {
      setDoorType('single');
      if (flagsPart.includes('Pd')) setDoorSide('right');
      else setDoorSide('left');
    } else {
      setDoorType('none');
    }

    const parseZones = (str: string, idPrefix: string): Zone => {
      const hMatch = str.match(/^H(?:\[([^\]]+)\]|(\d+))\((.*)\)$/);
      const vMatch = str.match(/^V(?:\[([^\]]+)\]|(\d+))\((.*)\)$/);
      const gMatch = str.match(/^(G|P|P2|Pm|Po|Pd|Pg)(?:\[([^\]]+)\])?\((.*)\)$/);
      
      if (hMatch || vMatch || gMatch) {
        const isH = !!hMatch;
        const isV = !!vMatch;
        const isG = !!gMatch && !isH && !isV;
        
        const match = hMatch || vMatch || gMatch;
        const ratiosStr = match![1] && (isH || isV) ? match![1] : (isG ? match![2] : undefined);
        const inner = isG ? match![3] : match![3];
        
        const parts: string[] = [];
        let current = '';
        let depth = 0;
        for (let i = 0; i < inner.length; i++) {
          if (inner[i] === '(') depth++;
          if (inner[i] === ')') depth--;
          if (inner[i] === ',' && depth === 0) {
            parts.push(current);
            current = '';
          } else {
            current += inner[i];
          }
        }
        parts.push(current);

        const ratios = ratiosStr ? ratiosStr.split(',').map(r => parseFloat(r)) : undefined;

        const orderedParts = isH ? [...parts].reverse() : parts;
        const orderedRatios = isH && ratios ? [...ratios].reverse() : ratios;

        const zoneType = isH ? 'horizontal' : (isV ? 'vertical' : 'leaf');
        
        let detectedType: 'horizontal' | 'vertical' | 'leaf' = zoneType;
        if (isG) {
          if (inner.startsWith('H')) detectedType = 'horizontal';
          else if (inner.startsWith('V')) detectedType = 'vertical';
          else detectedType = 'leaf';
        }

        return {
          id: idPrefix,
          type: detectedType,
          doorContent: isG ? (
            str.startsWith('P2') ? 'door_double' : 
            str.startsWith('Pm') ? 'mirror_door' :
            str.startsWith('Po') ? 'push_door' :
            str.startsWith('Pd') ? 'door_right' : 
            (str.startsWith('P') || str.startsWith('Pg')) ? 'door' : 
            undefined
          ) : undefined,
          children: orderedParts.map((p, idx) => parseZones(p, `${idPrefix}-${idx}`)),
          splitRatio: (orderedRatios && orderedRatios.length === 2) ? orderedRatios[0] : undefined,
          splitRatios: (orderedRatios && orderedRatios.length > 2) ? orderedRatios : undefined,
        };
      }

      const isGlassShelf = str.includes('v');
      const glassShelfMatch = str.match(/v(\d+)/);
      const glassShelfCount = glassShelfMatch ? parseInt(glassShelfMatch[1]) : (isGlassShelf ? 1 : undefined);

      return {
        id: idPrefix,
        type: 'leaf',
        content: (
          str.includes('To') ? 'push_drawer' :
          str.includes('T') ? 'drawer' :
          str.includes('D') ? 'dressing' :
          str.includes('P2') ? 'door_double' :
          str.includes('Pm') ? 'mirror_door' :
          str.includes('Po') ? 'push_door' :
          str.includes('Pd') ? 'door_right' :
          (str.includes('P') || str.includes('Pg')) ? 'door' :
          isGlassShelf ? 'glass_shelf' :
          str.includes('p') ? 'pegboard' :
          'empty'
        ) as ZoneContent,
        handleType: (() => {
          const m = str.match(/(?:T|Pg|Pd|P2|Pm)(\d)/);
          if (!m) return undefined;
          return Object.keys(HANDLE_TYPE_CODE).find(k => HANDLE_TYPE_CODE[k] === m[1]) as any;
        })(),
        glassShelfCount,
      };
    };

    const structurePart = compact.replace(/M\d+\([^)]+\)[^HVD]*/, '');
    if (structurePart && !['P', 'P2', 'Pg', 'Pd'].includes(structurePart)) {
      setRootZone(parseZones(structurePart, 'root'));
    } else {
      setRootZone({ id: 'root', type: 'leaf', content: 'empty' });
    }
  }, []);

  const loadModel = useCallback(async () => {
    setLoading(true);
    try {
      let configDataToUse: any = null;
      let configToRestore: any = null;

      if ((isEditMode || isViewMode) && configIdToEdit) {
        console.log(`🔄 Mode ${isViewMode ? 'vue' : 'édition'} détecté, chargement de la configuration #${configIdToEdit}`);

        const savedConfigKey = `archimeuble:configuration:${configIdToEdit}`;
        const savedConfigStr = (!isViewMode && fromAdmin !== 'true') ? localStorage.getItem(savedConfigKey) : null;

        if (savedConfigStr) {
          configDataToUse = JSON.parse(savedConfigStr);
          console.log('📦 Configuration trouvée dans localStorage:', configDataToUse);
        } else {
          console.log('📡 Chargement de la configuration via l\'API...');
          try {
            const response = await fetch(`/backend/api/admin/configurations.php?id=${configIdToEdit}`, { credentials: 'include' });
            if (response.ok) {
              const data = await response.json();
              if (data.configuration) {
                configDataToUse = data.configuration;
                console.log('📦 Configuration chargée via l\'API admin:', configDataToUse);
              }
            } else {
              const resClient = await fetch(`/backend/api/configurations/list.php?id=${configIdToEdit}`, { credentials: 'include' });
              if (resClient.ok) {
                const data = await resClient.json();
                if (data.configuration) {
                  configDataToUse = data.configuration;
                  console.log('📦 Configuration chargée via l\'API client:', configDataToUse);
                }
              }
            }
          } catch (apiErr) {
            console.warn('❌ Erreur lors du chargement API:', apiErr);
          }
        }

        if (configDataToUse) {
          let configDataObj = configDataToUse.config_data || configDataToUse.config_string;
          if (typeof configDataObj === 'string') {
            try {
              configDataObj = JSON.parse(configDataObj);
              console.log('📦 config_data était une chaîne, parsé en objet:', configDataObj);
            } catch (e) {
              console.warn('❌ Impossible de parser config_data:', e);
            }
          }

          if (configDataObj) {
            configToRestore = {
              ...configDataToRestore(configDataObj),
              prompt: configDataToUse.prompt || configDataObj.prompt,
              name: configDataToUse.name || configDataObj.name
            };

            setEditingConfiguration(configDataToUse);
            setEditingConfigId(configIdToEdit);
            if (configToRestore.name) {
              setEditingConfigName(configToRestore.name);
            }
          }
        }
      }

      // Lien partagé (?partage=…) : le meuble enregistré au moment du partage. Lu dans l'adresse plutôt que dans
      // router.query, pour que le retrait du paramètre une fois le meuble affiché ne recharge pas le modèle.
      const shareCode = new URLSearchParams(window.location.search).get(SHARE_QUERY_PARAM);
      if (shareCode && !configToRestore && !isAdminCreateModel && !isAdminEditModel) {
        try {
          const share = await fetchConfigurationShare(shareCode);
          configToRestore = { ...configDataToRestore(share.config_data), prompt: share.prompt };
        } catch (shareErr) {
          toast.error(shareErr instanceof Error ? shareErr.message : 'Ce lien de configuration est introuvable');
        }
      }

      let modelData = null;
      if (isAdminEditModel && modelId) {
        console.log(`🛠️ Mode édition de modèle détecté, chargement du modèle #${modelId}`);
        modelData = await apiClient.models.getById(Number(modelId));
      } else if (id && !isNaN(Number(id))) {
        modelData = await apiClient.models.getById(Number(id));
      }

      if (modelData) {
        setModel(modelData);
        
        if (isAdminEditModel) {
          setModelForm({
            name: modelData.name || '',
            description: modelData.description || '',
            category: modelData.category || 'dressing',
            price: modelData.price || 890,
            imageUrl: modelData.image_url || ''
          });
        }

        if (modelData.config_data && !configToRestore) {
          try {
            const dataObj = typeof modelData.config_data === 'string' ? JSON.parse(modelData.config_data) : modelData.config_data;
            configToRestore = {
              ...configDataToRestore(dataObj),
              prompt: modelData.prompt,
              name: modelData.name
            };
            console.log('💎 Configuration riche restaurée depuis le modèle catalogue');
            
            if (configToRestore.rootZone) {
              setRootZone(normalizeZoneSplitRatios(configToRestore.rootZone));
            }
          } catch (e) {
            console.warn('⚠️ Erreur lors du parsing de config_data du modèle:', e);
          }
        }

        if (modelData.prompt) {
          setTemplatePrompt(modelData.prompt);

          if (!configToRestore) {
            parsePromptToConfig(modelData.prompt);
          }

          const dims = modelData.prompt.match(/\((\d+),(\d+),(\d+)\)/);
          
          if (configToRestore) {
            setInitialConfig({
              width: configToRestore.width || (dims ? parseInt(dims[1]) : 1000),
              height: configToRestore.height || (dims ? parseInt(dims[3]) : 2000),
              depth: configToRestore.depth || (dims ? parseInt(dims[2]) : 400),
              socle: configToRestore.socle || 'none',
              rootZone: JSON.parse(JSON.stringify(configToRestore.rootZone)),
              finish: configToRestore.finish || 'Aggloméré',
              doorType: configToRestore.doorType || 'none',
              doorSide: configToRestore.doorSide || 'left',
            });
          } else {
            const compact = modelData.prompt.replace(/\s+/g, '');
            let initSocle = 'none';
            if (/S2/.test(compact)) initSocle = 'wood';
            else if (/S(?!\d)/.test(compact)) initSocle = 'metal';

            const flagsPart = compact.match(/M\d+\([^)]+\)([A-Za-z0-9]*)/)?.[1] || '';
            let initDoorType: 'none' | 'single' | 'double' = 'none';
            let initDoorSide: 'left' | 'right' = 'left';
            
            if (/P2/.test(flagsPart)) initDoorType = 'double';
            else if (/P/.test(flagsPart)) {
              initDoorType = 'single';
              initDoorSide = flagsPart.includes('Pd') ? 'right' : 'left';
            }

            let initRootZone: Zone = { id: 'root', type: 'leaf', content: 'empty' };
            const hStruct = compact.match(/H(\d+)\(([^)]*)\)/);
            const vStruct = compact.match(/V(\d+)\(([^)]*)\)/);

            if (hStruct) {
              const inner = hStruct[2];
              const children = inner.split(',').map((content: string, idx: number) => ({
                id: `zone-${idx}`,
                type: 'leaf' as const,
                content: (content.includes('T') ? 'drawer' : content.includes('D') ? 'dressing' : content.includes('P') ? 'door' : 'empty') as ZoneContent,
              }));
              initRootZone = { id: 'root', type: 'horizontal', children };
            } else if (vStruct) {
              const inner = vStruct[2];
              const children = inner.split(',').map((content: string, idx: number) => ({
                id: `zone-${idx}`,
                type: 'leaf' as const,
                content: (content.includes('T') ? 'drawer' : content.includes('D') ? 'dressing' : content.includes('P') ? 'door' : 'empty') as ZoneContent,
              }));
              initRootZone = { id: 'root', type: 'vertical', children };
            }

            setInitialConfig({
              width: dims ? parseInt(dims[1]) : 1500,
              height: dims ? parseInt(dims[3]) : 1130,
              depth: dims ? parseInt(dims[2]) : 350,
              socle: initSocle,
              rootZone: JSON.parse(JSON.stringify(initRootZone)),
              finish: 'Aggloméré',
              doorType: initDoorType,
              doorSide: initDoorSide,
            });
          }
        }
      } else {
        let promptToUse = (router.query.prompt as string) || configToRestore?.prompt || null;
        
        if (isAdminCreateModel && !promptToUse) {
          const type = String(id).toUpperCase();
          if (type === 'M1') promptToUse = 'M1(1000,400,2000)bFS';
          else if (type === 'M2') promptToUse = 'M2(1200,400,2000)bFS';
          else if (type === 'M3') promptToUse = 'M3(1500,400,2000)bFS';
          else if (type === 'M4') promptToUse = 'M4(1800,400,2000)bFS';
          else if (type === 'M5') promptToUse = 'M5(2000,400,2000)bFS';
          else promptToUse = 'M1(1000,400,2000)bFS';
        }

        if (promptToUse || configToRestore) {
          const virtualModel = {
            id: 0,
            name: configToRestore?.name || `Template ${id}`,
            description: null,
            prompt: promptToUse || configToRestore?.prompt,
            price: 0,
            image_url: null,
            created_at: new Date().toISOString(),
          } as FurnitureModel;
          
          setModel(virtualModel);

          if (promptToUse) {
            setTemplatePrompt(promptToUse);
            if (!configToRestore) {
              parsePromptToConfig(promptToUse);
            }

            const dims = promptToUse.match(/\((\d+),(\d+),(\d+)\)/);
            const compact = promptToUse.replace(/\s+/g, '');
            let initSocle = 'none';
            if (/S2/.test(compact)) initSocle = 'wood';
            else if (/S(?!\d)/.test(compact)) initSocle = 'metal';

            const flagsPart = compact.match(/M\d+\([^)]+\)([A-Za-z0-9]*)/)?.[1] || '';
            let initDoorType: 'none' | 'single' | 'double' = 'none';
            let initDoorSide: 'left' | 'right' = 'left';
            
            if (/P2/.test(flagsPart)) initDoorType = 'double';
            else if (/P/.test(flagsPart)) {
              initDoorType = 'single';
              initDoorSide = flagsPart.includes('Pd') ? 'right' : 'left';
            }

            let initRootZone: Zone = { id: 'root', type: 'leaf', content: 'empty' };
            const hStruct = compact.match(/H(\d+)\(([^)]*)\)/);
            const vStruct = compact.match(/V(\d+)\(([^)]*)\)/);

            if (hStruct) {
              const inner = hStruct[2];
              const children = inner.split(',').map((content: string, idx: number) => ({
                id: `zone-${idx}`,
                type: 'leaf' as const,
                content: (content.includes('T') ? 'drawer' : content.includes('D') ? 'dressing' : content.includes('P') ? 'door' : 'empty') as ZoneContent,
              }));
              initRootZone = { id: 'root', type: 'horizontal', children };
            } else if (vStruct) {
              const inner = vStruct[2];
              const children = inner.split(',').map((content: string, idx: number) => ({
                id: `zone-${idx}`,
                type: 'leaf' as const,
                content: (content.includes('T') ? 'drawer' : content.includes('D') ? 'dressing' : content.includes('P') ? 'door' : 'empty') as ZoneContent,
              }));
              initRootZone = { id: 'root', type: 'vertical', children };
            }

            setInitialConfig({
              width: dims ? parseInt(dims[1]) : 1500,
              height: dims ? parseInt(dims[3]) : 1130,
              depth: dims ? parseInt(dims[2]) : 350,
              socle: initSocle,
              rootZone: JSON.parse(JSON.stringify(initRootZone)),
              finish: 'Aggloméré',
              doorType: initDoorType,
              doorSide: initDoorSide,
            });
          }
        }
      }

      if (configToRestore) {
        console.log('🔧 Application de la configuration restaurée:', configToRestore);
        if (configToRestore.width) setWidth(configToRestore.width);
        if (configToRestore.height) setHeight(configToRestore.height);
        if (configToRestore.depth) setDepth(configToRestore.depth);
        if (configToRestore.socle) setSocle(configToRestore.socle);
        if (configToRestore.rootZone) setRootZone(normalizeZoneSplitRatios(configToRestore.rootZone));
        if (configToRestore.finish) setFinish(configToRestore.finish);
        if (configToRestore.color) setColor(configToRestore.color);
        if (configToRestore.colorLabel) setColorLabel(configToRestore.colorLabel);
        if (configToRestore.colorImage !== undefined) setSelectedColorImage(configToRestore.colorImage);
        if (configToRestore.selectedColorId !== undefined) setSelectedColorId(configToRestore.selectedColorId);
        if (configToRestore.useMultiColor !== undefined) setUseMultiColor(configToRestore.useMultiColor);
        if (configToRestore.componentColors) setComponentColors(configToRestore.componentColors);
        if (configToRestore.doorType) setDoorType(configToRestore.doorType);
        if (configToRestore.doorSide) setDoorSide(configToRestore.doorSide);
        if (configToRestore.mountingStyle) setMountingStyle(configToRestore.mountingStyle);
        if (configToRestore.deletedPanelIds) setDeletedPanelIds(new Set(configToRestore.deletedPanelIds));
        console.log('✅ Configuration restaurée avec succès');
        setInitialConfigApplied(true);
      } else {
        let restoreFound = false;
        if (!isAdminCreateModel && !isViewMode) {
          const savedConfigStr = localStorage.getItem(localStorageKey);
          if (savedConfigStr) {
            try {
              const localRestore = JSON.parse(savedConfigStr);
              if (localRestore.timestamp && (Date.now() - localRestore.timestamp < 24 * 60 * 60 * 1000)) {
                setPendingRestoreDialog(localRestore);
                setShowRestoreDialog(true);
                restoreFound = true;
              }
            } catch (e) {
              console.warn('Erreur parsing localStorage restore:', e);
            }
          }
        }
        
        if (!restoreFound) {
          setInitialConfigApplied(true);
        }
      }
    } catch (error) {
      console.error('Error loading model:', error);
    } finally {
      setLoading(false);
    }
  }, [id, router.query.prompt, parsePromptToConfig, localStorageKey, isEditMode, isViewMode, configIdToEdit, isAdminEditModel, modelId, fromAdmin]);

  useEffect(() => {
    if (!router.isReady) return;
    if (id) loadModel();
  }, [id, loadModel, router.isReady]);

  // Meuble partagé affiché : ?partage quitte l'adresse. Un rechargement propose alors de reprendre les modifications
  // faites depuis (sauvegarde locale) au lieu de rouvrir le meuble tel qu'il a été partagé.
  useEffect(() => {
    if (!initialConfigApplied || typeof router.query[SHARE_QUERY_PARAM] !== 'string') return;
    const query = { ...router.query };
    delete query[SHARE_QUERY_PARAM];
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  }, [initialConfigApplied, router]);

  const resetConfiguration = useCallback(() => {
    if (!initialConfig) {
      console.warn('⚠️ Aucune configuration initiale disponible');
      return;
    }

    console.log('🔄 Réinitialisation à la configuration par défaut...');

    setWidth(initialConfig.width);
    setHeight(initialConfig.height);
    setDepth(initialConfig.depth);
    setSocle(initialConfig.socle);
    setRootZone(normalizeZoneSplitRatios(JSON.parse(JSON.stringify(initialConfig.rootZone))));
    setFinish(initialConfig.finish);
    setDoorType(initialConfig.doorType || 'none');
    setDoorSide(initialConfig.doorSide || 'left');
    setSelectedZoneIds(['root']);
    setDeletedPanelIds(new Set());
    setSelectedPanelIds(new Set());

    try {
      localStorage.removeItem(localStorageKey);
      console.log('✅ Configuration réinitialisée et sauvegarde supprimée');
    } catch (e) {
      console.warn('❌ Erreur lors de la suppression de localStorage', e);
    }
  }, [initialConfig, localStorageKey]);

  const applyPendingRestore = () => {
    if (!pendingRestoreConfig) return;
    const c = pendingRestoreConfig;
    console.log('🔄 Application de la configuration restaurée depuis localStorage:', c);
    
    setSkipNextAutoGenerate(false); 
    setInitialConfigApplied(false);

    if (c.width) setWidth(c.width);
    if (c.height) setHeight(c.height);
    if (c.depth) setDepth(c.depth);
    if (c.socle) setSocle(c.socle);
    if (c.rootZone) {
      console.log('📦 Restauration de la zone racine:', c.rootZone);
      setRootZone(normalizeZoneSplitRatios(JSON.parse(JSON.stringify(c.rootZone))));
    }
    if (c.finish) setFinish(c.finish);
    if (c.color) setColor(c.color);
    if (c.colorLabel) setColorLabel(c.colorLabel);
    if (c.colorImage !== undefined) setSelectedColorImage(c.colorImage);
    if (c.selectedColorId !== undefined) setSelectedColorId(c.selectedColorId);
    if (c.useMultiColor !== undefined) setUseMultiColor(c.useMultiColor);
    if (c.componentColors) setComponentColors(JSON.parse(JSON.stringify(c.componentColors)));
    if (c.doorType) setDoorType(c.doorType);
    if (c.doorSide) setDoorSide(c.doorSide);
    if (c.mountingStyle) setMountingStyle(c.mountingStyle);
    if (c.doorsOpen !== undefined) setDoorsOpen(c.doorsOpen);
    if (c.showDecorations !== undefined) setShowDecorations(c.showDecorations);
    if (c.deletedPanelIds) setDeletedPanelIds(new Set(c.deletedPanelIds));
    
    setTimeout(() => {
      setInitialConfigApplied(true);
      setShowRestoreDialog(false);
      setPendingRestoreDialog(null);
      toast.success('Configuration restaurée');
    }, 100);
  };

  const discardPendingRestore = () => {
    localStorage.removeItem(localStorageKey);
    setShowRestoreDialog(false);
    setPendingRestoreDialog(null);
    setInitialConfigApplied(true);
  };

  const buildPromptFromZoneTree = useCallback((zone: Zone, currentPath: string = ''): string => {
    let doorCode = '';
    const currentDoor = zone.doorContent || (zone.type === 'leaf' ? zone.content : null);

    if (currentDoor) {
      switch (currentDoor) {
        case 'door': doorCode = zone.id === 'root' ? '' : 'Pg'; break;
        case 'door_right': doorCode = 'Pd'; break;
        case 'door_double': doorCode = 'P2'; break;
        // Le format n'a pas de côté pour les portes vitrées et Push : la porte est transmise sans son sens d'ouverture
        case 'mirror_door':
        case 'mirror_door_right': doorCode = 'Pm'; break;
        case 'push_door':
        case 'push_door_right': doorCode = 'Po'; break;
      }
      
      if (doorCode && ['door', 'door_right', 'door_double', 'mirror_door', 'mirror_door_right'].includes(currentDoor)) {
        const hCode = zone.handleType ? HANDLE_TYPE_CODE[zone.handleType] : '';
        if (hCode) doorCode += hCode;
      }
    }

    if (zone.type === 'leaf') {
      let leafChar = '';
      switch (zone.content) {
        case 'drawer': leafChar = 'T'; break;
        case 'push_drawer': leafChar = 'To'; break;
        case 'dressing': leafChar = 'D'; break;
        case 'glass_shelf':
          const shelfCount = zone.glassShelfCount || 1;
          leafChar = shelfCount > 1 ? `v${shelfCount}` : 'v';
          break;
        case 'shelf': leafChar = ''; break;
        default: leafChar = '';
      }

      if (zone.content === 'drawer') {
        const hCode = zone.handleType ? HANDLE_TYPE_CODE[zone.handleType] : '';
        if (hCode) leafChar += hCode;
      }

      let finalLeaf = leafChar;
      if (doorCode) {
        finalLeaf = doorCode + leafChar;
      }

      if (zone.hasCableHole) {
        finalLeaf += 'c';
      }
      if (zone.hasDressing && zone.content !== 'dressing') {
        finalLeaf += 'D';
      }
      return finalLeaf;
    }

    const isHorizontal = zone.type === 'horizontal';
    const children = zone.children || [];
    const childCount = children.length;

    const orderedChildren = isHorizontal ? [...children].reverse() : children;
    const childPrompts = orderedChildren.map((c, i) => {
        const childIdx = isHorizontal ? (childCount - 1 - i) : i;
        const nextPath = isHorizontal ? `${currentPath}r${childIdx}-` : `${currentPath}c${childIdx}-`;
        return buildPromptFromZoneTree(c, nextPath);
    });

    let prefix = isHorizontal ? 'H' : 'V';
    
    const allChildrenAreDrawers = childCount >= 2 && children.every(c => c.content === 'drawer' || c.content === 'push_drawer');
    
    if (isHorizontal && allChildrenAreDrawers) {
        prefix += 'I';
    } else if (childCount === 2) {
        const sepId = isHorizontal ? `separator-h-${currentPath}h0-0` : `separator-v-${currentPath}v0-0`;
        if (deletedPanelIds.has(sepId)) {
            prefix += 'I';
        }
    } else if (childCount > 2) {
        let allDeleted = true;
        for (let i = 0; i < childCount - 1; i++) {
            const sepId = isHorizontal ? `separator-h-${currentPath}h${i}-0` : `separator-v-${currentPath}v${i}-0`;
            if (!deletedPanelIds.has(sepId)) {
                allDeleted = false;
                break;
            }
        }
        if (allDeleted) {
            prefix += 'I';
        }
    }

    let zoneCode = '';

    if (zone.splitRatio !== undefined && childCount === 2) {
      const r1 = Math.round(zone.splitRatio);
      const r2 = 100 - r1;
      const ratios = isHorizontal ? [r2, r1] : [r1, r2];
      zoneCode = `${prefix}[${ratios[0]},${ratios[1]}](${childPrompts.join(',')})`;
    } else if (zone.splitRatios && zone.splitRatios.length === childCount && childCount > 2) {
      const ratios = isHorizontal ? [...zone.splitRatios].reverse() : zone.splitRatios;
      const ratiosStr = ratios.map(r => Math.round(r)).join(',');
      zoneCode = `${prefix}[${ratiosStr}](${childPrompts.join(',')})`;
    } else {
      zoneCode = `${prefix}${childCount}(${childPrompts.join(',')})`;
    }

    if (doorCode) {
      return doorCode + '(' + zoneCode + ')';
    }

    return zoneCode;
  }, [deletedPanelIds]);

  const calculatePrice = useCallback((config: {
    width: number;
    height: number;
    depth: number;
    finish: string;
    socle: string;
    rootZone: Zone;
    doorType?: 'none' | 'single' | 'double';
    selectedSample?: SampleColor | null;
    selectedColorId?: number | null;
    useMultiColor?: boolean;
    componentColors?: ComponentColors;
  }): number => {
    let p = 0;

    const normalizedFinish = config.finish.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '_');
    

    let samplePriceUnie = 0;
    if (config.selectedSample && config.selectedSample.price_per_m2 !== undefined) {
      samplePriceUnie = Number(config.selectedSample.price_per_m2);
    } else if (config.selectedColorId && samplePricesMap[config.selectedColorId] !== undefined) {
      samplePriceUnie = Number(samplePricesMap[config.selectedColorId]);
    }

    console.log(`[PRICING] Calcul en cours: ${config.finish} (${normalizedFinish})`, {
      samplePriceUnie,
      selectedColorId: config.selectedColorId,
      hasSample: !!config.selectedSample,
      useMultiColor: config.useMultiColor
    });

    let samplePriceStructure = 0;
    let samplePriceBack = 0;
    let samplePriceDoors = 0;
    let samplePriceDrawers = 0;

    if (pricingParams?.casing?.full) {
      const w = config.width / 1000;
      const h = config.height / 1000;
      const d = config.depth / 1000;

      const backSurface = w * h;
      const sidesSurface = (d * h) * 2;
      const topBottomSurface = (w * d) * 2;
      const casingSurface = sidesSurface + topBottomSurface;

      const casingCoefficient = Number(pricingParams.casing.full.coefficient) || 1.2;

      if (config.useMultiColor && config.componentColors) {
        const structColorId = config.componentColors.structure.colorId;
        const backColorId = config.componentColors.back.colorId;
        const doorsColorId = config.componentColors.doors?.colorId;
        const drawersColorId = config.componentColors.drawers?.colorId;
        samplePriceStructure = structColorId ? (Number(samplePricesMap[structColorId]) || 0) : 0;
        samplePriceBack = backColorId ? (Number(samplePricesMap[backColorId]) || 0) : 0;
        samplePriceDoors = doorsColorId ? (Number(samplePricesMap[doorsColorId]) || 0) : samplePriceStructure;
        samplePriceDrawers = drawersColorId ? (Number(samplePricesMap[drawersColorId]) || 0) : samplePriceStructure;
      } else {
        samplePriceStructure = samplePriceUnie;
        samplePriceBack = samplePriceUnie;
        samplePriceDoors = samplePriceUnie;
        samplePriceDrawers = samplePriceUnie;
      }

      const priceCasing = samplePriceStructure * casingSurface * casingCoefficient;
      const priceBack = samplePriceBack * backSurface * casingCoefficient;

      p = priceCasing + priceBack;

      console.log('💰 [STRUCTURE] Calcul détaillé:', {
        mode: config.useMultiColor ? 'multi' : 'single',
        surfaceCasing: `${casingSurface.toFixed(3)} m²`,
        surfaceBack: `${backSurface.toFixed(3)} m²`,
        prixM2Structure: `${samplePriceStructure}€/m²`,
        prixM2Back: `${samplePriceBack}€/m²`,
        coefficient: casingCoefficient,
        total: `${p.toFixed(2)}€`
      });
    } else {
      const volumeM3 = (config.width * config.height * config.depth) / 1000000000;
      p = volumeM3 * 1500;
      samplePriceStructure = samplePriceUnie;
      samplePriceBack = samplePriceUnie;
      samplePriceDoors = samplePriceUnie;
      samplePriceDrawers = samplePriceUnie;
      console.log('⚠️ Fallback prix structure (Volume):', p);
    }


    if (pricingParams?.bases) {
      if (config.socle === 'none') {
        const nonePrice = Number(pricingParams.bases.none?.fixed_price) || 0;
        p += nonePrice;
        if (nonePrice > 0) console.log('👞 [SOCLE] Aucun:', nonePrice + '€');
      } else if (config.socle === 'metal') {
        const pricePerFoot = Number(pricingParams.bases.metal?.price_per_foot) || 20;
        const footInterval = Number(pricingParams.bases.metal?.foot_interval) || 2000;
        const totalFeet = Math.ceil(config.width / footInterval) * 2;
        const metalPrice = pricePerFoot * totalFeet;
        p += metalPrice;
        console.log('👞 [SOCLE] Métal:', {
          pieds: totalFeet,
          prixParPied: pricePerFoot,
          total: metalPrice + '€'
        });
      } else if (config.socle === 'wood') {
        const woodParams = pricingParams.bases.wood;
        if (woodParams?.price_per_m3 && woodParams?.height) {
          const h = Number(woodParams.height);
          const volumeM3 = (config.width * config.depth * h) / 1_000_000_000;
          const woodPrice = Number(woodParams.price_per_m3) * volumeM3;

          p += woodPrice;
          console.log('👞 [SOCLE] Bois:', {
            volume: volumeM3.toFixed(4) + ' m³',
            prixM3: woodParams.price_per_m3 + '€/m³',
            total: woodPrice.toFixed(2) + '€'
          });
        } else if (woodParams?.coefficient) {
          const woodPrice = Number(woodParams.coefficient) * config.width * config.depth;
          p += woodPrice;
          console.log('👞 [SOCLE] Bois (Coef):', woodPrice.toFixed(2) + '€');
        } else {
          p += 60;
        }
      }
    } else {
      const soclePrices: Record<string, number> = { none: 0, metal: 40, wood: 60 };
      p += Number(soclePrices[config.socle] || 0);
    }

    const countExtraPrice = (zone: Zone, zoneWidth: number, zoneHeight: number, currentPath: string = ''): number => {
      let extra = 0;

      const isDrawer = (z: Zone) => z.content === 'drawer' || z.content === 'push_drawer';
      const shouldHideHorizontalSeparators = (z: Zone) => {
        return z.type === 'horizontal' && z.children && z.children.length >= 2 && z.children.every(isDrawer);
      };

      const door = zone.doorContent || (zone.type === 'leaf' ? zone.content : null);
      if (door && pricingParams?.doors) {
        const getDoorPrice = (doorType: string, w: number, h: number) => {
          const isDoor = [
            'door', 'door_right', 'door_double', 'mirror_door', 'mirror_door_right', 'glass_door', 'push_door', 'push_door_right'
          ].includes(doorType);

          if (!isDoor) return 0;

          let typeKey = 'simple';
          if (pricingParams.doors[doorType]) {
            typeKey = doorType;
          } else if (doorType === 'door_double') {
            typeKey = 'double';
          } else if (doorType === 'mirror_door' || doorType === 'mirror_door_right' || doorType === 'glass_door') {
            typeKey = 'glass';
          } else if (doorType === 'push_door' || doorType === 'push_door_right') {
            typeKey = 'push';
          } else {
            typeKey = 'simple';
          }

          const doorConfig = pricingParams.doors[typeKey];
          if (!doorConfig) return 0;

          const coefficient = Number(doorConfig.coefficient) || 0.00004;
          const hingeCount = Number(doorConfig.hinge_count) || 2;
          const hingePrice = Number(pricingParams.hinges?.standard?.price_per_unit) || 5;
          const surfaceDoorM2 = (w * h) / 1_000_000;

          const doorPrice = (coefficient * w * h) + (hingePrice * hingeCount) + (samplePriceDoors * surfaceDoorM2);

          console.log(`🚪 [PORTE] Calcul (${doorType} -> ${typeKey}):`, {
            dimensions: `${w.toFixed(0)}x${h.toFixed(0)}mm`,
            surface: `${surfaceDoorM2.toFixed(4)}m²`,
            prixEchantillon: `${samplePriceDoors}€/m²`,
            formule: `(${coefficient} × ${w.toFixed(0)} × ${h.toFixed(0)}) + (${hingePrice} × ${hingeCount}) + (${samplePriceDoors} × ${surfaceDoorM2.toFixed(4)})`,
            total: `${doorPrice.toFixed(2)}€`
          });

          return doorPrice;
        };

        extra += getDoorPrice(door, zoneWidth, zoneHeight);
      } else if (door) {
        switch (door) {
          case 'door':
          case 'door_right': extra += 40; break;
          case 'push_door': extra += 50; break;
          case 'door_double': extra += 80; break;
          case 'mirror_door': extra += 95; break;
        }
      }

      if (door && zone.handleType && pricingParams?.handles) {
        const handleConfig = pricingParams.handles[zone.handleType];
        if (handleConfig) {
          extra += Number(handleConfig.price_per_unit) || 0;
        }
      }

      if (zone.type === 'leaf') {
        if (pricingParams?.drawers && (zone.content === 'drawer' || zone.content === 'push_drawer')) {
          const drawerType = zone.content === 'push_drawer' ? 'push' : 'standard';
          const drawerConfig = pricingParams.drawers[drawerType];
          if (drawerConfig) {
            const basePrice = Number(drawerConfig.base_price) || 35;
            const coefficient = Number(drawerConfig.coefficient) || 0.0001;
            const surfaceFacadeM2 = (zoneWidth * zoneHeight) / 1_000_000;
            const drawerPrice = basePrice + (coefficient * zoneWidth * config.depth) + (samplePriceDrawers * surfaceFacadeM2);
            extra += drawerPrice;

            console.log(`📥 [TIROIR] Calcul détaillé (${drawerType}):`, {
              dimensions: `${zoneWidth.toFixed(0)}x${config.depth.toFixed(0)}mm`,
              facade: `${zoneWidth.toFixed(0)}x${zoneHeight.toFixed(0)}mm = ${surfaceFacadeM2.toFixed(4)}m²`,
              prixEchantillon: `${samplePriceDrawers}€/m²`,
              formule: `${basePrice} + (${coefficient} × ${zoneWidth.toFixed(0)} × ${config.depth.toFixed(0)}) + (${samplePriceDrawers} × ${surfaceFacadeM2.toFixed(4)})`,
              total: `${drawerPrice.toFixed(2)}€`
            });
          } else {
            extra += zone.content === 'drawer' ? 35 : 45;
          }
        } else if (zone.content === 'glass_shelf' && pricingParams?.shelves?.glass) {
          const pricePerM2 = Number(pricingParams.shelves.glass.price_per_m2) || 250;
          const shelfSurfaceM2 = (zoneWidth * config.depth) / 1000000;
          const shelfCount = zone.glassShelfCount || 1;
          const shelfPrice = pricePerM2 * shelfSurfaceM2 * shelfCount;

          console.log('💎 [ETAGERE VERRE] Calcul détaillée:', {
            dimensions: `${zoneWidth.toFixed(0)}x${config.depth.toFixed(0)}mm`,
            surface: `${shelfSurfaceM2.toFixed(3)} m²`,
            nombre: shelfCount,
            prixUnitaire: `${(pricePerM2 * shelfSurfaceM2).toFixed(2)}€`,
            total: `${shelfPrice.toFixed(2)}€`
          });

          extra += shelfPrice;
        } else if (zone.content === 'glass_shelf') {
          const shelfCount = zone.glassShelfCount || 1;
          extra += 25 * shelfCount;
        } else if (zone.content === 'dressing') {
          if (pricingParams?.wardrobe?.rod) {
            const pricePerMeter = Number(pricingParams.wardrobe.rod.price_per_linear_meter) || 20;
            const widthInMeters = zoneWidth / 1000;
            extra += pricePerMeter * widthInMeters;
          } else {
            extra += 20;
          }
        }

        if (zone.hasDressing && zone.content !== 'dressing') {
          if (pricingParams?.wardrobe?.rod) {
            const pricePerMeter = Number(pricingParams.wardrobe.rod.price_per_linear_meter) || 20;
            const widthInMeters = zoneWidth / 1000;
            extra += pricePerMeter * widthInMeters;
          } else {
            extra += 20;
          }
        }

        if (zone.hasCableHole) {
          if (pricingParams?.cables?.pass_cable) {
            extra += Number(pricingParams.cables.pass_cable.fixed_price) || 10;
          } else {
            extra += 10;
          }
        }

        if (zone.hasLight) {
          if (pricingParams?.lighting?.led) {
            const pricePerMeter = Number(pricingParams.lighting.led.price_per_linear_meter) || 15;
            const widthInMeters = zoneWidth / 1000;
            extra += pricePerMeter * widthInMeters;
          } else {
            extra += (zoneWidth / 1000) * 15;
          }
        }
      } else if (zone.children) {
        zone.children.forEach((child, index) => {
          let childWidth = zoneWidth;
          let childHeight = zoneHeight;

          let ratio: number;
          if (zone.splitRatios && zone.splitRatios.length === zone.children!.length) {
            ratio = zone.splitRatios[index] / 100;
          } else if (zone.children!.length === 2 && zone.splitRatio !== undefined) {
            ratio = (index === 0 ? zone.splitRatio : 100 - zone.splitRatio) / 100;
          } else {
            ratio = 1 / zone.children!.length;
          }

          let nextPath = currentPath;

          if (zone.type === 'horizontal') {
            childHeight = zoneHeight * ratio;
            const childIdx = zone.children!.length - 1 - index;
            nextPath = `${currentPath}r${childIdx}-`;

            if (index < zone.children!.length - 1) {
              const sepId = `separator-h-${currentPath}h${index}-0`;
              const isAutomaticInvisible = shouldHideHorizontalSeparators(zone);
              const isDeleted = deletedPanelIds.has(sepId);

              if (!isDeleted && !isAutomaticInvisible) {
                const surfaceShelfM2 = (zoneWidth * config.depth) / 1_000_000;
                const pricePerM2 = Number(pricingParams?.shelves?.wood?.price_per_m2) || 80;
                const shelfPrice = pricePerM2 * surfaceShelfM2;
                extra += shelfPrice;
                console.log(`📏 [ETAGERE BOIS] Calcul: ${pricePerM2}€/m² × ${surfaceShelfM2.toFixed(3)}m² = ${shelfPrice.toFixed(2)}€`);
              } else {
                console.log(`📏 [ETAGERE BOIS] Ignorée car ${isDeleted ? 'supprimée' : 'automatiquement invisible (tiroirs)'}`);
              }
            }
          } else if (zone.type === 'vertical') {
            childWidth = zoneWidth * ratio;
            nextPath = `${currentPath}c${index}-`;

            if (index < zone.children!.length - 1) {
              const sepId = `separator-v-${currentPath}v${index}-0`;
              if (!deletedPanelIds.has(sepId)) {
                const surfaceVerticalM2 = (zoneHeight * config.depth) / 1_000_000;
                const pricePerM2 = Number(pricingParams?.shelves?.wood?.price_per_m2) || 80;
                const verticalPrice = pricePerM2 * surfaceVerticalM2;
                extra += verticalPrice;
                console.log(`📏 [MONTANT VERTICAL] Calcul: ${pricePerM2}€/m² × ${surfaceVerticalM2.toFixed(3)}m² = ${verticalPrice.toFixed(2)}€`);
              } else {
                console.log(`📏 [MONTANT VERTICAL] Ignoré car supprimé`);
              }
            }
          }

          extra += countExtraPrice(child, childWidth, childHeight, nextPath);
        });
      }

      return extra;
    };
    p += countExtraPrice(config.rootZone, config.width, config.height);

    if (pricingParams?.doors && config.doorType && config.doorType !== 'none') {
      const doorTypeKey = config.doorType === 'double' ? 'double' : 'simple';
      const doorConfig = pricingParams.doors[doorTypeKey];
      if (doorConfig) {
        const coefficient = Number(doorConfig.coefficient) || 0.00004;
        const hingeCount = Number(doorConfig.hinge_count) || 2;
        const hingePrice = Number(pricingParams.hinges?.standard?.price_per_unit) || 5;
        const surfaceGlobalDoorM2 = (config.width * config.height) / 1_000_000;

        let globalDoorSamplePrice = samplePriceUnie;
        if (config.useMultiColor && config.componentColors?.doors?.colorId) {
          globalDoorSamplePrice = Number(samplePricesMap[config.componentColors.doors.colorId]) || samplePriceUnie;
        }

        const globalDoorPrice = (coefficient * config.width * config.height) + (hingePrice * hingeCount) + (globalDoorSamplePrice * surfaceGlobalDoorM2);
        p += globalDoorPrice;
        console.log(`🚪 Prix porte globale (${config.doorType}):`, {
          dimensions: `${config.width}x${config.height}mm`,
          surface: `${surfaceGlobalDoorM2.toFixed(4)}m²`,
          prixEchantillon: `${globalDoorSamplePrice}€/m²`,
          formule: `(${coefficient} × ${config.width} × ${config.height}) + (${hingePrice} × ${hingeCount}) + (${globalDoorSamplePrice} × ${surfaceGlobalDoorM2.toFixed(4)})`,
          total: `${globalDoorPrice.toFixed(2)}€`
        });
      } else {
        const fallbackPrice = config.doorType === 'single' ? 40 : 80;
        p += fallbackPrice;
        console.log(`🚪 Prix porte globale (Fallback ${config.doorType}):`, fallbackPrice + '€');
      }
    }

    if (isNaN(p)) {
      console.warn('⚠️ Le calcul du prix a retourné NaN, retour à 0');
      p = 0;
    }

    console.log('💰 PRIX TOTAL CALCULÉ:', Math.round(p) + '€');
    return Math.round(p);
  }, [pricingParams, samplePricesMap]);

  const generateModel = useCallback(async (prompt: string) => {
    setGenerating(true);
    try {
      let singleColor: string | undefined;
      let furnitureColors: FurnitureColors | undefined;

      if (useMultiColor) {
        furnitureColors = {
          structure: componentColors.structure.hex || DEFAULT_COLOR_HEX,
          drawers: componentColors.drawers.hex || DEFAULT_COLOR_HEX,
          doors: componentColors.doors.hex || DEFAULT_COLOR_HEX,
          base: componentColors.base.hex || DEFAULT_COLOR_HEX,
          shelves: componentColors.shelves.hex || DEFAULT_COLOR_HEX,
          back: componentColors.back.hex || DEFAULT_COLOR_HEX,
        };
      } else {
        singleColor = selectedColorOption?.hex || undefined;
      }

      const excludeDoors = !doorsOpenRef.current || doorType === 'none';

      const deletedPanelsArray = Array.from(deletedPanelIds);

      const zonesForSegmentation = deletedPanelsArray.length > 0 ? rootZone : undefined;

      const result = await apiClient.generate.generate(
        prompt,
        excludeDoors,
        singleColor,
        furnitureColors,
        deletedPanelsArray.length > 0 ? deletedPanelsArray : undefined,
        zonesForSegmentation
      );

      let glbUrlAbsolute = result.glb_url;
      setGlbUrl(glbUrlAbsolute);
      setDxfUrl(result.dxf_url || null);
    } catch (error) {
      console.warn('Génération 3D impossible :', error instanceof Error ? error.message : error);
    } finally {
      setGenerating(false);
    }
  }, [selectedColorOption, useMultiColor, componentColors, doorType, deletedPanelIds, rootZone]);

  useEffect(() => {
    if (!templatePrompt || !initialConfigApplied) return;
    if (skipNextAutoGenerate) {
      setSkipNextAutoGenerate(false);
      return;
    }

    const regex = /^(M[1-5])\(([^)]+)\)(.*)$/;
    const match = templatePrompt.match(regex);
    if (!match) return;

    const meubleType = match[1];
    let prompt = `${meubleType}(${width},${depth},${height})`;

    const rest = match[3] || '';
    const flagsMatch = rest.match(/^([^HV\[]*)/);
    const originalFlags = flagsMatch ? flagsMatch[1] : '';
    let flags = originalFlags.replace(/[PTD]/g, '');
    
    flags = flags.replace(/S2?/g, '');
    if (socle === 'metal') flags += 'S';
    else if (socle === 'wood') flags += 'S2';

    if (!hasZoneSpecificDoors) {
      if (doorType === 'double') flags += 'P2';
      else if (doorType === 'single') flags += doorSide === 'left' ? 'Pg' : 'Pd';
    }
    
    prompt += flags;

    const zonePrompt = buildPromptFromZoneTree(rootZone);
    if (zonePrompt && zonePrompt.trim()) {
      prompt += zonePrompt;
    }

    console.log('🚀 Génération du modèle avec le prompt:', prompt);

    setPrice(calculatePrice({ 
      width, height, depth, finish, socle, rootZone, doorType, 
      selectedSample: selectedColorOption,
      selectedColorId,
      useMultiColor,
      componentColors
    }));

    if (hasZoneIssues) return;

    const timer = setTimeout(() => generateModel(prompt), 300);
    return () => clearTimeout(timer);
  }, [templatePrompt, width, height, depth, socle, finish, rootZone, initialConfigApplied, skipNextAutoGenerate, buildPromptFromZoneTree, calculatePrice, generateModel, useMultiColor, componentColors, doorType, doorSide, selectedColorOption, selectedColorId, hasZoneIssues]);

  const handleToggleDoors = useCallback(() => {
    setDoorsOpen(prev => !prev);
  }, []);

  const handleMaterialChange = (key: string) => {
    setFinish(key);
    setSelectedColorId(null);
    setSelectedColorImage(null);

    // Les couleurs appartiennent à une matière : celles choisies pour l'ancienne ne sont plus valables
    const hasZoneColors = (zone: Zone): boolean => !!zone.zoneColor || !!zone.children?.some(hasZoneColors);
    const clearZoneColors = (zone: Zone): Zone => {
      const { zoneColor: _removed, ...rest } = zone;
      return rest.children ? { ...rest, children: rest.children.map(clearZoneColors) } : rest;
    };
    const resetZoneColors = hasZoneColors(rootZone);

    if (useMultiColor || resetZoneColors) {
      if (useMultiColor) setUseMultiColor(false);
      if (resetZoneColors) setRootZone(clearZoneColors(rootZone));
      toast('Couleurs réinitialisées : choisissez-les dans la nouvelle matière.');
    }
  };

  const applySingleColor = (option: SampleColor) => {
    setSelectedColorId(option.id);
    setColor(option.hex || DEFAULT_COLOR_HEX);
    setColorLabel(option.name || selectedMaterialLabel);
    setSelectedColorImage(option.image_url || null);
  };

  // Couleur d'une partie du meuble : les autres parties gardent la leur
  const handleComponentColorChange = (component: ColorComponent, option: SampleColor) => {
    const entry = { colorId: option.id, hex: option.hex || DEFAULT_COLOR_HEX, imageUrl: option.image_url || null };
    setUseMultiColor(true);
    setComponentColors({ ...displayedComponentColors, [component]: entry });
    // La structure donne la couleur principale (récapitulatif, enregistrement)
    if (component === 'structure') applySingleColor(option);
  };

  // Une seule couleur pour tout le meuble
  const handleApplyColorToAll = (option: SampleColor) => {
    applySingleColor(option);
    setUseMultiColor(false);
  };

  const saveAsModel = async () => {
    if (hasZoneIssues) {
      toast.error(`Ce meuble dépasse une limite de fabrication : ${constraintIssues[0].message}`);
      focusZoneIssue();
      return;
    }

    console.log('🔵 FONCTION saveAsModel APPELEE !');
    console.log('🔵 isAdmin:', isAdmin);
    console.log('🔵 isAdminCreateModel:', isAdminCreateModel);
    console.log('🔵 isAdminEditModel:', isAdminEditModel);
    console.log('🔵 modelForm:', modelForm);

    if (!isAdminCreateModel && !isAdminEditModel) {
      toast.error("Vous devez être en mode administration pour effectuer cette action.");
      return;
    }

    try {
      setIsSavingModel(true);
      console.log('--- DEBUT SAUVEGARDE MODELE ---');

      const finalImageUrl = modelForm.imageUrl;
      console.log('URL Image:', finalImageUrl);

      const regex = /^(M[1-5])\(([^)]+)\)(.*)$/;
      const match = templatePrompt?.match(regex);
      const meubleType = match?.[1] || (id as string)?.split('(')[0] || 'M1';

      let fullPrompt = `${meubleType}(${width},${depth},${height})bF`;
      if (socle === 'metal') fullPrompt += 'S';
      else if (socle === 'wood') fullPrompt += 'S2';
      
      const zonePrompt = buildPromptFromZoneTree(rootZone);
      if (zonePrompt) {
        fullPrompt += zonePrompt;
      }
      console.log('Prompt généré:', fullPrompt);

      const currentConfigData = {
        dimensions: { width, depth, height },
        styling: {
          materialKey: selectedMaterialKey,
          materialLabel: selectedMaterialLabel,
          finish,
          color,
          colorLabel,
          colorId: selectedColorId,
          colorImage: selectedColorImage,
          selectedColorId,
          socle,
        },
        features: { doorsOpen, doorType, doorSide, mountingStyle },
        advancedZones: JSON.parse(JSON.stringify(rootZone)),
        useMultiColor,
        componentColors,
      };

      const payload = {
        name: modelForm.name,
        description: modelForm.description,
        prompt: fullPrompt,
        category: modelForm.category,
        price: modelForm.price,
        image_url: finalImageUrl || '/images/accueil image/meubletv.jpg',
        config_data: currentConfigData,
      };
      
      console.log('Payload prêt pour envoi:', payload);

      const url = isAdminEditModel ? `/backend/api/models.php?id=${modelId}` : '/backend/api/models.php';
      const method = isAdminEditModel ? 'PUT' : 'POST';

      console.log(`Appel API ${method} ${url}...`);
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      console.log('Réponse API (Status):', response.status);

      if (response.status === 401 || response.status === 403) {
        toast.error("Session admin expirée ou accès refusé (Status: " + response.status + ")");
        throw new Error('Votre session administrateur a expiré. Veuillez vous reconnecter au tableau de bord.');
      }

      if (!response.ok) {
        let errorMessage = 'Erreur lors de la création du modèle';
        try {
          const errData = await response.json();
          errorMessage = errData.error || errorMessage;
          console.error('API Error Data:', errData);
        } catch (e) {
          console.error('Failed to parse error response', e);
          const text = await response.text();
          console.error('API Raw response:', text);
          errorMessage += " (Status: " + response.status + ")";
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Résultat final API:', result);

      toast.success(isAdminEditModel ? 'Le modèle a été mis à jour avec succès !' : 'Le modèle a été ajouté au catalogue avec succès !');
      setIsCreateModelDialogOpen(false);
      setShowModelCreatedModal(true);
      console.log('--- FIN SAUVEGARDE MODELE (SUCCES) ---');
      
    } catch (err: any) {
      console.error('CRITICAL ERROR saveAsModel:', err);
      toast.error(err.message || 'Erreur lors de l\'enregistrement du modèle');
    } finally {
      setIsSavingModel(false);
    }
  };

  // Meuble hors limites de fabrication : on le signale et on montre la zone en cause
  const reportZoneIssues = () => {
    if (!hasZoneIssues) return false;
    toast.error(`Ce meuble dépasse une limite de fabrication : ${constraintIssues[0].message}`);
    focusZoneIssue();
    return true;
  };

  // Le meuble affiché dans le format enregistré en base, et son code de fabrication : ce que gardent « Valider » et le
  // lien de partage
  const buildConfigPayload = () => {
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
        selectedColorId,
        socle,
      },
      features: { doorsOpen, doorType, doorSide, mountingStyle },
      advancedZones: rootZone,
      useMultiColor,
      componentColors,
      deletedPanelIds: Array.from(deletedPanelIds),
    };

    return { fullPrompt, configData };
  };

  // Lien court vers le meuble affiché (bouton Partager, demande de projet). Le backend rend le même code pour un
  // meuble identique : partager deux fois de suite ne crée pas deux liens.
  const shareCurrentConfiguration = async () => {
    const { fullPrompt, configData } = buildConfigPayload();
    const code = await createConfigurationShare(String(id), fullPrompt, configData);
    return { code, link: configurationShareUrl(window.location.origin, String(id), code) };
  };

  // Bouton final. Un client envoie sa demande par e-mail, sans compte. L'admin, ou un client qui modifie une
  // configuration déjà enregistrée dans son compte, enregistre comme avant.
  const validateConfiguration = () => {
    if (isAdmin || (isEditMode && editingConfigId)) {
      saveConfiguration();
      return;
    }
    if (reportZoneIssues()) return;
    setShowRequestDialog(true);
  };

  const saveConfiguration = async () => {
    if (reportZoneIssues()) return;

    const isAdminEditingConfig = isEditMode && editingConfigId;

    let configNameInput = editingConfigName;

    if (!isAdminEditingConfig && !(isAdmin && editingConfigId)) {
      const promptedName = prompt('Nom de cette configuration :', editingConfigName || '');
      if (promptedName === null) return;
      if (!promptedName.trim()) {
        setErrorMessage('Veuillez donner un nom à la configuration');
        setShowErrorModal(true);
        return;
      }
      configNameInput = promptedName;
    }

    try {
      const { fullPrompt, configData } = buildConfigPayload();

      const payload = {
        id: editingConfigId ?? undefined,
        name: configNameInput.trim(),
        model_id: model?.id ? Number(model.id) : null,
        prompt: fullPrompt,
        config_data: configData,
        glb_url: glbUrl,
        dxf_url: dxfUrl,
        price,
        thumbnail_url: glbUrl,
        status: isAdmin ? (editingConfiguration?.status || 'en_attente_validation') : 'en_attente_validation',
      };

      const response = await fetch('/backend/api/configurations/save.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const backendError = errorData.error || 'Erreur lors de la sauvegarde';

        if (response.status === 401) {
          if (isAdminEditingConfig) {
            setErrorMessage('Votre session admin a expiré.\n\nVeuillez vous reconnecter au panel admin puis réessayer.');
          } else if (isAdmin) {
            setErrorMessage('Un administrateur ne peut pas créer de configuration.\n\nPour créer une configuration, vous devez :\n1. Vous déconnecter du panel admin\n2. Vous connecter en tant que client\n3. Puis créer votre configuration');
          } else {
            setErrorMessage(backendError);
          }
          setShowErrorModal(true);
        } else {
          setErrorMessage(backendError);
          setShowErrorModal(true);
        }
        throw new Error(backendError);
      }

      const result = await response.json();
      
      localStorage.removeItem(localStorageKey);
      
      setEditingConfigName(configNameInput.trim());

      if (result.configuration) {
        setShowConfirmationModal(true);
      }
    } catch (err: unknown) {
      console.error('Erreur saveConfiguration:', err);
    }
  };

  const handleAdminEdit = useCallback(() => {
    const { mode, ...rest } = router.query;
    router.push({
      pathname: router.pathname,
      query: { ...rest, mode: 'edit' },
    }, undefined, { shallow: true });
  }, [router]);

  const handleOwnerEdit = useCallback(() => {
    const { mode, configId, ...rest } = router.query;
    router.push({
      pathname: router.pathname,
      query: { ...rest, configId, mode: 'edit' },
    }, undefined, { shallow: false });
  }, [router]);

  const isConfigOwner = useMemo(() => {
    if (!customer) return false;

    if (isViewMode && configIdToEdit && isAuthenticated) {
      return true;
    }

    if (!editingConfiguration) return false;
    const configUserId = editingConfiguration.user_id || editingConfiguration.customer_id;
    return configUserId && String(configUserId) === String(customer.id);
  }, [customer, editingConfiguration, isViewMode, configIdToEdit, isAuthenticated]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-am-paper">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin border-2 border-am-navy border-t-transparent" style={{ borderRadius: '50%' }} />
          <p className="mt-4 text-sm text-black/65">Chargement de la configuration...</p>
        </div>
      </div>
    );
  }

  const modelCategories = availableCategories.length > 0 
    ? availableCategories.map(cat => ({ id: cat.slug, label: cat.name }))
    : [
        { id: "dressing", label: "Dressings" },
        { id: "bibliotheque", label: "Bibliothèques" },
        { id: "buffet", label: "Buffets" },
        { id: "bureau", label: "Bureaux" },
        { id: "meuble-tv", label: "Meubles TV" },
        { id: "sous-escalier", label: "Sous-escaliers" },
        { id: "tete-de-lit", label: "Têtes de lit" },
      ];

  if (!model) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-am-paper p-6 text-center">
        <IconInfoCircle className="h-12 w-12 text-am-navy mb-4" />
        <h1 className="text-2xl text-black mb-2">Configuration introuvable</h1>
        <p className="text-black/65 max-w-md mb-8">
          Désolé, nous ne parvenons pas à charger cette configuration. Elle n&apos;existe peut-être plus ou le lien est incorrect.
        </p>
        <button 
          onClick={() => router.push('/')}
          className="bg-am-navy text-white px-8 py-3 text-sm font-medium hover:bg-am-navy/90 transition-colors"
          style={{ borderRadius: '2px' }}
        >
          Retour à l&apos;accueil
        </button>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-am-paper">
        <div className="text-center">
          <h1 className="text-2xl text-black">Modèle non trouvé</h1>
          <button
            onClick={() => router.push('/')}
            className="mt-6 bg-am-navy px-6 py-3 text-sm font-medium text-white"
            style={{ borderRadius: '2px' }}
          >
            Retour à l&apos;accueil
          </button>
        </div>
      </div>
    );
  }

  // Réglages communs à tous les panneaux de zone (Division, Portes, Finitions)
  const zoneEditorProps = {
    rootZone,
    selectedZoneIds,
    onRootZoneChange: setRootZone,
    onSelectedZoneIdsChange: setSelectedZoneIds,
    onToggleLight: toggleZoneLight,
    onToggleCableHole: toggleZoneCableHole,
    onToggleDressing: toggleZoneDressing,
    onGroupZones: groupZones,
    onSetZoneContent: setZoneContent,
    onSetDoorContent: setZoneDoorContent,
    onSetHandleType: setZoneHandleType,
    onDeleteSection: deleteSection,
    width,
    height,
    depth,
    onSelectZone: handleZoneClick,
    isAdminCreateModel,
    hideCanvas: true,
  };

  return (
    <>
      <Head>
        <title>Configurateur - {model.name} | ArchiMeuble</title>
      </Head>
      <Toaster position="top-center" />

      <Dialog open={isCreateModelDialogOpen} onOpenChange={setIsCreateModelDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isAdminEditModel ? 'Mettre à jour le modèle' : 'Enregistrer comme modèle de catalogue'}
            </DialogTitle>
            <DialogDescription>
              {isAdminEditModel 
                ? 'Les modifications seront appliquées à ce modèle dans le catalogue.'
                : 'Ce meuble sera ajouté à la liste des modèles disponibles pour tous les clients.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom du modèle</Label>
              <Input
                id="name"
                value={modelForm.name}
                onChange={(e) => {
                  console.log('🟢 Changement du nom du modèle:', e.target.value);
                  setModelForm({ ...modelForm, name: e.target.value });
                }}
                placeholder="Ex: Dressing Élégance"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select 
                value={modelForm.category} 
                onValueChange={(value) => setModelForm({ ...modelForm, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Choisir une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {modelCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Prix calculé (€)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="price"
                  type="number"
                  value={modelForm.price}
                  readOnly
                  className="bg-am-mist/15 font-semibold"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Auto-calculé
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Ce prix est calculé automatiquement selon les dimensions et options choisies.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="image">Photo du modèle</Label>
              <div className="flex flex-col gap-3">
                {modelForm.imageUrl && (
                  <div className="relative aspect-video w-full overflow-hidden rounded-md border">
                    <img 
                      src={modelForm.imageUrl} 
                      alt="Aperçu" 
                      className="h-full w-full object-cover"
                    />
                    <button 
                      onClick={() => setModelForm({ ...modelForm, imageUrl: '' })}
                      className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                    >
                      <IconTablerX className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="cursor-pointer"
                  />
                  {isUploading && <IconRefresh className="h-4 w-4 animate-spin text-am-navy" />}
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Format JPG, PNG ou WEBP. Max 20Mo.
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={modelForm.description}
                onChange={(e) => setModelForm({ ...modelForm, description: e.target.value })}
                placeholder="Description du meuble..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModelDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={() => {
                console.log('🟡 CLICK SUR BOUTON DIALOG - modelForm.name:', modelForm.name);
                console.log('🟡 Bouton désactivé?', !modelForm.name);
                saveAsModel();
              }}
              disabled={!modelForm.name}
              className="bg-am-navy text-white"
            >
              {isAdminEditModel ? 'Mettre à jour' : 'Enregistrer le modèle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex min-h-screen flex-col bg-am-paper lg:h-screen lg:overflow-hidden">
        <header className="flex-shrink-0 border-b border-black/10 bg-am-paper">
          <div className="mx-auto flex h-14 items-center justify-between px-4 lg:h-16 lg:max-w-screen-2xl lg:px-6">
            <div className="flex items-center gap-3 lg:gap-4">
              <Link
                href="/models"
                className="flex h-9 w-9 items-center justify-center border border-black/10 text-black/65 transition-colors hover:border-am-navy hover:text-black lg:h-10 lg:w-10"
                style={{ borderRadius: '2px' }}
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base text-black lg:text-lg">{model.name}</h1>
                  {isViewMode && isAdmin && (
                    <span className="bg-blue-100 text-blue-700 eyebrow px-2 py-0.5 rounded font-medium">Vue Admin</span>
                  )}
                  {isViewMode && !isAdmin && isConfigOwner && (
                    <span className="bg-emerald-100 text-emerald-700 eyebrow px-2 py-0.5 rounded font-medium">Ma configuration</span>
                  )}
                  {isEditMode && editingConfigId && isAdmin && (
                    <span className="bg-orange-100 text-orange-700 eyebrow px-2 py-0.5 rounded font-medium">Édition Admin</span>
                  )}
                  {isEditMode && editingConfigId && !isAdmin && isConfigOwner && (
                    <span className="bg-amber-100 text-amber-700 eyebrow px-2 py-0.5 rounded font-medium">Modification</span>
                  )}
                  {editingConfigName && (isEditMode || isViewMode) && (
                    <span className="text-[11px] text-black/65 font-medium">&quot;{editingConfigName}&quot;</span>
                  )}
                </div>
                <p className="hidden text-xs text-black/65 sm:block">
                  {isViewMode
                    ? (isAdmin ? 'Consultation de la configuration client' : 'Aperçu de votre configuration')
                    : (isEditMode && editingConfigId
                        ? (isAdmin ? 'Modification de la configuration client' : 'Modifier votre configuration')
                        : 'Configurateur sur mesure')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isAdminCreateModel && !isAdminEditModel && isAuthenticated && customer && (
                <span className="hidden text-xs text-black/65 md:block">
                  {customer.first_name} {customer.last_name}
                </span>
              )}
              {!isAdminCreateModel && !isAdminEditModel && (
                <ShareButton
                  getLink={async () => (await shareCurrentConfiguration()).link}
                  disabled={!initialConfigApplied}
                />
              )}
              <Link
                href="/"
                className="text-base font-semibold tracking-[-0.05em] text-black lg:text-lg"
              >
                ArchiMeuble
              </Link>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:min-h-0 lg:flex-1 lg:flex-row lg:overflow-hidden">
          <div className="sticky top-0 z-30 flex flex-col bg-am-paper lg:static lg:z-auto lg:flex-1">
            <div className="relative h-[40vh] min-h-[260px] lg:h-auto lg:flex-1">
              <div className="absolute inset-0">
                {!show3DView ? (
                  <div ref={planViewportRef} className="h-full w-full overflow-auto bg-am-paper px-3 pb-3 pt-14 sm:px-8 sm:pb-8 sm:pt-20">
                    <ZoneEditor
                      rootZone={rootZone}
                      selectedZoneIds={selectedZoneIds}
                      onRootZoneChange={setRootZone}
                      onSelectedZoneIdsChange={setSelectedZoneIds}
                      width={width}
                      height={height}
                      onSelectZone={isViewMode ? undefined : handleZoneClick}
                      canvasMaxHeight={isMobile ? 190 : planViewportHeight ? Math.min(720, Math.max(240, planViewportHeight - 230)) : undefined}
                      hideControls
                      deletedPanelIds={deletedPanelIds}
                    />
                  </div>
                ) : (
                  <ThreeViewer
                    width={width}
                    height={height}
                    depth={depth}
                    color={color}
                    imageUrl={selectedColorImage}
                    hasSocle={socle !== 'none'}
                    socle={socle}
                    rootZone={rootZone}
                    selectedZoneIds={highlightedZoneIds}
                    selectionTint={activeStep !== STEP.MATERIALS}
                    neighborZoneIds={neighborZoneIds}
                    onSelectZone={isViewMode ? undefined : handleZoneClick}
                    isBuffet={furnitureStructure?.isBuffet}
                    doorsOpen={doorsOpen}
                    showDecorations={showDecorations}
                    hideFacades={hideFacades}
                    roomScene={roomScene}
                    roomLightsOn={roomLightsOn}
                    onToggleDoors={isViewMode ? undefined : handleToggleDoors}
                    componentColors={componentColors}
                    useMultiColor={useMultiColor}
                    doorType={doorType}
                    doorSide={doorSide}
                    mountingStyle={mountingStyle}
                    selectedPanelIds={isViewMode ? new Set<string>() : selectedPanelIds}
                    onSelectPanel={isViewMode || !wideViewer ? undefined : handlePanelSelect}
                    deletedPanelIds={deletedPanelIds}
                    // Poignées de glissement des planches : à l'étape Division seulement
                    onResizeDivider={!isViewMode && activeStep === STEP.DIVISION ? handleDividerResize : undefined}
                  />
                )}
                <div className="absolute right-3 top-3 z-20 flex overflow-hidden border border-black/10 bg-white shadow-sm lg:right-4 lg:top-4" style={{ borderRadius: '2px' }}>
                  <button
                    type="button"
                    onClick={() => chooseView(false)}
                    aria-pressed={!show3DView}
                    className={`px-3 py-2 text-xs font-medium transition-colors ${
                      !show3DView
                        ? 'bg-am-navy text-white'
                        : 'text-black/65 hover:bg-am-mist/30 hover:text-black'
                    }`}
                  >
                    Plan 2D
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseView(true)}
                    aria-pressed={show3DView}
                    className={`flex items-center gap-1.5 border-l border-black/10 px-3 py-2 text-xs font-medium transition-colors ${
                      show3DView
                        ? 'bg-am-navy text-white'
                        : 'text-black/65 hover:bg-am-mist/30 hover:text-black'
                    }`}
                  >
                    <Box className="h-3.5 w-3.5" />
                    Vue 3D
                  </button>
                </div>
                {/* Mobile : ces commandes du viewer vivaient dans la barre du bas, avec des emoji sans libellé */}
                {!isViewMode && (
                  <div className="absolute left-3 top-3 z-20 flex gap-1 lg:hidden">
                    <button
                      type="button"
                      onClick={undoZone}
                      disabled={!canUndoZone}
                      aria-label="Annuler"
                      className="flex h-10 w-10 items-center justify-center border border-black/10 bg-white text-black shadow-sm disabled:text-black/30"
                      style={{ borderRadius: '2px' }}
                    >
                      <Undo2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={redoZone}
                      disabled={!canRedoZone}
                      aria-label="Rétablir"
                      className="flex h-10 w-10 items-center justify-center border border-black/10 bg-white text-black shadow-sm disabled:text-black/30"
                      style={{ borderRadius: '2px' }}
                    >
                      <Redo2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="absolute right-3 top-14 z-20 flex flex-col gap-2 lg:hidden">
                  {show3DView && (
                    <button
                      type="button"
                      onClick={() => {
                        const index = ROOM_SCENES.findIndex((s) => s.id === roomScene);
                        chooseRoomScene(ROOM_SCENES[(index + 1) % ROOM_SCENES.length].id);
                      }}
                      aria-label={`Pièce : ${ROOM_SCENES.find((s) => s.id === roomScene)?.label} (changer)`}
                      className="flex h-10 w-10 items-center justify-center border border-black/10 bg-white text-black shadow-sm"
                      style={{ borderRadius: '2px' }}
                    >
                      {roomScene === 'living' ? <Sofa className="h-4 w-4" /> : roomScene === 'bedroom' ? <BedDouble className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </button>
                  )}
                  {show3DView && roomScene !== 'neutral' && (
                    <button
                      type="button"
                      onClick={() => setRoomLightsOn(!roomLightsOn)}
                      aria-pressed={roomLightsOn}
                      aria-label={roomLightsOn ? 'Éteindre les lumières' : 'jour / nuit'}
                      className={`flex h-10 w-10 items-center justify-center border shadow-sm ${
                        roomLightsOn ? 'border-am-navy bg-am-navy text-white' : 'border-black/10 bg-white text-black'
                      }`}
                      style={{ borderRadius: '2px' }}
                    >
                      {roomLightsOn ? <Lightbulb className="h-4 w-4" /> : <LightbulbOff className="h-4 w-4" />}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowDecorations(!showDecorations)}
                    aria-pressed={showDecorations}
                    aria-label={showDecorations ? 'Cacher les décorations' : 'Afficher les décorations'}
                    className={`flex h-10 w-10 items-center justify-center border shadow-sm ${
                      showDecorations ? 'border-am-navy bg-am-navy text-white' : 'border-black/10 bg-white text-black'
                    }`}
                    style={{ borderRadius: '2px' }}
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleDoors}
                    aria-pressed={doorsOpen}
                    aria-label={doorsOpen ? 'Fermer les portes' : 'Ouvrir les portes'}
                    className={`flex h-10 w-10 items-center justify-center border shadow-sm ${
                      doorsOpen ? 'border-am-navy bg-am-navy text-white' : 'border-black/10 bg-white text-black'
                    }`}
                    style={{ borderRadius: '2px' }}
                  >
                    {doorsOpen ? <DoorClosed className="h-4 w-4" /> : <DoorOpen className="h-4 w-4" />}
                  </button>
                  {canHideFacades && (
                    <button
                      type="button"
                      onClick={() => setHideFacades(!hideFacades)}
                      aria-pressed={hideFacades}
                      aria-label={hideFacades ? 'Afficher les tiroirs et portes' : 'Cacher les tiroirs et portes'}
                      className={`flex h-10 w-10 items-center justify-center border shadow-sm ${
                        hideFacades ? 'border-am-navy bg-am-navy text-white' : 'border-black/10 bg-white text-black'
                      }`}
                      style={{ borderRadius: '2px' }}
                    >
                      <EyeOff className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {!isViewMode && showQuickMenu && quickMenu && (
                  <ZoneQuickMenu
                    title={quickMenu.title}
                    size={quickMenu.size}
                    onPrev={quickMenu.neighbours ? () => selectZoneFromMenu(quickMenu.neighbours!.prev) : undefined}
                    onNext={quickMenu.neighbours ? () => selectZoneFromMenu(quickMenu.neighbours!.next) : undefined}
                    onParent={quickMenu.parentId ? () => selectZoneFromMenu(quickMenu.parentId!) : undefined}
                    onDelete={quickMenu.canDelete ? () => deleteSection(selectedZoneIds[0]) : undefined}
                    onClose={() => setSelectedZoneIds([])}
                  />
                )}
                {!isViewMode && panelMenu && (
                  <ZoneQuickMenu
                    title={panelMenu.title}
                    subtitle={panelMenu.subtitle}
                    deleteLabel="Supprimer la planche"
                    deleteHint="Retirer cette planche du meuble"
                    onDelete={panelMenu.deleted ? undefined : () => toggleSelectedPanelsDeleted('delete')}
                    onRestore={panelMenu.deleted ? () => toggleSelectedPanelsDeleted('restore') : undefined}
                    onClose={() => setSelectedPanelIds(new Set())}
                  />
                )}
                <div className="absolute bottom-4 right-4 z-20 hidden flex-col gap-2 lg:flex">
                  {show3DView && (
                    <div
                      role="group"
                      aria-label="Pièce"
                      className="flex overflow-hidden border border-black/10 bg-white shadow-sm"
                      style={{ borderRadius: '2px' }}
                    >
                      {ROOM_SCENES.map((scene, index) => (
                        <button
                          key={scene.id}
                          type="button"
                          onClick={() => chooseRoomScene(scene.id)}
                          aria-pressed={roomScene === scene.id}
                          className={`h-10 flex-1 px-3 text-sm font-medium transition-colors ${index > 0 ? 'border-l border-black/10' : ''} ${
                            roomScene === scene.id ? 'bg-am-navy text-white' : 'text-black/65 hover:bg-am-mist/30 hover:text-black'
                          }`}
                        >
                          {scene.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {show3DView && roomScene !== 'neutral' && (
                    <button
                      type="button"
                      onClick={() => setRoomLightsOn(!roomLightsOn)}
                      aria-pressed={roomLightsOn}
                      className={`flex h-10 items-center gap-2 border px-4 text-sm font-medium shadow-sm transition-all ${
                        roomLightsOn
                          ? 'border-am-navy bg-am-navy text-white'
                          : 'border-black/10 bg-white text-black/65 hover:border-am-navy hover:text-black'
                      }`}
                      style={{ borderRadius: '2px' }}
                      title={roomLightsOn ? 'Revenir à la lumière du jour' : 'Allumer les lampes de la pièce (ambiance du soir)'}
                    >
                      <Lightbulb className={`h-4 w-4 ${roomLightsOn ? 'text-yellow-400' : ''}`} />
                      <span>{roomLightsOn ? 'Éteindre les lumières' : 'Allumer les lumières'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowDecorations(!showDecorations)}
                    className={`flex h-10 items-center gap-2 border px-4 text-sm font-medium shadow-sm transition-all ${
                      showDecorations
                        ? 'border-am-navy bg-am-navy text-white'
                        : 'border-black/10 bg-white text-black/65 hover:border-am-navy hover:text-black'
                    }`}
                    style={{ borderRadius: '2px' }}
                    title={showDecorations ? "Cacher les décorations" : "Afficher les décorations"}
                  >
                    <Sparkles className={`h-4 w-4 ${showDecorations ? 'text-yellow-400' : ''}`} />
                    <span>Décorations</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleDoors}
                    className={`flex h-10 items-center gap-2 border px-4 text-sm font-medium shadow-sm transition-all ${
                      doorsOpen
                        ? 'border-am-navy bg-am-navy text-white'
                        : 'border-black/10 bg-white text-black/65 hover:border-am-navy hover:text-black'
                    }`}
                    style={{ borderRadius: '2px' }}
                  >
                    <Box className="h-4 w-4" />
                    <span>{doorsOpen ? 'Fermer les portes' : 'Ouvrir les portes'}</span>
                  </button>

                  {canHideFacades && (
                    <button
                      type="button"
                      onClick={() => setHideFacades(!hideFacades)}
                      aria-pressed={hideFacades}
                      className={`flex h-10 items-center gap-2 border px-4 text-sm font-medium shadow-sm transition-all ${
                        hideFacades
                          ? 'border-am-navy bg-am-navy text-white'
                          : 'border-black/10 bg-white text-black/65 hover:border-am-navy hover:text-black'
                      }`}
                      style={{ borderRadius: '2px' }}
                      title="Masquer les tiroirs et les portes pour mieux voir les séparations"
                    >
                      <EyeOff className="h-4 w-4" />
                      <span>{hideFacades ? 'Afficher les tiroirs et portes' : 'Cacher les tiroirs et portes'}</span>
                    </button>
                  )}
                </div>

                {!isViewMode && (
                  <div className="absolute top-4 left-4 z-20 hidden flex-row gap-2 lg:flex">
                    <button
                      type="button"
                      onClick={undoZone}
                      disabled={!canUndoZone}
                      className={`flex h-10 w-10 items-center justify-center border shadow-sm transition-all ${
                        canUndoZone
                          ? 'border-black/10 bg-white text-black/65 hover:border-am-navy hover:text-black'
                          : 'border-black/10 bg-am-mist/15 text-black/30 cursor-not-allowed'
                      }`}
                      style={{ borderRadius: '2px' }}
                      title="Annuler (Ctrl+Z)"
                    >
                      <Undo2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={redoZone}
                      disabled={!canRedoZone}
                      className={`flex h-10 w-10 items-center justify-center border shadow-sm transition-all ${
                        canRedoZone
                          ? 'border-black/10 bg-white text-black/65 hover:border-am-navy hover:text-black'
                          : 'border-black/10 bg-am-mist/15 text-black/30 cursor-not-allowed'
                      }`}
                      style={{ borderRadius: '2px' }}
                      title="Rétablir (Ctrl+Y)"
                    >
                      <Redo2 className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {generating && (
                  <div
                    role="status"
                    className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 border border-black/10 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-black/65 shadow-sm lg:bottom-4"
                    style={{ borderRadius: '2px' }}
                  >
                    <span className="h-3 w-3 animate-spin border-2 border-am-navy border-t-transparent" style={{ borderRadius: '50%' }} />
                    Mise à jour…
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col border-t border-black/10 bg-am-paper lg:min-h-0 lg:w-[620px] lg:flex-none lg:border-l lg:border-t-0">
            {isViewMode ? (
              <ConfigurationSummary
                width={width}
                height={height}
                depth={depth}
                finish={finish}
                color={color}
                colorLabel={colorLabel}
                socle={socle}
                rootZone={rootZone}
                price={price}
                modelName={model?.name}
                isAdmin={isAdmin}
                onEdit={handleAdminEdit}
                priceDisplaySettings={priceDisplaySettings}
                mountingStyle={mountingStyle}
                isOwner={isConfigOwner}
                onEditOwn={handleOwnerEdit}
              />
            ) : (
              <>
                <div className="flex-shrink-0 border-b border-black/10 px-4 pb-3 pt-4 sm:px-6">
                  <StepNav
                    steps={CONFIG_STEPS}
                    activeStep={activeStep}
                    visited={visitedSteps}
                    onSelect={goToStep}
                  />
                </div>

                <div ref={stepContentRef} className="px-4 pb-24 pt-5 sm:px-6 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-0">
                  <div className="space-y-6 pb-6">
                    {hasZoneIssues && (
                      <div className="flex items-start gap-3 border border-am-wine/30 bg-am-wine/5 px-4 py-3" style={{ borderRadius: '2px' }} role="alert">
                        <IconInfoCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-am-wine" />
                        <div className="min-w-0 flex-1 text-xs leading-relaxed text-am-wine">
                          <p className="font-semibold">Ce meuble ne peut pas être fabriqué tel quel</p>
                          <ul className="mt-1 space-y-0.5">
                            {constraintIssues.slice(0, 3).map((issue, index) => (
                              <li key={`${issue.kind}-${issue.zoneId}-${index}`}>{issue.message}</li>
                            ))}
                            {constraintIssues.length > 3 && <li>Et {constraintIssues.length - 3} autre(s) point(s).</li>}
                          </ul>
                        </div>
                        <button
                          type="button"
                          onClick={focusZoneIssue}
                          className="flex-shrink-0 border border-am-wine px-3 py-1.5 text-[11px] font-medium text-am-wine transition-colors hover:bg-am-wine hover:text-white"
                          style={{ borderRadius: '2px' }}
                        >
                          Corriger
                        </button>
                      </div>
                    )}

                    <StepIntro step={CONFIG_STEPS[activeStep - 1]} total={LAST_STEP} />

                    {activeStep === STEP.DIMENSIONS && (
                      <div className="space-y-4">
                        {initialConfig && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={resetConfiguration}
                              className="flex items-center gap-2 border border-black/10 bg-white px-3 py-2 text-xs font-medium text-black/65 transition-colors hover:border-am-navy hover:text-black"
                              style={{ borderRadius: '2px' }}
                            >
                              <RotateCcw className="h-4 w-4" />
                              Réinitialiser au modèle par défaut
                            </button>
                          </div>
                        )}

                        <DimensionsPanel
                          width={width}
                          depth={depth}
                          height={height}
                          onWidthChange={setWidth}
                          onDepthChange={setDepth}
                          onHeightChange={setHeight}
                        />
                      </div>
                    )}

                    {activeStep === STEP.DIVISION && (
                      <DivisionSteps
                        rootZone={rootZone}
                        selectedZoneIds={selectedZoneIds}
                        width={width}
                        height={height}
                        onRootZoneChange={setRootZone}
                        onSelectedZoneIdsChange={setSelectedZoneIds}
                        openStep={divisionLevel}
                        onOpenStepChange={setDivisionLevel}
                      />
                    )}

                    {activeStep === STEP.DOORS && (
                      <>
                        <StepSection title="Montage des façades" aside="Pour tout le meuble">
                          <MountingStyleSelector value={mountingStyle} onChange={setMountingStyle} />
                        </StepSection>

                        <StepSection title="Portes, tiroirs & poignées" aside="Pour le compartiment sélectionné">
                          {selectedZoneIds.length === 0 ? (
                            <ZoneEmptyState>
                              Cliquez sur un compartiment du meuble pour lui poser une porte ou un tiroir.
                            </ZoneEmptyState>
                          ) : (
                            <ZoneEditor
                              {...zoneEditorProps}
                              hideDimensions
                              controlSections={['facades', 'storage', 'handles']}
                            />
                          )}
                          <p className="text-[11px] leading-relaxed text-black/65">
                            Astuce : maintenez Maj et cliquez sur un compartiment voisin pour poser une seule porte sur l&apos;ensemble.
                          </p>
                        </StepSection>
                      </>
                    )}

                    {activeStep === STEP.MATERIALS && (
                      <>
                        <MaterialSelector
                          materialsMap={materialsMap}
                          selectedMaterialKey={selectedMaterialLabel}
                          onMaterialChange={handleMaterialChange}
                          loading={materialsLoading}
                          componentColors={displayedComponentColors}
                          onComponentColorChange={handleComponentColorChange}
                          onApplyToAll={handleApplyColorToAll}
                          hiddenComponents={[
                            ...(zoneStats.doors === 0 ? (['doors'] as const) : []),
                            ...(zoneStats.drawers === 0 ? (['drawers'] as const) : []),
                          ]}
                        />

                        {isSelectedZoneColorizable && selectedZone ? (
                          <StepSection
                            title={selectedIsNiche ? 'Une niche en particulier' : 'Une porte ou un tiroir en particulier'}
                            aside="Compartiment sélectionné"
                          >
                            <ZoneColorPicker
                              inline
                              zone={selectedZone}
                              materialsMap={materialsMap}
                              selectedMaterialKey={selectedMaterialLabel}
                              defaultColor={
                                selectedIsNiche
                                  ? nicheDefaultColor(displayedComponentColors.back.hex || color)
                                  : selectedFacadeDefault.hex || color
                              }
                              defaultImageUrl={selectedIsNiche ? null : selectedFacadeDefault.imageUrl ?? null}
                              defaultColorName={selectedIsNiche ? null : selectedFacadeDefaultName}
                              onColorChange={setZoneColor}
                              onClose={() => setSelectedZoneIds([])}
                            />
                          </StepSection>
                        ) : (
                          zoneStats.doors + zoneStats.drawers + zoneStats.niches > 0 && (
                            <p className="text-[11px] leading-relaxed text-black/65">
                              Astuce : cliquez sur{' '}
                              {[
                                zoneStats.doors > 0 && 'une porte',
                                zoneStats.drawers > 0 && 'un tiroir',
                                zoneStats.niches > 0 && 'une niche',
                              ]
                                .filter(Boolean)
                                .join(', ')
                                .replace(/, ([^,]*)$/, ' ou $1')}{' '}
                              du meuble pour lui donner une couleur différente.
                            </p>
                          )
                        )}
                      </>
                    )}

                    {activeStep === STEP.FINISHES && (
                      <>
                        <StepSection title="Pieds & socle" aside="Pour tout le meuble">
                          <SocleSelector value={socle} onChange={setSocle} />
                        </StepSection>

                        <StepSection title="Accessoires" aside="Pour le compartiment sélectionné">
                          {selectedZoneIds.length === 0 ? (
                            <ZoneEmptyState>
                              Cliquez sur un compartiment du meuble pour y ajouter un éclairage, une penderie ou un passe-câble.
                            </ZoneEmptyState>
                          ) : (
                            <ZoneEditor
                              {...zoneEditorProps}
                              hideDimensions
                              controlSections={['accessories']}
                            />
                          )}
                        </StepSection>

                        <StepSection title="Récapitulatif">
                          <ConfigRecap
                            width={width}
                            depth={depth}
                            height={height}
                            finish={finish}
                            colorLabel={colorLabel}
                            colorHex={color}
                            colorImage={selectedColorImage}
                            facadeColorLabel={facadeColorLabel}
                            mountingStyle={mountingStyle}
                            socle={socle}
                            stats={zoneStats}
                          />
                        </StepSection>

                        <ArViewSection
                          furniture={arFurniture}
                          configKey={arConfigKey}
                          disabledReason={hasZoneIssues ? "Corrigez d'abord le meuble : il ne peut pas être fabriqué tel quel." : null}
                        />
                      </>
                    )}
                  </div>

                  <div className="-mx-4 flex items-center justify-between gap-3 border-t border-black/10 bg-am-paper px-4 py-3 sm:-mx-6 sm:px-6 sticky bottom-[69px] z-10 lg:bottom-0">
                    <button
                      type="button"
                      onClick={() => goToStep((activeStep - 1) as ConfigStep)}
                      disabled={activeStep === STEP.DIMENSIONS}
                      className="flex items-center gap-1.5 border border-black/10 px-4 py-2.5 text-xs font-medium text-black/65 transition-colors hover:border-am-navy hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ borderRadius: '2px' }}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Retour
                    </button>
                    {/* Dernière étape : le bouton du pied de page (prix + enregistrer) est l'action finale, pas besoin d'un second bouton identique */}
                    {activeStep < LAST_STEP && (
                      <button
                        type="button"
                        onClick={() => goToStep((activeStep + 1) as ConfigStep)}
                        className="flex items-center gap-1.5 bg-am-navy px-5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-am-navy/90"
                        style={{ borderRadius: '2px' }}
                      >
                        Suivant : {CONFIG_STEPS[activeStep].label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="hidden flex-shrink-0 border-t border-black/10 bg-am-paper px-6 py-4 lg:block">
                  <PriceDisplay
                    price={price}
                    onAddToCart={(isAdminCreateModel || isAdminEditModel) ? () => setIsCreateModelDialogOpen(true) : validateConfiguration}
                    isAdmin={isAdmin}
                    isAdminCreateModel={isAdminCreateModel}
                    isAdminEditModel={isAdminEditModel}
                    displayMode={priceDisplaySettings.mode}
                    deviationRange={priceDisplaySettings.range}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {!isViewMode && (
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/10 bg-am-paper px-4 py-3 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-shrink-0">
                <span className="eyebrow text-black/65">Prix</span>
                <div className="text-xl font-medium tracking-[-0.03em] text-black">
                  {priceDisplaySettings.mode === 1 && priceDisplaySettings.range > 0 ? (
                    `${new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(Math.max(0, price - priceDisplaySettings.range))} - ${new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(price + priceDisplaySettings.range)}`
                  ) : (
                    new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'EUR',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }).format(price)
                  )}
                </div>
              </div>
              {(!isAdminCreateModel && !isAdminEditModel) ? (
                <button
                  type="button"
                  onClick={validateConfiguration}
                  className="flex h-11 flex-1 max-w-[240px] items-center justify-center gap-2 bg-am-wine text-sm font-medium text-white transition-colors hover:bg-am-wine/90"
                  style={{ borderRadius: '2px' }}
                >
                  <Box className="h-4 w-4" />
                  <span>
                    {(isEditMode && editingConfigId) ? 'Enregistrer' : (isAdmin ? 'Terminer' : 'Valider')}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreateModelDialogOpen(true)}
                  className="flex h-11 flex-1 max-w-[200px] items-center justify-center gap-2 bg-am-navy text-sm font-medium text-white transition-colors hover:bg-am-navy/90"
                  style={{ borderRadius: '2px' }}
                >
                  <IconPlus className="h-4 w-4" />
                  <span>{isAdminEditModel ? 'Mettre à jour le modèle' : 'Enregistrer le modèle'}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fermer la fenêtre sans choisir laissait le configurateur en attente (initialConfigApplied jamais vrai) : plus aucune
          génération 3D ni sauvegarde. La croix vaut « Ignorer » ; un clic à côté ou Échap ne ferment pas, pour ne pas
          effacer une session par mégarde. */}
      <Dialog open={showRestoreDialog} onOpenChange={(open) => !open && discardPendingRestore()}>
        <DialogContent
          className="bg-white"
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Reprendre votre session ?</DialogTitle>
            <DialogDescription>
              Une configuration non enregistrée a été trouvée pour ce modèle. 
              Voulez-vous la restaurer pour reprendre là où vous en étiez ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={discardPendingRestore}
              className="border-black/10 text-black/65 hover:bg-am-mist/30 hover:text-black"
            >
              Ignorer
            </Button>
            <Button 
              onClick={applyPendingRestore}
              className="bg-am-navy text-white hover:bg-am-navy/90"
            >
              Restaurer ma session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProjectRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        getShare={shareCurrentConfiguration}
        price={price}
      />

      {showModelCreatedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="max-w-md w-full bg-white shadow-2xl" style={{ borderRadius: '4px' }}>
            <div className="p-6 sm:p-8">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-amber-100" style={{ borderRadius: '50%' }}>
                {isAdminEditModel ? <IconEdit className="h-8 w-8 text-amber-600" /> : <IconPlus className="h-8 w-8 text-amber-600" />}
              </div>

              <h2 className="mb-4 text-center text-2xl text-black">
                {isAdminEditModel ? 'Modèle mis à jour !' : 'Modèle créé avec succès !'}
              </h2>
              <p className="mb-6 text-center text-base text-black/65">
                {isAdminEditModel 
                  ? <>Le modèle <span className="font-semibold text-black">&quot;{modelForm.name}&quot;</span> a été mis à jour avec succès dans le catalogue.</>
                  : <>Votre nouveau modèle <span className="font-semibold text-black">&quot;{modelForm.name}&quot;</span> a été ajouté au catalogue et est désormais visible par tous les clients.</>
                }
              </p>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => router.push(adminUrl('/dashboard?section=models'))}
                  className="flex-1 bg-am-navy px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-am-navy/90"
                  style={{ borderRadius: '2px' }}
                >
                  Retour au catalogue
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModelCreatedModal(false);
                      if (!isAdminEditModel) {
                        setModelForm({
                          name: '',
                          description: '',
                          category: 'dressing',
                          price: 890,
                          imageUrl: ''
                        });
                        resetConfiguration();
                      }
                    }}
                    className="border-2 border-black/10 bg-white px-4 py-3 text-sm font-medium text-black transition-colors hover:border-am-navy"
                    style={{ borderRadius: '2px' }}
                  >
                    {isAdminEditModel ? 'Continuer à modifier' : 'Créer un autre'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(adminUrl('/dashboard'))}
                    className="border-2 border-black/10 bg-white px-4 py-3 text-sm font-medium text-black transition-colors hover:border-am-navy"
                    style={{ borderRadius: '2px' }}
                  >
                    Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirmationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="max-w-md w-full bg-white shadow-2xl" style={{ borderRadius: '4px' }}>
            <div className="p-6 sm:p-8">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-green-100" style={{ borderRadius: '50%' }}>
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {(isEditMode && editingConfigId) ? (
                <>
                  <h2 className="mb-4 text-center text-2xl text-black">
                    Configuration mise à jour !
                  </h2>
                  <p className="mb-6 text-center text-base text-black/65">
                    La configuration <span className="font-semibold text-black">&quot;{editingConfigName}&quot;</span> a été modifiée avec succès.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mb-4 text-center text-2xl text-black">
                    Configuration enregistrée !
                  </h2>
                  <p className="mb-6 text-center text-base text-black/65">
                    {customer?.civility === 'M' ? 'Monsieur' : customer?.civility === 'Mme' ? 'Madame' : ''}{' '}
                    <span className="font-semibold text-black">
                      {customer?.last_name}
                    </span>
                    , un menuisier va vous rappeler au plus vite pour valider votre projet et finaliser votre commande.
                  </p>
                </>
              )}

              {!(isEditMode && editingConfigId) && !isAdmin && (
                <div className="mb-6 border-t border-black/10 pt-4">
                  <p className="text-sm text-black/65">
                    <strong className="text-black">Prochaines étapes :</strong>
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-black/65">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5">📞</span>
                      <span>Notre menuisier vous contactera pour valider les détails du projet</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5">💳</span>
                      <span>Un lien de paiement sécurisé vous sera envoyé après validation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5">🚚</span>
                      <span>Votre meuble sera fabriqué sur-mesure et livré chez vous</span>
                    </li>
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                {(isEditMode && editingConfigId) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        router.push(isAdmin ? adminUrl('/dashboard?tab=configurations') : '/account?section=configurations');
                      }}
                      className="flex-1 bg-am-navy px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-am-navy/90"
                      style={{ borderRadius: '2px' }}
                    >
                      Retour aux configurations
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmationModal(false)}
                      className="flex-1 border-2 border-black/10 bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:border-am-navy"
                      style={{ borderRadius: '2px' }}
                    >
                      Continuer à modifier
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        router.push(isAdmin ? adminUrl('/dashboard') : '/account?section=configurations');
                      }}
                      className="flex-1 border-2 border-black/10 bg-white px-6 py-3 text-sm font-medium text-black transition-colors hover:border-am-navy"
                      style={{ borderRadius: '2px' }}
                    >
                      {isAdmin ? 'Retour au Dashboard' : 'Mes configurations'}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/')}
                      className="flex-1 bg-am-navy px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-am-navy/90"
                      style={{ borderRadius: '2px' }}
                    >
                      Retour à l&apos;accueil
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showErrorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="max-w-md w-full bg-white shadow-2xl" style={{ borderRadius: '4px' }}>
            <div className="p-6 sm:p-8">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-red-100" style={{ borderRadius: '50%' }}>
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h2 className="mb-4 text-center text-2xl text-black">
                Erreur
              </h2>
              <div className="mb-6 text-center text-base text-black/65 whitespace-pre-line">
                {errorMessage}
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowErrorModal(false)}
                  className="bg-am-navy px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-am-navy/90"
                  style={{ borderRadius: '2px' }}
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

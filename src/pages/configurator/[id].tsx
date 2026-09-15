import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Link from 'next/link';
import Viewer from '@/components/configurator/Viewer';
import { adminUrl } from '@/lib/adminPath';
import type { ThreeCanvasHandle } from '@/components/configurator/types';

const ThreeViewer = dynamic(() => import('@/components/configurator/ThreeViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#FAFAF9]" style={{ minHeight: '500px' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1A1917] border-t-transparent" />
        <p className="text-sm font-medium text-[#706F6C]">Chargement du studio 3D...</p>
      </div>
    </div>
  ),
});
import DimensionsPanel from '@/components/configurator/DimensionsPanel';
import ActionBar from '@/components/configurator/ActionBar';
import ZoneEditor, { Zone, ZoneContent, ZoneColor, stringToPanelId, PANEL_META, PanelPlanCanvas } from '@/components/configurator/ZoneEditor';
import ZoneColorPicker from '@/components/configurator/ZoneColorPicker';
import SocleSelector from '@/components/configurator/SocleSelector';
import DoorSelector from '@/components/configurator/DoorSelector';
import MaterialSelector, { ComponentColors } from '@/components/configurator/MaterialSelector';
import PriceDisplay from '@/components/configurator/PriceDisplay';
import AuthModal from '@/components/auth/AuthModal';
import { Header } from '@/components/Header';
import { apiClient, type FurnitureModel, type SampleType, type SampleColor, type FurnitureColors } from '@/lib/apiClient';
import { useCustomer } from '@/context/CustomerContext';
import { ChevronLeft, Settings, Palette, Box, Monitor, RotateCcw, Sparkles, Flower2, Download, Undo2, Redo2, Edit3, Trash2 } from 'lucide-react';
import { 
  IconRuler2, 
  IconPalette as IconTablerPalette, 
  IconApps, 
  IconInfoCircle, 
  IconEdit,
  IconTrendingUp,
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
import toast from 'react-hot-toast';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  MATERIAL_LABEL_BY_KEY,
  MATERIAL_PRICE_BY_KEY,
  DEFAULT_COLOR_HEX,
  HANDLE_TYPE_CODE,
  normalizeMaterialKey,
  materialLabelFromKey,
} from '@/lib/configurator/materials';
import { normalizeZoneSplitRatios } from '@/lib/configurator/zoneUtils';
import { ConfigurationSummary } from '@/components/configurator/ConfigurationSummary';

type ConfigTab = 'dimensions' | 'materials';

export default function ConfiguratorPage() {
  const router = useRouter();
  const { id, mode, configId: queryConfigId, adminMode, modelId, fromAdmin } = router.query;
  const { customer, isAuthenticated } = useCustomer();
  const [isAdmin, setIsAdmin] = useState(false);
  const isAdminCreateModel = adminMode === 'createModel';
  const isAdminEditModel = adminMode === 'editModel';
  const isMobile = useIsMobile();
  const [showMobileWarning, setShowMobileWarning] = useState(true);

  const [isCreateModelDialogOpen, setIsCreateModelDialogOpen] = useState(false);
  const [showModelCreatedModal, setShowModelCreatedModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingModel, setIsSavingModel] = useState(false);
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
        console.error('❌ Erreur lors de la vérification admin:', e);
      }
    };
    checkAdmin();
  }, [fromAdmin]);

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
  const [doors, setDoors] = useState(0);
  
  const [selectedPanelIds, setSelectedPanelIds] = useState<Set<string>>(new Set());
  const [deletedPanelIds, setDeletedPanelIds] = useState<Set<string>>(new Set());
  const [showPanelTool, setShowPanelTool] = useState(false);
  const panelToolRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showPanelTool && panelToolRef.current) {
      setTimeout(() => {
        panelToolRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [showPanelTool]);

  const togglePanelDeleted = useCallback((panelId: string) => {
    setDeletedPanelIds(prev => {
      const next = new Set(prev);
      if (next.has(panelId)) {
        next.delete(panelId);
      } else {
        next.add(panelId);
      }
      return next;
    });
  }, []);

  const toggleSelectedPanelsDeleted = useCallback((action: 'delete' | 'restore') => {
    setDeletedPanelIds(prev => {
      const next = new Set(prev);
      selectedPanelIds.forEach(panelId => {
        if (action === 'delete') {
          next.add(panelId);
        } else {
          next.delete(panelId);
        }
      });
      return next;
    });
  }, [selectedPanelIds]);

  const handlePanelSelect = useCallback((panelId: string | null) => {
    if (!panelId) {
      setSelectedPanelIds(new Set());
      return;
    }
    setSelectedPanelIds(prev => {
      const next = new Set(prev);
      if (next.has(panelId)) {
        next.delete(panelId);
      } else {
        next.add(panelId);
      }
      return next;
    });
    setSelectedZoneIds([]);
  }, []);

  const handleZoneSelect = useCallback(
    (zoneId: string | null) => {
      setSelectedPanelIds(new Set());
      
      if (!zoneId) {
        setSelectedZoneIds([]);
        return;
      }

      if (selectedZoneIds.length === 0) {
        setSelectedZoneIds([zoneId]);
        return;
      }

      if (selectedZoneIds.includes(zoneId)) {
        if (zoneId === 'root' && selectedZoneIds.length === 1) return;
        
        setSelectedZoneIds([]);
        return;
      }

      const firstId = selectedZoneIds[0];
      const secondId = zoneId;

      const findZoneWithParent = (current: Zone, targetId: string, parent: Zone | null = null): { zone: Zone; parent: Zone | null } | null => {
        if (current.id === targetId) return { zone: current, parent };
        if (!current.children) return null;
        for (const child of current.children) {
          const result = findZoneWithParent(child, targetId, current);
          if (result) return result;
        }
        return null;
      };

      const firstInfo = findZoneWithParent(rootZone, firstId);
      const secondInfo = findZoneWithParent(rootZone, secondId);

      if (firstInfo && secondInfo && firstInfo.parent === secondInfo.parent && firstInfo.parent !== null) {
        const parent = firstInfo.parent;
        const children = parent.children || [];
        const firstIndex = children.findIndex(c => c.id === firstId);
        const secondIndex = children.findIndex(c => c.id === secondId);

        if (firstIndex !== -1 && secondIndex !== -1) {
          const start = Math.min(firstIndex, secondIndex);
          const end = Math.max(firstIndex, secondIndex);
          const rangeIds = children.slice(start, end + 1).map(c => c.id);
          setSelectedZoneIds(rangeIds);
          return;
        }
      }

      setSelectedZoneIds([zoneId]);
    },
    [selectedZoneIds, rootZone]
  );
  
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

  const splitZone = useCallback((zoneId: string, direction: 'horizontal' | 'vertical', count: number = 2) => {
    const updateZone = (z: Zone): Zone => {
      if (z.id === zoneId) {
        let splitRatios: number[] | undefined = undefined;
        if (count > 2) {
          const equalRatio = 100 / count;
          const ratios = Array(count).fill(Math.round(equalRatio));
          const sum = ratios.reduce((a: number, b: number) => a + b, 0);
          ratios[ratios.length - 1] += 100 - sum;
          splitRatios = ratios;
        }

        return {
          ...z,
          type: direction,
          content: undefined,
          splitRatio: count === 2 ? 50 : undefined,
          splitRatios,
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
    setSelectedZoneIds([zoneId]);
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

    const findParentAndIndices = (current: Zone, targetIds: string[]): { parent: Zone, indices: number[] } | null => {
      if (!current.children) return null;
      
      const indices = targetIds.map(id => current.children!.findIndex(c => c.id === id)).filter(idx => idx !== -1);
      
      if (indices.length === targetIds.length) {
        return { parent: current, indices: indices.sort((a, b) => a - b) };
      }

      for (const child of current.children) {
        const found = findParentAndIndices(child, targetIds);
        if (found) return found;
      }
      return null;
    };

    const result = findParentAndIndices(rootZone, zoneIds);
    if (!result) {
      toast.error("Les zones doivent faire partie du même groupe.");
      return;
    }

    const { parent, indices } = result;
    
    for (let i = 0; i < indices.length - 1; i++) {
      if (indices[i+1] !== indices[i] + 1) {
        toast.error("Les zones doivent être côte à côte pour être groupées.");
        return;
      }
    }

    let createdGroupId = "";

    const updateZoneTree = (z: Zone): Zone => {
      if (z.id === parent.id) {
        const newChildren: Zone[] = [];
        const groupedChildren: Zone[] = [];
        const groupedRatios: number[] = [];
        
        const currentRatios = z.splitRatios || (z.children!.length === 2 ? [z.splitRatio!, 100 - z.splitRatio!] : z.children!.map(() => 100 / z.children!.length));
        
        let groupedRatioSum = 0;
        
        z.children!.forEach((child, idx) => {
          if (indices.includes(idx)) {
            groupedChildren.push(child);
            groupedRatioSum += currentRatios[idx];
            groupedRatios.push(currentRatios[idx]);
          } else {
            if (groupedChildren.length > 0 && newChildren.every(c => !c.id.startsWith('group-'))) {
              const groupId = `group-${Math.random().toString(36).substr(2, 9)}`;
              createdGroupId = groupId;
              const normalizedGroupedRatios = groupedRatios.map(r => (r / groupedRatioSum) * 100);
              
              newChildren.push({
                id: groupId,
                type: z.type,
                children: groupedChildren.map(c => ({...c})),
                splitRatio: groupedChildren.length === 2 ? normalizedGroupedRatios[0] : undefined,
                splitRatios: groupedChildren.length > 2 ? normalizedGroupedRatios : undefined,
                doorContent: forceContent || undefined,
              });
              groupedChildren.length = 0;
            }
            newChildren.push(child);
          }
        });

        if (groupedChildren.length > 0) {
          const groupId = `group-${Math.random().toString(36).substr(2, 9)}`;
          createdGroupId = groupId;
          const normalizedGroupedRatios = groupedRatios.map(r => (r / groupedRatioSum) * 100);
          
          newChildren.push({
            id: groupId,
            type: z.type,
            children: groupedChildren.map(c => ({...c})),
            splitRatio: groupedChildren.length === 2 ? normalizedGroupedRatios[0] : undefined,
            splitRatios: groupedChildren.length > 2 ? normalizedGroupedRatios : undefined,
            doorContent: forceContent || undefined,
          });
        }

        const newParentRatios: number[] = [];
        let groupAdded = false;
        z.children!.forEach((_, idx) => {
          if (indices.includes(idx)) {
            if (!groupAdded) {
              newParentRatios.push(groupedRatioSum);
              groupAdded = true;
            }
          } else {
            newParentRatios.push(currentRatios[idx]);
          }
        });

        return {
          ...z,
          children: newChildren,
          splitRatio: newChildren.length === 2 ? newParentRatios[0] : undefined,
          splitRatios: newChildren.length > 2 ? newParentRatios : undefined,
        };
      }
      
      if (z.children) {
        return { ...z, children: z.children.map(updateZoneTree) };
      }
      return z;
    };

    const newRoot = updateZoneTree(rootZone);
    setRootZone(newRoot);
    
    if (createdGroupId) {
      setSelectedZoneIds([createdGroupId]);
    } else {
      setSelectedZoneIds([]);
    }
    
    if (forceContent) {
      toast.success("Porte ajoutée sur l'ensemble sélectionné");
    } else {
      toast.success("Zones groupées avec succès");
    }
  }, [rootZone]);

  const setZoneDoorContent = useCallback((zoneId: string, content: ZoneContent) => {
    const updateZone = (z: Zone): Zone => {
      if (z.id === zoneId) {
        return { ...z, doorContent: content === 'empty' ? undefined : content };
      }
      if (z.children) {
        return { ...z, children: z.children.map(updateZone) };
      }
      return z;
    };
    setRootZone(updateZone(rootZone));
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

    const colorableContents = ['drawer', 'push_drawer', 'door', 'door_right', 'door_double', 'push_door', 'push_door_right', 'mirror_door', 'mirror_door_right'];

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

  const [activeTab, setActiveTab] = useState<ConfigTab>('dimensions');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const pendingSaveRef = useRef(false);
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
        const countValue = match![2] && (isH || isV) ? parseInt(match![2]) : undefined;
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
              width: configDataObj.dimensions?.width,
              height: configDataObj.dimensions?.height,
              depth: configDataObj.dimensions?.depth,
              socle: configDataObj.styling?.socle || 'none',
              rootZone: configDataObj.advancedZones,
              finish: configDataObj.styling?.finish,
              color: configDataObj.styling?.color,
              colorImage: configDataObj.styling?.colorImage,
              selectedColorId: configDataObj.styling?.selectedColorId,
              useMultiColor: configDataObj.useMultiColor,
              componentColors: configDataObj.componentColors,
              doorType: configDataObj.features?.doorType,
              doorSide: configDataObj.features?.doorSide,
              deletedPanelIds: configDataObj.deletedPanelIds,
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
              width: dataObj.dimensions?.width,
              height: dataObj.dimensions?.height,
              depth: dataObj.dimensions?.depth,
              socle: dataObj.styling?.socle || 'none',
              rootZone: dataObj.advancedZones,
              finish: dataObj.styling?.finish,
              color: dataObj.styling?.color,
              colorImage: dataObj.styling?.colorImage,
              selectedColorId: dataObj.styling?.selectedColorId,
              useMultiColor: dataObj.useMultiColor,
              componentColors: dataObj.componentColors,
              doorType: dataObj.features?.doorType,
              doorSide: dataObj.features?.doorSide,
              deletedPanelIds: dataObj.deletedPanelIds,
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
    setShowPanelTool(false);

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
        case 'mirror_door': doorCode = 'Pm'; break;
        case 'push_door': doorCode = 'Po'; break;
      }
      
      if (doorCode && ['door', 'door_right', 'door_double', 'mirror_door'].includes(currentDoor)) {
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
      console.error('Erreur génération:', error);
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

    const timer = setTimeout(() => generateModel(prompt), 300);
    return () => clearTimeout(timer);
  }, [templatePrompt, width, height, depth, socle, finish, rootZone, initialConfigApplied, skipNextAutoGenerate, buildPromptFromZoneTree, calculatePrice, generateModel, useMultiColor, componentColors, doorType, doorSide, selectedColorOption, selectedColorId]);

  const handleToggleDoors = useCallback(() => {
    setDoorsOpen(prev => !prev);
  }, []);

  const handleMaterialChange = (key: string) => {
    setFinish(key);
    setSelectedColorId(null);
    setSelectedColorImage(null);
  };

  const handleColorChange = (option: SampleColor) => {
    setSelectedColorId(option.id);
    setColor(option.hex || DEFAULT_COLOR_HEX);
    setColorLabel(option.name || selectedMaterialLabel);
    setSelectedColorImage(option.image_url || null);
  };

  const handleComponentColorChange = (component: keyof ComponentColors, colorId: number, hex: string, imageUrl?: string | null) => {
    setComponentColors((prev) => ({
      ...prev,
      [component]: { colorId, hex, imageUrl },
    }));
  };

  const handleUseMultiColorChange = (value: boolean) => {
    setUseMultiColor(value);

    if (value) {
      const currentHex = color || '#D8C7A1';
      const currentImageUrl = selectedColorImage;
      const currentColorId = selectedColorId;

      setComponentColors({
        structure: { colorId: currentColorId, hex: currentHex, imageUrl: currentImageUrl },
        drawers: { colorId: currentColorId, hex: currentHex, imageUrl: currentImageUrl },
        doors: { colorId: currentColorId, hex: currentHex, imageUrl: currentImageUrl },
        shelves: { colorId: currentColorId, hex: currentHex, imageUrl: currentImageUrl },
        back: { colorId: currentColorId, hex: currentHex, imageUrl: currentImageUrl },
        base: { colorId: currentColorId, hex: currentHex, imageUrl: currentImageUrl },
      });
    }
  };

  const saveAsModel = async () => {
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

  const saveConfiguration = async () => {
    const isAdminEditingConfig = isEditMode && editingConfigId;

    if (!isAdmin && !isAdminEditingConfig && (!isAuthenticated || !customer)) {
      setShowAuthModal(true);
      return;
    }

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

  useEffect(() => {
    if (isAuthenticated && customer && pendingSaveRef.current) {
      pendingSaveRef.current = false;
      setTimeout(() => saveConfiguration(), 300);
    }
  }, [isAuthenticated, customer, showAuthModal]);

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
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9]">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin border-2 border-[#1A1917] border-t-transparent" style={{ borderRadius: '50%' }} />
          <p className="mt-4 text-sm text-[#706F6C]">Chargement de la configuration...</p>
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAF9] p-6 text-center">
        <IconInfoCircle className="h-12 w-12 text-[#8B7355] mb-4" />
        <h1 className="font-serif text-2xl text-[#1A1917] mb-2">Configuration introuvable</h1>
        <p className="text-[#706F6C] max-w-md mb-8">
          Désolé, nous ne parvenons pas à charger cette configuration. Elle n&apos;existe peut-être plus ou le lien est incorrect.
        </p>
        <button 
          onClick={() => router.push('/')}
          className="bg-[#1A1917] text-white px-8 py-3 text-sm font-medium hover:bg-[#2A2927] transition-colors"
          style={{ borderRadius: '2px' }}
        >
          Retour à l&apos;accueil
        </button>
      </div>
    );
  }

  if (isMobile && showMobileWarning) {
    return (
      <>
        <Head>
          <title>Configurateur - {model?.name || 'ArchiMeuble'} | ArchiMeuble</title>
        </Head>
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAF9] p-6">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center bg-[#1A1917]" style={{ borderRadius: '4px' }}>
              <Monitor className="h-10 w-10 text-white" />
            </div>
            <h1 className="font-serif text-2xl text-[#1A1917]">
              Configuration sur ordinateur recommandée
            </h1>
            <p className="mt-4 text-base text-[#706F6C]">
              Pour une meilleure expérience de configuration de votre meuble sur mesure,
              nous vous recommandons d&apos;utiliser un ordinateur.
            </p>
            <p className="mt-2 text-sm text-[#706F6C]">
              Le configurateur 3D est optimisé pour les écrans larges et l&apos;utilisation de la souris.
            </p>
            <div className="mt-8 space-y-3">
              <button
                onClick={() => setShowMobileWarning(false)}
                className="w-full border-2 border-[#E8E6E3] bg-white px-6 py-3 text-sm font-medium text-[#706F6C] transition-colors hover:border-[#1A1917] hover:text-[#1A1917]"
                style={{ borderRadius: '2px' }}
              >
                Continuer sur mobile quand même
              </button>
              <Link
                href="/models"
                className="block w-full bg-[#1A1917] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#2A2927]"
                style={{ borderRadius: '2px' }}
              >
                Voir les modèles
              </Link>
            </div>
          </div>
        </div>
      </>
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
            Retour à l&apos;accueil
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
                  className="bg-gray-50 font-semibold"
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
                  {isUploading && <IconRefresh className="h-4 w-4 animate-spin text-[#8B7355]" />}
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
              className="bg-[#1A1917] text-white"
            >
              {isAdminEditModel ? 'Mettre à jour' : 'Enregistrer le modèle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex h-screen flex-col overflow-hidden bg-[#FAFAF9]">
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
                <div className="flex items-center gap-2">
                  <h1 className="font-serif text-base text-[#1A1917] lg:text-lg">{model.name}</h1>
                  {isViewMode && isAdmin && (
                    <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Vue Admin</span>
                  )}
                  {isViewMode && !isAdmin && isConfigOwner && (
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Ma configuration</span>
                  )}
                  {isEditMode && editingConfigId && isAdmin && (
                    <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Édition Admin</span>
                  )}
                  {isEditMode && editingConfigId && !isAdmin && isConfigOwner && (
                    <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Modification</span>
                  )}
                  {editingConfigName && (isEditMode || isViewMode) && (
                    <span className="text-[11px] text-[#706F6C] font-medium">&quot;{editingConfigName}&quot;</span>
                  )}
                </div>
                <p className="hidden text-xs text-[#706F6C] sm:block">
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

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <div className="viewer-section relative flex flex-col bg-[#FAFAF9] lg:flex-1">
            <div className="viewer-wrapper relative h-[35vh] min-h-[240px] flex-1 lg:h-auto">
              <div className="absolute inset-0">
                <ThreeViewer
                  width={width}
                  height={height}
                  depth={depth}
                  color={color}
                  imageUrl={selectedColorImage}
                  hasSocle={socle !== 'none'}
                  socle={socle}
                  rootZone={rootZone}
                  selectedZoneIds={isViewMode ? [] : selectedZoneIds}
                  onSelectZone={isViewMode ? undefined : handleZoneSelect}
                  isBuffet={furnitureStructure?.isBuffet}
                  doorsOpen={doorsOpen}
                  showDecorations={showDecorations}
                  onToggleDoors={isViewMode ? undefined : handleToggleDoors}
                  componentColors={componentColors}
                  useMultiColor={useMultiColor}
                  doorType={doorType}
                  doorSide={doorSide}
                  mountingStyle={mountingStyle}
                  selectedPanelIds={isViewMode || !showPanelTool ? new Set<string>() : selectedPanelIds}
                  onSelectPanel={isViewMode || !showPanelTool ? undefined : handlePanelSelect}
                  deletedPanelIds={deletedPanelIds}
                />

                {!isViewMode && isSelectedZoneColorizable && selectedZone && (
                  <ZoneColorPicker
                    zone={selectedZone}
                    materialsMap={materialsMap}
                    selectedMaterialKey={selectedMaterialLabel}
                    defaultColor={color}
                    defaultImageUrl={selectedColorImage}
                    onColorChange={setZoneColor}
                    onClose={() => setSelectedZoneIds([])}
                  />
                )}

                <div className="absolute bottom-4 right-4 z-20 hidden flex-col gap-2 lg:flex">
                  {!isViewMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowPanelTool(!showPanelTool);
                        if (showPanelTool) {
                          setSelectedPanelIds(new Set());
                        }
                      }}
                      className={`flex h-10 items-center gap-2 border px-4 text-sm font-medium shadow-sm transition-all ${
                        showPanelTool
                          ? 'border-[#E64A19] bg-[#E64A19] text-white'
                          : 'border-[#FF8A65] bg-[#FFF3E0] text-[#E64A19] hover:border-[#E64A19] hover:bg-[#E64A19] hover:text-white'
                      }`}
                      style={{ borderRadius: '2px' }}
                      title={showPanelTool ? "Fermer l'outil" : "Retirer des planches"}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="20" height="4" rx="0.5" />
                        <line x1="6" y1="12" x2="18" y2="12" strokeDasharray="2 2" opacity="0.5" />
                        <rect x="2" y="16" width="20" height="4" rx="0.5" />
                      </svg>
                      <span>Retirer planches</span>
                      {deletedPanelIds.size > 0 && (
                        <span className="rounded-full bg-white px-1.5 py-0.5 text-xs font-medium text-[#E64A19]">
                          {deletedPanelIds.size}
                        </span>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowDecorations(!showDecorations)}
                    className={`flex h-10 items-center gap-2 border px-4 text-sm font-medium shadow-sm transition-all ${
                      showDecorations
                        ? 'border-[#1A1917] bg-[#1A1917] text-white'
                        : 'border-[#E8E6E3] bg-white text-[#706F6C] hover:border-[#1A1917] hover:text-[#1A1917]'
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
                        ? 'border-[#1A1917] bg-[#1A1917] text-white'
                        : 'border-[#E8E6E3] bg-white text-[#706F6C] hover:border-[#1A1917] hover:text-[#1A1917]'
                    }`}
                    style={{ borderRadius: '2px' }}
                  >
                    <Box className="h-4 w-4" />
                    <span>{doorsOpen ? 'Fermer les portes' : 'Ouvrir les portes'}</span>
                  </button>
                </div>

                {!isViewMode && (
                  <div className="absolute top-4 left-4 z-20 hidden flex-row gap-2 lg:flex">
                    <button
                      type="button"
                      onClick={undoZone}
                      disabled={!canUndoZone}
                      className={`flex h-10 w-10 items-center justify-center border shadow-sm transition-all ${
                        canUndoZone
                          ? 'border-[#E8E6E3] bg-white text-[#706F6C] hover:border-[#1A1917] hover:text-[#1A1917]'
                          : 'border-[#E8E6E3] bg-[#F5F5F5] text-[#C4C4C4] cursor-not-allowed'
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
                          ? 'border-[#E8E6E3] bg-white text-[#706F6C] hover:border-[#1A1917] hover:text-[#1A1917]'
                          : 'border-[#E8E6E3] bg-[#F5F5F5] text-[#C4C4C4] cursor-not-allowed'
                      }`}
                      style={{ borderRadius: '2px' }}
                      title="Rétablir (Ctrl+Y)"
                    >
                      <Redo2 className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {selectedPanelIds.size > 0 && !isViewMode && showPanelTool && (
                  <div className="absolute top-4 right-4 z-20 hidden lg:block">
                    <div className="flex items-center gap-2 border border-[#2196F3] bg-white px-3 py-2 shadow-sm" style={{ borderRadius: '2px' }}>
                      <div className="h-3 w-3 rounded-full bg-[#2196F3]" />
                      <span className="text-sm font-medium text-[#1A1917]">
                        {selectedPanelIds.size === 1 ? (
                          (() => {
                            const panelId = Array.from(selectedPanelIds)[0];
                            const panelInfo = stringToPanelId(panelId);
                            if (panelInfo) {
                              if (panelInfo.type === 'separator') {
                                const isHorizontal = panelId.includes('-h-');
                                return `Séparateur ${isHorizontal ? 'horizontal' : 'vertical'}`;
                              }
                              const baseLabel = PANEL_META[panelInfo.type]?.label || panelId;
                              if (panelInfo.index !== undefined) {
                                return `${baseLabel} (segment ${panelInfo.index + 1})`;
                              }
                              return baseLabel;
                            }
                            return panelId;
                          })()
                        ) : (
                          `${selectedPanelIds.size} panneaux sélectionnés`
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleSelectedPanelsDeleted('delete')}
                        className="ml-1 text-[#FF5722] hover:text-[#E64A19]"
                        title={`Retirer ${selectedPanelIds.size > 1 ? 'les panneaux' : 'le panneau'}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleSelectedPanelsDeleted('restore')}
                        className="ml-1 text-[#4CAF50] hover:text-[#388E3C]"
                        title={`Restaurer ${selectedPanelIds.size > 1 ? 'les panneaux' : 'le panneau'}`}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPanelIds(new Set())}
                        className="ml-1 text-[#706F6C] hover:text-[#1A1917]"
                        title="Désélectionner tout"
                      >
                        <IconTablerX className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {generating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#FAFAF9]/40 backdrop-blur-[1px] z-10">
                    <div className="flex flex-col items-center gap-3">
                      <img
                        src="/images/logo-icon.png"
                        alt=""
                        className="h-16 w-16 animate-pulse"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!isViewMode && (
              <div className="hidden flex-shrink-0 lg:block">
                <ActionBar
                  selectedZoneId={selectedZone?.type === 'leaf' ? selectedZoneIds[0] : null}
                />
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col border-t border-[#E8E6E3] bg-white lg:w-[620px] lg:flex-none lg:border-l lg:border-t-0">
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

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                  {activeTab === 'dimensions' && (
                    <div className="space-y-4 pb-32 lg:pb-0">
                      {initialConfig && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={resetConfiguration}
                            className="flex items-center gap-2 border border-[#E8E6E3] bg-white px-3 py-2 text-xs font-medium text-[#706F6C] transition-colors hover:border-[#1A1917] hover:text-[#1A1917]"
                            style={{ borderRadius: '2px' }}
                          >
                            <RotateCcw className="h-4 w-4" />
                            Réinitialiser au modèle par défaut
                          </button>
                        </div>
                      )}

                      <ZoneEditor
                        rootZone={rootZone}
                        selectedZoneIds={selectedZoneIds}
                        onRootZoneChange={setRootZone}
                        onSelectedZoneIdsChange={setSelectedZoneIds}
                        onToggleLight={toggleZoneLight}
                        onToggleCableHole={toggleZoneCableHole}
                        onToggleDressing={toggleZoneDressing}
                        onGroupZones={groupZones}
                        onSetDoorContent={setZoneDoorContent}
                        onSetHandleType={setZoneHandleType}
                        width={width}
                        height={height}
                        onSelectZone={handleZoneSelect}
                        isAdminCreateModel={isAdminCreateModel}
                        renderAfterCanvas={
                          <DimensionsPanel
                            width={width}
                            depth={depth}
                            height={height}
                            onWidthChange={setWidth}
                            onDepthChange={setDepth}
                            onHeightChange={setHeight}
                          />
                        }
                      />

                      {showPanelTool && (
                        <div ref={panelToolRef}>
                          <PanelPlanCanvas
                            zone={rootZone}
                            width={width}
                            height={height}
                            selectedPanelIds={selectedPanelIds}
                            onSelectPanel={handlePanelSelect}
                            deletedPanelIds={deletedPanelIds}
                          />
                        </div>
                      )}

                      <SocleSelector
                        value={socle}
                        onChange={setSocle}
                      />

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between border-b border-[#E8E6E3] pb-2">
                          <h3 className="font-serif text-xs text-[#1A1917]">Montage façades</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setMountingStyle('applique')}
                            className={`flex flex-col items-center gap-1.5 border-2 p-3 transition-all ${
                              mountingStyle === 'applique'
                                ? 'border-[#1A1917] bg-[#1A1917] text-white'
                                : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
                            }`}
                            style={{ borderRadius: '4px' }}
                          >
                            <svg width="32" height="24" viewBox="0 0 32 24" fill="none" className="opacity-80">
                              <rect x="2" y="4" width="28" height="16" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                              <rect x="0" y="2" width="12" height="20" fill="currentColor" opacity="0.3"/>
                              <rect x="0" y="2" width="12" height="20" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                            </svg>
                            <span className="text-[11px] font-medium">Applique</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setMountingStyle('encastre')}
                            className={`flex flex-col items-center gap-1.5 border-2 p-3 transition-all ${
                              mountingStyle === 'encastre'
                                ? 'border-[#1A1917] bg-[#1A1917] text-white'
                                : 'border-[#E8E6E3] bg-white text-[#1A1917] hover:border-[#1A1917]'
                            }`}
                            style={{ borderRadius: '4px' }}
                          >
                            <svg width="32" height="24" viewBox="0 0 32 24" fill="none" className="opacity-80">
                              <rect x="2" y="4" width="28" height="16" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                              <rect x="4" y="6" width="10" height="12" fill="currentColor" opacity="0.3"/>
                              <rect x="4" y="6" width="10" height="12" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                            </svg>
                            <span className="text-[11px] font-medium">Encastré</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-[#706F6C]">
                          {mountingStyle === 'applique'
                            ? 'Portes et tiroirs en saillie sur le cadre'
                            : 'Portes et tiroirs affleurant avec le cadre'}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'materials' && (
                    <div className="pb-32 lg:pb-0">
                      <MaterialSelector
                        materialsMap={materialsMap}
                        selectedMaterialKey={selectedMaterialLabel}
                        selectedColorId={selectedColorId}
                        onMaterialChange={handleMaterialChange}
                        onColorChange={handleColorChange}
                        loading={materialsLoading}
                        useMultiColor={useMultiColor}
                        onUseMultiColorChange={handleUseMultiColorChange}
                        componentColors={componentColors}
                        onComponentColorChange={handleComponentColorChange}
                      />
                    </div>
                  )}
                </div>

                <div className="hidden flex-shrink-0 border-t border-[#E8E6E3] bg-white px-6 py-4 lg:block">
                  <PriceDisplay
                    price={price}
                    onAddToCart={(isAdminCreateModel || isAdminEditModel) ? () => setIsCreateModelDialogOpen(true) : saveConfiguration}
                    isAuthenticated={isAuthenticated}
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
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E8E6E3] bg-white px-4 py-3 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-shrink-0">
                <span className="text-[10px] uppercase tracking-wide text-[#706F6C]">Prix</span>
                <div className="font-serif text-xl text-[#1A1917]">
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
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={undoZone}
                  disabled={!canUndoZone}
                  className={`flex items-center justify-center w-9 h-9 border transition-colors ${
                    canUndoZone
                      ? 'border-[#E8E6E3] bg-white text-[#706F6C]'
                      : 'border-[#E8E6E3] bg-[#F5F5F5] text-[#C4C4C4]'
                  }`}
                  style={{ borderRadius: '2px' }}
                >
                  <Undo2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={redoZone}
                  disabled={!canRedoZone}
                  className={`flex items-center justify-center w-9 h-9 border transition-colors ${
                    canRedoZone
                      ? 'border-[#E8E6E3] bg-white text-[#706F6C]'
                      : 'border-[#E8E6E3] bg-[#F5F5F5] text-[#C4C4C4]'
                  }`}
                  style={{ borderRadius: '2px' }}
                >
                  <Redo2 className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={handleToggleDoors}
                className={`flex items-center gap-1.5 border px-3 py-2 text-xs transition-colors ${doorsOpen ? 'border-[#1A1917] bg-[#1A1917] text-white' : 'border-[#E8E6E3] bg-white text-[#706F6C]'}`}
                style={{ borderRadius: '2px' }}
              >
                <span>{doorsOpen ? '🚪' : '📦'}</span>
                <span className="hidden sm:inline">{doorsOpen ? 'Ouvert' : 'Fermé'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDecorations(!showDecorations)}
                className={`flex items-center gap-1.5 border px-3 py-2 text-xs transition-colors ${showDecorations ? 'border-[#1A1917] bg-[#1A1917] text-white' : 'border-[#E8E6E3] bg-white text-[#706F6C]'}`}
                style={{ borderRadius: '2px' }}
              >
                <span>{showDecorations ? '🏺' : '✨'}</span>
                <span className="hidden sm:inline">Déco</span>
              </button>
              {(!isAdminCreateModel && !isAdminEditModel) ? (
                <button
                  type="button"
                  onClick={saveConfiguration}
                  className="flex h-11 flex-1 max-w-[180px] items-center justify-center gap-2 bg-[#1A1917] text-sm font-medium text-white transition-colors hover:bg-[#2A2927]"
                  style={{ borderRadius: '2px' }}
                >
                  <Box className="h-4 w-4" />
                  <span>
                    {(isEditMode && editingConfigId) ? 'Enregistrer' : (isAdmin ? 'Terminer' : (isAuthenticated ? 'Valider' : 'Enregistrer'))}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreateModelDialogOpen(true)}
                  className="flex h-11 flex-1 max-w-[200px] items-center justify-center gap-2 bg-[#8B7355] text-sm font-medium text-white transition-colors hover:bg-[#705D45]"
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

      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="bg-white">
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
              className="border-[#E8E6E3] text-[#706F6C] hover:bg-[#F5F5F5] hover:text-[#1A1917]"
            >
              Ignorer
            </Button>
            <Button 
              onClick={applyPendingRestore}
              className="bg-[#1A1917] text-white hover:bg-[#333]"
            >
              Restaurer ma session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          pendingSaveRef.current = true;
        }}
      />

      {showModelCreatedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="max-w-md w-full bg-white shadow-2xl" style={{ borderRadius: '4px' }}>
            <div className="p-6 sm:p-8">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-amber-100" style={{ borderRadius: '50%' }}>
                {isAdminEditModel ? <IconEdit className="h-8 w-8 text-amber-600" /> : <IconPlus className="h-8 w-8 text-amber-600" />}
              </div>

              <h2 className="mb-4 text-center font-serif text-2xl text-[#1A1917]">
                {isAdminEditModel ? 'Modèle mis à jour !' : 'Modèle créé avec succès !'}
              </h2>
              <p className="mb-6 text-center text-base text-[#706F6C]">
                {isAdminEditModel 
                  ? <>Le modèle <span className="font-semibold text-[#1A1917]">&quot;{modelForm.name}&quot;</span> a été mis à jour avec succès dans le catalogue.</>
                  : <>Votre nouveau modèle <span className="font-semibold text-[#1A1917]">&quot;{modelForm.name}&quot;</span> a été ajouté au catalogue et est désormais visible par tous les clients.</>
                }
              </p>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => router.push(adminUrl('/dashboard?section=models'))}
                  className="flex-1 bg-[#1A1917] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#2A2927]"
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
                    className="border-2 border-[#E8E6E3] bg-white px-4 py-3 text-sm font-medium text-[#1A1917] transition-colors hover:border-[#1A1917]"
                    style={{ borderRadius: '2px' }}
                  >
                    {isAdminEditModel ? 'Continuer à modifier' : 'Créer un autre'}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(adminUrl('/dashboard'))}
                    className="border-2 border-[#E8E6E3] bg-white px-4 py-3 text-sm font-medium text-[#1A1917] transition-colors hover:border-[#1A1917]"
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
                  <h2 className="mb-4 text-center font-serif text-2xl text-[#1A1917]">
                    Configuration mise à jour !
                  </h2>
                  <p className="mb-6 text-center text-base text-[#706F6C]">
                    La configuration <span className="font-semibold text-[#1A1917]">&quot;{editingConfigName}&quot;</span> a été modifiée avec succès.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="mb-4 text-center font-serif text-2xl text-[#1A1917]">
                    Configuration enregistrée !
                  </h2>
                  <p className="mb-6 text-center text-base text-[#706F6C]">
                    {customer?.civility === 'M' ? 'Monsieur' : customer?.civility === 'Mme' ? 'Madame' : ''}{' '}
                    <span className="font-semibold text-[#1A1917]">
                      {customer?.last_name}
                    </span>
                    , un menuisier va vous rappeler au plus vite pour valider votre projet et finaliser votre commande.
                  </p>
                </>
              )}

              {!(isEditMode && editingConfigId) && !isAdmin && (
                <div className="mb-6 border-t border-[#E8E6E3] pt-4">
                  <p className="text-sm text-[#706F6C]">
                    <strong className="text-[#1A1917]">Prochaines étapes :</strong>
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-[#706F6C]">
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
                      className="flex-1 bg-[#1A1917] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#2A2927]"
                      style={{ borderRadius: '2px' }}
                    >
                      Retour aux configurations
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmationModal(false)}
                      className="flex-1 border-2 border-[#E8E6E3] bg-white px-6 py-3 text-sm font-medium text-[#1A1917] transition-colors hover:border-[#1A1917]"
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
                      className="flex-1 border-2 border-[#E8E6E3] bg-white px-6 py-3 text-sm font-medium text-[#1A1917] transition-colors hover:border-[#1A1917]"
                      style={{ borderRadius: '2px' }}
                    >
                      {isAdmin ? 'Retour au Dashboard' : 'Mes configurations'}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/')}
                      className="flex-1 bg-[#1A1917] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#2A2927]"
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

              <h2 className="mb-4 text-center font-serif text-2xl text-[#1A1917]">
                Erreur
              </h2>
              <div className="mb-6 text-center text-base text-[#706F6C] whitespace-pre-line">
                {errorMessage}
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowErrorModal(false)}
                  className="bg-[#1A1917] px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-[#2A2927]"
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

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Link from 'next/link';
import Viewer from '@/components/configurator/Viewer';
import type { ThreeCanvasHandle } from '@/components/configurator/types';

// Import dynamique pour éviter les erreurs SSR avec R3F
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
import ZoneEditor, { Zone, ZoneContent, ZoneColor } from '@/components/configurator/ZoneEditor';
import ZoneColorPicker from '@/components/configurator/ZoneColorPicker';
import SocleSelector from '@/components/configurator/SocleSelector';
import DoorSelector from '@/components/configurator/DoorSelector';
import MaterialSelector, { ComponentColors } from '@/components/configurator/MaterialSelector';
import PriceDisplay from '@/components/configurator/PriceDisplay';
import AuthModal from '@/components/auth/AuthModal';
import { Header } from '@/components/Header';
import { apiClient, type FurnitureModel, type SampleType, type SampleColor, type FurnitureColors } from '@/lib/apiClient';
import { useCustomer } from '@/context/CustomerContext';
import { ChevronLeft, Settings, Palette, Box, Monitor, RotateCcw, Sparkles, Flower2, Camera, Download, Undo2, Redo2, Edit3 } from 'lucide-react';
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

// Hook pour détecter mobile
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(mobileRegex.test(userAgent.toLowerCase()) || (isTouchDevice && isSmallScreen));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// Mapping pour les anciens matériaux uniquement (backward compatibility)
const MATERIAL_LABEL_BY_KEY: Record<string, string> = {
  agglomere: 'Aggloméré',
  mdf_melamine: 'MDF + revêtement (mélaminé)',
  plaque_bois: 'Plaqué bois',
};

// Prix par défaut pour les anciens matériaux (backward compatibility)
const MATERIAL_PRICE_BY_KEY: Record<string, number> = {
  agglomere: 0,
  mdf_melamine: 70,
  plaque_bois: 140,
};

const DEFAULT_COLOR_HEX = '#D8C7A1';

// Mapping pour les poignées vers codes prompt
const HANDLE_TYPE_CODE: Record<string, string> = {
  'vertical_bar': '1',
  'horizontal_bar': '2',
  'knob': '3',
  'recessed': '4',
};

// Normalise une clé de matériau - garde la valeur telle quelle pour les nouveaux matériaux
function normalizeMaterialKey(value: string | null | undefined): string {
  if (!value) return 'agglomere';
  
  // Normalisation pour comparaison
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  
  // Mapping strict pour la rétrocompatibilité uniquement
  // On ne cherche plus de correspondances partielles comme "bois" qui polluent les nouvelles catégories
  if (normalized === 'agglomere') return 'agglomere';
  if (normalized === 'mdf + revetement (melamine)' || normalized === 'mdf_melamine') return 'mdf_melamine';
  if (normalized === 'plaque bois' || normalized === 'plaque_bois') return 'plaque_bois';
  
  // Pour tout le reste (nouvelles catégories admin), retourner la valeur originale sans transformation
  return value;
}

function materialLabelFromKey(key: string): string {
  // Les matériaux sont maintenant gérés dynamiquement via l'API
  return key;
}

function ConfigurationSummary({ 
  width, height, depth, finish, color, socle, rootZone, price, modelName,
  isAdmin, onEdit, priceDisplaySettings
}: any) {
  const analyzeConfiguration = (zone: Zone) => {
    const handleTypes = new Set<string>();
    const leafZones: any[] = [];
    
    let leafCounter = 0;
    
    const traverse = (z: Zone) => {
      if (z.type === 'leaf') {
        leafCounter++;
        leafZones.push({
          number: leafCounter,
          id: z.id,
          content: z.content || 'empty',
          handleType: z.handleType,
          hasLight: z.hasLight,
          hasCableHole: z.hasCableHole,
          color: z.zoneColor?.hex
        });

        if (z.content && z.content !== 'empty') {
          if (z.handleType) {
            handleTypes.add(z.handleType);
          }
        }
      }
      
      if (z.children) z.children.forEach(traverse);
    };
    
    traverse(zone);
    
    return { 
      handleTypes: Array.from(handleTypes),
      leafZones
    };
  };

  const analysis = analyzeConfiguration(rootZone);
  
  const labels: Record<string, string> = {
    drawer: 'Tiroir(s)',
    push_drawer: 'Tiroir(s) Push-to-Open',
    dressing: 'Penderie(s)',
    door: 'Porte(s) Gauche',
    door_right: 'Porte(s) Droite',
    door_double: 'Double Porte(s)',
    mirror_door: 'Porte(s) Vitrée',
    push_door: 'Porte(s) Push-to-Open',
    glass_shelf: 'Étagère(s) en verre',
    shelf: 'Étagère(s) standard',
    light: 'Éclairage(s) LED',
    cable_hole: 'Passe-câble(s)',
  };

  const handleLabels: Record<string, string> = {
    vertical_bar: 'Barre verticale',
    horizontal_bar: 'Barre horizontale',
    knob: 'Bouton',
    recessed: 'Encastrée',
  };

  return (
    <div className="flex flex-col h-full bg-[#FAFAF9] overflow-y-auto custom-scrollbar">
      {/* Header simple et chic */}
      <div className="p-6 lg:p-8 border-b border-[#E8E6E3] bg-white">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#706F6C] font-medium mb-2 block">Administration</span>
        <h2 className="font-serif text-3xl text-[#1A1917] leading-tight">Récapitulatif de configuration</h2>
        <p className="mt-2 text-sm text-[#706F6C]">Analyse technique du meuble configuré par le client.</p>
      </div>

      <div className="p-6 lg:p-8 space-y-8">
        {/* Visualisation 2D - Le "vrai" plus pour l'admin */}
        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#1A1917] mb-4 flex items-center gap-2">
            <IconApps className="h-3.5 w-3.5" />
            Structure visuelle
          </h3>
          <div className="bg-white border border-[#E8E6E3] rounded-[2px] p-4 shadow-sm">
            <ZoneEditor
              rootZone={rootZone}
              selectedZoneIds={[]}
              onRootZoneChange={() => {}}
              onSelectedZoneIdsChange={() => {}}
              width={width}
              height={height}
              hideControls={true}
              showNumbers={true}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Dimensions */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#1A1917] mb-4 flex items-center gap-2">
              <IconRuler2 className="h-3.5 w-3.5" />
              Dimensions (mm)
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Largeur', value: width },
                { label: 'Hauteur', value: height },
                { label: 'Profondeur', value: depth }
              ].map((dim) => (
                <div key={dim.label} className="flex justify-between items-baseline border-b border-[#E8E6E3] pb-2">
                  <span className="text-sm text-[#706F6C]">{dim.label}</span>
                  <span className="text-base font-bold tabular-nums">{dim.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Finitions */}
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#1A1917] mb-4 flex items-center gap-2">
              <IconTablerPalette className="h-3.5 w-3.5" />
              Esthétique
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-[#E8E6E3] pb-2">
                <span className="text-sm text-[#706F6C]">Finition</span>
                <span className="text-sm font-semibold">{finish}</span>
              </div>
              <div className="flex justify-between items-center border-b border-[#E8E6E3] pb-2">
                <span className="text-sm text-[#706F6C]">Couleur</span>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: color }}></div>
                  <span className="text-sm font-semibold">{color}</span>
                </div>
              </div>
              <div className="flex justify-between items-center border-b border-[#E8E6E3] pb-2">
                <span className="text-sm text-[#706F6C]">Socle</span>
                <span className="text-sm font-semibold">
                  {socle === 'metal' ? 'Métal Noir' : socle === 'wood' ? 'Plinthe Bois' : 'Aucun'}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-[#E8E6E3] pb-2">
                <span className="text-sm text-[#706F6C]">Poignée</span>
                <span className="text-sm font-semibold">
                  {analysis.handleTypes.length > 0 
                    ? analysis.handleTypes.map(h => handleLabels[h] || h).join(', ')
                    : 'Aucune'}
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* Inventaire détaillé par compartiment */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#1A1917] flex items-center gap-2">
              <IconRuler2 className="h-3.5 w-3.5" />
              Inventaire par compartiment
            </h3>
            <span className="text-[9px] text-[#706F6C] uppercase font-bold tracking-tighter bg-[#F5F5F4] px-2 py-1">Lecture de gauche à droite, haut en bas</span>
          </div>
          <div className="bg-white border border-[#E8E6E3] rounded-[2px] overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#FAFAF9] border-b border-[#E8E6E3]">
                  <th className="p-3 font-bold text-[10px] uppercase tracking-wider w-12 text-center">N°</th>
                  <th className="p-3 font-bold text-[10px] uppercase tracking-wider">Équipement</th>
                  <th className="p-3 font-bold text-[10px] uppercase tracking-wider">Détails / Poignée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E6E3]">
                {analysis.leafZones.map((z: any) => (
                  <tr key={z.id} className="hover:bg-[#FAFAF9] transition-colors">
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#1A1917] text-white text-[10px] font-bold shadow-sm">
                        {z.number}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-[#1A1917]">
                        {labels[z.content] || (z.content === 'empty' ? 'Étagères / Vide' : z.content)}
                      </div>
                      <div className="flex gap-1.5 mt-1.5">
                        {z.hasLight && (
                          <span className="text-[8px] bg-yellow-400 text-black px-1.5 py-0.5 rounded-[1px] font-black uppercase">LED</span>
                        )}
                        {z.hasCableHole && (
                          <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded-[1px] font-black uppercase">Câble</span>
                        )}
                        {z.color && (
                          <div className="flex items-center gap-1 bg-[#F5F5F4] px-1.5 py-0.5 rounded-[1px] border border-[#E8E6E3]">
                            <div className="h-2 w-2 rounded-full border border-black/10" style={{ backgroundColor: z.color }}></div>
                            <span className="text-[8px] font-bold text-[#706F6C]">{z.color}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-[#706F6C] text-xs">
                      {z.handleType ? (
                        <div className="flex items-center gap-2">
                          <IconTrendingUp className="h-3 w-3 text-[#1A1917]" />
                          <span className="font-medium italic">{handleLabels[z.handleType] || z.handleType}</span>
                        </div>
                      ) : (
                        z.content !== 'empty' && !['shelf', 'glass_shelf', 'pegboard', 'dressing'].includes(z.content) ? (
                          <div className="flex items-center gap-2 text-amber-700">
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500"></div>
                            <span className="text-[10px] uppercase tracking-tighter font-black">Pousser-Lâcher</span>
                          </div>
                        ) : (
                          <span className="text-[#D0CEC9]">—</span>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="pt-4 border-t border-[#E8E6E3]">
          <div className="flex items-center justify-between bg-[#1A1917] p-6 rounded-[2px] text-white">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-white/60 mb-1 block">Estimation brute</span>
              <div className="flex items-baseline gap-1 font-serif text-4xl">
                {priceDisplaySettings?.mode === 1 && priceDisplaySettings?.range > 0 ? (
                  <>
                    <span>{Math.max(0, price - priceDisplaySettings.range)}</span>
                    <span className="text-xl">€</span>
                    <span className="text-2xl mx-2 opacity-40">-</span>
                    <span>{price + priceDisplaySettings.range}</span>
                    <span className="text-xl">€</span>
                  </>
                ) : (
                  <>
                    <span>{price}</span>
                    <span className="text-xl">€</span>
                  </>
                )}
              </div>
            </div>
            {isAdmin && (
              <Button
                onClick={onEdit}
                className="bg-white text-[#1A1917] hover:bg-[#E8E6E3] h-12 px-6 font-bold rounded-[2px] transition-all active:scale-[0.98]"
              >
                <IconEdit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            )}
          </div>
        </div>

        {/* Note informative */}
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-[2px] flex gap-3">
          <IconInfoCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 leading-relaxed">
            <strong>Mode Consultation</strong> : Les modifications directes sont désactivées dans cette vue. Utilisez le bouton "Modifier" pour ajuster la configuration avec le client.
          </p>
        </div>
      </div>
    </div>
  );
}

type ConfigTab = 'dimensions' | 'materials';

export default function ConfiguratorPage() {
  const router = useRouter();
  const { id, mode, configId: queryConfigId, adminMode, modelId } = router.query;
  const { customer, isAuthenticated } = useCustomer();
  const [isAdmin, setIsAdmin] = useState(false);
  const isAdminCreateModel = adminMode === 'createModel';
  const isAdminEditModel = adminMode === 'editModel';
  const isMobile = useIsMobile();
  const [showMobileWarning, setShowMobileWarning] = useState(true);

  // Formulaire création modèle
  const [isCreateModelDialogOpen, setIsCreateModelDialogOpen] = useState(false);
  const [showModelCreatedModal, setShowModelCreatedModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingModel, setIsSavingModel] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);


  // Charger les catégories dynamiques
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/backend/api/categories.php?active=true');
        if (response.ok) {
          const data = await response.json();
          if (data.categories) {
            setAvailableCategories(data.categories);
            // Si on est en mode création, on peut présélectionner la première catégorie
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

  // Modes
  const isEditMode = mode === 'edit' && queryConfigId;
  const isViewMode = mode === 'view' && queryConfigId;
  const configIdToEdit = queryConfigId ? Number(queryConfigId) : null;

  // Vérifier la session admin au chargement
  useEffect(() => {
    const checkAdmin = async () => {
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
  }, []);

  // Clé localStorage unique par modèle
  const localStorageKey = useMemo(() => `configurator_config_${id}`, [id]);

  // État pour la configuration initiale (pour réinitialiser)
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

  // États de base
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

  // Paramètres de pricing configurables chargés depuis l'API
  const [pricingParams, setPricingParams] = useState<any>(null);

  const [doorsOpen, setDoorsOpen] = useState(true);
  const [showDecorations, setShowDecorations] = useState(true);
  const doorsOpenRef = useRef(doorsOpen);
  // const viewerRef = useRef<ThreeCanvasHandle>(null); // TODO: Implémenter la capture d'écran
  const [doorType, setDoorType] = useState<'none' | 'single' | 'double'>('none');
  const [doorSide, setDoorSide] = useState<'left' | 'right'>('left');

  useEffect(() => {
    doorsOpenRef.current = doorsOpen;
  }, [doorsOpen]);

  // TODO: Implémenter la capture d'écran - nécessite de résoudre les problèmes SSR avec forwardRef
  // const handleCaptureScreenshot = useCallback(() => { ... }, []);

  // Mode multi-couleurs
  const [useMultiColor, setUseMultiColor] = useState(false);
  const [componentColors, setComponentColors] = useState<ComponentColors>({
    structure: { colorId: null, hex: null },
    drawers: { colorId: null, hex: null },
    doors: { colorId: null, hex: null },
    shelves: { colorId: null, hex: null },
    back: { colorId: null, hex: null },
    base: { colorId: null, hex: null },
  });

  // Zones (mode par défaut) - avec historique pour undo/redo
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

  // Raccourcis clavier pour undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si l'utilisateur est dans un champ de saisie
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl+Z ou Cmd+Z pour Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndoZone) undoZone();
      }
      // Ctrl+Y ou Cmd+Shift+Z pour Redo
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

  // Gérer la sélection intelligente (clic 1 -> clic 2)
  const handleZoneSelect = useCallback(
    (zoneId: string | null) => {
      if (!zoneId) {
        setSelectedZoneIds([]);
        return;
      }

      // Si aucune zone n'est sélectionnée, on sélectionne la première
      if (selectedZoneIds.length === 0) {
        setSelectedZoneIds([zoneId]);
        return;
      }

      // Si on clique sur une zone déjà sélectionnée
      if (selectedZoneIds.includes(zoneId)) {
        // Si c'est la racine et qu'elle est seule, on ne désélectionne pas
        if (zoneId === 'root' && selectedZoneIds.length === 1) return;
        
        // Sinon on désélectionne tout (comportement intuitif pour "éteindre" ce qui est orange)
        setSelectedZoneIds([]);
        return;
      }

      // Logique de sélection de plage (entre le premier sélectionné et le nouveau clic)
      const firstId = selectedZoneIds[0];
      const secondId = zoneId;

      // Fonction utilitaire pour trouver une zone et son parent
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

      // Si pas le même parent ou autre cas, on remplace la sélection
      setSelectedZoneIds([zoneId]);
    },
    [selectedZoneIds, rootZone]
  );
  
  // Vérifier s'il y a des portes spécifiques dans les zones
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

  // Fonctions de manipulation des zones
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

    // Trouver le parent commun et les index des zones
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
    
    // Vérifier si consécutives
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
              // Créer le groupe
              const groupId = `group-${Math.random().toString(36).substr(2, 9)}`;
              createdGroupId = groupId;
              const normalizedGroupedRatios = groupedRatios.map(r => (r / groupedRatioSum) * 100);
              
              newChildren.push({
                id: groupId,
                type: z.type, // même type que le parent
                children: groupedChildren.map(c => ({...c})),
                splitRatio: groupedChildren.length === 2 ? normalizedGroupedRatios[0] : undefined,
                splitRatios: groupedChildren.length > 2 ? normalizedGroupedRatios : undefined,
                doorContent: forceContent || undefined,
              });
              groupedChildren.length = 0; // Clear
            }
            newChildren.push(child);
          }
        });

        // Si le groupe est à la fin
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

        // Calculer les nouveaux ratios du parent
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

  // Modifier la couleur d'une zone spécifique (tiroir, porte)
  const setZoneColor = useCallback((zoneId: string, zoneColor: ZoneColor) => {
    const updateZone = (z: Zone): Zone => {
      if (z.id === zoneId) {
        // Si la couleur est nulle, on supprime la propriété zoneColor
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

  // Vérifier si la zone sélectionnée est un tiroir ou une porte (pour afficher le color picker)
  const isSelectedZoneColorizable = useMemo(() => {
    if (!selectedZone) return false;
    
    // Contenus colorisables (feuilles)
    const colorableContents = ['drawer', 'push_drawer', 'door', 'door_right', 'door_double', 'push_door', 'mirror_door'];
    if (selectedZone.type === 'leaf' && colorableContents.includes(selectedZone.content || '')) {
      return true;
    }
    
    // Portes sur groupes (parents)
    if (selectedZone.doorContent && colorableContents.includes(selectedZone.doorContent as string)) {
      return true;
    }
    
    return false;
  }, [selectedZone]);

  // UI
  // Compter les étagères à partir de la rootZone pour Three.js
  const shelfCount = useMemo(() => {
    if (!rootZone || !rootZone.children) return 0;
    // On compte le nombre de divisions horizontales
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

  // Parsing du prompt pour extraire la structure du meuble pour Three.js
  const furnitureStructure = useMemo(() => {
    if (!glbUrl) return null;
    
    // On essaie d'extraire les infos du prompt ou de la rootZone
    // Pour Three.js, on a besoin de savoir si c'est une bibliothèque, un buffet, etc.
    const isBuffet = templatePrompt?.startsWith('M2') || templatePrompt?.startsWith('M3');
    
    return {
      isBuffet,
      shelfCount: shelfCount,
      // On peut ajouter d'autres infos extraites du prompt ici
    };
  }, [glbUrl, templatePrompt, shelfCount]);

  const [activeTab, setActiveTab] = useState<ConfigTab>('dimensions');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Derived state
  const selectedMaterialKey = useMemo(() => normalizeMaterialKey(finish), [finish]);
  
  // Trouve la clé réelle dans materialsMap qui correspond au matériau sélectionné
  const selectedMaterialLabel = useMemo(() => {
    if (!finish) return '';
    if (materialsMap[finish]) return finish;
    
    // Recherche insensible à la casse/accents si pas de correspondance directe
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

  // Options d'affichage du prix depuis les paramètres de pricing
  const priceDisplaySettings = useMemo(() => {
    const displayConfig = pricingParams?.display?.price;
    return {
      mode: Number(displayConfig?.display_mode) || 0,
      range: Number(displayConfig?.deviation_range) || 0
    };
  }, [pricingParams]);

  // Sauvegarder automatiquement dans localStorage
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
      doorsOpen,
      showDecorations,
      timestamp: Date.now(), // Pour savoir quand la config a été sauvegardée
    };

    try {
      localStorage.setItem(localStorageKey, JSON.stringify(configToSave));
      // console.log('✅ Configuration sauvegardée automatiquement');
    } catch (e) {
      console.warn('❌ Impossible de sauvegarder dans localStorage', e);
    }
  }, [id, loading, width, height, depth, socle, rootZone, finish, selectedColorId, useMultiColor, componentColors, doorType, doorSide, color, localStorageKey, isViewMode, initialConfigApplied, showRestoreDialog, doorsOpen, showDecorations]);

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

  // Sélectionner le premier matériau disponible si le matériau actuel n'existe pas
  useEffect(() => {
    const materialKeys = Object.keys(materialsMap);
    if (materialKeys.length === 0) return; // Pas encore chargé

    // Vérifier si le matériau actuel existe dans la map (insensible à la casse)
    const currentFinish = finish || '';
    const normalizedCurrent = currentFinish.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    
    const exactMatch = materialKeys.find(k => k === currentFinish);
    const caseMatch = materialKeys.find(k => k.toLowerCase() === currentFinish.toLowerCase());
    const normalizedMatch = materialKeys.find(k => k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() === normalizedCurrent);
    
    const bestMatch = exactMatch || caseMatch || normalizedMatch;

    if (!bestMatch) {
      // Le matériau actuel n'existe vraiment pas dans les données de l'API
      const firstMaterial = materialKeys[0];
      console.log('[DEBUG] Matériau actuel non trouvé, sélection du premier disponible:', firstMaterial);
      setFinish(firstMaterial);
    } else if (bestMatch !== finish) {
      // Si on a trouvé une correspondance mais avec une casse/accentuation différente
      // on met à jour pour s'aligner sur la clé exacte de l'API
      console.log('[DEBUG] Alignement du matériau sur la clé API:', bestMatch);
      setFinish(bestMatch);
    }
  }, [materialsMap, finish]);

  // Charger les paramètres de pricing configurables depuis l'API
  useEffect(() => {
    let cancelled = false;
    const loadPricing = async () => {
      try {
        const paramsResponse = await fetch('/backend/api/pricing-config/index.php');
        const paramsData = await paramsResponse.json();

        if (!cancelled && paramsData.success && paramsData.data) {
          // Transformer les données en objet structuré pour un accès facile
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

  // Synchroniser la couleur sélectionnée
  useEffect(() => {
    if (!colorsForMaterial.length || !initialConfigApplied) {
      // Ne pas réinitialiser si on est en train de charger
      return;
    }
    if (selectedColorId !== null && colorsForMaterial.some((o) => o.id === selectedColorId)) return;
    const fallback = colorsForMaterial.find((o) => o.name?.toLowerCase() === colorLabel.toLowerCase());
    const nextColor = fallback || colorsForMaterial[0];
    setSelectedColorId(nextColor.id);
  }, [colorsForMaterial, selectedColorId, colorLabel, initialConfigApplied]);

  // Map plate pour accéder rapidement aux prix des échantillons par ID
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
      // Seulement si on a vraiment aucune option sélectionnée alors qu'on devrait
      if (selectedColorId === null && !useMultiColor) {
        setColor(DEFAULT_COLOR_HEX);
        setColorLabel(selectedMaterialLabel);
      }
    }
  }, [selectedColorOption, selectedMaterialLabel, initialConfigApplied, colorsForMaterial.length, selectedColorId, useMultiColor]);

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

    // Détecter les portes globales dans les flags (avant H/V)
    const flagsPart = compact.match(/M\d+\([^)]+\)([A-Za-z0-9]*)/)?.[1] || '';
    if (/P2/.test(flagsPart)) setDoorType('double');
    else if (/P/.test(flagsPart)) {
      setDoorType('single');
      if (flagsPart.includes('Pd')) setDoorSide('right');
      else setDoorSide('left');
    } else {
      setDoorType('none');
    }

    // Parse structure récursivement
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
        
        // Splitting inner content while respecting parentheses
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
        
        // Pour un groupe (G, P2, etc.), on détecte si c'est horizontal ou vertical à partir du premier enfant
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

      // Leaf node
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
          str.includes('v') ? 'glass_shelf' :
          str.includes('p') ? 'pegboard' :
          'empty'
        ) as ZoneContent,
        handleType: (() => {
          const m = str.match(/(?:T|Pg|Pd|P2|Pm)(\d)/);
          if (!m) return undefined;
          return Object.keys(HANDLE_TYPE_CODE).find(k => HANDLE_TYPE_CODE[k] === m[1]) as any;
        })(),
      };
    };

    // Extraire la partie structure du prompt (tout ce qui suit EbF, E, etc.)
    const structurePart = compact.replace(/M\d+\([^)]+\)[^HVD]*/, '');
    if (structurePart && !['P', 'P2', 'Pg', 'Pd'].includes(structurePart)) {
      setRootZone(parseZones(structurePart, 'root'));
    } else {
      // Si c'est juste une porte globale, la rootZone est une feuille vide 
      // car la porte est gérée par doorType
      setRootZone({ id: 'root', type: 'leaf', content: 'empty' });
    }
  }, []);

  // Charger le modèle
  const loadModel = useCallback(async () => {
    setLoading(true);
    try {
      let configDataToUse: any = null;
      let configToRestore: any = null;

      // 1. Charger la configuration si on est en mode édition ou vue
      if ((isEditMode || isViewMode) && configIdToEdit) {
        console.log(`🔄 Mode ${isViewMode ? 'vue' : 'édition'} détecté, chargement de la configuration #${configIdToEdit}`);

        // D'abord essayer de charger depuis localStorage (uniquement pour l'édition client)
        const savedConfigKey = `archimeuble:configuration:${configIdToEdit}`;
        const savedConfigStr = !isViewMode ? localStorage.getItem(savedConfigKey) : null;

        if (savedConfigStr) {
          configDataToUse = JSON.parse(savedConfigStr);
          console.log('📦 Configuration trouvée dans localStorage:', configDataToUse);
        } else {
          // Sinon, charger depuis l'API (indispensable pour l'admin)
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
              // Essayer l'API client si l'API admin échoue (cas client recharge la page)
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
          // La config sauvegardée contient config_data avec toutes les infos
          // config_data peut être une chaîne JSON ou un objet
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

      // 2. Initialiser le modèle (soit via ID numérique, soit via Template key)
      let modelData = null;
      if (isAdminEditModel && modelId) {
        console.log(`🛠️ Mode édition de modèle détecté, chargement du modèle #${modelId}`);
        modelData = await apiClient.models.getById(Number(modelId));
      } else if (id && !isNaN(Number(id))) {
        modelData = await apiClient.models.getById(Number(id));
      }

      if (modelData) {
        setModel(modelData);
        
        // Mettre à jour le formulaire pour l'édition admin
        if (isAdminEditModel) {
          setModelForm({
            name: modelData.name || '',
            description: modelData.description || '',
            category: modelData.category || 'dressing',
            price: modelData.price || 890,
            imageUrl: modelData.image_url || ''
          });
        }

        // Si le modèle a des données de config riches, les utiliser en priorité pour la restauration
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
              prompt: modelData.prompt,
              name: modelData.name
            };
            console.log('💎 Configuration riche restaurée depuis le modèle catalogue');
            
            // Initialiser rootZone immédiatement pour éviter le bloc vide
            if (configToRestore.rootZone) {
              setRootZone(configToRestore.rootZone);
            }
          } catch (e) {
            console.warn('⚠️ Erreur lors du parsing de config_data du modèle:', e);
          }
        }

        if (modelData.prompt) {
          setTemplatePrompt(modelData.prompt);

          // Parser le prompt pour obtenir la config par défaut (seulement si pas de restauration)
          if (!configToRestore) {
            parsePromptToConfig(modelData.prompt);
          }

          // Sauvegarder la config initiale pour réinitialisation
          // On utilise configToRestore si disponible pour la config initiale
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
              const children = inner.split(',').map((content, idx) => ({
                id: `zone-${idx}`,
                type: 'leaf' as const,
                content: (content.includes('T') ? 'drawer' : content.includes('D') ? 'dressing' : content.includes('P') ? 'door' : 'empty') as ZoneContent,
              }));
              initRootZone = { id: 'root', type: 'horizontal', children };
            } else if (vStruct) {
              const inner = vStruct[2];
              const children = inner.split(',').map((content, idx) => ({
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
        // C'est un template (M1, M2...)
        let promptToUse = (router.query.prompt as string) || configToRestore?.prompt || null;
        
        // Mode création de modèle : si pas de prompt, utiliser un prompt par défaut (caisson vide)
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

            // Calculer la config initiale pour les templates aussi
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
              const children = inner.split(',').map((content, idx) => ({
                id: `zone-${idx}`,
                type: 'leaf' as const,
                content: (content.includes('T') ? 'drawer' : content.includes('D') ? 'dressing' : content.includes('P') ? 'door' : 'empty') as ZoneContent,
              }));
              initRootZone = { id: 'root', type: 'horizontal', children };
            } else if (vStruct) {
              const inner = vStruct[2];
              const children = inner.split(',').map((content, idx) => ({
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

      // 3. Appliquer la configuration restaurée si trouvée
      if (configToRestore) {
        console.log('🔧 Application de la configuration restaurée:', configToRestore);
        if (configToRestore.width) setWidth(configToRestore.width);
        if (configToRestore.height) setHeight(configToRestore.height);
        if (configToRestore.depth) setDepth(configToRestore.depth);
        if (configToRestore.socle) setSocle(configToRestore.socle);
        if (configToRestore.rootZone) setRootZone(configToRestore.rootZone);
        if (configToRestore.finish) setFinish(configToRestore.finish);
        if (configToRestore.color) setColor(configToRestore.color);
        if (configToRestore.colorLabel) setColorLabel(configToRestore.colorLabel);
        if (configToRestore.colorImage !== undefined) setSelectedColorImage(configToRestore.colorImage);
        if (configToRestore.selectedColorId !== undefined) setSelectedColorId(configToRestore.selectedColorId);
        if (configToRestore.useMultiColor !== undefined) setUseMultiColor(configToRestore.useMultiColor);
        if (configToRestore.componentColors) setComponentColors(configToRestore.componentColors);
        if (configToRestore.doorType) setDoorType(configToRestore.doorType);
        if (configToRestore.doorSide) setDoorSide(configToRestore.doorSide);
        console.log('✅ Configuration restaurée avec succès');
        setInitialConfigApplied(true);
      } else {
        // Fallback local pour template ou modèle (IGNORÉ en mode création de modèle admin pour éviter les résidus)
        let restoreFound = false;
        if (!isAdminCreateModel && !isViewMode) {
          const savedConfigStr = localStorage.getItem(localStorageKey);
          if (savedConfigStr) {
            try {
              const localRestore = JSON.parse(savedConfigStr);
              // On ne restaure pas automatiquement, on demande
              // Session valide si moins de 24h
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
  }, [id, router.query.prompt, parsePromptToConfig, localStorageKey, isEditMode, isViewMode, configIdToEdit, isAdminEditModel, modelId]);

  useEffect(() => {
    // Attendre que le router soit prêt (important pour les query params)
    if (!router.isReady) return;
    if (id) loadModel();
  }, [id, loadModel, router.isReady]);

  // Fonction de réinitialisation de la configuration
  const resetConfiguration = useCallback(() => {
    if (!initialConfig) {
      console.warn('⚠️ Aucune configuration initiale disponible');
      return;
    }

    console.log('🔄 Réinitialisation à la configuration par défaut...');

    // Restaurer la config initiale
    setWidth(initialConfig.width);
    setHeight(initialConfig.height);
    setDepth(initialConfig.depth);
    setSocle(initialConfig.socle);
    setRootZone(JSON.parse(JSON.stringify(initialConfig.rootZone))); // Deep copy
    setFinish(initialConfig.finish);
    setDoorType(initialConfig.doorType || 'none');
    setDoorSide(initialConfig.doorSide || 'left');
    setSelectedZoneIds(['root']);

    // Supprimer la sauvegarde localStorage
    try {
      localStorage.removeItem(localStorageKey);
      console.log('✅ Configuration réinitialisée et sauvegarde supprimée');
    } catch (e) {
      console.warn('❌ Erreur lors de la suppression de localStorage', e);
    }
  }, [initialConfig, localStorageKey]);

  // Actions pour le dialogue de restauration
  const applyPendingRestore = () => {
    if (!pendingRestoreConfig) return;
    const c = pendingRestoreConfig;
    console.log('🔄 Application de la configuration restaurée depuis localStorage:', c);
    
    // Désactiver temporairement la régénération auto pour grouper les changements
    setSkipNextAutoGenerate(false); 
    setInitialConfigApplied(false);

    if (c.width) setWidth(c.width);
    if (c.height) setHeight(c.height);
    if (c.depth) setDepth(c.depth);
    if (c.socle) setSocle(c.socle);
    if (c.rootZone) {
      console.log('📦 Restauration de la zone racine:', c.rootZone);
      setRootZone(JSON.parse(JSON.stringify(c.rootZone)));
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
    if (c.doorsOpen !== undefined) setDoorsOpen(c.doorsOpen);
    if (c.showDecorations !== undefined) setShowDecorations(c.showDecorations);
    
    // Réactiver la régénération et forcer l'application
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

  // Construction du prompt depuis l'arbre de zones
  const buildPromptFromZoneTree = useCallback((zone: Zone): string => {
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
      
      // Ajouter le code de poignée si c'est une porte
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
        case 'glass_shelf': leafChar = 'v'; break;
        case 'shelf': leafChar = ''; break; // étagère standard
        default: leafChar = '';
      }

      // Ajouter le code de poignée si c'est un tiroir
      if (zone.content === 'drawer') {
        const hCode = zone.handleType ? HANDLE_TYPE_CODE[zone.handleType] : '';
        if (hCode) leafChar += hCode;
      }

      // Combiner avec le code de porte si présent sur la feuille
      // Note: doorCode contient déjà Pg, Pd, etc.
      // Si on a un contenu interne (T, v, D) ET une porte sur la même feuille
      let finalLeaf = leafChar;
      if (doorCode) {
        // Le prompt accepte PgT (Porte Gauche + Tiroir)
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
    const childPrompts = orderedChildren.map((c) => buildPromptFromZoneTree(c));

    const prefix = isHorizontal ? 'H' : 'V';
    let zoneCode = '';

    // Pour 2 enfants avec splitRatio
    if (zone.splitRatio !== undefined && childCount === 2) {
      const r1 = Math.round(zone.splitRatio);
      const r2 = 100 - r1;
      const ratios = isHorizontal ? [r2, r1] : [r1, r2];
      zoneCode = `${prefix}[${ratios[0]},${ratios[1]}](${childPrompts.join(',')})`;
    } else if (zone.splitRatios && zone.splitRatios.length === childCount && childCount > 2) {
      // Pour 3+ enfants avec splitRatios
      const ratios = isHorizontal ? [...zone.splitRatios].reverse() : zone.splitRatios;
      const ratiosStr = ratios.map(r => Math.round(r)).join(',');
      zoneCode = `${prefix}[${ratiosStr}](${childPrompts.join(',')})`;
    } else {
      zoneCode = `${prefix}${childCount}(${childPrompts.join(',')})`;
    }

    // Si on a une porte sur ce groupe (parent)
    if (doorCode) {
      // Syntaxe : Pg(V2(T,T)) -> Porte sur le groupe
      return doorCode + '(' + zoneCode + ')';
    }

    return zoneCode;
  }, []);

  // Calcul du prix basé sur la surface totale du meuble
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

    // Normalisation du nom du matériau pour correspondre aux clés API (ex: "Aggloméré" -> "agglomere")
    const normalizedFinish = config.finish.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '_');
    
    // On cherche d'abord une config spécifique au matériau, puis on retombe sur 'base' (fallback)
    const materialConfig = pricingParams?.materials?.[normalizedFinish] || 
                          pricingParams?.materials?.[config.finish.toLowerCase().replace(/\s+/g, '_')] || 
                          pricingParams?.materials?.base || 
                          (pricingParams?.materials ? Object.values(pricingParams.materials)[0] : null);

    const baseMaterialPrice = Number((materialConfig as any)?.price_per_m2) || 50;
    
    // Déterminer le prix de l'échantillon (revêtement) en mode coloration unie
    let samplePriceUnie = 0;
    if (config.selectedSample && config.selectedSample.price_per_m2 !== undefined) {
      samplePriceUnie = Number(config.selectedSample.price_per_m2);
    } else if (config.selectedColorId && samplePricesMap[config.selectedColorId] !== undefined) {
      samplePriceUnie = Number(samplePricesMap[config.selectedColorId]);
    }

    console.log(`[PRICING] Calcul en cours: ${config.finish} (${normalizedFinish})`, { 
      baseMaterialPrice,
      samplePriceUnie,
      selectedColorId: config.selectedColorId,
      hasSample: !!config.selectedSample,
      useMultiColor: config.useMultiColor
    });

    if (materialConfig && pricingParams?.casing?.full) {
      const w = config.width / 1000;
      const h = config.height / 1000;
      const d = config.depth / 1000;

      const backSurface = w * h;
      const sidesSurface = (d * h) * 2;
      const topBottomSurface = (w * d) * 2;
      const casingSurface = sidesSurface + topBottomSurface;

      const casingCoefficient = Number(pricingParams.casing.full.coefficient) || 1.2;

      // Déterminer les prix d'échantillons selon le mode
      let samplePriceStructure = 0;
      let samplePriceBack = 0;

      if (config.useMultiColor && config.componentColors) {
        const structColorId = config.componentColors.structure.colorId;
        const backColorId = config.componentColors.back.colorId;
        samplePriceStructure = structColorId ? (Number(samplePricesMap[structColorId]) || 0) : 0;
        samplePriceBack = backColorId ? (Number(samplePricesMap[backColorId]) || 0) : 0;
      } else {
        samplePriceStructure = samplePriceUnie;
        samplePriceBack = samplePriceUnie;
      }

      // Calcul séparé pour structure (caisson) et fond (back)
      const priceCasing = (baseMaterialPrice + samplePriceStructure) * casingSurface * casingCoefficient;
      const priceBack = (baseMaterialPrice + samplePriceBack) * backSurface * casingCoefficient;
      
      p = priceCasing + priceBack;

      console.log('💰 [STRUCTURE] Calcul détaillé:', {
        mode: config.useMultiColor ? 'multi' : 'single',
        surfaceCasing: `${casingSurface.toFixed(3)} m²`,
        surfaceBack: `${backSurface.toFixed(3)} m²`,
        prixM2Structure: `${baseMaterialPrice} + ${samplePriceStructure}`,
        prixM2Back: `${baseMaterialPrice} + ${samplePriceBack}`,
        total: `${p.toFixed(2)}€`
      });
    } else {
      const volumeM3 = (config.width * config.height * config.depth) / 1000000000;
      p = volumeM3 * 1500;
      console.log('⚠️ Fallback prix structure (Volume):', p);
    }

    // Prix des échantillons pour les composants
    let samplePriceDoors = 0;
    let samplePriceDrawers = 0;
    let samplePriceShelves = 0;
    let samplePriceBase = 0;

    if (config.useMultiColor && config.componentColors) {
      samplePriceDoors = config.componentColors.doors.colorId ? (Number(samplePricesMap[config.componentColors.doors.colorId]) || 0) : 0;
      samplePriceDrawers = config.componentColors.drawers.colorId ? (Number(samplePricesMap[config.componentColors.drawers.colorId]) || 0) : 0;
      samplePriceShelves = config.componentColors.shelves.colorId ? (Number(samplePricesMap[config.componentColors.shelves.colorId]) || 0) : 0;
      samplePriceBase = config.componentColors.base.colorId ? (Number(samplePricesMap[config.componentColors.base.colorId]) || 0) : 0;
    } else {
      samplePriceDoors = samplePriceUnie;
      samplePriceDrawers = samplePriceUnie;
      samplePriceShelves = samplePriceUnie;
      samplePriceBase = samplePriceUnie;
    }

    // 2. Ajouter le supplément matériau
    const materialSupplement = Number((materialConfig as any)?.supplement) || 0;
    p += materialSupplement;

    // 3. Ajouter le prix du socle
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
          // Nouvelle formule : Volume × Prix/m³
          const h = Number(woodParams.height);
          const volumeM3 = (config.width * config.depth * h) / 1_000_000_000;
          const woodPrice = Number(woodParams.price_per_m3) * volumeM3;
          
          // Ajouter le prix de l'échantillon sur la surface visible du socle (périmètre × hauteur)
          const surfaceSocleVisible = ((config.width * 2) + (config.depth * 2)) * h / 1_000_000;
          const samplePriceSocle = samplePriceBase * surfaceSocleVisible;

          p += woodPrice + samplePriceSocle;
          console.log('👞 [SOCLE] Bois:', {
            volume: volumeM3.toFixed(4) + ' m³',
            prixM3: woodParams.price_per_m3 + '€/m³',
            samplePrice: samplePriceSocle.toFixed(2) + '€',
            total: (woodPrice + samplePriceSocle).toFixed(2) + '€'
          });
        } else if (woodParams?.coefficient) {
          // Ancienne formule (fallback) : Coef × L × P
          const woodPrice = Number(woodParams.coefficient) * config.width * config.depth;
          p += woodPrice;
          console.log('👞 [SOCLE] Bois (Coef):', woodPrice.toFixed(2) + '€');
        } else {
          p += 60; // Fallback hardcodé
        }
      }
    } else {
      const soclePrices: Record<string, number> = { none: 0, metal: 40, wood: 60 };
      p += Number(soclePrices[config.socle] || 0);
    }

    // 4. Compter tiroirs et penderies dans les zones
    const countExtraPrice = (zone: Zone, zoneWidth: number, zoneHeight: number): number => {
      let extra = 0;

      // Prix de la porte sur cette zone (feuille ou parent)
      const door = zone.doorContent || (zone.type === 'leaf' ? zone.content : null);
      if (door && pricingParams?.doors) {
        // Utiliser les prix configurables pour les portes
        const getDoorPrice = (doorType: string, w: number, h: number) => {
          // Vérifier si le contenu est bien une porte
          const isDoor = [
            'door', 'door_right', 'door_double', 'mirror_door', 'glass_door', 'push_door'
          ].includes(doorType);
          
          if (!isDoor) return 0;

          // Mapping vers les clés de configuration admin
          let typeKey = 'simple';
          if (pricingParams.doors[doorType]) {
            // Si une clé exacte existe dans l'admin (ex: "door_right"), on l'utilise
            typeKey = doorType;
          } else if (doorType === 'door_double') {
            typeKey = 'double';
          } else if (doorType === 'mirror_door' || doorType === 'glass_door') {
            typeKey = 'glass';
          } else if (doorType === 'push_door') {
            typeKey = 'push';
          } else {
            // Par défaut pour door, door_right, etc.
            typeKey = 'simple';
          }

          const doorConfig = pricingParams.doors[typeKey];
          if (!doorConfig) return 0;

          const coefficient = Number(doorConfig.coefficient) || 0.00004;
          const hingeCount = Number(doorConfig.hinge_count) || 2;
          const hingePrice = Number(pricingParams.hinges?.standard?.price_per_unit) || 5;

          // Calcul : Coef × Largeur × Hauteur + (Prix Charnière × Nombre) + (Prix Échantillon × Surface)
          const surfaceDoorM2 = (w * h) / 1_000_000;
          const doorPrice = (coefficient * w * h) + (hingePrice * hingeCount) + (samplePriceDoors * surfaceDoorM2);
          
          console.log(`🚪 [PORTE] Calcul détaillée (${doorType} -> ${typeKey}):`, {
            dimensions: `${w.toFixed(0)}x${h.toFixed(0)}mm`,
            formule: `(${coefficient} × ${w.toFixed(0)} × ${h.toFixed(0)}) + (${hingePrice} × ${hingeCount}) + (${samplePriceDoors} × ${surfaceDoorM2.toFixed(3)})`,
            total: `${doorPrice.toFixed(2)}€`
          });
          
          return doorPrice;
        };

        extra += getDoorPrice(door, zoneWidth, zoneHeight);
      } else if (door) {
        // Fallback sur valeurs hardcodées
        switch (door) {
          case 'door':
          case 'door_right': extra += 40; break;
          case 'push_door': extra += 50; break;
          case 'door_double': extra += 80; break;
          case 'mirror_door': extra += 95; break;
        }
      }

      // Prix de la poignée (si une porte existe et qu'une poignée est définie)
      if (door && zone.handleType && pricingParams?.handles) {
        const handleConfig = pricingParams.handles[zone.handleType];
        if (handleConfig) {
          extra += Number(handleConfig.price_per_unit) || 0;
        }
      }

      if (zone.type === 'leaf') {
        if (pricingParams?.drawers && (zone.content === 'drawer' || zone.content === 'push_drawer')) {
          // Prix des tiroirs avec formule: base_price + coefficient × largeur × profondeur + (Prix Échantillon × Surface Façade)
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
              facade: `${zoneWidth.toFixed(0)}x${zoneHeight.toFixed(0)}mm (${surfaceFacadeM2.toFixed(3)}m²)`,
              formule: `${basePrice} + (${coefficient} × ${zoneWidth.toFixed(0)} × ${config.depth.toFixed(0)}) + (${samplePriceDrawers} × ${surfaceFacadeM2.toFixed(3)})`,
              total: `${drawerPrice.toFixed(2)}€`
            });
          } else {
            extra += zone.content === 'drawer' ? 35 : 45;
          }
        } else if (zone.content === 'glass_shelf' && pricingParams?.shelves?.glass) {
          // Prix étagère verre: prix_m² × surface
          const pricePerM2 = Number(pricingParams.shelves.glass.price_per_m2) || 250;
          const shelfSurfaceM2 = (zoneWidth * config.depth) / 1000000;
          const shelfPrice = pricePerM2 * shelfSurfaceM2;
          
          console.log('💎 [ETAGERE VERRE] Calcul détaillée:', {
            dimensions: `${zoneWidth.toFixed(0)}x${config.depth.toFixed(0)}mm`,
            surface: `${shelfSurfaceM2.toFixed(3)} m²`,
            total: `${shelfPrice.toFixed(2)}€`
          });
          
          extra += shelfPrice;
        } else if (zone.content === 'glass_shelf') {
          extra += 25; // Fallback
        } else if (zone.content === 'dressing') {
          // Prix penderie = prix par mètre × largeur de la zone
          if (pricingParams?.wardrobe?.rod) {
            const pricePerMeter = Number(pricingParams.wardrobe.rod.price_per_linear_meter) || 20;
            const widthInMeters = zoneWidth / 1000;
            extra += pricePerMeter * widthInMeters;
          } else {
            extra += 20; // Fallback
          }
        }

        // Ajouter le prix de la penderie si l'option toggle est activée
        if (zone.hasDressing && zone.content !== 'dressing') {
          if (pricingParams?.wardrobe?.rod) {
            const pricePerMeter = Number(pricingParams.wardrobe.rod.price_per_linear_meter) || 20;
            const widthInMeters = zoneWidth / 1000;
            extra += pricePerMeter * widthInMeters;
          } else {
            extra += 20; // Fallback
          }
        }

        // Ajouter le prix du passe-câble si activé
        if (zone.hasCableHole) {
          if (pricingParams?.cables?.pass_cable) {
            extra += Number(pricingParams.cables.pass_cable.fixed_price) || 10;
          } else {
            extra += 10; // Fallback
          }
        }

        // Ajouter le prix de l'éclairage LED si activé
        if (zone.hasLight) {
          if (pricingParams?.lighting?.led) {
            // Prix LED = prix par mètre linéaire × largeur (en mètres)
            const pricePerMeter = Number(pricingParams.lighting.led.price_per_linear_meter) || 15;
            const widthInMeters = zoneWidth / 1000;
            extra += pricePerMeter * widthInMeters;
          } else {
            // Fallback: estimation basée sur la largeur
            extra += (zoneWidth / 1000) * 15;
          }
        }
      } else if (zone.children) {
        // Calculer les dimensions des enfants
        zone.children.forEach((child, index) => {
          let childWidth = zoneWidth;
          let childHeight = zoneHeight;

          // Calcul du ratio pour chaque enfant (aligné sur ThreeCanvas.tsx)
          let ratio: number;
          if (zone.splitRatios && zone.splitRatios.length === zone.children!.length) {
            ratio = zone.splitRatios[index] / 100;
          } else if (zone.children!.length === 2 && zone.splitRatio !== undefined) {
            ratio = (index === 0 ? zone.splitRatio : 100 - zone.splitRatio) / 100;
          } else {
            ratio = 1 / zone.children!.length;
          }

          if (zone.type === 'horizontal') {
            // Les enfants partagent la hauteur
            childHeight = zoneHeight * ratio;
            
            // Ajouter le prix de la séparation horizontale (étagère bois)
            if (index < zone.children!.length - 1) {
              const surfaceShelfM2 = (zoneWidth * config.depth) / 1_000_000;
              const shelfPrice = (baseMaterialPrice + samplePriceShelves) * surfaceShelfM2 * (Number(pricingParams?.casing?.full?.coefficient) || 1.2);
              extra += shelfPrice;
              console.log(`📏 [ETAGERE BOIS] Calcul: (${baseMaterialPrice} + ${samplePriceShelves}) × ${surfaceShelfM2.toFixed(3)}m² = ${shelfPrice.toFixed(2)}€`);
            }
          } else if (zone.type === 'vertical') {
            // Les enfants partagent la largeur
            childWidth = zoneWidth * ratio;

            // Ajouter le prix de la séparation verticale (montant bois)
            if (index < zone.children!.length - 1) {
              const surfaceVerticalM2 = (zoneHeight * config.depth) / 1_000_000;
              const verticalPrice = (baseMaterialPrice + samplePriceShelves) * surfaceVerticalM2 * (Number(pricingParams?.casing?.full?.coefficient) || 1.2);
              extra += verticalPrice;
              console.log(`📏 [MONTANT VERTICAL] Calcul: (${baseMaterialPrice} + ${samplePriceShelves}) × ${surfaceVerticalM2.toFixed(3)}m² = ${verticalPrice.toFixed(2)}€`);
            }
          }

          extra += countExtraPrice(child, childWidth, childHeight);
        });
      }

      return extra;
    };
    p += countExtraPrice(config.rootZone, config.width, config.height);

    // 5. Ajouter le prix des portes globales (si configuré)
    if (pricingParams?.doors && config.doorType && config.doorType !== 'none') {
      const doorTypeKey = config.doorType === 'double' ? 'double' : 'simple';
      const doorConfig = pricingParams.doors[doorTypeKey];
      if (doorConfig) {
        const coefficient = Number(doorConfig.coefficient) || 0.00004;
        const hingeCount = Number(doorConfig.hinge_count) || 2;
        const hingePrice = Number(pricingParams.hinges?.standard?.price_per_unit) || 5;
        const surfaceDoorM2 = (config.width * config.height) / 1_000_000;
        const globalDoorPrice = (coefficient * config.width * config.height) + (hingePrice * hingeCount) + (samplePriceDoors * surfaceDoorM2);
        p += globalDoorPrice;
        console.log(`🚪 Prix porte globale (${config.doorType}):`, {
          dimensions: `${config.width}x${config.height}mm`,
          formule: `(${coefficient} × ${config.width} × ${config.height}) + (${hingePrice} × ${hingeCount}) + (${samplePriceDoors} × ${surfaceDoorM2.toFixed(3)})`,
          total: `${globalDoorPrice.toFixed(2)}€`
        });
      } else {
        // Fallback
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
          shelves: componentColors.shelves.hex || DEFAULT_COLOR_HEX,
          back: componentColors.back.hex || DEFAULT_COLOR_HEX,
        };
      } else {
        // Mode couleur unique
        singleColor = selectedColorOption?.hex || undefined;
      }

      const excludeDoors = !doorsOpenRef.current || doorType === 'none';
      const result = await apiClient.generate.generate(prompt, excludeDoors, singleColor, furnitureColors);

      let glbUrlAbsolute = result.glb_url;
      // On utilise maintenant le proxy configuré dans next.config.js
      setGlbUrl(glbUrlAbsolute);
      setDxfUrl(result.dxf_url || null);
    } catch (error) {
      console.error('Erreur génération:', error);
    } finally {
      setGenerating(false);
    }
  }, [selectedColorOption, useMultiColor, componentColors, doorType]);

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

    // Garder les flags originaux (E, b, F, S, S2) mais nettoyer les contenus (P, T, D)
    // On extrait uniquement ce qui précède la structure (H, V, ou [ )
    const rest = match[3] || '';
    const flagsMatch = rest.match(/^([^HV\[]*)/);
    const originalFlags = flagsMatch ? flagsMatch[1] : '';
    let flags = originalFlags.replace(/[PTD]/g, '');
    
    // S'assurer que le socle est correctement reflété dans les flags
    // S = socle métal, S2 = socle bois
    flags = flags.replace(/S2?/g, ''); // On enlève les anciens socles
    if (socle === 'metal') flags += 'S';
    else if (socle === 'wood') flags += 'S2';

    // Ajouter les portes globales si activées (uniquement s'il n'y a pas de portes de compartiment)
    if (!hasZoneSpecificDoors) {
      if (doorType === 'double') flags += 'P2';
      else if (doorType === 'single') flags += doorSide === 'left' ? 'Pg' : 'Pd';
    }
    
    prompt += flags;

    // Structure de zones
    const zonePrompt = buildPromptFromZoneTree(rootZone);
    if (zonePrompt && zonePrompt.trim()) {
      prompt += zonePrompt;
    }

    console.log('🚀 Génération du modèle avec le prompt:', prompt);

    // Calculer le prix
    setPrice(calculatePrice({ 
      width, height, depth, finish, socle, rootZone, doorType, 
      selectedSample: selectedColorOption,
      selectedColorId,
      useMultiColor,
      componentColors
    }));

    // Générer
    const timer = setTimeout(() => generateModel(prompt), 300);
    return () => clearTimeout(timer);
  }, [templatePrompt, width, height, depth, socle, finish, rootZone, initialConfigApplied, skipNextAutoGenerate, buildPromptFromZoneTree, calculatePrice, generateModel, useMultiColor, componentColors, doorType, doorSide, selectedColorOption, selectedColorId]);

  // Handlers
  const handleToggleDoors = useCallback(() => {
    setDoorsOpen(prev => !prev);
  }, []);

  const handleMaterialChange = (key: string) => {
    // On utilise directement la clé (qui est le label du matériau venant de l'API)
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

  // Gestion du changement de mode multi-couleurs
  const handleUseMultiColorChange = (value: boolean) => {
    setUseMultiColor(value);

    // Quand on active le mode multi-couleurs, initialiser tous les composants avec la couleur actuelle
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

  // Fonction pour enregistrer comme modèle de catalogue
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

      // 1. Utiliser l'URL de l'image déjà uploadée
      const finalImageUrl = modelForm.imageUrl;
      console.log('URL Image:', finalImageUrl);

      // 2. Préparation du prompt
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

      // 3. Préparation des données techniques
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
        features: { doorsOpen, doorType, doorSide },
        advancedZones: JSON.parse(JSON.stringify(rootZone)),
        useMultiColor,
        componentColors,
      };

      // 4. Payload final
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

      // 5. Envoi final au backend
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

  // Sauvegarde
  const saveConfiguration = async () => {
    if (!isAdmin && (!isAuthenticated || !customer)) {
      setShowAuthModal(true);
      return;
    }

    let configNameInput = editingConfigName;

    // Si ce n'est pas un admin qui édite une config existante, on demande le nom
    if (!(isAdmin && editingConfigId)) {
      const promptedName = prompt('Nom de cette configuration :', editingConfigName || '');
      if (promptedName === null) return; // Annulation
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
        features: { doorsOpen, doorType, doorSide },
        advancedZones: rootZone,
        useMultiColor,
        componentColors,
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
        // Récupérer le message d'erreur du backend
        const errorData = await response.json().catch(() => ({}));
        const backendError = errorData.error || 'Erreur lors de la sauvegarde';

        // Si c'est un admin qui essaie de sauvegarder sans compte client
        if (response.status === 401 && isAdmin) {
          setErrorMessage('Un administrateur ne peut pas créer de configuration.\n\nPour créer une configuration, vous devez :\n1. Vous déconnecter du panel admin\n2. Vous connecter en tant que client\n3. Puis créer votre configuration');
          setShowErrorModal(true);
        } else {
          setErrorMessage(backendError);
          setShowErrorModal(true);
        }
        throw new Error(backendError);
      }

      const result = await response.json();
      
      // Nettoyer localStorage après une sauvegarde réussie
      localStorage.removeItem(localStorageKey);
      
      setEditingConfigName(configNameInput.trim());

      // Afficher le modal de confirmation au lieu de rediriger vers le panier
      if (result.configuration) {
        setShowConfirmationModal(true);
      }
    } catch (err: unknown) {
      console.error('Erreur saveConfiguration:', err);
      // Ne rien faire ici car l'erreur a déjà été affichée dans le modal
    }
  };

  // Fonction pour passer en mode édition admin
  const handleAdminEdit = useCallback(() => {
    const { mode, ...rest } = router.query;
    router.push({
      pathname: router.pathname,
      query: { ...rest, mode: 'edit' },
    }, undefined, { shallow: true });
  }, [router]);

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

  // Message si le modèle ou la configuration n'existe pas
  if (!model) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAF9] p-6 text-center">
        <IconInfoCircle className="h-12 w-12 text-[#8B7355] mb-4" />
        <h1 className="font-serif text-2xl text-[#1A1917] mb-2">Configuration introuvable</h1>
        <p className="text-[#706F6C] max-w-md mb-8">
          Désolé, nous ne parvenons pas à charger cette configuration. Elle n'existe peut-être plus ou le lien est incorrect.
        </p>
        <button 
          onClick={() => router.push('/')}
          className="bg-[#1A1917] text-white px-8 py-3 text-sm font-medium hover:bg-[#2A2927] transition-colors"
          style={{ borderRadius: '2px' }}
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  // Message mobile
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
              nous vous recommandons d'utiliser un ordinateur.
            </p>
            <p className="mt-2 text-sm text-[#706F6C]">
              Le configurateur 3D est optimisé pour les écrans larges et l'utilisation de la souris.
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

      {/* Modal création modèle (Admin) */}
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
              <Label htmlFor="price">Prix de base (€)</Label>
              <Input
                id="price"
                type="number"
                value={modelForm.price}
                onChange={(e) => setModelForm({ ...modelForm, price: Number(e.target.value) })}
              />
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
                <div className="flex items-center gap-2">
                  <h1 className="font-serif text-base text-[#1A1917] lg:text-lg">{model.name}</h1>
                  {isViewMode && (
                    <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Vue Admin</span>
                  )}
                  {(isEditMode && isAdmin) && (
                    <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Édition Admin</span>
                  )}
                </div>
                <p className="hidden text-xs text-[#706F6C] sm:block">
                  {isViewMode ? 'Consultation de la configuration client' : 'Configurateur sur mesure'}
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

        {/* Main content - Desktop: side by side, Mobile: stacked */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Viewer - Mobile: fixed height, Desktop: flex-1 */}
          <div className="viewer-section relative flex flex-col bg-[#FAFAF9] lg:flex-1">
            {/* Viewer wrapper - prend l'espace disponible */}
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
                  selectedZoneIds={selectedZoneIds}
                  onSelectZone={handleZoneSelect}
                  isBuffet={furnitureStructure?.isBuffet}
                  doorsOpen={doorsOpen}
                  showDecorations={showDecorations}
                  onToggleDoors={handleToggleDoors}
                  componentColors={componentColors}
                  useMultiColor={useMultiColor}
                  doorType={doorType}
                  doorSide={doorSide}
                />

                {/* Sélecteur de couleur pour la zone (tiroir/porte) - apparaît quand une zone colorisable est sélectionnée */}
                {isSelectedZoneColorizable && selectedZone && (
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

                {/* Boutons flottants pour le viewer (Desktop) */}
                <div className="absolute bottom-4 right-4 z-20 hidden flex-col gap-2 lg:flex">
                  {/* TODO: Bouton capture d'écran - désactivé temporairement
                  <button
                    type="button"
                    onClick={handleCaptureScreenshot}
                    className="flex h-10 items-center gap-2 border border-[#E8E6E3] bg-white px-4 text-sm font-medium text-[#706F6C] shadow-sm transition-all hover:border-[#1A1917] hover:text-[#1A1917]"
                    style={{ borderRadius: '2px' }}
                    title="Télécharger une image du meuble"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Capturer</span>
                  </button>
                  */}

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

                {/* Boutons Undo/Redo flottants (Desktop) */}
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

                {generating && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#FAFAF9]/40 backdrop-blur-[1px] z-10">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin border-2 border-[#1A1917] border-t-transparent" style={{ borderRadius: '50%' }} />
                      <p className="text-sm text-[#706F6C]">Mise à jour de la fabrication...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action bar - sous le viewer */}
            {!isViewMode && (
              <div className="hidden flex-shrink-0 lg:block">
                <ActionBar
                  selectedZoneId={selectedZone?.type === 'leaf' ? selectedZoneIds[0] : null}
                />
              </div>
            )}
          </div>

          {/* Panel de configuration - Mobile: scrollable, Desktop: fixed width 620px pour contenir le grand canvas */}
          <div className="flex min-h-0 flex-1 flex-col border-t border-[#E8E6E3] bg-white lg:w-[620px] lg:flex-none lg:border-l lg:border-t-0">
            {isViewMode ? (
              <ConfigurationSummary
                width={width}
                height={height}
                depth={depth}
                finish={finish}
                color={color}
                socle={socle}
                rootZone={rootZone}
                price={price}
                modelName={model?.name}
                isAdmin={isAdmin}
                onEdit={handleAdminEdit}
                priceDisplaySettings={priceDisplaySettings}
              />
            ) : (
              <>
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
                    <div className="space-y-4 pb-32 lg:pb-0">
                      {/* Bouton réinitialiser */}
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
                      />
                      <DimensionsPanel
                        width={width}
                        depth={depth}
                        height={height}
                        onWidthChange={setWidth}
                        onDepthChange={setDepth}
                        onHeightChange={setHeight}
                      />
                      {/* DoorSelector supprimé - Les options de portes sont maintenant dans ZoneControls */}
                      <SocleSelector
                        value={socle}
                        onChange={setSocle}
                      />
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

                {/* Footer avec prix - Desktop: dans le panel */}
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

        {/* Mobile bottom bar - Fixed with price and CTA */}
        {!isViewMode && (
          <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E8E6E3] bg-white px-4 py-3 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              {/* Prix compact */}
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
              {/* Undo/Redo mobile */}
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
              {/* Toggle portes */}
              <button
                type="button"
                onClick={handleToggleDoors}
                className={`flex items-center gap-1.5 border px-3 py-2 text-xs transition-colors ${doorsOpen ? 'border-[#1A1917] bg-[#1A1917] text-white' : 'border-[#E8E6E3] bg-white text-[#706F6C]'}`}
                style={{ borderRadius: '2px' }}
              >
                <span>{doorsOpen ? '🚪' : '📦'}</span>
                <span className="hidden sm:inline">{doorsOpen ? 'Ouvert' : 'Fermé'}</span>
              </button>
              {/* Toggle déco */}
              <button
                type="button"
                onClick={() => setShowDecorations(!showDecorations)}
                className={`flex items-center gap-1.5 border px-3 py-2 text-xs transition-colors ${showDecorations ? 'border-[#1A1917] bg-[#1A1917] text-white' : 'border-[#E8E6E3] bg-white text-[#706F6C]'}`}
                style={{ borderRadius: '2px' }}
              >
                <span>{showDecorations ? '🏺' : '✨'}</span>
                <span className="hidden sm:inline">Déco</span>
              </button>
              {/* CTA */}
              {(!isAdminCreateModel && !isAdminEditModel) ? (
                <button
                  type="button"
                  onClick={saveConfiguration}
                  className="flex h-11 flex-1 max-w-[180px] items-center justify-center gap-2 bg-[#1A1917] text-sm font-medium text-white transition-colors hover:bg-[#2A2927]"
                  style={{ borderRadius: '2px' }}
                >
                  <Box className="h-4 w-4" />
                  <span>
                    {isAdmin ? 'Terminer' : (isAuthenticated ? 'Valider' : 'Enregistrer')}
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

      {/* Dialogue de restauration */}
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
          setTimeout(() => saveConfiguration(), 500);
        }}
      />

      {/* Modal de confirmation après création de modèle (Admin) */}
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
                  ? <>Le modèle <span className="font-semibold text-[#1A1917]">"{modelForm.name}"</span> a été mis à jour avec succès dans le catalogue.</>
                  : <>Votre nouveau modèle <span className="font-semibold text-[#1A1917]">"{modelForm.name}"</span> a été ajouté au catalogue et est désormais visible par tous les clients.</>
                }
              </p>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/admin/dashboard?section=models')}
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
                    onClick={() => router.push('/admin/dashboard')}
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

      {/* Modal de confirmation après configuration */}
      {showConfirmationModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="max-w-md w-full bg-white shadow-2xl" style={{ borderRadius: '4px' }}>
            <div className="p-6 sm:p-8">
              {/* Icône de succès */}
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-green-100" style={{ borderRadius: '50%' }}>
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Message personnalisé */}
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

              {/* Informations complémentaires */}
              {!isAdmin && (
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

              {/* Boutons */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    const isAdminUser = typeof window !== 'undefined' && localStorage.getItem('admin_email');
                    router.push(isAdminUser ? '/admin/dashboard' : '/my-configurations');
                  }}
                  className="flex-1 border-2 border-[#E8E6E3] bg-white px-6 py-3 text-sm font-medium text-[#1A1917] transition-colors hover:border-[#1A1917]"
                  style={{ borderRadius: '2px' }}
                >
                  {typeof window !== 'undefined' && localStorage.getItem('admin_email') ? 'Retour au Dashboard' : 'Mes configurations'}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="flex-1 bg-[#1A1917] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#2A2927]"
                  style={{ borderRadius: '2px' }}
                >
                  Retour à l'accueil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'erreur */}
      {showErrorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="max-w-md w-full bg-white shadow-2xl" style={{ borderRadius: '4px' }}>
            <div className="p-6 sm:p-8">
              {/* Icône d'erreur */}
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-red-100" style={{ borderRadius: '50%' }}>
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              {/* Message d'erreur */}
              <h2 className="mb-4 text-center font-serif text-2xl text-[#1A1917]">
                Erreur
              </h2>
              <div className="mb-6 text-center text-base text-[#706F6C] whitespace-pre-line">
                {errorMessage}
              </div>

              {/* Bouton */}
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

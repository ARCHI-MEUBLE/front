// Modèles de poignées gérés dans l'admin et choix de poignée du configurateur.
//
// Trois niveaux, comme les couleurs :
// 1. Les modèles (table handle_models du backend) : forme, finition, longueur.
// 2. Le choix pour tout le meuble (HandleDefaults, enregistré dans config_data.handles) : un modèle, une orientation
//    pour les portes et une pour les tiroirs.
// 3. Le choix d'une porte ou d'un tiroir en particulier (zone.handleModelId / zone.handleOrientation), qui remplace
//    celui du meuble.
//
// Compatibilité : les configurations enregistrées avant les modèles portent zone.handleType ('vertical_bar',
// 'horizontal_bar', 'knob', 'recessed'). Une zone qui n'a que ce champ garde son ancien rendu et son ancien prix ;
// dès qu'on lui choisit une poignée (ou qu'on applique un choix à tout le meuble), handleType est retiré.

import type { HandleType, Zone, ZoneContent } from '@/components/configurator/ZoneEditor/types';
import { getZoneFacade, isDoorContent, isDrawerContent, isPushContent, isSlidingDoor } from './zoneStats';

export type HandleShape = 'bar' | 'flat_bar' | 'profile' | 'knob' | 'cup' | 'recessed' | 'leather';
export type HandleOrientation = 'horizontal' | 'vertical';
export type HandleFacadeKind = 'door' | 'drawer';

export const HANDLE_SHAPES: HandleShape[] = ['bar', 'flat_bar', 'profile', 'knob', 'cup', 'recessed', 'leather'];

export const HANDLE_SHAPE_LABELS: Record<HandleShape, string> = {
  bar: 'Barre ronde',
  flat_bar: 'Barre plate',
  profile: 'Profilé',
  knob: 'Bouton',
  cup: 'Poignée cuvette',
  recessed: 'Poignée encastrée',
  leather: 'Lanière cuir',
};

export const HANDLE_ORIENTATION_LABELS: Record<HandleOrientation, string> = {
  horizontal: 'Horizontale',
  vertical: 'Verticale',
};

// Modèle tel que renvoyé au configurateur (GET /backend/api/handle-models : modèles actifs seulement)
export interface HandleModel {
  id: number;
  name: string;
  shape: HandleShape;
  finish_hex: string;
  length_mm: number | null;
  // Cotes du plan du fabricant (mm), facultatives : sans elles, la vue 3D prend les proportions de la forme.
  // Entraxe : distance entre les deux vis (perçages de la façade)
  center_distance_mm?: number | null;
  // Largeur vue de face (diamètre d'une barre ronde ou d'un bouton)
  width_mm?: number | null;
  // Saillie : distance entre la façade et l'avant de la poignée
  projection_mm?: number | null;
  image_url: string | null;
  position: number;
}

// Modèle tel que l'admin le voit (GET /backend/api/admin/handle-models), actifs et inactifs
export interface AdminHandleModel extends HandleModel {
  // DECIMAL PostgreSQL : chaîne, comme les prix des échantillons
  price_per_unit: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Choix pour tout le meuble (config_data.handles)
export interface HandleDefaults {
  modelId: number | null;
  doorOrientation: HandleOrientation;
  drawerOrientation: HandleOrientation;
}

export const DEFAULT_HANDLE_DEFAULTS: HandleDefaults = {
  modelId: null,
  doorOrientation: 'vertical',
  drawerOrientation: 'horizontal',
};

// Poignée réellement posée sur une façade
export interface ResolvedHandle {
  // Modèle de l'admin, ou null : rendu historique (legacyType) ou poignée par défaut
  model: HandleModel | null;
  // Ancien type, quand la zone n'a que lui (configuration enregistrée avant les modèles)
  legacyType: HandleType | null;
  orientation: HandleOrientation;
  // La porte ou le tiroir a son propre choix (sinon : celui du meuble)
  customized: boolean;
}

export function isHandleShape(value: unknown): value is HandleShape {
  return typeof value === 'string' && (HANDLE_SHAPES as string[]).includes(value);
}

export function isHandleOrientation(value: unknown): value is HandleOrientation {
  return value === 'horizontal' || value === 'vertical';
}

// Un bouton ou une poignée encastrée ronde n'a ni sens de pose ni longueur
export function shapeHasOrientation(shape: HandleShape | null | undefined): boolean {
  return shape !== 'knob' && shape !== 'recessed';
}

// Poignées qui ne dépassent pas de la façade : les seules possibles sur une porte coulissante, dont les vantaux
// passent l'un devant l'autre
const FLUSH_SHAPES: HandleShape[] = ['cup', 'recessed'];

export function isFlushHandle(model: HandleModel | null | undefined): boolean {
  return !!model && FLUSH_SHAPES.includes(model.shape);
}

// Modèles proposés pour une façade : tous, sauf sur une porte coulissante (encastrés seulement)
export function handleModelsFor(zone: Zone | null, models: HandleModel[]): HandleModel[] {
  return zone && isSlidingDoor(facadeOf(zone)) ? models.filter(isFlushHandle) : models;
}

// La zone porte une porte coulissante (feuille ou groupe)
export function hasSlidingDoor(zone: Zone): boolean {
  return isSlidingDoor(facadeOf(zone));
}

// Cuvette de repli d'une porte coulissante quand ni la porte ni le meuble n'ont de poignée encastrée
export function firstFlushModel(models: HandleModel[]): HandleModel | null {
  return models.find(isFlushHandle) ?? null;
}

// Façade de la zone, comme la dessine la vue 3D (contenu d'une feuille, ou porte posée sur un groupe)
function facadeOf(zone: Zone): ZoneContent | undefined {
  const facade = getZoneFacade(zone);
  if (facade) return facade;
  return zone.type === 'leaf' && isDoorContent(zone.doorContent) ? zone.doorContent : undefined;
}

// 'door' ou 'drawer' si la zone porte une façade avec poignée ; null sans façade ou en ouverture par pression (push)
export function handleFacadeKind(zone: Zone): HandleFacadeKind | null {
  const facade = facadeOf(zone);
  if (!facade || isPushContent(facade)) return null;
  if (isDrawerContent(facade)) return 'drawer';
  return isDoorContent(facade) ? 'door' : null;
}

// Toutes les façades à poignée du meuble (feuilles et portes de groupe), dans l'ordre de l'arbre
export function listHandleFacades(root: Zone): Array<{ zone: Zone; kind: HandleFacadeKind }> {
  const found: Array<{ zone: Zone; kind: HandleFacadeKind }> = [];
  const visit = (zone: Zone) => {
    const kind = handleFacadeKind(zone);
    if (kind) found.push({ zone, kind });
    zone.children?.forEach(visit);
  };
  visit(root);
  return found;
}

// Orientation de l'ancien type ; null pour le bouton et la poignée encastrée (sans sens de pose)
export function legacyOrientation(type: HandleType | undefined | null): HandleOrientation | null {
  if (type === 'vertical_bar') return 'vertical';
  if (type === 'horizontal_bar') return 'horizontal';
  return null;
}

function findModel(models: HandleModel[], id: number | null | undefined): HandleModel | null {
  if (id === null || id === undefined) return null;
  return models.find((model) => model.id === id) ?? null;
}

// Modèle du meuble : celui choisi s'il existe encore (actif), sinon le premier modèle proposé
export function defaultHandleModel(models: HandleModel[], defaults: HandleDefaults): HandleModel | null {
  return findModel(models, defaults.modelId) ?? models[0] ?? null;
}

export function resolveZoneHandle(
  zone: Zone,
  kind: HandleFacadeKind,
  models: HandleModel[],
  defaults: HandleDefaults = DEFAULT_HANDLE_DEFAULTS
): ResolvedHandle {
  const furnitureOrientation = kind === 'drawer' ? defaults.drawerOrientation : defaults.doorOrientation;
  const ownModel = findModel(models, zone.handleModelId);
  const ownOrientation = isHandleOrientation(zone.handleOrientation) ? zone.handleOrientation : null;
  const customized = zone.handleModelId != null || ownOrientation !== null;

  // Porte coulissante : une poignée encastrée seulement. Son propre choix s'il l'est, sinon celui du meuble s'il l'est,
  // sinon la première cuvette de l'admin (aucune : pas de poignée, plutôt qu'une barre qui bloquerait le vantail)
  if (hasSlidingDoor(zone)) {
    const furnitureModel = defaultHandleModel(models, defaults);
    const model = [ownModel, furnitureModel].find(isFlushHandle) ?? firstFlushModel(models);
    return {
      model,
      legacyType: null,
      orientation: ownOrientation ?? furnitureOrientation,
      customized: isFlushHandle(ownModel) || ownOrientation !== null,
    };
  }

  // Ancienne configuration : la zone n'a que handleType, on garde son rendu d'origine
  if (!customized && zone.handleType) {
    return {
      model: null,
      legacyType: zone.handleType,
      orientation: legacyOrientation(zone.handleType) ?? furnitureOrientation,
      customized: true,
    };
  }

  return {
    model: ownModel ?? defaultHandleModel(models, defaults),
    legacyType: null,
    orientation: ownOrientation ?? furnitureOrientation,
    customized,
  };
}

// Chiffre de poignée du texte de génération (« Pg1 », « T2 »…), lu par le générateur Python (qui ne dessine plus les
// poignées) et par la relecture des anciens textes. Émis seulement quand la façade a son propre choix, comme avant.
// 1 verticale, 2 horizontale, 3 bouton, 4 encastrée (ancien type).
export function handlePromptCode(zone: Zone, kind: HandleFacadeKind, models: HandleModel[], defaults: HandleDefaults): string {
  const resolved = resolveZoneHandle(zone, kind, models, defaults);
  if (!resolved.customized) return '';
  if (resolved.legacyType === 'knob' || resolved.model?.shape === 'knob') return '3';
  if (resolved.legacyType === 'recessed' || resolved.model?.shape === 'recessed') return '4';
  return resolved.orientation === 'vertical' ? '1' : '2';
}

// Relecture d'un chiffre de poignée : champs à poser sur la zone (sans modèle : celui du meuble s'applique)
export function zoneHandleFromPromptCode(code: string): Pick<Zone, 'handleOrientation' | 'handleType'> {
  if (code === '1') return { handleOrientation: 'vertical' };
  if (code === '2') return { handleOrientation: 'horizontal' };
  if (code === '3') return { handleType: 'knob' };
  if (code === '4') return { handleType: 'recessed' };
  return {};
}

// config_data.handles relu (configuration enregistrée, lien de partage, sauvegarde locale) : valeurs inconnues ignorées
export function parseHandleDefaults(value: unknown): HandleDefaults {
  if (!value || typeof value !== 'object') return { ...DEFAULT_HANDLE_DEFAULTS };
  const raw = value as Record<string, unknown>;
  const modelId = typeof raw.modelId === 'number' && Number.isInteger(raw.modelId) && raw.modelId > 0 ? raw.modelId : null;
  return {
    modelId,
    doorOrientation: isHandleOrientation(raw.doorOrientation) ? raw.doorOrientation : DEFAULT_HANDLE_DEFAULTS.doorOrientation,
    drawerOrientation: isHandleOrientation(raw.drawerOrientation)
      ? raw.drawerOrientation
      : DEFAULT_HANDLE_DEFAULTS.drawerOrientation,
  };
}

// Retire le choix propre aux zones visées (et l'ancien type) : elles suivent de nouveau le choix du meuble
export function clearZoneHandles(
  root: Zone,
  fields: Array<'model' | 'orientation'>,
  only?: HandleFacadeKind
): Zone {
  const visit = (zone: Zone): Zone => {
    const kind = handleFacadeKind(zone);
    let next = zone;
    if (kind && (!only || only === kind)) {
      next = { ...zone };
      delete next.handleType;
      if (fields.includes('model')) delete next.handleModelId;
      if (fields.includes('orientation')) delete next.handleOrientation;
    }
    if (zone.children) {
      const children = zone.children.map(visit);
      if (children.some((child, index) => child !== zone.children![index])) {
        next = next === zone ? { ...zone } : next;
        next.children = children;
      }
    }
    return next;
  };
  return visit(root);
}

// Pose (ou retire, avec null) le choix propre d'une porte ou d'un tiroir
export function setZoneHandle(
  root: Zone,
  zoneId: string,
  choice: { modelId: number | null; orientation: HandleOrientation | null } | null
): Zone {
  const visit = (zone: Zone): Zone => {
    if (zone.id === zoneId) {
      const next: Zone = { ...zone };
      delete next.handleType;
      delete next.handleModelId;
      delete next.handleOrientation;
      if (choice?.modelId != null) next.handleModelId = choice.modelId;
      if (choice?.orientation) next.handleOrientation = choice.orientation;
      return next;
    }
    if (!zone.children) return zone;
    const children = zone.children.map(visit);
    return children.some((child, index) => child !== zone.children![index]) ? { ...zone, children } : zone;
  };
  return visit(root);
}

// Ligne « Poignées » des récapitulatifs : « Barre ronde noire (verticale) », ou plusieurs modèles séparés par des virgules
export function summarizeHandles(root: Zone, models: HandleModel[], defaults: HandleDefaults): string | null {
  const facades = listHandleFacades(root);
  if (facades.length === 0) return null;
  const labels = new Map<string, number>();
  for (const { zone, kind } of facades) {
    const resolved = resolveZoneHandle(zone, kind, models, defaults);
    const name = resolved.model?.name ?? (resolved.legacyType ? LEGACY_HANDLE_LABELS[resolved.legacyType] : 'Poignée standard');
    const hasOrientation = resolved.model ? shapeHasOrientation(resolved.model.shape) : legacyOrientation(resolved.legacyType) !== null || !resolved.legacyType;
    const label = hasOrientation ? `${name} (${HANDLE_ORIENTATION_LABELS[resolved.orientation].toLowerCase()})` : name;
    labels.set(label, (labels.get(label) ?? 0) + 1);
  }
  return Array.from(labels, ([label, count]) => (labels.size > 1 ? `${label} ×${count}` : label)).join(', ');
}

export const LEGACY_HANDLE_LABELS: Record<HandleType, string> = {
  vertical_bar: 'Barre verticale',
  horizontal_bar: 'Barre horizontale',
  knob: 'Bouton',
  recessed: 'Poignée encastrée',
};

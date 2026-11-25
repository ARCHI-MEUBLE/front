import { describe, expect, it } from 'vitest';
import type { Zone } from '@/components/configurator/ZoneEditor/types';
import {
  clearZoneHandles,
  DEFAULT_HANDLE_DEFAULTS,
  handleFacadeKind,
  handlePromptCode,
  listHandleFacades,
  parseHandleDefaults,
  resolveZoneHandle,
  setZoneHandle,
  shapeHasOrientation,
  summarizeHandles,
  zoneHandleFromPromptCode,
  type HandleModel,
} from './handles';

const BAR: HandleModel = { id: 1, name: 'Barre ronde noire', shape: 'bar', finish_hex: '#1C1C1C', length_mm: 160, image_url: null, position: 1 };
const BRASS: HandleModel = { id: 2, name: 'Barre plate laiton', shape: 'flat_bar', finish_hex: '#B08D57', length_mm: 192, image_url: null, position: 2 };
const KNOB: HandleModel = { id: 3, name: 'Bouton', shape: 'knob', finish_hex: '#C9CCCF', length_mm: null, image_url: null, position: 3 };
const MODELS = [BAR, BRASS, KNOB];

const leaf = (id: string, extra: Partial<Zone> = {}): Zone => ({ id, type: 'leaf', ...extra });

// Une porte de groupe sur deux étagères, un tiroir, une porte push et une niche
const furniture = (): Zone => ({
  id: 'root',
  type: 'vertical',
  children: [
    { id: 'group', type: 'horizontal', doorContent: 'door', children: [leaf('a', { content: 'shelf' }), leaf('b', { content: 'shelf' })] },
    leaf('drawer', { content: 'drawer' }),
    leaf('push', { content: 'push_door' }),
    leaf('niche', { content: 'niche' }),
    leaf('double', { content: 'door_double' }),
  ],
});

describe('handleFacadeKind', () => {
  it('finds doors (leaf or group) and drawers, never push fronts or niches', () => {
    expect(handleFacadeKind(leaf('x', { content: 'door' }))).toBe('door');
    expect(handleFacadeKind(leaf('x', { content: 'mirror_door_right' }))).toBe('door');
    expect(handleFacadeKind(leaf('x', { content: 'drawer' }))).toBe('drawer');
    expect(handleFacadeKind(leaf('x', { content: 'push_drawer' }))).toBeNull();
    expect(handleFacadeKind(leaf('x', { content: 'push_door' }))).toBeNull();
    expect(handleFacadeKind(leaf('x', { content: 'niche' }))).toBeNull();
    expect(handleFacadeKind({ id: 'g', type: 'vertical', doorContent: 'door_right', children: [] })).toBe('door');
    expect(handleFacadeKind({ id: 'g', type: 'vertical', doorContent: 'push_door', children: [] })).toBeNull();
  });

  it('lists every front with a handle', () => {
    expect(listHandleFacades(furniture()).map((f) => `${f.zone.id}:${f.kind}`)).toEqual(['group:door', 'drawer:drawer', 'double:door']);
  });
});

describe('resolveZoneHandle', () => {
  it('follows the furniture choice: model and orientation by front type', () => {
    const defaults = { modelId: 2, doorOrientation: 'horizontal' as const, drawerOrientation: 'vertical' as const };
    expect(resolveZoneHandle(leaf('d', { content: 'door' }), 'door', MODELS, defaults)).toEqual({
      model: BRASS,
      legacyType: null,
      orientation: 'horizontal',
      customized: false,
    });
    expect(resolveZoneHandle(leaf('t', { content: 'drawer' }), 'drawer', MODELS, defaults).orientation).toBe('vertical');
  });

  it('uses the first model when none (or a removed one) is chosen', () => {
    expect(resolveZoneHandle(leaf('d', { content: 'door' }), 'door', MODELS, DEFAULT_HANDLE_DEFAULTS).model).toBe(BAR);
    expect(resolveZoneHandle(leaf('d', { content: 'door' }), 'door', MODELS, { ...DEFAULT_HANDLE_DEFAULTS, modelId: 99 }).model).toBe(BAR);
    expect(resolveZoneHandle(leaf('d', { content: 'door' }), 'door', [], DEFAULT_HANDLE_DEFAULTS).model).toBeNull();
  });

  it('lets a front override the model, the orientation, or both', () => {
    const zone = leaf('d', { content: 'door', handleModelId: 3, handleOrientation: 'horizontal' });
    expect(resolveZoneHandle(zone, 'door', MODELS, DEFAULT_HANDLE_DEFAULTS)).toEqual({
      model: KNOB,
      legacyType: null,
      orientation: 'horizontal',
      customized: true,
    });
    const onlyOrientation = leaf('d', { content: 'door', handleOrientation: 'horizontal' });
    expect(resolveZoneHandle(onlyOrientation, 'door', MODELS, { ...DEFAULT_HANDLE_DEFAULTS, modelId: 2 }).model).toBe(BRASS);
  });

  it('keeps the legacy look of a front saved before handle models', () => {
    expect(resolveZoneHandle(leaf('d', { content: 'door', handleType: 'horizontal_bar' }), 'door', MODELS, DEFAULT_HANDLE_DEFAULTS)).toEqual({
      model: null,
      legacyType: 'horizontal_bar',
      orientation: 'horizontal',
      customized: true,
    });
  });
});

describe('prompt code', () => {
  it('is only written for fronts with their own choice, as before', () => {
    expect(handlePromptCode(leaf('d', { content: 'door' }), 'door', MODELS, DEFAULT_HANDLE_DEFAULTS)).toBe('');
    expect(handlePromptCode(leaf('d', { content: 'door', handleOrientation: 'vertical' }), 'door', MODELS, DEFAULT_HANDLE_DEFAULTS)).toBe('1');
    expect(handlePromptCode(leaf('d', { content: 'drawer', handleModelId: 2, handleOrientation: 'horizontal' }), 'drawer', MODELS, DEFAULT_HANDLE_DEFAULTS)).toBe('2');
    expect(handlePromptCode(leaf('d', { content: 'door', handleModelId: 3 }), 'door', MODELS, DEFAULT_HANDLE_DEFAULTS)).toBe('3');
    expect(handlePromptCode(leaf('d', { content: 'door', handleType: 'recessed' }), 'door', MODELS, DEFAULT_HANDLE_DEFAULTS)).toBe('4');
  });

  it('reads the codes back', () => {
    expect(zoneHandleFromPromptCode('1')).toEqual({ handleOrientation: 'vertical' });
    expect(zoneHandleFromPromptCode('2')).toEqual({ handleOrientation: 'horizontal' });
    expect(zoneHandleFromPromptCode('3')).toEqual({ handleType: 'knob' });
    expect(zoneHandleFromPromptCode('4')).toEqual({ handleType: 'recessed' });
    expect(zoneHandleFromPromptCode('7')).toEqual({});
  });
});

describe('shapes', () => {
  const RECESSED: HandleModel = { id: 4, name: 'Encastrée', shape: 'recessed', finish_hex: '#B08D57', length_mm: null, image_url: null, position: 4 };
  const CUP: HandleModel = { id: 5, name: 'Cuvette', shape: 'cup', finish_hex: '#C9CCCF', length_mm: 92, image_url: null, position: 5 };
  const LEATHER: HandleModel = { id: 6, name: 'Cuir', shape: 'leather', finish_hex: '#A9703F', length_mm: 224, image_url: null, position: 6 };

  it('gives a direction to every shape but the knob and the round recessed pull', () => {
    expect(['bar', 'flat_bar', 'profile', 'cup', 'leather'].every((shape) => shapeHasOrientation(shape as HandleModel['shape']))).toBe(true);
    expect(shapeHasOrientation('knob')).toBe(false);
    expect(shapeHasOrientation('recessed')).toBe(false);
  });

  it('writes the recessed code for a recessed model and a directional code for the others', () => {
    const own = (modelId: number) => leaf('d', { content: 'door', handleModelId: modelId });
    const models = [RECESSED, CUP, LEATHER];
    expect(handlePromptCode(own(4), 'door', models, DEFAULT_HANDLE_DEFAULTS)).toBe('4');
    expect(handlePromptCode(own(5), 'door', models, DEFAULT_HANDLE_DEFAULTS)).toBe('1');
    expect(handlePromptCode(own(6), 'door', models, DEFAULT_HANDLE_DEFAULTS)).toBe('1');
  });
});

describe('parseHandleDefaults', () => {
  it('keeps valid values and drops the rest', () => {
    expect(parseHandleDefaults({ modelId: 4, doorOrientation: 'horizontal', drawerOrientation: 'vertical' })).toEqual({
      modelId: 4,
      doorOrientation: 'horizontal',
      drawerOrientation: 'vertical',
    });
    expect(parseHandleDefaults({ modelId: '4', doorOrientation: 'diagonal' })).toEqual(DEFAULT_HANDLE_DEFAULTS);
    expect(parseHandleDefaults(null)).toEqual(DEFAULT_HANDLE_DEFAULTS);
    expect(parseHandleDefaults({ modelId: -1 })).toEqual(DEFAULT_HANDLE_DEFAULTS);
  });
});

describe('editing', () => {
  it('sets and resets the handle of one front, dropping the legacy type', () => {
    const root = furniture();
    root.children![1] = leaf('drawer', { content: 'drawer', handleType: 'knob' });
    const set = setZoneHandle(root, 'drawer', { modelId: 2, orientation: 'vertical' });
    expect(set.children![1]).toEqual(leaf('drawer', { content: 'drawer', handleModelId: 2, handleOrientation: 'vertical' }));
    expect(set.children![0]).toBe(root.children![0]);
    expect(setZoneHandle(set, 'drawer', null).children![1]).toEqual(leaf('drawer', { content: 'drawer' }));
  });

  it('clears own choices on the targeted fronts only', () => {
    let root = furniture();
    root = setZoneHandle(root, 'group', { modelId: 3, orientation: 'horizontal' });
    root = setZoneHandle(root, 'drawer', { modelId: 2, orientation: 'vertical' });
    const doorsReset = clearZoneHandles(root, ['orientation'], 'door');
    expect(doorsReset.children![0]).toMatchObject({ handleModelId: 3 });
    expect(doorsReset.children![0].handleOrientation).toBeUndefined();
    expect(doorsReset.children![1]).toMatchObject({ handleModelId: 2, handleOrientation: 'vertical' });
    const allModels = clearZoneHandles(root, ['model']);
    expect(listHandleFacades(allModels).some((f) => f.zone.handleModelId !== undefined)).toBe(false);
  });
});

describe('summarizeHandles', () => {
  it('names the models used, with orientation and counts when mixed', () => {
    const defaults = { modelId: 1, doorOrientation: 'vertical' as const, drawerOrientation: 'horizontal' as const };
    expect(summarizeHandles(leaf('d', { content: 'door' }), MODELS, defaults)).toBe('Barre ronde noire (verticale)');
    expect(summarizeHandles(furniture(), MODELS, defaults)).toBe('Barre ronde noire (verticale) ×2, Barre ronde noire (horizontale) ×1');
    const knobbed = setZoneHandle(leaf('d', { content: 'door' }), 'd', { modelId: 3, orientation: null });
    expect(summarizeHandles(knobbed, MODELS, defaults)).toBe('Bouton');
    expect(summarizeHandles(leaf('x', { content: 'push_door' }), MODELS, defaults)).toBeNull();
  });
});

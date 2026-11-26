import { describe, expect, it } from 'vitest';
import type { Zone } from '@/components/configurator/ZoneEditor/types';
import { DEFAULT_HANDLE_DEFAULTS, type HandleDefaults, type HandleModel } from './handles';
import { leafHandleFromPrompt, matchGroupDoor, zoneFacadeCodes } from './promptHandles';

const BAR: HandleModel = { id: 1, name: 'Barre ronde noire', shape: 'bar', finish_hex: '#1C1C1C', length_mm: 160, image_url: null, position: 1 };
const KNOB: HandleModel = { id: 3, name: 'Bouton', shape: 'knob', finish_hex: '#C9CCCF', length_mm: null, image_url: null, position: 3 };
const MODELS = [BAR, KNOB];
const DEFAULTS: HandleDefaults = { ...DEFAULT_HANDLE_DEFAULTS, modelId: BAR.id };

const leaf = (id: string, extra: Partial<Zone> = {}): Zone => ({ id, type: 'leaf', ...extra });
const codes = (zone: Zone) => zoneFacadeCodes(zone, MODELS, DEFAULTS);

describe('zoneFacadeCodes', () => {
  it('writes no handle digit when the front follows the furniture', () => {
    expect(codes(leaf('a', { content: 'door' }))).toEqual({ door: 'Pg', leaf: '' });
    expect(codes(leaf('a', { content: 'drawer' }))).toEqual({ door: '', leaf: 'T' });
    expect(codes(leaf('a', { content: 'door_double' }))).toEqual({ door: 'P2', leaf: '' });
  });

  it('writes the digit right after the front that carries the handle', () => {
    expect(codes(leaf('a', { content: 'door', handleOrientation: 'vertical' })).door).toBe('Pg1');
    expect(codes(leaf('a', { content: 'door_double', handleOrientation: 'horizontal' })).door).toBe('P22');
    expect(codes(leaf('a', { content: 'mirror_door_right', handleModelId: KNOB.id })).door).toBe('Pm3');
    expect(codes(leaf('a', { content: 'drawer', handleOrientation: 'horizontal' }))).toEqual({ door: '', leaf: 'T2' });
    // Ancien type seul : son chiffre d'origine
    expect(codes(leaf('a', { content: 'drawer', handleType: 'recessed' })).leaf).toBe('T4');
  });

  it('puts the digit of a group door after its code', () => {
    const group: Zone = { id: 'g', type: 'horizontal', doorContent: 'door_right', handleOrientation: 'horizontal', children: [leaf('g-0'), leaf('g-1')] };
    expect(codes(group)).toEqual({ door: 'Pd2', leaf: '' });
  });

  it('never writes a digit on push fronts or on the door of the whole furniture', () => {
    expect(codes(leaf('a', { content: 'push_door', handleOrientation: 'vertical' }))).toEqual({ door: 'Po', leaf: '' });
    expect(codes(leaf('a', { content: 'push_drawer', handleOrientation: 'vertical' }))).toEqual({ door: '', leaf: 'To' });
    expect(codes(leaf('root', { content: 'door', handleOrientation: 'vertical' }))).toEqual({ door: '', leaf: '' });
  });
});

describe('matchGroupDoor', () => {
  it('reads a double door without taking its 2 for a handle digit', () => {
    expect(matchGroupDoor('P2(H2(,))')).toEqual({ doorContent: 'door_double', handle: {}, ratios: undefined, inner: 'H2(,)' });
  });

  it('reads the handle digit written after the door code', () => {
    expect(matchGroupDoor('P21(H2(,))')).toMatchObject({ doorContent: 'door_double', handle: { handleOrientation: 'vertical' }, inner: 'H2(,)' });
    expect(matchGroupDoor('Pg1(V2(,))')).toMatchObject({ doorContent: 'door', handle: { handleOrientation: 'vertical' }, inner: 'V2(,)' });
    expect(matchGroupDoor('P1(V2(,))')).toMatchObject({ doorContent: 'door', handle: { handleOrientation: 'vertical' } });
    expect(matchGroupDoor('Pd3(V2(,))')).toMatchObject({ doorContent: 'door_right', handle: { handleType: 'knob' } });
  });

  it('reads a group without door and legacy ratios', () => {
    expect(matchGroupDoor('G(H2(,))')).toMatchObject({ doorContent: undefined, handle: {}, inner: 'H2(,)' });
    expect(matchGroupDoor('Pg[30,70](H2(,))')).toMatchObject({ doorContent: 'door', ratios: '30,70', inner: 'H2(,)' });
  });

  it('ignores anything that is not a group door', () => {
    expect(matchGroupDoor('H2(T,T)')).toBeNull();
    expect(matchGroupDoor('Pg1')).toBeNull();
  });

  it('reads back what zoneFacadeCodes writes', () => {
    const group: Zone = { id: 'g', type: 'horizontal', doorContent: 'door_double', handleOrientation: 'vertical', children: [] };
    expect(matchGroupDoor(`${codes(group).door}(H2(,))`)?.handle).toEqual({ handleOrientation: 'vertical' });
  });
});

describe('leafHandleFromPrompt', () => {
  it('reads the digit after a drawer or a door with a handle', () => {
    expect(leafHandleFromPrompt('T2')).toEqual({ handleOrientation: 'horizontal' });
    expect(leafHandleFromPrompt('Pg1c')).toEqual({ handleOrientation: 'vertical' });
    expect(leafHandleFromPrompt('P21')).toEqual({ handleOrientation: 'vertical' });
    expect(leafHandleFromPrompt('Pm4')).toEqual({ handleType: 'recessed' });
  });

  it('finds no digit on plain fronts', () => {
    expect(leafHandleFromPrompt('P2')).toEqual({});
    expect(leafHandleFromPrompt('Pg')).toEqual({});
    expect(leafHandleFromPrompt('To')).toEqual({});
    expect(leafHandleFromPrompt('')).toEqual({});
  });
});

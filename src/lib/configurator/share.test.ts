import { describe, expect, it } from 'vitest';
import { configDataToRestore, configurationShareUrl } from './share';

describe('configurationShareUrl', () => {
  it('opens the configurator of the model with the share code', () => {
    expect(configurationShareUrl('https://archimeuble.com', '12', 'Ab3dEf7h')).toBe(
      'https://archimeuble.com/configurator/12?partage=Ab3dEf7h'
    );
  });

  it('keeps a template id (no model) in the path', () => {
    expect(configurationShareUrl('http://localhost:3000', 'M2', 'Zz9yXx8w')).toBe(
      'http://localhost:3000/configurator/M2?partage=Zz9yXx8w'
    );
  });
});

describe('configDataToRestore', () => {
  it('reads the saved format back into configurator values', () => {
    const rootZone = { id: 'root', type: 'leaf', content: 'drawer' };
    const restored = configDataToRestore({
      dimensions: { width: 1500, height: 730, depth: 400 },
      styling: { socle: 'wood', finish: 'Mat', color: '#ffffff', colorLabel: 'Blanc', selectedColorId: 4 },
      features: { doorType: 'single', doorSide: 'right', mountingStyle: 'encastre' },
      advancedZones: rootZone,
      useMultiColor: false,
      deletedPanelIds: ['left'],
    });
    expect(restored).toMatchObject({
      width: 1500,
      height: 730,
      depth: 400,
      socle: 'wood',
      rootZone,
      colorLabel: 'Blanc',
      selectedColorId: 4,
      doorSide: 'right',
      mountingStyle: 'encastre',
      deletedPanelIds: ['left'],
    });
  });

  it('defaults to no base when the format has none', () => {
    expect(configDataToRestore({}).socle).toBe('none');
  });

  it('restores the installation only when it was chosen', () => {
    expect(configDataToRestore({ features: { installation: true } }).installation).toBe(true);
    expect(configDataToRestore({ features: { installation: false } }).installation).toBe(false);
    // Modèle du catalogue, configuration d'avant l'option, valeur illisible : sans pose
    expect(configDataToRestore({ features: { doorType: 'none' } }).installation).toBe(false);
    expect(configDataToRestore({}).installation).toBe(false);
    expect(configDataToRestore({ features: { installation: 'true' } }).installation).toBe(false);
  });

  it('reads the handles chosen for the whole furniture', () => {
    expect(configDataToRestore({ handles: { modelId: 2, doorOrientation: 'horizontal', drawerOrientation: 'vertical' } }).handleDefaults).toEqual({
      modelId: 2,
      doorOrientation: 'horizontal',
      drawerOrientation: 'vertical',
    });
  });

  it('falls back to the default handles for configurations saved before handle models', () => {
    expect(configDataToRestore({}).handleDefaults).toEqual({ modelId: null, doorOrientation: 'vertical', drawerOrientation: 'horizontal' });
    expect(configDataToRestore({ handles: { modelId: 'x', doorOrientation: 'sideways' } }).handleDefaults).toEqual({
      modelId: null,
      doorOrientation: 'vertical',
      drawerOrientation: 'horizontal',
    });
  });
});

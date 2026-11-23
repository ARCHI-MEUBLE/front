import { afterEach, describe, expect, it, vi } from 'vitest';
import { arLaunchPlan, checkArSupport, checkCameraAccess, isWebXrVerdictReliable } from './arReadiness';

const setNavigator = (key: string, value: unknown) => Object.defineProperty(navigator, key, { value, configurable: true });

afterEach(() => {
  setNavigator('xr', undefined);
  setNavigator('mediaDevices', undefined);
});

describe('arLaunchPlan', () => {
  it('offers the camera when the phone supports AR and the camera answers', () => {
    expect(arLaunchPlan({ ar: 'supported', camera: 'granted' })).toEqual({ offerAr: true, canRecheck: false });
  });

  it('still offers the camera when the browser cannot tell (Firefox, Samsung Internet)', () => {
    expect(arLaunchPlan({ ar: 'unknown', camera: 'unknown' }).offerAr).toBe(true);
  });

  it('falls back to 3D without ARCore or without a rear camera', () => {
    expect(arLaunchPlan({ ar: 'unsupported', camera: 'granted' }).offerAr).toBe(false);
    expect(arLaunchPlan({ ar: 'supported', camera: 'missing' }).offerAr).toBe(false);
  });

  it('lets the visitor allow the camera again after a refusal', () => {
    expect(arLaunchPlan({ ar: 'supported', camera: 'denied' })).toEqual({ offerAr: false, canRecheck: true });
  });
});

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko)';
const CHROME = `${ANDROID} Chrome/138.0.0.0 Mobile Safari/537.36`;

describe('isWebXrVerdictReliable', () => {
  it('trusts only Google Chrome to say the phone has no ARCore', () => {
    expect(isWebXrVerdictReliable(CHROME, false)).toBe(true);
    expect(isWebXrVerdictReliable(`${CHROME} EdgA/138.0.3351.65`, false)).toBe(false);
    expect(isWebXrVerdictReliable(`${ANDROID} SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36`, false)).toBe(false);
    expect(isWebXrVerdictReliable(`${CHROME} OPR/90.0.0.0`, false)).toBe(false);
    expect(isWebXrVerdictReliable('Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 Chrome/138.0.0.0 Mobile Safari/537.36', false)).toBe(false);
    expect(isWebXrVerdictReliable('Mozilla/5.0 (Android 15; Mobile; rv:141.0) Gecko/141.0 Firefox/141.0', false)).toBe(false);
    // Brave : identifiant de Chrome, reconnu à navigator.brave
    expect(isWebXrVerdictReliable(CHROME, true)).toBe(false);
  });
});

describe('checkArSupport', () => {
  // Retire l'identifiant posé par le test : celui de jsdom (sur le prototype) reprend la main
  afterEach(() => Reflect.deleteProperty(navigator, 'userAgent'));

  it('reads ARCore support from WebXR in Chrome', async () => {
    setNavigator('userAgent', CHROME);
    setNavigator('xr', { isSessionSupported: vi.fn().mockResolvedValue(false) });
    expect(await checkArSupport()).toBe('unsupported');
    setNavigator('xr', { isSessionSupported: vi.fn().mockResolvedValue(true) });
    expect(await checkArSupport()).toBe('supported');
  });

  it('does not take a "no" from another browser for a phone without ARCore', async () => {
    setNavigator('userAgent', `${CHROME} EdgA/138.0.3351.65`);
    setNavigator('xr', { isSessionSupported: vi.fn().mockResolvedValue(false) });
    expect(await checkArSupport()).toBe('unknown');
  });

  it('cannot tell without WebXR', async () => {
    expect(await checkArSupport()).toBe('unknown');
  });
});

describe('checkCameraAccess', () => {
  it('turns the camera off right after the permission', async () => {
    const stop = vi.fn();
    setNavigator('mediaDevices', { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }) });
    expect(await checkCameraAccess()).toBe('granted');
    expect(stop).toHaveBeenCalled();
  });

  it('tells a refusal from a missing camera', async () => {
    const refuse = (name: string) => vi.fn().mockRejectedValue(Object.assign(new Error(name), { name }));
    setNavigator('mediaDevices', { getUserMedia: refuse('NotAllowedError') });
    expect(await checkCameraAccess()).toBe('denied');
    setNavigator('mediaDevices', { getUserMedia: refuse('NotFoundError') });
    expect(await checkCameraAccess()).toBe('missing');
  });
});

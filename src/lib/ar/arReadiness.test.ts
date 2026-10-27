import { afterEach, describe, expect, it, vi } from 'vitest';
import { arLaunchPlan, checkArSupport, checkCameraAccess } from './arReadiness';

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

describe('checkArSupport', () => {
  it('reads ARCore support from WebXR', async () => {
    setNavigator('xr', { isSessionSupported: vi.fn().mockResolvedValue(false) });
    expect(await checkArSupport()).toBe('unsupported');
    setNavigator('xr', { isSessionSupported: vi.fn().mockResolvedValue(true) });
    expect(await checkArSupport()).toBe('supported');
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

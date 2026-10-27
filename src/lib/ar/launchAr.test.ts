import { describe, expect, it } from 'vitest';
import { arPlatformFor, type BrowserTraits } from './launchAr';

const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko)';

const iphone = (suffix: string, inWebView = true): BrowserTraits => ({
  userAgent: `${IOS} ${suffix}`,
  platform: 'iPhone',
  maxTouchPoints: 5,
  inWebView,
  supportsArLinks: !inWebView,
});
const android = (userAgent: string): BrowserTraits => ({
  userAgent,
  platform: 'Linux armv8l',
  maxTouchPoints: 5,
  inWebView: false,
  supportsArLinks: false,
});
const desktop = (userAgent: string, platform = 'Win32'): BrowserTraits => ({
  userAgent,
  platform,
  maxTouchPoints: 0,
  inWebView: false,
  supportsArLinks: false,
});

describe('arPlatformFor', () => {
  it('opens Quick Look in Safari and the main iPhone browsers', () => {
    expect(arPlatformFor(iphone('Version/18.5 Mobile/15E148 Safari/604.1', false))).toBe('quick-look');
    expect(arPlatformFor(iphone('CriOS/138.0.7204.156 Mobile/15E148 Safari/604.1'))).toBe('quick-look');
    expect(arPlatformFor(iphone('FxiOS/141.0 Mobile/15E148 Safari/605.1.15'))).toBe('quick-look');
    expect(arPlatformFor(iphone('EdgiOS/138.0.3351.83 Mobile/15E148 Safari/605.1.15'))).toBe('quick-look');
    expect(arPlatformFor(iphone('Mobile/15E148 DuckDuckGo/7 Safari/605.1.15'))).toBe('quick-look');
  });

  it('recognises an iPad, which presents itself as a Mac, by its touch screen', () => {
    const ipad: BrowserTraits = { ...desktop(`${MAC} Version/18.5 Safari/605.1.15`, 'MacIntel'), maxTouchPoints: 5, supportsArLinks: true };
    expect(arPlatformFor(ipad)).toBe('quick-look');
    expect(arPlatformFor({ ...ipad, maxTouchPoints: 0 })).toBeNull();
  });

  it('leaves out the Google app and the web views of other apps, where Quick Look does not open', () => {
    expect(arPlatformFor(iphone('GSA/380.0.785196451 Mobile/15E148 Safari/604.1'))).toBeNull();
    expect(arPlatformFor(iphone('Mobile/22F76 Instagram 385.0.0.21.86 (iPhone15,2; iOS 18_5; fr_FR)'))).toBeNull();
  });

  it('opens Scene Viewer from every Android browser, Firefox included', () => {
    expect(arPlatformFor(android(`${ANDROID} Chrome/138.0.0.0 Mobile Safari/537.36`))).toBe('scene-viewer');
    expect(arPlatformFor(android('Mozilla/5.0 (Android 15; Mobile; rv:141.0) Gecko/141.0 Firefox/141.0'))).toBe('scene-viewer');
    expect(
      arPlatformFor(android(`${ANDROID} SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36`))
    ).toBe('scene-viewer');
    expect(arPlatformFor(android(`${ANDROID} Chrome/138.0.0.0 Mobile Safari/537.36 EdgA/138.0.3351.65`))).toBe('scene-viewer');
    // Tablette : pas de « Mobile » dans l'identifiant
    expect(arPlatformFor(android('Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36'))).toBe(
      'scene-viewer'
    );
  });

  it('has no phone AR on a headset or a computer', () => {
    expect(arPlatformFor(android('Mozilla/5.0 (Linux; Android 12; Quest 3) OculusBrowser/37.0.0 Chrome/132.0 VR Safari/537.36'))).toBeNull();
    expect(arPlatformFor(desktop('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/138.0.0.0 Safari/537.36'))).toBeNull();
    expect(arPlatformFor(desktop('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0'))).toBeNull();
    expect(arPlatformFor({ ...desktop(`${MAC} Version/18.5 Safari/605.1.15`, 'MacIntel'), supportsArLinks: true })).toBeNull();
  });
});

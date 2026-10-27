import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QUICK_CLOSE_MS, arPlatformFor, openSceneViewer, type BrowserTraits } from './launchAr';

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

describe('openSceneViewer', () => {
  const GLB = 'https://www.archimeuble.com/api/ar-model/ar_0123abcd.glb';
  let visibility: DocumentVisibilityState;
  let clicked: string[];

  const setVisibility = (state: DocumentVisibilityState) => {
    visibility = state;
    document.dispatchEvent(new Event('visibilitychange'));
  };

  beforeEach(() => {
    vi.useFakeTimers();
    visibility = 'visible';
    clicked = [];
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this.href);
    });
    vi.spyOn(window.history, 'back').mockImplementation(() => {});
  });

  afterEach(() => {
    // Termine le suivi du dernier lancement avant le test suivant
    vi.advanceTimersByTime(60000);
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.location.hash = '';
  });

  it('opens Scene Viewer through the Google app, in AR when possible and in 3D otherwise', () => {
    openSceneViewer(GLB, 'Votre meuble', () => {});
    expect(clicked).toHaveLength(1);
    const [link] = clicked;
    expect(link).toMatch(/^intent:\/\/arvr\.google\.com\/scene-viewer\/1\.2\?/);
    expect(link).toContain('package=com.google.android.googlequicksearchbox');
    expect(link).toContain('mode=ar_preferred');
    expect(link).toContain(`file=${encodeURIComponent(GLB)}`);
    expect(link).toContain('S.browser_fallback_url=');
  });

  it('does not launch a model served over http, which Scene Viewer cannot download', () => {
    const onIssue = vi.fn();
    openSceneViewer('http://192.168.1.20:3000/api/ar-model/ar_0123abcd.glb', 'Votre meuble', onIssue);
    expect(clicked).toHaveLength(0);
    expect(onIssue).toHaveBeenCalledWith('needs-https');
  });

  it('reports that nothing opened when the page stays on screen', () => {
    const onIssue = vi.fn();
    openSceneViewer(GLB, 'Votre meuble', onIssue);
    vi.advanceTimersByTime(4000);
    expect(onIssue).toHaveBeenLastCalledWith('not-opened');
  });

  it('reports a viewer that closes right after opening, not one the visitor used', () => {
    const quick = vi.fn();
    openSceneViewer(GLB, 'Votre meuble', quick);
    setVisibility('hidden');
    expect(quick).toHaveBeenLastCalledWith(null);
    vi.advanceTimersByTime(QUICK_CLOSE_MS - 1000);
    setVisibility('visible');
    expect(quick).toHaveBeenLastCalledWith('closed');

    const used = vi.fn();
    openSceneViewer(GLB, 'Votre meuble', used);
    setVisibility('hidden');
    vi.advanceTimersByTime(20000);
    setVisibility('visible');
    expect(used).toHaveBeenCalledTimes(1);
    expect(used).toHaveBeenLastCalledWith(null);
  });

  it('goes back only once when the browser falls back after several launches', () => {
    const first = vi.fn();
    const second = vi.fn();
    openSceneViewer(GLB, 'Votre meuble', first);
    openSceneViewer(GLB, 'Votre meuble', second);
    window.location.hash = '#ar-indisponible';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(window.history.back).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('unavailable');
  });
});

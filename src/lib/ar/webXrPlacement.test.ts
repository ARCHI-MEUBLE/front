import { describe, expect, it, vi } from 'vitest';
import type * as THREE from 'three';
import { setSessionWithoutLayers } from './webXrPlacement';

// Comme dans Chrome : les propriétés de l'état de rendu sont des accesseurs du prototype, pas des propriétés propres
class FakeRenderState {
  get layers() {
    return [];
  }
  get depthNear() {
    return 0.1;
  }
}

class FakeSession {
  private state = new FakeRenderState();
  get renderState() {
    return this.state;
  }
}

const rendererWith = (setSession: (session: XRSession) => Promise<void>) => ({ xr: { setSession } }) as unknown as THREE.WebGLRenderer;

describe('setSessionWithoutLayers', () => {
  it('hides WebXR Layers from Three.js during setSession only', async () => {
    const session = new FakeSession() as unknown as XRSession;
    const seen: unknown[] = [];
    await setSessionWithoutLayers(
      rendererWith(async (s) => {
        seen.push(s.renderState.layers, s.renderState.depthNear);
      }),
      session,
    );

    expect(seen).toEqual([undefined, 0.1]);
    expect(session.renderState.layers).toEqual([]);
    expect(Object.prototype.hasOwnProperty.call(session, 'renderState')).toBe(false);
  });

  it('restores the render state when setSession fails', async () => {
    const session = new FakeSession() as unknown as XRSession;
    const failing = rendererWith(vi.fn().mockRejectedValue(new Error('makeXRCompatible')));

    await expect(setSessionWithoutLayers(failing, session)).rejects.toThrow('makeXRCompatible');
    expect(session.renderState.layers).toEqual([]);
  });
});

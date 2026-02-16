// Types partagés pour le configurateur

// Type pour les méthodes exposées par le composant ThreeCanvas
export interface ThreeCanvasHandle {
  captureScreenshot: () => string | null;
}

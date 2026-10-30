import type { DetailedHTMLProps, HTMLAttributes } from 'react';

interface ModelViewerAttributes extends HTMLAttributes<HTMLElement> {
  src?: string;
  alt?: string;
  'auto-rotate'?: boolean;
  'camera-controls'?: boolean;
  'touch-action'?: string;
  'interaction-prompt'?: string;
  ar?: boolean;
  'ar-modes'?: string;
  exposure?: string;
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<ModelViewerAttributes, HTMLElement>;
    }
  }
}

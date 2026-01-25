/**
 * Utilitaire de sanitization SVG
 *
 * SÉCURITÉ: Nettoie le contenu SVG pour prévenir les attaques XSS
 * Ne permet que les éléments et attributs SVG sûrs
 */

// Éléments SVG autorisés (liste blanche stricte)
const ALLOWED_SVG_ELEMENTS = new Set([
  'svg',
  'path',
  'circle',
  'ellipse',
  'line',
  'polygon',
  'polyline',
  'rect',
  'g',
  'defs',
  'clipPath',
  'mask',
  'pattern',
  'linearGradient',
  'radialGradient',
  'stop',
  'use',
  'symbol',
  'text',
  'tspan',
  'title',
  'desc',
]);

// Attributs SVG autorisés (liste blanche stricte)
const ALLOWED_SVG_ATTRIBUTES = new Set([
  // Attributs généraux
  'id',
  'class',
  'style',
  'transform',
  'opacity',
  'visibility',

  // Attributs de dimension/position
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'width',
  'height',
  'viewBox',
  'preserveAspectRatio',

  // Attributs de chemin
  'd',
  'points',

  // Attributs de style
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-miterlimit',

  // Attributs de gradient
  'offset',
  'stop-color',
  'stop-opacity',
  'gradientUnits',
  'gradientTransform',
  'spreadMethod',
  'fx',
  'fy',

  // Attributs de clip/mask
  'clip-path',
  'clip-rule',
  'mask',

  // Autres attributs sûrs
  'font-family',
  'font-size',
  'font-weight',
  'text-anchor',
  'dominant-baseline',
  'alignment-baseline',
]);

// Patterns dangereux à bloquer
const DANGEROUS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i, // onclick, onerror, onload, etc.
  /data:/i,
  /vbscript:/i,
  /expression\s*\(/i,
  /url\s*\(\s*["']?\s*javascript/i,
  /<iframe/i,
  /<embed/i,
  /<object/i,
  /<link/i,
  /<style/i,
  /<meta/i,
  /<base/i,
  /<form/i,
  /<input/i,
  /<button/i,
];

/**
 * Vérifie si le contenu SVG contient des patterns dangereux
 */
function containsDangerousPatterns(svg: string): boolean {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(svg));
}

/**
 * Sanitize le contenu SVG inner (le contenu à l'intérieur des balises <svg>)
 * Retourne null si le contenu est dangereux
 */
export function sanitizeSvgContent(svgContent: string | null | undefined): string | null {
  if (!svgContent || typeof svgContent !== 'string') {
    return null;
  }

  // Trim et vérification basique
  const trimmed = svgContent.trim();
  if (!trimmed) {
    return null;
  }

  // Vérifier les patterns dangereux
  if (containsDangerousPatterns(trimmed)) {
    console.warn('[SECURITY] SVG content blocked: dangerous pattern detected');
    return null;
  }

  // Pour le contenu SVG simple (paths, circles, etc.), on peut le parser côté client
  // si le navigateur supporte DOMParser
  if (typeof window !== 'undefined' && window.DOMParser) {
    try {
      const parser = new DOMParser();
      // Wrapper dans un SVG pour parser correctement
      const doc = parser.parseFromString(
        `<svg xmlns="http://www.w3.org/2000/svg">${trimmed}</svg>`,
        'image/svg+xml'
      );

      // Vérifier les erreurs de parsing
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        console.warn('[SECURITY] SVG parsing error');
        return null;
      }

      // Récursivement sanitizer les éléments
      const svg = doc.documentElement;
      sanitizeElement(svg);

      // Retourner uniquement le contenu intérieur
      return svg.innerHTML;
    } catch (error) {
      console.warn('[SECURITY] SVG sanitization error:', error);
      return null;
    }
  }

  // Fallback: si pas de DOMParser, utiliser une approche plus restrictive
  // Accepter uniquement les paths SVG simples
  if (/^<path[^>]*\/>$/i.test(trimmed) || /^<circle[^>]*\/>$/i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Sanitize un élément DOM SVG récursivement
 */
function sanitizeElement(element: Element): void {
  // Collecter les enfants à supprimer (ne pas modifier pendant l'itération)
  const toRemove: Element[] = [];

  for (const child of Array.from(element.children)) {
    const tagName = child.tagName.toLowerCase();

    // Supprimer les éléments non autorisés
    if (!ALLOWED_SVG_ELEMENTS.has(tagName)) {
      toRemove.push(child);
      continue;
    }

    // Supprimer les attributs non autorisés
    const attributesToRemove: string[] = [];
    for (const attr of Array.from(child.attributes)) {
      const attrName = attr.name.toLowerCase();

      // Vérifier si l'attribut est autorisé
      if (!ALLOWED_SVG_ATTRIBUTES.has(attrName) && !attrName.startsWith('aria-')) {
        attributesToRemove.push(attr.name);
        continue;
      }

      // Vérifier la valeur de l'attribut pour les patterns dangereux
      if (containsDangerousPatterns(attr.value)) {
        attributesToRemove.push(attr.name);
      }
    }

    // Supprimer les attributs dangereux
    for (const attrName of attributesToRemove) {
      child.removeAttribute(attrName);
    }

    // Récursion sur les enfants
    sanitizeElement(child);
  }

  // Supprimer les éléments dangereux
  for (const el of toRemove) {
    el.remove();
  }
}

/**
 * Composant React pour afficher un SVG sanitisé
 * Utilisation: <SafeSvgIcon svgContent={type.icon_svg} className="w-8 h-8" />
 */
export function getSafeSvgMarkup(
  svgContent: string | null | undefined,
  viewBox: string = '0 0 24 24',
  className: string = ''
): { __html: string } | null {
  const sanitized = sanitizeSvgContent(svgContent);

  if (!sanitized) {
    // Retourner une icône par défaut ou rien
    return {
      __html: `<svg viewBox="${viewBox}" class="${className}"><circle cx="12" cy="12" r="8" fill="currentColor" opacity="0.3"/></svg>`,
    };
  }

  return {
    __html: `<svg viewBox="${viewBox}" class="${className}">${sanitized}</svg>`,
  };
}

/**
 * Hook pour obtenir le markup SVG sanitisé
 */
export function useSanitizedSvg(
  svgContent: string | null | undefined,
  viewBox: string = '0 0 24 24',
  className: string = ''
): { __html: string } | null {
  // Mémoriser pour éviter les re-sanitizations inutiles
  const [safeMarkup, setSafeMarkup] = React.useState<{ __html: string } | null>(null);

  React.useEffect(() => {
    setSafeMarkup(getSafeSvgMarkup(svgContent, viewBox, className));
  }, [svgContent, viewBox, className]);

  return safeMarkup;
}

// Import React pour le hook
import React from 'react';

import type { HandleModel, HandleOrientation } from '@/lib/configurator/handles';

type PreviewModel = Pick<HandleModel, 'name' | 'shape' | 'finish_hex' | 'length_mm' | 'image_url' | 'center_distance_mm'>;

interface HandleModelPreviewProps {
  model: PreviewModel;
  orientation?: HandleOrientation;
  className?: string;
}

const HEX = /^#[0-9A-Fa-f]{6}$/;

// Vignette d'un modèle de poignée : la photo envoyée dans l'admin, sinon un dessin de la forme dans sa finition, posée
// sur une façade claire. Le dessin suit l'orientation choisie (un bouton n'en a pas).
export function HandleModelPreview({ model, orientation = 'horizontal', className = '' }: HandleModelPreviewProps) {
  if (model.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- photo du backend, taille de vignette
      <img src={model.image_url} alt={model.name} className={`h-full w-full object-cover ${className}`} loading="lazy" />
    );
  }

  const finish = HEX.test(model.finish_hex) ? model.finish_hex : '#1C1C1C';
  // Longueur dessinée : proportionnelle au modèle (64 à 400 mm), dans une vignette de 100 × 100
  const length = Math.max(28, Math.min(80, ((model.length_mm ?? 160) / 400) * 80));
  const vertical = orientation === 'vertical' && model.shape !== 'knob' && model.shape !== 'recessed';

  let shape: React.ReactNode;
  if (model.shape === 'knob') {
    shape = (
      <>
        <circle cx="50" cy="52" r="11" fill="black" opacity="0.12" />
        <circle cx="50" cy="50" r="11" fill={finish} />
        <circle cx="46" cy="46" r="4" fill="white" opacity="0.25" />
      </>
    );
  } else if (model.shape === 'recessed') {
    shape = (
      <>
        <circle cx="50" cy="52" r="15" fill="black" opacity="0.12" />
        <circle cx="50" cy="50" r="15" fill={finish} />
        <circle cx="50" cy="50" r="10" fill="#1a1a1a" opacity="0.85" />
      </>
    );
  } else {
    const thickness = model.shape === 'bar' ? 6 : model.shape === 'flat_bar' ? 8 : model.shape === 'cup' ? 14 : model.shape === 'leather' ? 7 : 10;
    const radius = model.shape === 'bar' ? 3 : model.shape === 'flat_bar' ? 1.5 : model.shape === 'cup' ? 6 : 1;
    const x = 50 - length / 2;
    const y = 50 - thickness / 2;
    // Pieds aux vis : à l'entraxe du plan quand il est connu
    const ownSpacing =
      model.center_distance_mm && model.length_mm ? length * Math.min(1, model.center_distance_mm / model.length_mm) : null;
    const spacing = Math.max(6, ownSpacing ?? length - 13);
    shape = (
      <g transform={vertical ? 'rotate(90 50 50)' : undefined}>
        {model.shape !== 'profile' && model.shape !== 'cup' && (
          <>
            <rect x={50 - spacing / 2 - 1.5} y={y + thickness} width="3" height="6" fill={finish} opacity="0.7" />
            <rect x={50 + spacing / 2 - 1.5} y={y + thickness} width="3" height="6" fill={finish} opacity="0.7" />
          </>
        )}
        <rect x={x} y={y + 2} width={length} height={thickness} rx={radius} fill="black" opacity="0.12" />
        <rect x={x} y={y} width={length} height={thickness} rx={radius} fill={finish} />
        <rect x={x + 2} y={y + 1} width={length - 4} height={Math.max(1, thickness / 4)} rx={radius} fill="white" opacity="0.22" />
      </g>
    );
  }

  return (
    <svg viewBox="0 0 100 100" className={`h-full w-full ${className}`} role="img" aria-label={model.name}>
      <rect x="0" y="0" width="100" height="100" fill="#F4F0E8" />
      <rect x="8" y="8" width="84" height="84" fill="#EAE3D6" stroke="black" strokeOpacity="0.08" />
      {shape}
    </svg>
  );
}

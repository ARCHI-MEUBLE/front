// Vitesse de rapprochement (par seconde) : équivaut à 10 % par image à 60 images par seconde
export const SMOOTHING_SPEED = 6.3;

// Fait avancer une valeur vers sa cible, de façon fluide et indépendante de la fréquence d'images
export function smoothStep(current: number, target: number, delta: number, speed = SMOOTHING_SPEED): number {
  const difference = target - current;
  if (Math.abs(difference) < 1e-4) return target;
  return current + difference * (1 - Math.exp(-delta * speed));
}

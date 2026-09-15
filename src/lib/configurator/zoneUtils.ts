import { Zone } from '@/components/configurator/ZoneEditor';

export function normalizeZoneSplitRatios(zone: Zone): Zone {
  let normalizedZone = { ...zone };

  if (normalizedZone.splitRatios && normalizedZone.splitRatios.length > 0) {
    const sum = normalizedZone.splitRatios.reduce((a, b) => a + b, 0);
    if (sum !== 100) {
      const newRatios = [...normalizedZone.splitRatios];
      newRatios[newRatios.length - 1] += 100 - sum;
      normalizedZone.splitRatios = newRatios;
    }
  }

  if (normalizedZone.children) {
    normalizedZone.children = normalizedZone.children.map(normalizeZoneSplitRatios);
  }

  return normalizedZone;
}

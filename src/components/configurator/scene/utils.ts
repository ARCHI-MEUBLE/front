export const DEFAULT_MATERIAL_COLOR = '#D8C7A1';

export function getSafeColor(hexColor: string | null | undefined): string {
    if (hexColor && hexColor !== '' && hexColor !== 'null' && hexColor !== 'undefined' && hexColor.startsWith('#')) {
        return hexColor;
    }
    return DEFAULT_MATERIAL_COLOR;
}

export function getHingeYPositions(height: number): number[] {
    const margin = 0.15; // Marge de 15cm depuis le bord haut/bas
    const usableHeight = height - 2 * margin;

    // Logique: 2 charnières jusqu'à 1.5m, puis +1 charnière par 0.5m supplémentaire
    let numHinges = 2;
    if (height >= 1.5) {
        numHinges = 3;
    }
    if (height >= 2.0) {
        numHinges = 4;
    }
    if (height >= 2.5) {
        numHinges = 5;
    }

    const positions: number[] = [];
    if (numHinges === 2) {
        // 2 charnières: haut et bas
        positions.push(height / 2 - margin);
        positions.push(-height / 2 + margin);
    } else {
        // Plus de 2 charnières: répartition uniforme
        for (let i = 0; i < numHinges; i++) {
            const y = (height / 2 - margin) - (i * usableHeight / (numHinges - 1));
            positions.push(y);
        }
    }

    return positions;
}

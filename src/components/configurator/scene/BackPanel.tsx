import React from 'react';
import { TexturedMaterial } from './TexturedMaterial';

// Composant pour générer le panneau arrière avec des ouvertures pour les espaces ouverts
export function BackPanelWithOpenings({
                                   totalWidth,
                                   totalHeight,
                                   yOffset,
                                   zOffset,
                                   openSpaces,
                                   hexColor,
                                   imageUrl
                               }: {
    totalWidth: number;
    totalHeight: number;
    yOffset: number;
    zOffset: number;
    openSpaces: { x: number; y: number; width: number; height: number }[];
    hexColor: string;
    imageUrl?: string | null;
}) {
    // Pour simplifier, on divise le panneau en segments horizontaux
    // Si un espace ouvert couvre toute la largeur, on crée des panneaux au-dessus et en-dessous
    // Pour des cas plus complexes (plusieurs colonnes ouvertes), on génère des segments

    // Trier les espaces ouverts par position Y (de haut en bas)
    const sortedOpenSpaces = [...openSpaces].sort((a, b) => b.y - a.y);

    // Générer les panneaux qui évitent les zones ouvertes
    const panels: React.ReactNode[] = [];

    // Simplification : créer des panneaux autour de chaque espace ouvert
    // En utilisant une approche par colonne verticale

    const leftEdge = -totalWidth / 2;
    const rightEdge = totalWidth / 2;
    const topEdge = yOffset + totalHeight / 2;
    const bottomEdge = yOffset - totalHeight / 2;

    // Convertir les espaces ouverts en rectangles exclus
    const exclusions = openSpaces.map(os => ({
        left: os.x - os.width / 2,
        right: os.x + os.width / 2,
        top: os.y + os.height / 2,
        bottom: os.y - os.height / 2
    }));

    // Pour chaque espace ouvert, créer des panneaux à gauche, à droite, au-dessus et en-dessous
    if (exclusions.length === 1) {
        const ex = exclusions[0];

        // Panneau à gauche de l'ouverture
        if (ex.left > leftEdge + 0.01) {
            const panelWidth = ex.left - leftEdge;
            panels.push(
                <mesh key="back-left" position={[leftEdge + panelWidth/2, yOffset, zOffset]} receiveShadow>
                    <boxGeometry args={[panelWidth, totalHeight, 0.004]} />
                    <TexturedMaterial hexColor={hexColor} imageUrl={imageUrl} />
                </mesh>
            );
        }

        // Panneau à droite de l'ouverture
        if (ex.right < rightEdge - 0.01) {
            const panelWidth = rightEdge - ex.right;
            panels.push(
                <mesh key="back-right" position={[rightEdge - panelWidth/2, yOffset, zOffset]} receiveShadow>
                    <boxGeometry args={[panelWidth, totalHeight, 0.004]} />
                    <TexturedMaterial hexColor={hexColor} imageUrl={imageUrl} />
                </mesh>
            );
        }

        // Panneau au-dessus de l'ouverture (dans la colonne de l'ouverture)
        if (ex.top < topEdge - 0.01) {
            const panelHeight = topEdge - ex.top;
            const panelWidth = ex.right - ex.left;
            panels.push(
                <mesh key="back-top" position={[(ex.left + ex.right)/2, topEdge - panelHeight/2, zOffset]} receiveShadow>
                    <boxGeometry args={[panelWidth, panelHeight, 0.004]} />
                    <TexturedMaterial hexColor={hexColor} imageUrl={imageUrl} />
                </mesh>
            );
        }

        // Panneau en-dessous de l'ouverture (dans la colonne de l'ouverture)
        if (ex.bottom > bottomEdge + 0.01) {
            const panelHeight = ex.bottom - bottomEdge;
            const panelWidth = ex.right - ex.left;
            panels.push(
                <mesh key="back-bottom" position={[(ex.left + ex.right)/2, bottomEdge + panelHeight/2, zOffset]} receiveShadow>
                    <boxGeometry args={[panelWidth, panelHeight, 0.004]} />
                    <TexturedMaterial hexColor={hexColor} imageUrl={imageUrl} />
                </mesh>
            );
        }
    } else if (exclusions.length > 1) {
        // Pour plusieurs ouvertures, utiliser une approche plus générale
        // On crée un panneau complet puis on "découpe" conceptuellement avec des panneaux par segment

        // Trier par position X
        const sortedExclusions = [...exclusions].sort((a, b) => a.left - b.left);

        let currentX = leftEdge;

        sortedExclusions.forEach((ex, i) => {
            // Panneau à gauche de cette exclusion
            if (ex.left > currentX + 0.01) {
                const panelWidth = ex.left - currentX;
                panels.push(
                    <mesh key={`back-seg-${i}-left`} position={[currentX + panelWidth/2, yOffset, zOffset]} receiveShadow>
                        <boxGeometry args={[panelWidth, totalHeight, 0.004]} />
                        <TexturedMaterial hexColor={hexColor} imageUrl={imageUrl} />
                    </mesh>
                );
            }

            // Panneau au-dessus de l'ouverture
            if (ex.top < topEdge - 0.01) {
                const panelHeight = topEdge - ex.top;
                const panelWidth = ex.right - ex.left;
                panels.push(
                    <mesh key={`back-seg-${i}-top`} position={[(ex.left + ex.right)/2, topEdge - panelHeight/2, zOffset]} receiveShadow>
                        <boxGeometry args={[panelWidth, panelHeight, 0.004]} />
                        <TexturedMaterial hexColor={hexColor} imageUrl={imageUrl} />
                    </mesh>
                );
            }

            // Panneau en-dessous de l'ouverture
            if (ex.bottom > bottomEdge + 0.01) {
                const panelHeight = ex.bottom - bottomEdge;
                const panelWidth = ex.right - ex.left;
                panels.push(
                    <mesh key={`back-seg-${i}-bottom`} position={[(ex.left + ex.right)/2, bottomEdge + panelHeight/2, zOffset]} receiveShadow>
                        <boxGeometry args={[panelWidth, panelHeight, 0.004]} />
                        <TexturedMaterial hexColor={hexColor} imageUrl={imageUrl} />
                    </mesh>
                );
            }

            currentX = ex.right;
        });

        // Panneau final à droite
        if (currentX < rightEdge - 0.01) {
            const panelWidth = rightEdge - currentX;
            panels.push(
                <mesh key="back-seg-final" position={[currentX + panelWidth/2, yOffset, zOffset]} receiveShadow>
                    <boxGeometry args={[panelWidth, totalHeight, 0.004]} />
                    <TexturedMaterial hexColor={hexColor} imageUrl={imageUrl} />
                </mesh>
            );
        }
    }

    return <group>{panels}</group>;
}

import React from 'react';
import { TexturedMaterial } from './TexturedMaterial';

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

    const sortedOpenSpaces = [...openSpaces].sort((a, b) => b.y - a.y);

    const panels: React.ReactNode[] = [];


    const leftEdge = -totalWidth / 2;
    const rightEdge = totalWidth / 2;
    const topEdge = yOffset + totalHeight / 2;
    const bottomEdge = yOffset - totalHeight / 2;

    const exclusions = openSpaces.map(os => ({
        left: os.x - os.width / 2,
        right: os.x + os.width / 2,
        top: os.y + os.height / 2,
        bottom: os.y - os.height / 2
    }));

    if (exclusions.length === 1) {
        const ex = exclusions[0];

        if (ex.left > leftEdge + 0.01) {
            const panelWidth = ex.left - leftEdge;
            panels.push(
                <mesh key="back-left" position={[leftEdge + panelWidth/2, yOffset, zOffset]} receiveShadow>
                    <boxGeometry args={[panelWidth, totalHeight, 0.004]} />
                    <TexturedMaterial hexColor={hexColor} imageUrl={imageUrl} />
                </mesh>
            );
        }

        if (ex.right < rightEdge - 0.01) {
            const panelWidth = rightEdge - ex.right;
            panels.push(
                <mesh key="back-right" position={[rightEdge - panelWidth/2, yOffset, zOffset]} receiveShadow>
                    <boxGeometry args={[panelWidth, totalHeight, 0.004]} />
                    <TexturedMaterial hexColor={hexColor} imageUrl={imageUrl} />
                </mesh>
            );
        }

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

        const sortedExclusions = [...exclusions].sort((a, b) => a.left - b.left);

        let currentX = leftEdge;

        sortedExclusions.forEach((ex, i) => {
            if (ex.left > currentX + 0.01) {
                const panelWidth = ex.left - currentX;
                panels.push(
                    <mesh key={`back-seg-${i}-left`} position={[currentX + panelWidth/2, yOffset, zOffset]} receiveShadow>
                        <boxGeometry args={[panelWidth, totalHeight, 0.004]} />
                        <TexturedMaterial hexColor={hexColor} imageUrl={imageUrl} />
                    </mesh>
                );
            }

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

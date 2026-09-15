import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { JapaneseMinimalist, ScandinavianLandscape, BauhausGeometric, WallClock } from './wall-art';

export function Room() {
    return (
        <group>
            {/* Sol (Parquet clair) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
                <planeGeometry args={[20, 20]} />
                <meshStandardMaterial color="#E5DACE" roughness={0.8} metalness={0.1} />
            </mesh>

            {/* Tapis */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 1]} receiveShadow>
                <planeGeometry args={[4, 3]} />
                <meshStandardMaterial color="#D1D1D1" roughness={1} />
            </mesh>

            {/* Mur Arrière */}
            <mesh position={[0, 5, -2]} receiveShadow>
                <planeGeometry args={[20, 10]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
            </mesh>

            {/* Mur Gauche */}
            <mesh position={[-5, 5, 3]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                <planeGeometry args={[10, 10]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
            </mesh>

            {/* Plinthe */}
            <mesh position={[0, 0.05, -1.99]}>
                <boxGeometry args={[20, 0.1, 0.02]} />
                <meshStandardMaterial color="#FFFFFF" />
            </mesh>

            {/* Interrupteur */}
            <mesh position={[-4.98, 1.2, 0]}>
                <boxGeometry args={[0.02, 0.1, 0.1]} />
                <meshStandardMaterial color="#f0f0f0" />
            </mesh>

            {/* Plante décorative */}
            <group position={[-1.8, 0, -1]}>
                <mesh position={[0, 0.15, 0]} castShadow>
                    <cylinderGeometry args={[0.15, 0.1, 0.3, 16]} />
                    <meshStandardMaterial color="#444444" />
                </mesh>
                {Array.from({ length: 12 }).map((_, i) => (
                    <mesh
                        key={i}
                        position={[0, 0.5, 0]}
                        rotation={[Math.random() * 0.8, i * Math.PI/6, Math.random() * 0.8]}
                        castShadow
                    >
                        <capsuleGeometry args={[0.03, 0.6, 4, 8]} />
                        <meshStandardMaterial color="#2D5A27" roughness={0.8} />
                    </mesh>
                ))}
            </group>

            {/* ========== TABLEAUX ARTISTIQUES MODERNES ========== */}

            {/* Tableau principal - Japonais minimaliste (centre) - NOUVEAU DESIGN */}
            <JapaneseMinimalist position={[0.3, 2.6, -1.97]} width={1.2} height={0.95} />

            {/* Tableau scandinave (gauche) */}
            <ScandinavianLandscape position={[-2.2, 2.4, -1.97]} width={0.8} height={0.95} />

            {/* Bauhaus géométrique (droite haut) */}
            <BauhausGeometric position={[2.5, 2.8, -1.97]} width={0.65} height={0.8} />

            {/* Horloge murale (droite bas) - REMPLACE LE TABLEAU NOIR */}
            <WallClock position={[2.5, 1.8, -1.97]} radius={0.25} />

            {/* Bauhaus géométrique (extrême gauche) */}
            <BauhausGeometric position={[-3.5, 2.2, -1.97]} width={0.55} height={0.7} />

        </group>
    );
}

export function HumanSilhouette() {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        const loader = new THREE.TextureLoader();
        loader.load('/images/human-silhouette.png', (t) => {
            setTexture(t);
        });
    }, []);

    if (!texture) return null;

    return (
        <group position={[1.4, 0.85, 0.9]}>
            <sprite scale={[1.1, 1.7, 1]}>
                <spriteMaterial
                    map={texture}
                    transparent
                    opacity={0.12}
                    depthWrite={false}
                />
            </sprite>
        </group>
    );
}

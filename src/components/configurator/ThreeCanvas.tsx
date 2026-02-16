import React, { Suspense, useMemo, useRef, useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
// On retire useFrame de l'import react-three/fiber
import { Canvas, useThree, RootState } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Float, useTexture } from '@react-three/drei';
import * as THREE from 'three';

import { Zone, PanelId, panelIdToString } from './ZoneEditor/types';
import { ComponentColors } from './MaterialSelector';
import type { ThreeCanvasHandle } from './types';

export type { ThreeCanvasHandle };

// --- Hooks Utilitaires ---

// On supprime useAnimationFrame car il causait des erreurs de contexte R3F
// Les composants utilisent maintenant requestAnimationFrame directement dans useEffect

interface ThreeViewerProps {
    width: number;
    height: number;
    depth: number;
    color: string;
    imageUrl?: string | null;
    hasSocle: boolean;
    socle?: string;
    rootZone: Zone | null;
    selectedZoneIds?: string[];
    onSelectZone?: (id: string | null) => void;
    selectedPanelIds?: Set<string>;
    onSelectPanel?: (panelId: string | null) => void;
    deletedPanelIds?: Set<string>;
    isBuffet?: boolean;
    doorsOpen?: boolean;
    showDecorations?: boolean;
    onToggleDoors?: () => void;
    componentColors?: ComponentColors;
    doorType?: 'none' | 'single' | 'double';
    doorSide?: 'left' | 'right';
    useMultiColor?: boolean;
    mountingStyle?: 'applique' | 'encastre';
    onCaptureReady?: (captureFunction: () => string | null) => void;
}

// Couleur par défaut (beige/bois naturel)
const DEFAULT_MATERIAL_COLOR = '#D8C7A1';

// Fonction utilitaire pour obtenir une couleur valide
function getSafeColor(hexColor: string | null | undefined): string {
    if (hexColor && hexColor !== '' && hexColor !== 'null' && hexColor !== 'undefined' && hexColor.startsWith('#')) {
        return hexColor;
    }
    return DEFAULT_MATERIAL_COLOR;
}

// Composant pour un matériau avec support de texture
function TexturedMaterial({ hexColor, imageUrl }: { hexColor: string; imageUrl?: string | null }) {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);
    const textureRef = useRef<THREE.Texture | null>(null);
    const currentImageUrlRef = useRef<string | null>(null);

    // Couleur de fallback - calculée de manière synchrone à chaque render
    const safeColor = getSafeColor(hexColor);

    useEffect(() => {
        // Si pas d'URL d'image, utiliser la couleur hex
        if (!imageUrl) {
            // Dispose de la texture précédente si elle existe
            if (textureRef.current) {
                textureRef.current.dispose();
                textureRef.current = null;
            }
            setTexture(null);
            currentImageUrlRef.current = null;
            return;
        }

        // Si c'est la même URL, ne pas recharger
        if (currentImageUrlRef.current === imageUrl && textureRef.current) {
            return;
        }

        currentImageUrlRef.current = imageUrl;
        console.log('[TexturedMaterial] Loading texture:', imageUrl);

        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        loader.load(
            imageUrl,
            (loadedTexture) => {
                console.log('[TexturedMaterial] Texture loaded successfully:', imageUrl);
                // Vérifier que l'URL n'a pas changé pendant le chargement
                if (currentImageUrlRef.current !== imageUrl) {
                    loadedTexture.dispose();
                    return;
                }

                // Dispose de l'ancienne texture
                if (textureRef.current) {
                    textureRef.current.dispose();
                }

                loadedTexture.wrapS = loadedTexture.wrapT = THREE.RepeatWrapping;
                loadedTexture.repeat.set(4, 4); // Augmenter la répétition pour mieux voir la texture
                loadedTexture.needsUpdate = true;
                textureRef.current = loadedTexture;
                setTexture(loadedTexture);
            },
            undefined,
            () => {
                console.warn('Failed to load texture:', imageUrl);
                if (currentImageUrlRef.current === imageUrl) {
                    setTexture(null);
                }
            }
        );

        return () => {
            // Cleanup seulement si on démonte le composant
        };
    }, [imageUrl]);

    // Cleanup au démontage
    useEffect(() => {
        return () => {
            if (textureRef.current) {
                textureRef.current.dispose();
                textureRef.current = null;
            }
        };
    }, []);

    // Utiliser une clé unique pour forcer React à recréer le matériau proprement
    // quand la couleur ou la texture change
    const materialKey = texture ? `tex-${currentImageUrlRef.current}` : `col-${safeColor}`;

    // Si on a une texture chargée, l'utiliser
    if (texture) {
        return (
            <meshStandardMaterial
                key={materialKey}
                attach="material"
                map={texture}
                color="#ffffff"
                roughness={0.7}
                metalness={0.1}
            />
        );
    }

    // Sinon utiliser la couleur hex (pendant le chargement ou en fallback)
    return (
        <meshStandardMaterial
            key={materialKey}
            attach="material"
            color={safeColor}
            roughness={0.4}
            metalness={0.1}
        />
    );
}

// Composant pour une hitbox de sélection de segment de panneau (invisible, uniquement pour la sélection)
interface PanelSegmentHitboxProps {
    panelId: string;
    position: [number, number, number];
    size: [number, number, number]; // width, height, depth
    isSelected: boolean;
    onSelect: (panelId: string | null) => void;
    isDeleted?: boolean;
}

function PanelSegmentHitbox({
                                panelId,
                                position,
                                size,
                                isSelected,
                                onSelect,
                                isDeleted = false
                            }: PanelSegmentHitboxProps) {
    return (
        <group position={position}>
            {/* Hitbox invisible pour la sélection */}
            <mesh
                visible={false}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                    document.body.style.cursor = 'default';
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(isSelected ? null : panelId);
                }}
            >
                <boxGeometry args={[size[0] + 0.002, size[1] + 0.002, size[2] + 0.002]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>

            {/* Effet de sélection visible uniquement quand sélectionné */}
            {isSelected && (
                <>
                    <mesh>
                        <boxGeometry args={[size[0] + 0.003, size[1] + 0.003, size[2] + 0.003]} />
                        <meshBasicMaterial
                            transparent
                            opacity={isDeleted ? 0.35 : 0.4}
                            color={isDeleted ? "#FF5722" : "#2196F3"}
                            depthWrite={false}
                            toneMapped={false}
                        />
                    </mesh>
                    <mesh>
                        <boxGeometry args={[size[0] + 0.004, size[1] + 0.004, size[2] + 0.004]} />
                        <meshBasicMaterial color={isDeleted ? "#FF5722" : "#2196F3"} wireframe transparent opacity={0.5} toneMapped={false} />
                    </mesh>
                    <lineSegments>
                        <edgesGeometry args={[new THREE.BoxGeometry(size[0] + 0.005, size[1] + 0.005, size[2] + 0.005)]} />
                        <lineBasicMaterial color={isDeleted ? "#FF5722" : "#2196F3"} linewidth={4} toneMapped={false} />
                    </lineSegments>
                </>
            )}
        </group>
    );
}

// Composant pour un panneau structurel (visuel uniquement, sans interaction)
interface StructuralPanelProps {
    position: [number, number, number];
    size: [number, number, number]; // width, height, depth
    hexColor: string;
    imageUrl?: string | null;
    castShadow?: boolean;
    receiveShadow?: boolean;
}

function StructuralPanel({
                             position,
                             size,
                             hexColor,
                             imageUrl,
                             castShadow = true,
                             receiveShadow = true
                         }: StructuralPanelProps) {
    return (
        <mesh position={position} castShadow={castShadow} receiveShadow={receiveShadow}>
            <boxGeometry args={size} />
            <TexturedMaterial hexColor={hexColor} imageUrl={imageUrl} />
        </mesh>
    );
}

// Composant pour rendre différents types de poignées
function Handle({ type = 'vertical_bar', position, side, height, width }: { type?: string; position: [number, number, number]; side: string; height: number; width?: number }) {
    const handleMaterial = <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />;

    if (type === 'horizontal_bar') {
        // Barre horizontale (utilise width si disponible, sinon height)
        const barLength = width ? Math.min(width * 0.4, 0.5) : Math.min(height * 0.4, 0.3);
        return (
            <mesh position={position} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.008, 0.008, barLength, 12]} />
                {handleMaterial}
            </mesh>
        );
    } else if (type === 'knob') {
        // Bouton rond
        return (
            <mesh position={position}>
                <sphereGeometry args={[0.02, 16, 16]} />
                {handleMaterial}
            </mesh>
        );
    } else if (type === 'recessed') {
        // Poignée encastrée (encoche)
        return (
            <group position={position}>
                <mesh>
                    <boxGeometry args={[0.08, 0.025, 0.015]} />
                    <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.6} />
                </mesh>
            </group>
        );
    } else {
        // Barre verticale (défaut)
        return (
            <mesh position={position}>
                <cylinderGeometry args={[0.008, 0.008, Math.min(height * 0.25, 0.4), 12]} />
                {handleMaterial}
            </mesh>
        );
    }
}

// Fonction pour calculer les positions des charnières selon la hauteur
function getHingeYPositions(height: number): number[] {
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

// Composant pour les charnières de porte
function DoorHinge({ position, side }: { position: [number, number, number]; side: 'left' | 'right' }) {
    const hingeMaterial = (
        <meshPhysicalMaterial
            color="#2a2a2a"
            metalness={0.85}
            roughness={0.2}
            clearcoat={0.3}
        />
    );

    return (
        <group position={position}>
            {/* Partie fixe de la charnière (sur le cadre) */}
            <mesh position={[side === 'left' ? -0.008 : 0.008, 0, -0.012]} castShadow>
                <boxGeometry args={[0.012, 0.05, 0.008]} />
                {hingeMaterial}
            </mesh>
            {/* Cylindre central (pivot) */}
            <mesh position={[side === 'left' ? -0.002 : 0.002, 0, -0.008]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.004, 0.004, 0.055, 12]} />
                {hingeMaterial}
            </mesh>
            {/* Partie mobile de la charnière (sur la porte) */}
            <mesh position={[side === 'left' ? 0.004 : -0.004, 0, -0.004]} castShadow>
                <boxGeometry args={[0.01, 0.045, 0.006]} />
                {hingeMaterial}
            </mesh>
        </group>
    );
}

// --- Composants Animés (Utilisant requestAnimationFrame manuel pour plus de robustesse) ---

function AnimatedDoor({ position, width, height, hexColor, imageUrl, side, isOpen, onClick, handleType }: any) {
    const groupRef = useRef<THREE.Group>(null);
    // Réduire l'angle d'ouverture à 70° (0.39 * PI) pour éviter les collisions entre portes adjacentes
    const targetRot = isOpen ? (side === 'left' ? -Math.PI * 0.39 : Math.PI * 0.39) : 0;

    // S'assurer que la couleur est valide
    const safeHexColor = getSafeColor(hexColor);

    useEffect(() => {
        let animationFrameId: number;

        const animate = () => {
            if (groupRef.current) {
                groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot, 0.1);
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        animate();
        return () => cancelAnimationFrame(animationFrameId);
    }, [targetRot]);

    return (
        <group
            ref={groupRef}
            position={position}
            onClick={(e) => {
                if (onClick) {
                    e.stopPropagation();
                    onClick(e);
                }
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
                document.body.style.cursor = 'default';
            }}
        >
            <mesh position={[side === 'left' ? width/2 : -width/2, 0, 0.01]} castShadow>
                <boxGeometry args={[width - 0.005, height - 0.01, 0.018]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
            {/* Poignée */}
            <Handle
                type={handleType || 'vertical_bar'}
                position={[side === 'left' ? width - 0.04 : -width + 0.04, 0, 0.02]}
                side={side}
                height={height}
            />
        </group>
    );
}

function AnimatedMirrorDoor({ position, width, height, side, isOpen, onClick, handleType }: any) {
    const groupRef = useRef<THREE.Group>(null);
    // Réduire l'angle d'ouverture à 70° (0.39 * PI) pour éviter les collisions entre portes adjacentes
    const targetRot = isOpen ? (side === 'left' ? -Math.PI * 0.39 : Math.PI * 0.39) : 0;

    useEffect(() => {
        let animationFrameId: number;
        const animate = () => {
            if (groupRef.current) {
                groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot, 0.1);
            }
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();
        return () => cancelAnimationFrame(animationFrameId);
    }, [targetRot]);

    return (
        <group
            ref={groupRef}
            position={position}
            onClick={(e) => {
                if (onClick) {
                    e.stopPropagation();
                    onClick(e);
                }
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
                document.body.style.cursor = 'default';
            }}
        >
            {/* Porte avec effet vitré */}
            <mesh position={[side === 'left' ? width/2 : -width/2, 0, 0.01]} castShadow>
                <boxGeometry args={[width - 0.005, height - 0.01, 0.018]} />
                <meshStandardMaterial
                    color="#A5D8FF"
                    transparent={true}
                    opacity={0.4}
                    metalness={0.9}
                    roughness={0.1}
                    envMapIntensity={2}
                />
            </mesh>
            {/* Poignée */}
            <Handle
                type={handleType || 'vertical_bar'}
                position={[side === 'left' ? width - 0.04 : -width + 0.04, 0, 0.02]}
                side={side}
                height={height}
            />
        </group>
    );
}

function AnimatedPushDoor({ position, width, height, hexColor, imageUrl, side, isOpen, onClick }: any) {
    const groupRef = useRef<THREE.Group>(null);
    // Réduire l'angle d'ouverture à 70° (0.39 * PI) pour éviter les collisions entre portes adjacentes
    const targetRot = isOpen ? (side === 'left' ? -Math.PI * 0.39 : Math.PI * 0.39) : 0;

    // S'assurer que la couleur est valide
    const safeHexColor = getSafeColor(hexColor);

    useEffect(() => {
        let animationFrameId: number;
        const animate = () => {
            if (groupRef.current) {
                groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot, 0.1);
            }
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();
        return () => cancelAnimationFrame(animationFrameId);
    }, [targetRot]);

    return (
        <group
            ref={groupRef}
            position={position}
            onClick={(e) => {
                if (onClick) {
                    e.stopPropagation();
                    onClick(e);
                }
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
                document.body.style.cursor = 'default';
            }}
        >
            <mesh position={[side === 'left' ? width/2 : -width/2, 0, 0.01]} castShadow>
                <boxGeometry args={[width - 0.005, height - 0.01, 0.018]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
            {/* Petite encoche discrète pour indiquer push-to-open */}
            <mesh position={[side === 'left' ? width - 0.08 : -width + 0.08, 0, 0.015]}>
                <cylinderGeometry args={[0.012, 0.012, 0.003, 16]} />
                <meshStandardMaterial color="#333" metalness={0.3} roughness={0.7} />
            </mesh>
        </group>
    );
}

function AnimatedPushDrawer({ position, width, height, depth, hexColor, imageUrl, isOpen, onClick }: any) {
    const groupRef = useRef<THREE.Group>(null);
    const initialZ = position[2];
    const targetZ = isOpen ? initialZ + depth * 0.6 : initialZ;

    // S'assurer que la couleur est valide
    const safeHexColor = getSafeColor(hexColor);

    useEffect(() => {
        let animationFrameId: number;
        const animate = () => {
            if (groupRef.current) {
                groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.1);
            }
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();
        return () => cancelAnimationFrame(animationFrameId);
    }, [targetZ]);

    const boxDepth = depth * 0.8;
    const boxHeight = height * 0.8;

    return (
        <group
            ref={groupRef}
            position={[position[0], position[1], initialZ]}
            onClick={(e) => {
                if (onClick) {
                    e.stopPropagation();
                    onClick(e);
                }
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
                document.body.style.cursor = 'default';
            }}
        >
            {/* Façade sans poignée */}
            <mesh castShadow>
                <boxGeometry args={[width - 0.01, height - 0.01, 0.02]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
            {/* Petite encoche discrète pour indiquer push-to-open */}
            <mesh position={[0, -height * 0.3, 0.015]}>
                <cylinderGeometry args={[0.012, 0.012, 0.003, 16]} />
                <meshStandardMaterial color="#333" metalness={0.3} roughness={0.7} />
            </mesh>
            {/* Corps du tiroir (visible quand ouvert) */}
            <mesh position={[0, 0, -boxDepth / 2]}>
                <boxGeometry args={[width - 0.02, boxHeight, boxDepth]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
        </group>
    );
}

function AnimatedDrawer({ position, width, height, depth, hexColor, imageUrl, isOpen, onClick, handleType }: any) {
    const groupRef = useRef<THREE.Group>(null);
    const initialZ = position[2];
    const targetZ = isOpen ? initialZ + depth * 0.6 : initialZ;

    // S'assurer que la couleur est valide
    const safeHexColor = getSafeColor(hexColor);

    useEffect(() => {
        let animationFrameId: number;
        const animate = () => {
            if (groupRef.current) {
                groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.1);
            }
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();
        return () => cancelAnimationFrame(animationFrameId);
    }, [targetZ]);

    const boxDepth = depth * 0.8;
    const boxHeight = height * 0.8;

    return (
        <group
            ref={groupRef}
            position={[position[0], position[1], initialZ]}
            onClick={(e) => {
                if (onClick) {
                    e.stopPropagation();
                    onClick(e);
                }
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
                document.body.style.cursor = 'default';
            }}
        >
            {/* Façade */}
            <mesh castShadow>
                <boxGeometry args={[width - 0.01, height - 0.01, 0.02]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
            {/* Poignée */}
            <Handle
                type={handleType || 'horizontal_bar'}
                position={[0, 0, 0.015]}
                side="center"
                height={height}
                width={width}
            />
            {/* Fond du tiroir */}
            <mesh position={[0, -height / 2 + 0.05, -boxDepth / 2]} receiveShadow>
                <boxGeometry args={[width - 0.06, 0.01, boxDepth]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
            {/* Côtés du tiroir */}
            <mesh position={[-width / 2 + 0.03, -height / 2 + 0.05 + boxHeight / 2, -boxDepth / 2]} castShadow>
                <boxGeometry args={[0.012, boxHeight, boxDepth]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
            <mesh position={[width / 2 - 0.03, -height / 2 + 0.05 + boxHeight / 2, -boxDepth / 2]} castShadow>
                <boxGeometry args={[0.012, boxHeight, boxDepth]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
            {/* Arrière du tiroir */}
            <mesh position={[0, -height / 2 + 0.05 + boxHeight / 2, -boxDepth]} castShadow>
                <boxGeometry args={[width - 0.06, boxHeight, 0.012]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
        </group>
    );
}

// Composant pour générer le panneau arrière avec des ouvertures pour les espaces ouverts
function BackPanelWithOpenings({
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

function Furniture({
                       width, height, depth, color, imageUrl, hasSocle, socle, rootZone, isBuffet,
                       doorsOpen, showDecorations, onToggleDoors, componentColors,
                       doorType = 'none',
                       doorSide = 'left',
                       useMultiColor = false,
                       mountingStyle = 'applique',
                       selectedZoneIds = [],
                       onSelectZone,
                       selectedPanelIds = new Set(),
                       onSelectPanel,
                       deletedPanelIds = new Set()
                   }: ThreeViewerProps) {
    const [openCompartments, setOpenCompartments] = useState<Record<string, boolean>>({});

    // Synchronisation avec l'état global doorsOpen
    useEffect(() => {
        if (rootZone) {
            const newOpenStates: Record<string, boolean> = {};
            const applyOpenState = (zone: Zone) => {
                if (zone.type === 'leaf' && (zone.content === 'drawer' || zone.content === 'push_drawer' || zone.content === 'door' || zone.content === 'door_right' || zone.content === 'door_double' || zone.content === 'push_door' || zone.content === 'push_door_right' || zone.content === 'mirror_door' || zone.content === 'mirror_door_right')) {
                    newOpenStates[zone.id] = doorsOpen || false;
                }
                if (zone.children) {
                    zone.children.forEach(applyOpenState);
                }
            };
            applyOpenState(rootZone);
            setOpenCompartments(newOpenStates);
        }
    }, [doorsOpen, rootZone]);

    const toggleCompartment = useCallback((id: string) => {
        setOpenCompartments(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    }, []);
    const { w, h, d, sideHeight, yOffset, thickness, compartmentGap, mountingOffset, doorOverlap } = useMemo(() => {
        const w = (width || 1500) / 1000;
        const h = (height || 730) / 1000;
        const d = (depth || 500) / 1000;
        const thickness = 0.019;
        const sideHeight = hasSocle ? h - 0.1 : h;
        const yOffset = hasSocle ? 0.1 : 0;
        const compartmentGap = mountingStyle === 'encastre' ? 0.006 : 0.003;
        // En encastré, reculer les portes de 22mm pour que leur face avant soit derrière la face avant des montants
        // Cela évite le z-fighting entre les bords des portes et les montants structurels
        const mountingOffset = mountingStyle === 'encastre' ? -0.022 : 0;
        // En appliqué, les portes débordent pour recouvrir le cadre (dessus/dessous)
        const doorOverlap = mountingStyle === 'encastre' ? 0 : thickness;
        return { w, h, d, sideHeight, yOffset, thickness, compartmentGap, mountingOffset, doorOverlap };
    }, [width, height, depth, hasSocle, mountingStyle]);

    // Couleur par défaut
    const DEFAULT_COLOR = '#D8C7A1';

    // Couleur de base (structure) - utilisée comme fallback pour tout
    const baseStructureColor = color || DEFAULT_COLOR;
    const baseStructureImageUrl = imageUrl || null;

    // Calcul des couleurs finales - simplifié et robuste
    const finalStructureColor = useMemo(() => {
        if (!useMultiColor) return baseStructureColor;
        const hex = componentColors?.structure?.hex;
        return (hex && hex !== '') ? hex : baseStructureColor;
    }, [useMultiColor, componentColors?.structure?.hex, baseStructureColor]);

    const finalStructureImageUrl = useMemo(() => {
        if (!useMultiColor) return baseStructureImageUrl;
        return componentColors?.structure?.imageUrl ?? baseStructureImageUrl;
    }, [useMultiColor, componentColors?.structure?.imageUrl, baseStructureImageUrl]);

    const finalShelfColor = useMemo(() => {
        if (!useMultiColor) return baseStructureColor;
        const hex = componentColors?.shelves?.hex;
        return (hex && hex !== '') ? hex : finalStructureColor;
    }, [useMultiColor, componentColors?.shelves?.hex, baseStructureColor, finalStructureColor]);

    const finalShelfImageUrl = useMemo(() => {
        if (!useMultiColor) return baseStructureImageUrl;
        return componentColors?.shelves?.imageUrl ?? finalStructureImageUrl;
    }, [useMultiColor, componentColors?.shelves?.imageUrl, baseStructureImageUrl, finalStructureImageUrl]);

    const finalDoorColor = useMemo(() => {
        if (!useMultiColor) return baseStructureColor;
        const hex = componentColors?.doors?.hex;
        return (hex && hex !== '') ? hex : finalStructureColor;
    }, [useMultiColor, componentColors?.doors?.hex, baseStructureColor, finalStructureColor]);

    const finalDoorImageUrl = useMemo(() => {
        if (!useMultiColor) return baseStructureImageUrl;
        return componentColors?.doors?.imageUrl ?? finalStructureImageUrl;
    }, [useMultiColor, componentColors?.doors?.imageUrl, baseStructureImageUrl, finalStructureImageUrl]);

    const finalBackColor = useMemo(() => {
        if (!useMultiColor) return baseStructureColor;
        const hex = componentColors?.back?.hex;
        return (hex && hex !== '') ? hex : finalStructureColor;
    }, [useMultiColor, componentColors?.back?.hex, baseStructureColor, finalStructureColor]);

    const finalBackImageUrl = useMemo(() => {
        if (!useMultiColor) return baseStructureImageUrl;
        return componentColors?.back?.imageUrl ?? finalStructureImageUrl;
    }, [useMultiColor, componentColors?.back?.imageUrl, baseStructureImageUrl, finalStructureImageUrl]);

    const finalDrawerColor = useMemo(() => {
        if (!useMultiColor) return baseStructureColor;
        const hex = componentColors?.drawers?.hex;
        return (hex && hex !== '') ? hex : finalStructureColor;
    }, [useMultiColor, componentColors?.drawers?.hex, baseStructureColor, finalStructureColor]);

    const finalDrawerImageUrl = useMemo(() => {
        if (!useMultiColor) return baseStructureImageUrl;
        return componentColors?.drawers?.imageUrl ?? finalStructureImageUrl;
    }, [useMultiColor, componentColors?.drawers?.imageUrl, baseStructureImageUrl, finalStructureImageUrl]);

    const finalBaseColor = useMemo(() => {
        if (!useMultiColor) return baseStructureColor;
        const hex = componentColors?.base?.hex;
        return (hex && hex !== '') ? hex : finalStructureColor;
    }, [useMultiColor, componentColors?.base?.hex, baseStructureColor, finalStructureColor]);

    const finalBaseImageUrl = useMemo(() => {
        if (!useMultiColor) return baseStructureImageUrl;
        return componentColors?.base?.imageUrl ?? finalStructureImageUrl;
    }, [useMultiColor, componentColors?.base?.imageUrl, baseStructureImageUrl, finalStructureImageUrl]);

    const separatorColor = finalStructureColor;
    const separatorImageUrl = finalStructureImageUrl;

    // Check if any zone has a zone-specific door
    const hasZoneSpecificDoors = useMemo(() => {
        if (!rootZone) return false;

        const checkZone = (zone: Zone): boolean => {
            if (zone.type === 'leaf' && (zone.content === 'door' || zone.content === 'door_right' || zone.content === 'door_double' || zone.content === 'push_door' || zone.content === 'push_door_right' || zone.content === 'mirror_door' || zone.content === 'mirror_door_right')) {
                return true;
            }
            if (zone.children) {
                return zone.children.some(child => checkZone(child));
            }
            return false;
        };

        return checkZone(rootZone);
    }, [rootZone]);

    // Collecter les informations sur les espaces ouverts pour le rendu du fond
    const openSpaceInfo = useMemo(() => {
        const openSpaces: { x: number; y: number; width: number; height: number }[] = [];
        if (!rootZone) return openSpaces;

        const collectOpenSpaces = (zone: Zone, x: number, y: number, width: number, height: number) => {
            if (zone.type === 'leaf' && zone.isOpenSpace) {
                openSpaces.push({ x, y, width, height });
                return;
            }

            if (zone.children && zone.children.length > 0) {
                let currentPos = 0;
                zone.children.forEach((child, i) => {
                    let ratio: number;
                    if (zone.splitRatios && zone.splitRatios.length === zone.children!.length) {
                        ratio = zone.splitRatios[i] / 100;
                    } else if (zone.children!.length === 2 && zone.splitRatio !== undefined) {
                        ratio = (i === 0 ? zone.splitRatio : 100 - zone.splitRatio) / 100;
                    } else {
                        ratio = 1 / zone.children!.length;
                    }

                    if (zone.type === 'horizontal') {
                        const childHeight = height * ratio;
                        collectOpenSpaces(child, x, (y + height/2) - currentPos - childHeight/2, width, childHeight);
                        currentPos += childHeight;
                    } else {
                        const childWidth = width * ratio;
                        collectOpenSpaces(child, x - width/2 + currentPos + childWidth/2, y, childWidth, height);
                        currentPos += childWidth;
                    }
                });
            }
        };

        collectOpenSpaces(rootZone, 0, sideHeight/2 + yOffset, w - (thickness * 2), sideHeight - (thickness * 2));
        return openSpaces;
    }, [rootZone, w, sideHeight, yOffset, thickness]);

    // Calculer les segments de panneaux basés sur la structure des zones
    // Cela permet de sélectionner des portions de panneaux correspondant aux zones
    interface PanelSegment {
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
    }

    // Interface pour les segments du panneau arrière (2D grid)
    interface BackPanelSegment extends PanelSegment {
        colIndex: number;
        rowIndex: number;
    }

    // Interface pour les séparateurs
    interface SeparatorSegment extends PanelSegment {
        orientation: 'vertical' | 'horizontal';
        segmentIndex: number;
    }

    const panelSegments = useMemo(() => {
        const topSegments: PanelSegment[] = [];
        const bottomSegments: PanelSegment[] = [];
        const leftSegments: PanelSegment[] = [];
        const rightSegments: PanelSegment[] = [];
        const backSegments: BackPanelSegment[] = [];
        const separatorSegments: SeparatorSegment[] = [];

        const innerWidth = w - (thickness * 2);
        const innerHeight = sideHeight - (thickness * 2);

        if (!rootZone) {
            // Si pas de zones, un seul segment par panneau
            topSegments.push({ id: 'panel-top-0', x: 0, y: h - thickness/2, width: w, height: thickness });
            bottomSegments.push({ id: 'panel-bottom-0', x: 0, y: yOffset + thickness/2, width: w, height: thickness });
            leftSegments.push({ id: 'panel-left-0', x: -w/2 + thickness/2, y: sideHeight/2 + yOffset, width: thickness, height: sideHeight });
            rightSegments.push({ id: 'panel-right-0', x: w/2 - thickness/2, y: sideHeight/2 + yOffset, width: thickness, height: sideHeight });
            backSegments.push({ id: 'panel-back-0-0', x: 0, y: sideHeight/2 + yOffset, width: w - 0.01, height: sideHeight - 0.01, colIndex: 0, rowIndex: 0 });
            return { topSegments, bottomSegments, leftSegments, rightSegments, backSegments, separatorSegments };
        }

        // Fonction pour collecter toutes les cellules (grille 2D) récursivement
        interface GridCell {
            x: number;
            y: number;
            width: number;
            height: number;
            colPath: number[];
            rowPath: number[];
            zone: Zone;
        }

        const collectGridCells = (
            zone: Zone,
            x: number,
            y: number,
            width: number,
            height: number,
            colPath: number[] = [],
            rowPath: number[] = []
        ): GridCell[] => {
            if (zone.type === 'leaf' || !zone.children || zone.children.length === 0) {
                return [{ x, y, width, height, colPath, rowPath, zone }];
            }

            const cells: GridCell[] = [];

            if (zone.type === 'vertical') {
                // Soustraire l'espace occupé par les séparateurs
                const numSeparators = zone.children.length - 1;
                const availableWidth = width - (numSeparators * thickness);
                let currentX = x - width / 2;

                zone.children.forEach((child, i) => {
                    let ratio: number;
                    if (zone.splitRatios && zone.splitRatios.length === zone.children!.length) {
                        ratio = zone.splitRatios[i] / 100;
                    } else if (zone.children!.length === 2 && zone.splitRatio !== undefined) {
                        ratio = (i === 0 ? zone.splitRatio : 100 - zone.splitRatio) / 100;
                    } else {
                        ratio = 1 / zone.children!.length;
                    }

                    const colWidth = availableWidth * ratio;
                    const childCells = collectGridCells(
                        child,
                        currentX + colWidth / 2,
                        y,
                        colWidth,
                        height,
                        [...colPath, i],
                        rowPath
                    );
                    cells.push(...childCells);
                    currentX += colWidth;
                    if (i < zone.children!.length - 1) {
                        currentX += thickness;
                    }
                });
            } else if (zone.type === 'horizontal') {
                // Soustraire l'espace occupé par les séparateurs
                const numSeparators = zone.children.length - 1;
                const availableHeight = height - (numSeparators * thickness);
                let currentY = y + height / 2;

                zone.children.forEach((child, i) => {
                    let ratio: number;
                    if (zone.splitRatios && zone.splitRatios.length === zone.children!.length) {
                        ratio = zone.splitRatios[i] / 100;
                    } else if (zone.children!.length === 2 && zone.splitRatio !== undefined) {
                        ratio = (i === 0 ? zone.splitRatio : 100 - zone.splitRatio) / 100;
                    } else {
                        ratio = 1 / zone.children!.length;
                    }

                    const rowHeight = availableHeight * ratio;
                    const childCells = collectGridCells(
                        child,
                        x,
                        currentY - rowHeight / 2,
                        width,
                        rowHeight,
                        colPath,
                        [...rowPath, i]
                    );
                    cells.push(...childCells);
                    currentY -= rowHeight;
                    if (i < zone.children!.length - 1) {
                        currentY -= thickness;
                    }
                });
            }

            return cells;
        };

        // Collecter les séparateurs récursivement
        interface SeparatorInfo {
            x: number;
            y: number;
            width: number;
            height: number;
            orientation: 'vertical' | 'horizontal';
            path: string;
        }

        const collectSeparators = (
            zone: Zone,
            x: number,
            y: number,
            width: number,
            height: number,
            path: string = ''
        ): SeparatorInfo[] => {
            const separators: SeparatorInfo[] = [];

            // Si pas d'enfants, retourner vide
            if (!zone.children || zone.children.length === 0) {
                return separators;
            }

            // Si un seul enfant, pas de séparateurs à ce niveau mais on doit quand même
            // récurser dans l'enfant pour collecter ses séparateurs internes
            if (zone.children.length === 1) {
                const child = zone.children[0];
                const childSeparators = collectSeparators(
                    child,
                    x,
                    y,
                    width,
                    height,
                    `${path}c0-`
                );
                separators.push(...childSeparators);
                return separators;
            }

            if (zone.type === 'vertical') {
                // Soustraire l'espace occupé par les séparateurs
                const numSeparators = zone.children.length - 1;
                const availableWidth = width - (numSeparators * thickness);
                let currentX = x - width / 2;

                zone.children.forEach((child, i) => {
                    let ratio: number;
                    if (zone.splitRatios && zone.splitRatios.length === zone.children!.length) {
                        ratio = zone.splitRatios[i] / 100;
                    } else if (zone.children!.length === 2 && zone.splitRatio !== undefined) {
                        ratio = (i === 0 ? zone.splitRatio : 100 - zone.splitRatio) / 100;
                    } else {
                        ratio = 1 / zone.children!.length;
                    }

                    const colWidth = availableWidth * ratio;

                    // Ajouter séparateur vertical après chaque colonne sauf la dernière
                    if (i < zone.children!.length - 1) {
                        separators.push({
                            x: currentX + colWidth + thickness / 2,
                            y: y,
                            width: thickness,
                            height: height,
                            orientation: 'vertical',
                            path: `${path}v${i}`
                        });
                    }

                    // Récursion dans l'enfant
                    const childSeparators = collectSeparators(
                        child,
                        currentX + colWidth / 2,
                        y,
                        colWidth,
                        height,
                        `${path}c${i}-`
                    );
                    separators.push(...childSeparators);

                    currentX += colWidth;
                    if (i < zone.children!.length - 1) {
                        currentX += thickness;
                    }
                });
            } else if (zone.type === 'horizontal') {
                // Soustraire l'espace occupé par les séparateurs
                const numSeparators = zone.children.length - 1;
                const availableHeight = height - (numSeparators * thickness);
                let currentY = y + height / 2;

                zone.children.forEach((child, i) => {
                    let ratio: number;
                    if (zone.splitRatios && zone.splitRatios.length === zone.children!.length) {
                        ratio = zone.splitRatios[i] / 100;
                    } else if (zone.children!.length === 2 && zone.splitRatio !== undefined) {
                        ratio = (i === 0 ? zone.splitRatio : 100 - zone.splitRatio) / 100;
                    } else {
                        ratio = 1 / zone.children!.length;
                    }

                    const rowHeight = availableHeight * ratio;

                    // Ajouter séparateur horizontal après chaque rangée sauf la dernière
                    if (i < zone.children!.length - 1) {
                        const sepY = currentY - rowHeight - thickness / 2;
                        separators.push({
                            x: x,
                            y: sepY,
                            width: width,
                            height: thickness,
                            orientation: 'horizontal',
                            path: `${path}h${i}`
                        });
                    }

                    // Récursion dans l'enfant
                    const childSeparators = collectSeparators(
                        child,
                        x,
                        currentY - rowHeight / 2,
                        width,
                        rowHeight,
                        `${path}r${i}-`
                    );
                    separators.push(...childSeparators);

                    currentY -= rowHeight;
                    if (i < zone.children!.length - 1) {
                        currentY -= thickness;
                    }
                });
            }

            return separators;
        };

        // Collecter toutes les cellules de la grille
        const allCells = collectGridCells(
            rootZone,
            0,
            sideHeight / 2 + yOffset,
            innerWidth,
            innerHeight
        );

        // Collecter tous les séparateurs
        const allSeparators = collectSeparators(
            rootZone,
            0,
            sideHeight / 2 + yOffset,
            innerWidth,
            innerHeight
        );

        // Définir les limites ABSOLUES de l'intérieur du meuble (basées sur la structure, pas les cellules)
        // Ces valeurs correspondent aux bords internes des panneaux haut/bas
        const furnitureBottomInner = yOffset + thickness;  // Haut du panneau du bas
        const furnitureTopInner = yOffset + sideHeight - thickness;  // Bas du panneau du haut

        // Créer les segments du panneau arrière basés sur les cellules
        // Calculer les limites min/max réelles des cellules (pour référence)
        const minCellY = Math.min(...allCells.map(c => c.y - c.height / 2));
        const maxCellY = Math.max(...allCells.map(c => c.y + c.height / 2));
        const minCellX = Math.min(...allCells.map(c => c.x - c.width / 2));
        const maxCellX = Math.max(...allCells.map(c => c.x + c.width / 2));

        allCells.forEach((cell, i) => {
            let segX = cell.x;
            let segY = cell.y;
            let segWidth = cell.width;
            let segHeight = cell.height;

            // Utiliser les limites réelles des cellules pour déterminer les bords
            const cellBottom = cell.y - cell.height / 2;
            const cellTop = cell.y + cell.height / 2;
            const cellLeft = cell.x - cell.width / 2;
            const cellRight = cell.x + cell.width / 2;

            // Vérifier si la cellule est aux bords par rapport aux autres cellules
            const isLeftmost = cellLeft <= minCellX + 0.01;
            const isRightmost = cellRight >= maxCellX - 0.01;
            const isTopmost = cellTop >= maxCellY - 0.01;
            const isBottommost = cellBottom <= minCellY + 0.01;

            // Vérifier AUSSI contre les limites absolues du meuble (pour les colonnes internes)
            // Utiliser une tolérance plus grande (0.05) pour capturer les cellules proches du bord
            const touchesFurnitureBottom = cellBottom <= furnitureBottomInner + 0.05;
            const touchesFurnitureTop = cellTop >= furnitureTopInner - 0.05;

            if (isLeftmost) {
                segWidth += thickness;
                segX -= thickness / 2;
            }
            if (isRightmost) {
                segWidth += thickness;
                segX += thickness / 2;
            }
            // Étendre vers le haut si cellule au sommet
            if (isTopmost || touchesFurnitureTop) {
                segHeight += thickness;
                segY += thickness / 2;
            }
            // Étendre vers le bas si cellule au fond du meuble - étendre jusqu'au socle
            if (isBottommost || touchesFurnitureBottom) {
                // Calculer l'extension exacte nécessaire pour atteindre le haut du socle (yOffset)
                const gapToBottom = cellBottom - yOffset;
                const extensionBottom = Math.max(thickness, gapToBottom + 0.001);
                segHeight += extensionBottom;
                segY -= extensionBottom / 2;
            }

            const colIndex = cell.colPath.length > 0 ? cell.colPath[0] : 0;
            const rowIndex = cell.rowPath.length > 0 ? cell.rowPath[0] : 0;

            // Utiliser le chemin complet pour un ID unique et stable
            const pathId = `c${cell.colPath.join('_')}-r${cell.rowPath.join('_')}`;

            backSegments.push({
                id: `panel-back-${pathId}`,
                x: segX,
                y: segY,
                width: segWidth,
                height: segHeight,
                colIndex,
                rowIndex
            });
        });

        // DEBUG: Log pour comparer avec PanelPlanCanvas
        console.log('ThreeCanvas - Back panel IDs:', allCells.map((cell) => {
            const pathId = `c${cell.colPath.join('_')}-r${cell.rowPath.join('_')}`;
            return `panel-back-${pathId}`;
        }));

        // Pour le panneau du haut - segmenter selon les colonnes de premier niveau
        // IMPORTANT: Ne considérer que les cellules qui touchent le bord SUPÉRIEUR
        // Tolérance augmentée à 0.05 (5cm) pour gérer les cas où splitRatios ne somment pas à 100%
        const maxY = Math.max(...allCells.map(c => c.y + c.height / 2));
        const topTouchingCells = allCells.filter(cell =>
            cell.y + cell.height / 2 >= maxY - 0.05
        );

        // Identifier les colonnes uniques parmi les cellules touchant le haut
        const uniqueTopColumns = new Map<number, GridCell[]>();
        topTouchingCells.forEach(cell => {
            const key = Math.round(cell.x * 1000);
            if (!uniqueTopColumns.has(key)) {
                uniqueTopColumns.set(key, []);
            }
            uniqueTopColumns.get(key)!.push(cell);
        });

        // Créer un segment de panneau haut pour chaque colonne
        const sortedTopColumns = Array.from(uniqueTopColumns.entries())
            .sort(([keyA], [keyB]) => keyA - keyB);

        if (sortedTopColumns.length > 1) {
            sortedTopColumns.forEach(([, cells], index) => {
                // Prendre la première cellule de cette colonne pour obtenir la position
                const cell = cells[0];
                const isLeftmost = index === 0;
                const isRightmost = index === sortedTopColumns.length - 1;

                let segX = cell.x;
                let segWidth = cell.width;

                // Étendre aux bords pour les colonnes extrêmes
                if (isLeftmost) {
                    segWidth += thickness;
                    segX -= thickness / 2;
                }
                if (isRightmost) {
                    segWidth += thickness;
                    segX += thickness / 2;
                }

                topSegments.push({
                    id: `panel-top-${index}`,
                    x: segX,
                    y: h - thickness / 2,
                    width: segWidth,
                    height: thickness
                });
            });
        } else {
            // Pas de colonnes multiples, un seul segment
            topSegments.push({
                id: 'panel-top-0',
                x: 0,
                y: h - thickness / 2,
                width: w,
                height: thickness
            });
        }

        // Pour le panneau du bas - segmenter selon les colonnes qui touchent le BAS
        // IMPORTANT: Ne considérer que les cellules qui touchent le bord INFÉRIEUR
        // Tolérance augmentée à 0.05 (5cm) pour gérer les cas où splitRatios ne somment pas à 100%
        const minY = Math.min(...allCells.map(c => c.y - c.height / 2));
        const bottomTouchingCells = allCells.filter(cell =>
            cell.y - cell.height / 2 <= minY + 0.05
        );

        const uniqueBottomColumns = new Map<number, GridCell[]>();
        bottomTouchingCells.forEach(cell => {
            const key = Math.round(cell.x * 1000);
            if (!uniqueBottomColumns.has(key)) {
                uniqueBottomColumns.set(key, []);
            }
            uniqueBottomColumns.get(key)!.push(cell);
        });

        const sortedBottomColumns = Array.from(uniqueBottomColumns.entries())
            .sort(([keyA], [keyB]) => keyA - keyB);

        if (sortedBottomColumns.length > 1) {
            sortedBottomColumns.forEach(([, cells], index) => {
                const cell = cells[0];
                const isLeftmost = index === 0;
                const isRightmost = index === sortedBottomColumns.length - 1;

                let segX = cell.x;
                let segWidth = cell.width;

                if (isLeftmost) {
                    segWidth += thickness;
                    segX -= thickness / 2;
                }
                if (isRightmost) {
                    segWidth += thickness;
                    segX += thickness / 2;
                }

                bottomSegments.push({
                    id: `panel-bottom-${index}`,
                    x: segX,
                    y: yOffset + thickness / 2,
                    width: segWidth,
                    height: thickness
                });
            });
        } else {
            bottomSegments.push({
                id: 'panel-bottom-0',
                x: 0,
                y: yOffset + thickness / 2,
                width: w,
                height: thickness
            });
        }

        // DEBUG: Log bottom panel creation
        console.log('🔵 BOTTOM PANEL DEBUG:', {
            allCellsCount: allCells.length,
            allCellsX: allCells.map(c => ({ x: c.x.toFixed(4), y: c.y.toFixed(4), bottom: (c.y - c.height/2).toFixed(4) })),
            minY: minY.toFixed(4),
            bottomTouchingCells: bottomTouchingCells.map(c => ({ x: c.x.toFixed(4), key: Math.round(c.x * 1000) })),
            uniqueKeys: Array.from(uniqueBottomColumns.keys()),
            sortedBottomColumnsLength: sortedBottomColumns.length,
            bottomSegments: bottomSegments.map(s => ({ id: s.id, x: s.x.toFixed(4), width: s.width.toFixed(4) }))
        });

        // Pour le panneau gauche - segmenter selon les rangées de premier niveau
        // Tolérance augmentée à 0.05 (5cm) pour gérer les cas où splitRatios ne somment pas à 100%
        const uniqueLeftRows = new Map<number, GridCell[]>();
        const leftCells = allCells.filter(cell =>
            cell.x - cell.width / 2 <= -innerWidth / 2 + 0.05
        );
        leftCells.forEach(cell => {
            const key = Math.round(cell.y * 1000);
            if (!uniqueLeftRows.has(key)) {
                uniqueLeftRows.set(key, []);
            }
            uniqueLeftRows.get(key)!.push(cell);
        });

        const sortedLeftRows = Array.from(uniqueLeftRows.entries())
            .sort(([keyA], [keyB]) => keyB - keyA); // Tri descendant pour Y (haut en premier)

        if (sortedLeftRows.length > 1) {
            sortedLeftRows.forEach(([, cells], index) => {
                const cell = cells[0];
                const isTopmost = index === 0;
                const isBottommost = index === sortedLeftRows.length - 1;

                let segY = cell.y;
                let segHeight = cell.height;

                if (isTopmost) {
                    segHeight += thickness;
                    segY += thickness / 2;
                }
                if (isBottommost) {
                    // Étendre jusqu'au socle (yOffset)
                    const cellBottom = cell.y - cell.height / 2;
                    const gapToBottom = cellBottom - yOffset;
                    const extensionBottom = Math.max(thickness, gapToBottom + 0.001);
                    segHeight += extensionBottom;
                    segY -= extensionBottom / 2;
                }

                leftSegments.push({
                    id: `panel-left-${index}`,
                    x: -w / 2 + thickness / 2,
                    y: segY,
                    width: thickness,
                    height: segHeight
                });
            });
        } else {
            leftSegments.push({
                id: 'panel-left-0',
                x: -w / 2 + thickness / 2,
                y: sideHeight / 2 + yOffset,
                width: thickness,
                height: sideHeight
            });
        }

        // Pour le panneau droit - segmenter selon les rangées de premier niveau
        // Tolérance augmentée à 0.05 (5cm) pour gérer les cas où splitRatios ne somment pas à 100%
        const uniqueRightRows = new Map<number, GridCell[]>();
        const rightCells = allCells.filter(cell =>
            cell.x + cell.width / 2 >= innerWidth / 2 - 0.05
        );
        rightCells.forEach(cell => {
            const key = Math.round(cell.y * 1000);
            if (!uniqueRightRows.has(key)) {
                uniqueRightRows.set(key, []);
            }
            uniqueRightRows.get(key)!.push(cell);
        });

        const sortedRightRows = Array.from(uniqueRightRows.entries())
            .sort(([keyA], [keyB]) => keyB - keyA); // Tri descendant pour Y (haut en premier)

        if (sortedRightRows.length > 1) {
            sortedRightRows.forEach(([, cells], index) => {
                const cell = cells[0];
                const isTopmost = index === 0;
                const isBottommost = index === sortedRightRows.length - 1;

                let segY = cell.y;
                let segHeight = cell.height;

                if (isTopmost) {
                    segHeight += thickness;
                    segY += thickness / 2;
                }
                if (isBottommost) {
                    // Étendre jusqu'au socle (yOffset)
                    const cellBottom = cell.y - cell.height / 2;
                    const gapToBottom = cellBottom - yOffset;
                    const extensionBottom = Math.max(thickness, gapToBottom + 0.001);
                    segHeight += extensionBottom;
                    segY -= extensionBottom / 2;
                }

                rightSegments.push({
                    id: `panel-right-${index}`,
                    x: w / 2 - thickness / 2,
                    y: segY,
                    width: thickness,
                    height: segHeight
                });
            });
        } else {
            rightSegments.push({
                id: 'panel-right-0',
                x: w / 2 - thickness / 2,
                y: sideHeight / 2 + yOffset,
                width: thickness,
                height: sideHeight
            });
        }

        // DEBUG: Log séparateurs
        console.log('ThreeCanvas - Separators:', allSeparators.map((sep) =>
            `${sep.orientation === 'vertical' ? 'V' : 'H'}[${sep.path}] at ${sep.orientation === 'vertical' ? `x=${sep.x.toFixed(2)}` : `y=${sep.y.toFixed(2)}`}`
        ));

        // Utiliser les limites réelles des cellules pour les séparateurs aussi
        // (déjà calculées ci-dessus : minCellY, maxCellY, minCellX, maxCellX)

        // Créer les segments des séparateurs
        allSeparators.forEach((sep, i) => {
            // Pour chaque séparateur, on peut le segmenter selon les cellules qu'il borde
            // Pour simplifier, on crée un segment pour chaque portion du séparateur

            if (sep.orientation === 'vertical') {
                // Vérifier si le séparateur lui-même touche les bords ABSOLUS du meuble
                // Utiliser une tolérance plus grande (0.05) pour éviter les erreurs de virgule flottante
                const sepBottom = sep.y - sep.height / 2;
                const sepTop = sep.y + sep.height / 2;
                const sepTouchesFurnitureTop = sepTop >= furnitureTopInner - 0.05;
                const sepTouchesFurnitureBottom = sepBottom <= furnitureBottomInner + 0.05;

                // DEBUG: Afficher les valeurs pour diagnostic
                console.log(`Separator ${sep.path}: bottom=${sepBottom.toFixed(4)}, furnitureBottomInner=${furnitureBottomInner.toFixed(4)}, touches=${sepTouchesFurnitureBottom}`);

                // Trouver toutes les cellules à gauche de ce séparateur
                // Utiliser une tolérance plus grande pour capturer les cellules adjacentes
                const adjacentCells = allCells.filter(cell =>
                    Math.abs((cell.x + cell.width / 2) - (sep.x - thickness / 2)) < 0.05
                );

                console.log(`Separator ${sep.path}: found ${adjacentCells.length} adjacent cells`);

                if (adjacentCells.length > 0) {
                    // Grouper par Y
                    const uniqueRows = new Map<number, GridCell>();
                    adjacentCells.forEach(cell => {
                        const key = Math.round(cell.y * 1000);
                        if (!uniqueRows.has(key)) {
                            uniqueRows.set(key, cell);
                        }
                    });

                    Array.from(uniqueRows.values())
                        .sort((a, b) => b.y - a.y)
                        .forEach((cell, j) => {
                            // Utiliser directement les positions du séparateur pour assurer l'alignement
                            let segY = sep.y;
                            let segHeight = sep.height;

                            // Étendre vers le haut si le séparateur touche le haut du meuble
                            if (sepTouchesFurnitureTop) {
                                // Calculer l'extension exacte nécessaire pour atteindre le haut
                                const gapToTop = furnitureTopInner - sepTop;
                                const extensionTop = thickness + Math.max(0, gapToTop);
                                segHeight += extensionTop;
                                segY += extensionTop / 2;
                            }
                            // Étendre vers le bas si le séparateur touche le bas du meuble
                            if (sepTouchesFurnitureBottom) {
                                // Calculer l'extension exacte nécessaire pour atteindre le bas (yOffset = haut du socle)
                                const gapToBottom = sepBottom - yOffset;
                                const extensionBottom = Math.max(thickness, gapToBottom + 0.001); // +0.001 pour s'assurer de la couverture
                                segHeight += extensionBottom;
                                segY -= extensionBottom / 2;
                            }

                            console.log(`Sep ${sep.path} segment ${j}: sepBottom=${sepBottom.toFixed(4)}, yOffset=${yOffset.toFixed(4)}, furnitureBottomInner=${furnitureBottomInner.toFixed(4)}, sepTouchesFurnitureBottom=${sepTouchesFurnitureBottom}, height=${segHeight.toFixed(4)}`);

                            separatorSegments.push({
                                id: `separator-v-${sep.path}-${j}`,
                                x: sep.x,
                                y: segY,
                                width: thickness,
                                height: segHeight,
                                orientation: 'vertical',
                                segmentIndex: j
                            });
                        });
                } else {
                    // Pas de cellules adjacentes, utiliser les dimensions du séparateur
                    let segY = sep.y;
                    let segHeight = sep.height;

                    // Étendre jusqu'aux bords du meuble si le séparateur les touche
                    if (sepTouchesFurnitureTop) {
                        const gapToTop = furnitureTopInner - sepTop;
                        const extensionTop = thickness + Math.max(0, gapToTop);
                        segHeight += extensionTop;
                        segY += extensionTop / 2;
                    }
                    if (sepTouchesFurnitureBottom) {
                        // Calculer l'extension exacte nécessaire pour atteindre le bas (yOffset = haut du socle)
                        const gapToBottom = sepBottom - yOffset;
                        const extensionBottom = Math.max(thickness, gapToBottom + 0.001);
                        segHeight += extensionBottom;
                        segY -= extensionBottom / 2;
                    }

                    separatorSegments.push({
                        id: `separator-v-${sep.path}-0`,
                        x: sep.x,
                        y: segY,
                        width: thickness,
                        height: segHeight,
                        orientation: 'vertical',
                        segmentIndex: 0
                    });
                }
            } else {
                // Séparateur horizontal
                // Limites gauche/droite du meuble
                const furnitureLeftInner = -innerWidth / 2;
                const furnitureRightInner = innerWidth / 2;

                // Vérifier si le séparateur lui-même touche les bords du meuble
                const sepTouchesFurnitureLeft = sep.x - sep.width / 2 <= furnitureLeftInner + 0.05;
                const sepTouchesFurnitureRight = sep.x + sep.width / 2 >= furnitureRightInner - 0.05;

                const adjacentCells = allCells.filter(cell =>
                    Math.abs((cell.y - cell.height / 2) - (sep.y + thickness / 2)) < 0.05
                );

                if (adjacentCells.length > 0) {
                    const uniqueCols = new Map<number, GridCell>();
                    adjacentCells.forEach(cell => {
                        const key = Math.round(cell.x * 1000);
                        if (!uniqueCols.has(key)) {
                            uniqueCols.set(key, cell);
                        }
                    });

                    const sortedCols = Array.from(uniqueCols.values()).sort((a, b) => a.x - b.x);
                    const isSingleColumn = sortedCols.length === 1;

                    sortedCols.forEach((cell, j) => {
                            let segX = cell.x;
                            let segWidth = cell.width;

                            // Vérifier si la cellule touche les bords ABSOLUS du meuble
                            const touchesFurnitureLeft = cell.x - cell.width / 2 <= furnitureLeftInner + 0.01;
                            const touchesFurnitureRight = cell.x + cell.width / 2 >= furnitureRightInner - 0.01;

                            // Vérifier si c'est la première/dernière colonne dans le groupe
                            const isFirstInGroup = j === 0;
                            const isLastInGroup = j === sortedCols.length - 1;

                            // Étendre vers la gauche si:
                            // - La cellule touche le bord gauche du meuble, OU
                            // - C'est une colonne unique (pas de colonnes adjacentes à gauche)
                            if (touchesFurnitureLeft || (isSingleColumn && isFirstInGroup)) {
                                segWidth += thickness;
                                segX -= thickness / 2;
                            }
                            // Étendre vers la droite si:
                            // - La cellule touche le bord droit du meuble, OU
                            // - C'est une colonne unique (pas de colonnes adjacentes à droite)
                            if (touchesFurnitureRight || (isSingleColumn && isLastInGroup)) {
                                segWidth += thickness;
                                segX += thickness / 2;
                            }

                            separatorSegments.push({
                                id: `separator-h-${sep.path}-${j}`,
                                x: segX,
                                y: sep.y,
                                width: segWidth,
                                height: thickness,
                                orientation: 'horizontal',
                                segmentIndex: j
                            });
                        });
                } else {
                    // Pas de cellules adjacentes, utiliser les dimensions du séparateur
                    let segX = sep.x;
                    let segWidth = sep.width;

                    // Étendre jusqu'aux bords du meuble si le séparateur les touche
                    if (sepTouchesFurnitureLeft) {
                        segWidth += thickness;
                        segX -= thickness / 2;
                    }
                    if (sepTouchesFurnitureRight) {
                        segWidth += thickness;
                        segX += thickness / 2;
                    }

                    separatorSegments.push({
                        id: `separator-h-${sep.path}-0`,
                        x: segX,
                        y: sep.y,
                        width: segWidth,
                        height: sep.height,
                        orientation: 'horizontal',
                        segmentIndex: 0
                    });
                }
            }
        });

        // Log des segments séparateurs créés
        console.log('ThreeCanvas - Separator segments:', separatorSegments.map(s => s.id));

        // Fallback pour le panneau arrière si aucun segment n'a été créé
        if (backSegments.length === 0) {
            backSegments.push({ id: 'panel-back-c0-r0', x: 0, y: sideHeight/2 + yOffset, width: w, height: sideHeight, colIndex: 0, rowIndex: 0 });
        }

        return { topSegments, bottomSegments, leftSegments, rightSegments, backSegments, separatorSegments };
    }, [rootZone, w, h, sideHeight, yOffset, thickness]);


    const elements = useMemo(() => {
        const items: React.ReactNode[] = [];
        if (!rootZone) return items;

        // Debug: afficher la rootZone reçue
        // console.log('🎨 ThreeCanvas - rootZone reçue:', JSON.stringify(rootZone, null, 2));
        // console.log('🎨 ThreeCanvas - rootZone.type:', rootZone.type);
        // console.log('🎨 ThreeCanvas - rootZone.children:', rootZone.children?.length || 0, 'enfants');

        const parseZone = (zone: Zone, x: number, y: number, z: number, width: number, height: number, isAtTop: boolean = true, isAtBottom: boolean = true) => {
            // Calcul du débordement pour les portes en mode appliqué
            // On n'applique le débordement que sur les bords externes du meuble
            const topOverlap = isAtTop ? doorOverlap : 0;
            const bottomOverlap = isAtBottom ? doorOverlap : 0;
            const totalDoorOverlap = topOverlap + bottomOverlap;
            const doorYOffset = (topOverlap - bottomOverlap) / 2;
            if (zone.type === 'leaf') {
                // Si c'est un espace ouvert, ne pas ajouter de contenu ni de hitbox normale
                if (zone.isOpenSpace) {
                    // Hitbox transparente pour pouvoir sélectionner l'espace ouvert
                    items.push(
                        <mesh
                            key={`${zone.id}-hitbox`}
                            position={[x, y, 0]}
                            visible={true}
                            onPointerOver={(e) => {
                                e.stopPropagation();
                                document.body.style.cursor = 'pointer';
                            }}
                            onPointerOut={() => {
                                document.body.style.cursor = 'default';
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelectZone?.(zone.id);
                            }}
                        >
                            <boxGeometry args={[width + 0.002, height + 0.002, d + 0.002]} />
                            <meshBasicMaterial
                                transparent
                                opacity={selectedZoneIds.includes(zone.id) ? 0.3 : 0.01}
                                color="#4CAF50"
                                depthWrite={false}
                                toneMapped={false}
                            />
                            {selectedZoneIds.includes(zone.id) && (
                                <>
                                    <mesh>
                                        <boxGeometry args={[width + 0.002, height + 0.002, d + 0.002]} />
                                        <meshBasicMaterial color="#4CAF50" wireframe transparent opacity={0.4} toneMapped={false} />
                                    </mesh>
                                    <lineSegments>
                                        <edgesGeometry args={[new THREE.BoxGeometry(width + 0.002, height + 0.002, d + 0.002)]} />
                                        <lineBasicMaterial color="#4CAF50" linewidth={4} toneMapped={false} />
                                    </lineSegments>
                                </>
                            )}
                        </mesh>
                    );
                    return; // Ne pas continuer - c'est un espace ouvert
                }

                // Ajouter l'éclairage si activé
                if (zone.hasLight) {
                    items.push(
                        <CompartmentLight
                            key={`${zone.id}-light`}
                            width={width}
                            depth={d}
                            position={[x, y + height/2, 0]}
                        />
                    );
                }

                // Ajouter le passe-câble si activé
                if (zone.hasCableHole) {
                    items.push(
                        <CableHole
                            key={`${zone.id}-cable`}
                            width={width}
                            height={height}
                            depth={d}
                            position={[x, y, 0]}
                        />
                    );
                }

                // Hitbox de sélection pour toutes les zones leaf
                items.push(
                    <mesh
                        key={`${zone.id}-hitbox`}
                        position={[x, y, 0]}
                        visible={true}
                        onPointerOver={(e) => {
                            e.stopPropagation();
                            document.body.style.cursor = 'pointer';
                        }}
                        onPointerOut={() => {
                            document.body.style.cursor = 'default';
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            // On appelle onSelectZone avec l'id de la zone.
                            onSelectZone?.(zone.id);

                            // On bascule l'ouverture si c'est un compartiment mobile
                            if (zone.content === 'drawer' || zone.content === 'push_drawer' || zone.content === 'door' || zone.content === 'door_right' || zone.content === 'door_double' || zone.content === 'push_door' || zone.content === 'push_door_right' || zone.content === 'mirror_door' || zone.content === 'mirror_door_right') {
                                toggleCompartment(zone.id);
                            }
                        }}
                    >
                        <boxGeometry args={[width + 0.002, height + 0.002, d + 0.002]} />
                        <meshBasicMaterial
                            transparent
                            opacity={selectedZoneIds.includes(zone.id) ? 0.5 : 0.01}
                            color="#FF9800"
                            depthWrite={false}
                            toneMapped={false}
                        />
                        {selectedZoneIds.includes(zone.id) && (
                            <>
                                {/* Grillage (Wireframe) pour effet de sélection */}
                                <mesh>
                                    <boxGeometry args={[width + 0.002, height + 0.002, d + 0.002]} />
                                    <meshBasicMaterial color="#FF9800" wireframe transparent opacity={0.4} toneMapped={false} />
                                </mesh>
                                {/* Bordures plus marquées */}
                                <lineSegments>
                                    <edgesGeometry args={[new THREE.BoxGeometry(width + 0.002, height + 0.002, d + 0.002)]} />
                                    <lineBasicMaterial color="#FF9800" linewidth={4} toneMapped={false} />
                                </lineSegments>
                            </>
                        )}
                    </mesh>
                );

                if (zone.content === 'shelf') {
                    items.push(
                        <mesh key={zone.id} position={[x, y, z]} castShadow receiveShadow>
                            <boxGeometry args={[width, thickness, d]} />
                            <TexturedMaterial hexColor={finalShelfColor} imageUrl={finalShelfImageUrl} />
                        </mesh>
                    );
                    // Ajouter des décorations sur l'étagère
                    if (showDecorations) {
                        items.push(
                            <group key={`${zone.id}-deco`} position={[x, y + thickness/2, z]}>
                                <ShelfDecoration width={width} height={height} depth={d} seed={zone.id} />
                            </group>
                        );
                    }
                } else if (zone.content === 'drawer') {
                    // Utiliser la couleur spécifique de la zone si disponible
                    const drawerHexColor = zone.zoneColor?.hex || finalDrawerColor;
                    const drawerImageUrl = zone.zoneColor?.imageUrl !== undefined ? zone.zoneColor.imageUrl : finalDrawerImageUrl;
                    items.push(
                        <AnimatedDrawer
                            key={zone.id}
                            position={[x, y + doorYOffset, d / 2 + mountingOffset + 0.009]}
                            width={width - compartmentGap}
                            height={height - compartmentGap + totalDoorOverlap}
                            depth={d}
                            hexColor={drawerHexColor}
                            imageUrl={drawerImageUrl}
                            handleType={zone.handleType}
                            isOpen={openCompartments[zone.id]}
                            onClick={(e: any) => {
                                e.stopPropagation();
                                onSelectZone?.(zone.id);
                                toggleCompartment(zone.id);
                            }}
                        />
                    );
                } else if (zone.content === 'push_drawer') {
                    // Tiroir push-to-open sans poignée - utiliser la couleur spécifique de la zone si disponible
                    const drawerHexColor = zone.zoneColor?.hex || finalDrawerColor;
                    const drawerImageUrl = zone.zoneColor?.imageUrl !== undefined ? zone.zoneColor.imageUrl : finalDrawerImageUrl;
                    items.push(
                        <AnimatedPushDrawer
                            key={zone.id}
                            position={[x, y + doorYOffset, d / 2 + mountingOffset + 0.009]}
                            width={width - compartmentGap}
                            height={height - compartmentGap + totalDoorOverlap}
                            depth={d}
                            hexColor={drawerHexColor}
                            imageUrl={drawerImageUrl}
                            isOpen={openCompartments[zone.id]}
                            onClick={(e: any) => {
                                e.stopPropagation();
                                onSelectZone?.(zone.id);
                                toggleCompartment(zone.id);
                            }}
                        />
                    );
                }

                // Rendu de la penderie (Dressing) - Indépendant du contenu principal
                if (zone.hasDressing || zone.content === 'dressing') {
                    items.push(
                        <mesh key={`${zone.id}-dressing`} position={[x, y + height / 2 - 0.05, z]} rotation={[0, 0, Math.PI / 2]}>
                            <cylinderGeometry args={[0.01, 0.01, width - 0.02, 16]} />
                            <meshStandardMaterial color="#aaa" metalness={0.9} />
                        </mesh>
                    );
                }

                // Rendu des portes (Indépendant du type de zone : feuille ou parent)
                const doorToRender = zone.doorContent || (zone.type === 'leaf' && (zone.content === 'door' || zone.content === 'door_right' || zone.content === 'door_double' || zone.content === 'push_door' || zone.content === 'push_door_right' || zone.content === 'mirror_door' || zone.content === 'mirror_door_right') ? zone.content : null);

                if (doorToRender) {
                    const isDouble = doorToRender === 'door_double';
                    const isRight = doorToRender === 'door_right';
                    const isPush = doorToRender === 'push_door' || doorToRender === 'push_door_right';
                    const isPushRight = doorToRender === 'push_door_right';
                    const isMirror = doorToRender === 'mirror_door' || doorToRender === 'mirror_door_right';
                    const isMirrorRight = doorToRender === 'mirror_door_right';

                    const doorHexColor = zone.zoneColor?.hex || finalDoorColor;
                    const doorImageUrl = zone.zoneColor?.imageUrl !== undefined ? zone.zoneColor.imageUrl : finalDoorImageUrl;

                    if (isMirror) {
                        items.push(
                            <group key={`${zone.id}-door`} position={[x, y + doorYOffset, d/2 + mountingOffset]}>
                                <AnimatedMirrorDoor
                                    side={isMirrorRight ? "right" : "left"}
                                    position={[isMirrorRight ? (width/2 - compartmentGap/2) : (-width/2 + compartmentGap/2), 0, 0]}
                                    width={width - compartmentGap}
                                    height={height - compartmentGap + totalDoorOverlap}
                                    handleType={zone.handleType}
                                    isOpen={openCompartments[zone.id]}
                                    onClick={() => {
                                        toggleCompartment(zone.id);
                                        onSelectZone?.(selectedZoneIds.includes(zone.id) ? null : zone.id);
                                    }}
                                />
                            </group>
                        );
                    } else if (isPush) {
                        items.push(
                            <group key={`${zone.id}-door`} position={[x, y + doorYOffset, d/2 + mountingOffset]}>
                                <AnimatedPushDoor
                                    side={isPushRight ? "right" : "left"}
                                    position={[isPushRight ? (width/2 - compartmentGap/2) : (-width/2 + compartmentGap/2), 0, 0]}
                                    width={width - compartmentGap}
                                    height={height - compartmentGap + totalDoorOverlap}
                                    hexColor={doorHexColor}
                                    imageUrl={doorImageUrl}
                                    isOpen={openCompartments[zone.id]}
                                    onClick={(e: any) => {
                                        e.stopPropagation();
                                        onSelectZone?.(zone.id);
                                        toggleCompartment(zone.id);
                                    }}
                                />
                            </group>
                        );
                    } else {
                        items.push(
                            <group key={`${zone.id}-door`} position={[x, y + doorYOffset, d/2 + mountingOffset]}>
                                {(isDouble || !isRight) && (
                                    <AnimatedDoor
                                        side="left"
                                        position={[-width/2 + compartmentGap/2, 0, 0]}
                                        width={isDouble ? (width - compartmentGap)/2 : width - compartmentGap}
                                        height={height - compartmentGap + totalDoorOverlap}
                                        hexColor={doorHexColor}
                                        imageUrl={doorImageUrl}
                                        handleType={zone.handleType}
                                        isOpen={openCompartments[zone.id]}
                                        onClick={(e: any) => {
                                            e.stopPropagation();
                                            onSelectZone?.(zone.id);
                                        }}
                                    />
                                )}
                                {(isDouble || isRight) && (
                                    <AnimatedDoor
                                        side="right"
                                        position={[width/2 - compartmentGap/2, 0, 0]}
                                        width={isDouble ? (width - compartmentGap)/2 : width - compartmentGap}
                                        height={height - compartmentGap + totalDoorOverlap}
                                        hexColor={doorHexColor}
                                        imageUrl={doorImageUrl}
                                        handleType={zone.handleType}
                                        isOpen={openCompartments[zone.id]}
                                        onClick={(e: any) => {
                                            e.stopPropagation();
                                            onSelectZone?.(zone.id);
                                        }}
                                    />
                                )}
                            </group>
                        );
                    }
                }

                if (zone.content === 'glass_shelf') {
                    // Étagère en verre transparente
                    items.push(
                        <mesh key={zone.id} position={[x, y, z]} castShadow receiveShadow>
                            <boxGeometry args={[width, thickness, d]} />
                            <meshPhysicalMaterial
                                color="#ffffff"
                                transparent
                                opacity={0.3}
                                roughness={0.1}
                                metalness={0.1}
                                transmission={0.9}
                                thickness={0.5}
                            />
                        </mesh>
                    );
                } else if (zone.content === 'mirror_door' || zone.content === 'mirror_door_right') {
                    // Porte avec miroir
                    const isMirrorRightLeaf = zone.content === 'mirror_door_right';
                    items.push(
                        <group key={zone.id} position={[x, y + doorYOffset, d/2 + mountingOffset]}>
                            <AnimatedMirrorDoor
                                side={isMirrorRightLeaf ? "right" : "left"}
                                position={[isMirrorRightLeaf ? (width/2 - compartmentGap/2) : (-width/2 + compartmentGap/2), 0, 0]}
                                width={width - compartmentGap}
                                height={height - compartmentGap + totalDoorOverlap}
                                handleType={zone.handleType}
                                isOpen={openCompartments[zone.id]}
                                onClick={(e: any) => {
                                    e.stopPropagation();
                                    onSelectZone?.(zone.id);
                                    toggleCompartment(zone.id);
                                }}
                            />
                        </group>
                    );
                } else {
                    // Niche vide : Ajouter des décorations au fond de la niche
                    if (showDecorations) {
                        items.push(
                            <group key={`${zone.id}-deco`} position={[x, y - height/2 + thickness/2, z]}>
                                <ShelfDecoration width={width} height={height} depth={d} seed={zone.id} />
                            </group>
                        );
                    }
                }
            }

            // --- Gestion des Portes sur les Groupes ---
            // Si la zone a des enfants (groupe) et qu'elle a un contenu de type porte
            const groupDoor = zone.doorContent || (zone.children && zone.children.length > 0 ? zone.content : null);
            if (zone.children && zone.children.length > 0 && groupDoor && groupDoor.includes('door') && groupDoor !== 'empty') {
                const doorToRender = groupDoor;
                const isDouble = doorToRender === 'door_double';
                const isRight = doorToRender === 'door_right';
                const isPush = doorToRender === 'push_door' || doorToRender === 'push_door_right';
                const isPushRightGroup = doorToRender === 'push_door_right';
                const isMirror = doorToRender === 'mirror_door' || doorToRender === 'mirror_door_right';
                const isMirrorRightGroup = doorToRender === 'mirror_door_right';

                const doorHexColor = zone.zoneColor?.hex || finalDoorColor;
                const doorImageUrl = zone.zoneColor?.imageUrl !== undefined ? zone.zoneColor.imageUrl : finalDoorImageUrl;

                if (isMirror) {
                    items.push(
                        <group key={`${zone.id}-group-door`} position={[x, y + doorYOffset, d/2 + mountingOffset]}>
                            <AnimatedMirrorDoor
                                side={isMirrorRightGroup ? "right" : "left"}
                                position={[isMirrorRightGroup ? (width/2 - compartmentGap/2) : (-width/2 + compartmentGap/2), 0, 0]}
                                width={width - compartmentGap}
                                height={height - compartmentGap + totalDoorOverlap}
                                handleType={zone.handleType}
                                isOpen={openCompartments[zone.id]}
                                onClick={(e: any) => {
                                    e.stopPropagation();
                                    onSelectZone?.(zone.id);
                                    toggleCompartment(zone.id);
                                }}
                            />
                        </group>
                    );
                } else if (isPush) {
                    items.push(
                        <group key={`${zone.id}-group-door`} position={[x, y + doorYOffset, d/2 + mountingOffset]}>
                            <AnimatedPushDoor
                                side={isPushRightGroup ? "right" : "left"}
                                position={[isPushRightGroup ? (width/2 - compartmentGap/2) : (-width/2 + compartmentGap/2), 0, 0]}
                                width={width - compartmentGap}
                                height={height - compartmentGap + totalDoorOverlap}
                                hexColor={doorHexColor}
                                imageUrl={doorImageUrl}
                                isOpen={openCompartments[zone.id]}
                                onClick={(e: any) => {
                                    e.stopPropagation();
                                    onSelectZone?.(zone.id);
                                    toggleCompartment(zone.id);
                                }}
                            />
                        </group>
                    );
                } else {
                    items.push(
                        <group key={`${zone.id}-group-door`} position={[x, y + doorYOffset, d/2 + mountingOffset]}>
                            {(isDouble || !isRight) && (
                                <AnimatedDoor
                                    side="left"
                                    position={[-width/2 + compartmentGap/2, 0, 0]}
                                    width={isDouble ? (width - compartmentGap)/2 : width - compartmentGap}
                                    height={height - compartmentGap + totalDoorOverlap}
                                    hexColor={doorHexColor}
                                    imageUrl={doorImageUrl}
                                    handleType={zone.handleType}
                                    isOpen={openCompartments[zone.id]}
                                    onClick={(e: any) => {
                                        e.stopPropagation();
                                        onSelectZone?.(zone.id);
                                        toggleCompartment(zone.id);
                                    }}
                                />
                            )}
                            {(isDouble || isRight) && (
                                <AnimatedDoor
                                    side="right"
                                    position={[width/2 - compartmentGap/2, 0, 0]}
                                    width={isDouble ? (width - compartmentGap)/2 : width - compartmentGap}
                                    height={height - compartmentGap + totalDoorOverlap}
                                    hexColor={doorHexColor}
                                    imageUrl={doorImageUrl}
                                    handleType={zone.handleType}
                                    isOpen={openCompartments[zone.id]}
                                    onClick={(e: any) => {
                                        e.stopPropagation();
                                        onSelectZone?.(zone.id);
                                        toggleCompartment(zone.id);
                                    }}
                                />
                            )}
                        </group>
                    );
                }
            }

            if (zone.children && zone.children.length > 0) {
                console.log('🎨 parseZone - zone avec enfants:', zone.id, 'type:', zone.type, 'enfants:', zone.children.length);
                let currentPos = 0;
                zone.children.forEach((child, i) => {
                    // Calcul du ratio pour chaque enfant
                    let ratio: number;
                    if (zone.splitRatios && zone.splitRatios.length === zone.children!.length) {
                        // Ratios explicites pour chaque enfant
                        ratio = zone.splitRatios[i] / 100;
                    } else if (zone.children!.length === 2 && zone.splitRatio !== undefined) {
                        // Mode splitRatio pour exactement 2 enfants
                        ratio = (i === 0 ? zone.splitRatio : 100 - zone.splitRatio) / 100;
                    } else {
                        // Par défaut: distribution égale
                        ratio = 1 / zone.children!.length;
                    }
                    console.log('🎨 parseZone - enfant', i, 'ratio:', ratio);

                    if (zone.type === 'horizontal') {
                        const childHeight = height * ratio;
                        // Rendu de haut en bas pour correspondre à l'UI 2D (index 0 = haut)
                        // Pour les splits horizontaux:
                        // - Premier enfant (i=0) est en haut: hérite isAtTop du parent, isAtBottom = false (sauf si c'est le seul enfant)
                        // - Dernier enfant est en bas: isAtTop = false (sauf si c'est le seul enfant), hérite isAtBottom du parent
                        const isFirst = i === 0;
                        const isLast = i === zone.children!.length - 1;
                        const childIsAtTop = isFirst ? isAtTop : false;
                        const childIsAtBottom = isLast ? isAtBottom : false;
                        parseZone(child, x, (y + height/2) - currentPos - childHeight/2, z, width, childHeight, childIsAtTop, childIsAtBottom);
                        currentPos += childHeight;
                        // Note: Les séparateurs visuels sont maintenant rendus via panelSegments.separatorSegments
                        // pour permettre la suppression individuelle de chaque segment
                    } else {
                        const childWidth = width * ratio;
                        // Pour les splits verticaux: les enfants héritent isAtTop et isAtBottom du parent
                        parseZone(child, x - width/2 + currentPos + childWidth/2, y, z, childWidth, height, isAtTop, isAtBottom);
                        currentPos += childWidth;
                        // Note: Les séparateurs visuels sont maintenant rendus via panelSegments.separatorSegments
                        // pour permettre la suppression individuelle de chaque segment
                    }
                });
            }
        };

        parseZone(rootZone, 0, sideHeight/2 + yOffset, 0, w - (thickness * 2), sideHeight - (thickness * 2));
        return items;
    }, [
        rootZone, w, sideHeight, yOffset, thickness, compartmentGap, mountingOffset, doorOverlap, d,
        finalStructureColor, finalShelfColor, finalDrawerColor, finalDoorColor, finalBackColor, finalBaseColor,
        finalStructureImageUrl, finalShelfImageUrl, finalDrawerImageUrl, finalDoorImageUrl, finalBackImageUrl, finalBaseImageUrl,
        separatorColor, separatorImageUrl,
        openCompartments, showDecorations, selectedZoneIds, onSelectZone, toggleCompartment,
        selectedPanelIds, onSelectPanel
    ]);

    // Note: On n'utilise plus de key={colorKey} car cela causait des remontages
    // et des flashs blancs lors des changements de couleur

    // Callback pour la sélection de panneaux (désélectionne les zones si on sélectionne un panneau)
    const handlePanelSelect = useCallback((panelId: string | null) => {
        if (panelId && onSelectZone) {
            onSelectZone(null); // Désélectionner les zones
        }
        onSelectPanel?.(panelId);
    }, [onSelectPanel, onSelectZone]);

    return (
        <group>
            {/* Panneau gauche - rendu segment par segment pour permettre la suppression individuelle */}
            {panelSegments.leftSegments.map((segment) => (
                !deletedPanelIds.has(segment.id) && (
                    <StructuralPanel
                        key={`visual-${segment.id}`}
                        position={[segment.x, segment.y, 0]}
                        size={[segment.width, segment.height, d]}
                        hexColor={finalStructureColor}
                        imageUrl={finalStructureImageUrl}
                    />
                )
            ))}
            {/* Hitbox de sélection par segment pour le panneau gauche */}
            {panelSegments.leftSegments.map((segment) => (
                <PanelSegmentHitbox
                    key={segment.id}
                    panelId={segment.id}
                    position={[segment.x, segment.y, 0]}
                    size={[segment.width, segment.height, d]}
                    isSelected={selectedPanelIds.has(segment.id)}
                    onSelect={handlePanelSelect}
                    isDeleted={deletedPanelIds.has(segment.id)}
                />
            ))}

            {/* Panneau droit - rendu segment par segment pour permettre la suppression individuelle */}
            {panelSegments.rightSegments.map((segment) => (
                !deletedPanelIds.has(segment.id) && (
                    <StructuralPanel
                        key={`visual-${segment.id}`}
                        position={[segment.x, segment.y, 0]}
                        size={[segment.width, segment.height, d]}
                        hexColor={finalStructureColor}
                        imageUrl={finalStructureImageUrl}
                    />
                )
            ))}
            {/* Hitbox de sélection par segment pour le panneau droit */}
            {panelSegments.rightSegments.map((segment) => (
                <PanelSegmentHitbox
                    key={segment.id}
                    panelId={segment.id}
                    position={[segment.x, segment.y, 0]}
                    size={[segment.width, segment.height, d]}
                    isSelected={selectedPanelIds.has(segment.id)}
                    onSelect={handlePanelSelect}
                    isDeleted={deletedPanelIds.has(segment.id)}
                />
            ))}

            {/* Panneau supérieur - rendu segment par segment pour permettre la suppression individuelle */}
            {panelSegments.topSegments.map((segment) => (
                !deletedPanelIds.has(segment.id) && (
                    <StructuralPanel
                        key={`visual-${segment.id}`}
                        position={[segment.x, segment.y, 0]}
                        size={[segment.width, segment.height, d]}
                        hexColor={finalStructureColor}
                        imageUrl={finalStructureImageUrl}
                    />
                )
            ))}
            {/* Hitbox de sélection par segment pour le panneau supérieur */}
            {panelSegments.topSegments.map((segment) => (
                <PanelSegmentHitbox
                    key={segment.id}
                    panelId={segment.id}
                    position={[segment.x, segment.y, 0]}
                    size={[segment.width, segment.height, d]}
                    isSelected={selectedPanelIds.has(segment.id)}
                    onSelect={handlePanelSelect}
                    isDeleted={deletedPanelIds.has(segment.id)}
                />
            ))}

            {/* Décorations sur le dessus */}
            {showDecorations && (
                <group position={[0, h, 0]}>
                    {w > 0.6 && (
                        <Lamp position={[w/2 - 0.2, 0, 0]} />
                    )}
                    {w > 0.8 && (
                        <Vase position={[-w/2 + 0.3, 0, 0.05]} color="#E0E0E0" scale={1.2} seed="top-vase" />
                    )}
                    {w > 1.2 && (
                        <Books position={[0, 0, -0.05]} count={Math.min(6, Math.floor(w * 3))} seed="top-books" />
                    )}
                    {w > 1.6 && (
                        <Vase position={[w/2 - 0.5, 0, -0.1]} color="#BDBDBD" scale={0.9} seed="top-vase-2" />
                    )}
                </group>
            )}

            {/* Panneau inférieur - rendu segment par segment pour permettre la suppression individuelle */}
            {panelSegments.bottomSegments.map((segment) => {
                const isDeleted = deletedPanelIds.has(segment.id);
                console.log('🟢 BOTTOM RENDER:', segment.id, 'isDeleted:', isDeleted, 'deletedPanelIds:', Array.from(deletedPanelIds));
                return !isDeleted && (
                    <StructuralPanel
                        key={`visual-${segment.id}`}
                        position={[segment.x, segment.y, 0]}
                        size={[segment.width, segment.height, d]}
                        hexColor={finalStructureColor}
                        imageUrl={finalStructureImageUrl}
                    />
                );
            })}
            {/* Hitbox de sélection par segment pour le panneau inférieur */}
            {panelSegments.bottomSegments.map((segment) => (
                <PanelSegmentHitbox
                    key={segment.id}
                    panelId={segment.id}
                    position={[segment.x, segment.y, 0]}
                    size={[segment.width, segment.height, d]}
                    isSelected={selectedPanelIds.has(segment.id)}
                    onSelect={handlePanelSelect}
                    isDeleted={deletedPanelIds.has(segment.id)}
                />
            ))}

            {/* Séparateurs - rendu segment par segment pour permettre la suppression individuelle */}
            {panelSegments.separatorSegments.map((segment) => (
                !deletedPanelIds.has(segment.id) && (
                    <StructuralPanel
                        key={`visual-${segment.id}`}
                        position={[segment.x, segment.y, 0]}
                        size={[segment.width, segment.height, d]}
                        hexColor={segment.orientation === 'vertical' ? separatorColor : finalShelfColor}
                        imageUrl={segment.orientation === 'vertical' ? separatorImageUrl : finalShelfImageUrl}
                    />
                )
            ))}
            {/* Hitbox de sélection par segment pour les séparateurs */}
            {panelSegments.separatorSegments.map((segment) => (
                <PanelSegmentHitbox
                    key={segment.id}
                    panelId={segment.id}
                    position={[segment.x, segment.y, 0]}
                    size={[segment.width, segment.height, d]}
                    isSelected={selectedPanelIds.has(segment.id)}
                    onSelect={handlePanelSelect}
                    isDeleted={deletedPanelIds.has(segment.id)}
                />
            ))}

            {/* Dynamic Elements */}
            {elements}

            {/* Doors with Animation - Only render if no zone-specific doors */}
            {rootZone && doorType !== 'none' && !hasZoneSpecificDoors && (
                <group position={[0, sideHeight/2 + yOffset, d/2]}>
                    {(doorType === 'double' || (doorType === 'single' && doorSide === 'left')) && (
                        <AnimatedDoor
                            side="left"
                            position={[-w/2, 0, 0]}
                            width={doorType === 'double' ? w/2 : w}
                            height={sideHeight}
                            hexColor={finalDoorColor}
                            imageUrl={finalDoorImageUrl}
                            isOpen={doorsOpen}
                            onClick={() => {
                                onToggleDoors?.();
                                onSelectZone?.(selectedZoneIds.includes('root') ? null : 'root');
                            }}
                        />
                    )}
                    {(doorType === 'double' || (doorType === 'single' && doorSide === 'right')) && (
                        <AnimatedDoor
                            side="right"
                            position={[w/2, 0, 0]}
                            width={doorType === 'double' ? w/2 : w}
                            height={sideHeight}
                            hexColor={finalDoorColor}
                            imageUrl={finalDoorImageUrl}
                            isOpen={doorsOpen}
                            onClick={() => {
                                onToggleDoors?.();
                                onSelectZone?.(selectedZoneIds.includes('root') ? null : 'root');
                            }}
                        />
                    )}
                </group>
            )}

            {/* Click Detector for Doors (invisible large area) - Only render if no zone-specific doors */}
            {/* We keep it as a fallback for when clicking between doors or for the root selection if doors are closed */}
            {doorType !== 'none' && !hasZoneSpecificDoors && (
                <mesh
                    position={[0, sideHeight/2 + yOffset, d/2 + 0.01]}
                    visible={false}
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleDoors?.();
                        onSelectZone?.(selectedZoneIds.includes('root') ? null : 'root');
                    }}
                >
                    <boxGeometry args={[w, sideHeight, 0.02]} />
                </mesh>
            )}

            {/* Socle */}
            {hasSocle && (
                <>
                    {socle === 'metal' ? (
                        <group position={[0, 0, 0]}>
                            {/* Pieds métal */}
                            <mesh position={[-w/2 + 0.05, 0.05, -d/2 + 0.05]} castShadow>
                                <boxGeometry args={[0.03, 0.1, 0.03]} />
                                <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.8} />
                            </mesh>
                            <mesh position={[w/2 - 0.05, 0.05, -d/2 + 0.05]} castShadow>
                                <boxGeometry args={[0.03, 0.1, 0.03]} />
                                <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.8} />
                            </mesh>
                            <mesh position={[-w/2 + 0.05, 0.05, d/2 - 0.05]} castShadow>
                                <boxGeometry args={[0.03, 0.1, 0.03]} />
                                <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.8} />
                            </mesh>
                            <mesh position={[w/2 - 0.05, 0.05, d/2 - 0.05]} castShadow>
                                <boxGeometry args={[0.03, 0.1, 0.03]} />
                                <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.8} />
                            </mesh>
                        </group>
                    ) : (
                        /* Socle plein (bois) - segmenté selon les colonnes du bas */
                        <group>
                            {panelSegments.bottomSegments.map((segment, index) => {
                                if (deletedPanelIds.has(segment.id)) return null;

                                // Étendre le socle pour couvrir les espaces des séparateurs
                                const isFirst = index === 0;
                                const isLast = index === panelSegments.bottomSegments.length - 1;
                                const separatorGap = thickness; // Épaisseur du séparateur vertical

                                let socleX = segment.x;
                                let socleWidth = segment.width;

                                // Étendre vers la droite pour couvrir le séparateur (sauf dernier segment)
                                if (!isLast) {
                                    socleWidth += separatorGap / 2;
                                    socleX += separatorGap / 4;
                                }
                                // Étendre vers la gauche pour couvrir le séparateur (sauf premier segment)
                                if (!isFirst) {
                                    socleWidth += separatorGap / 2;
                                    socleX -= separatorGap / 4;
                                }

                                return (
                                    <mesh
                                        key={`socle-${segment.id}`}
                                        position={[socleX, 0.05, 0]}
                                        castShadow
                                        receiveShadow
                                    >
                                        <boxGeometry args={[socleWidth, 0.1, d - 0.02]} />
                                        <TexturedMaterial hexColor={finalBaseColor} imageUrl={finalBaseImageUrl} />
                                    </mesh>
                                );
                            })}
                        </group>
                    )}
                </>
            )}

            {/* Back Panel - avec gestion des espaces ouverts */}
            {openSpaceInfo.length === 0 ? (
                // Pas d'espaces ouverts : panneaux segmentés avec suppression individuelle
                <>
                    {/* Panneaux arrière visuels par segment (peuvent être supprimés individuellement) */}
                    {panelSegments.backSegments.map((segment) => (
                        !deletedPanelIds.has(segment.id) && (
                            <StructuralPanel
                                key={`visual-${segment.id}`}
                                position={[segment.x, segment.y, -d/2 + 0.002]}
                                size={[segment.width, segment.height, 0.004]}
                                hexColor={finalBackColor}
                                imageUrl={finalBackImageUrl}
                                castShadow={false}
                            />
                        )
                    ))}
                    {/* Hitbox de sélection par segment pour le panneau arrière */}
                    {panelSegments.backSegments.map((segment) => (
                        <PanelSegmentHitbox
                            key={segment.id}
                            panelId={segment.id}
                            position={[segment.x, segment.y, -d/2 + 0.002]}
                            size={[segment.width, segment.height, 0.004]}
                            isSelected={selectedPanelIds.has(segment.id)}
                            onSelect={handlePanelSelect}
                            isDeleted={deletedPanelIds.has(segment.id)}
                        />
                    ))}
                </>
            ) : (
                // Avec espaces ouverts : générer des panneaux qui évitent les zones ouvertes
                // Note: Pour simplifier, le back panel avec ouvertures n'est pas sélectionnable pour l'instant
                <group
                    onClick={(e) => {
                        e.stopPropagation();
                        handlePanelSelect(selectedPanelIds.has('panel-back') ? null : 'panel-back');
                    }}
                    onPointerOver={(e) => {
                        e.stopPropagation();
                        document.body.style.cursor = 'pointer';
                    }}
                    onPointerOut={() => {
                        document.body.style.cursor = 'default';
                    }}
                >
                    <BackPanelWithOpenings
                        totalWidth={w - 0.01}
                        totalHeight={sideHeight - 0.01}
                        yOffset={sideHeight/2 + yOffset}
                        zOffset={-d/2 + 0.002}
                        openSpaces={openSpaceInfo}
                        hexColor={finalBackColor}
                        imageUrl={finalBackImageUrl}
                    />
                    {selectedPanelIds.has('panel-back') && (
                        <mesh position={[0, sideHeight/2 + yOffset, -d/2 + 0.003]}>
                            <boxGeometry args={[w - 0.005, sideHeight - 0.005, 0.006]} />
                            <meshBasicMaterial color="#2196F3" wireframe transparent opacity={0.5} toneMapped={false} />
                        </mesh>
                    )}
                </group>
            )}
        </group>
    );
}

// ============================================
// TABLEAUX ARTISTIQUES MODERNES
// ============================================

// Composant pour un tableau style minimaliste japonais
function JapaneseMinimalist({ position, width = 0.8, height = 1.0 }: { position: [number, number, number]; width?: number; height?: number }) {
    return (
        <group position={position}>
            {/* Cadre noir fin */}
            <mesh position={[0, height/2 + 0.01, 0]} castShadow>
                <boxGeometry args={[width + 0.02, 0.015, 0.02]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.3} />
            </mesh>
            <mesh position={[0, -height/2 - 0.01, 0]} castShadow>
                <boxGeometry args={[width + 0.02, 0.015, 0.02]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.3} />
            </mesh>
            <mesh position={[-width/2 - 0.01, 0, 0]} castShadow>
                <boxGeometry args={[0.015, height, 0.02]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.3} />
            </mesh>
            <mesh position={[width/2 + 0.01, 0, 0]} castShadow>
                <boxGeometry args={[0.015, height, 0.02]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.3} />
            </mesh>

            {/* Fond crème */}
            <mesh position={[0, 0, -0.005]}>
                <planeGeometry args={[width, height]} />
                <meshStandardMaterial color="#F5F2E8" roughness={0.95} />
            </mesh>

            {/* Branche de cerisier */}
            <mesh position={[-width*0.1, -height*0.1, 0.001]} rotation={[0, 0, 0.3]}>
                <boxGeometry args={[width*0.5, 0.008, 0.002]} />
                <meshStandardMaterial color="#3E2723" roughness={0.8} />
            </mesh>
            <mesh position={[width*0.05, height*0.05, 0.001]} rotation={[0, 0, -0.5]}>
                <boxGeometry args={[width*0.25, 0.005, 0.002]} />
                <meshStandardMaterial color="#3E2723" roughness={0.8} />
            </mesh>

            {/* Fleurs de cerisier */}
            <mesh position={[-width*0.05, height*0.1, 0.002]}>
                <circleGeometry args={[0.025, 16]} />
                <meshStandardMaterial color="#FFCDD2" roughness={0.6} />
            </mesh>
            <mesh position={[width*0.08, height*0.15, 0.002]}>
                <circleGeometry args={[0.02, 16]} />
                <meshStandardMaterial color="#F8BBD9" roughness={0.6} />
            </mesh>
            <mesh position={[width*0.15, height*0.08, 0.002]}>
                <circleGeometry args={[0.022, 16]} />
                <meshStandardMaterial color="#FFCDD2" roughness={0.6} />
            </mesh>
            <mesh position={[-width*0.12, height*0.02, 0.002]}>
                <circleGeometry args={[0.018, 16]} />
                <meshStandardMaterial color="#F8BBD9" roughness={0.6} />
            </mesh>
            <mesh position={[width*0.02, height*0.2, 0.002]}>
                <circleGeometry args={[0.024, 16]} />
                <meshStandardMaterial color="#FFCDD2" roughness={0.6} />
            </mesh>

            {/* Sceau rouge signature */}
            <mesh position={[width*0.3, -height*0.35, 0.002]}>
                <boxGeometry args={[0.04, 0.05, 0.001]} />
                <meshStandardMaterial color="#C62828" roughness={0.5} />
            </mesh>
        </group>
    );
}

// Composant pour un tableau abstrait contemporain
function AbstractContemporary({ position, width = 1.2, height = 0.9 }: { position: [number, number, number]; width?: number; height?: number }) {
    return (
        <group position={position}>
            {/* Cadre flottant blanc */}
            <mesh position={[0, 0, -0.02]} castShadow>
                <boxGeometry args={[width + 0.08, height + 0.08, 0.04]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.3} metalness={0.1} />
            </mesh>
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[width + 0.04, height + 0.04, 0.03]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
            </mesh>

            {/* Fond */}
            <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[width - 0.04, height - 0.04]} />
                <meshStandardMaterial color="#FAFAFA" roughness={0.9} />
            </mesh>

            {/* Arc doré */}
            <mesh position={[width*0.2, -height*0.05, 0.016]} rotation={[0, 0, -0.3]}>
                <ringGeometry args={[width*0.12, width*0.18, 32, 1, 0, Math.PI]} />
                <meshStandardMaterial color="#F2CC8F" roughness={0.6} side={THREE.DoubleSide} />
            </mesh>

            {/* Cercle bleu foncé */}
            <mesh position={[-width*0.2, height*0.15, 0.015]}>
                <circleGeometry args={[width*0.18, 32]} />
                <meshStandardMaterial color="#4A5F7F" roughness={0.6} />
            </mesh>

            {/* Cercle vert */}
            <mesh position={[width*0.25, height*0.25, 0.017]}>
                <circleGeometry args={[width*0.06, 24]} />
                <meshStandardMaterial color="#81B29A" roughness={0.5} />
            </mesh>

            {/* Ligne graphique */}
            <mesh position={[-width*0.1, -height*0.25, 0.018]}>
                <boxGeometry args={[width*0.4, 0.008, 0.001]} />
                <meshStandardMaterial color="#3D405B" roughness={0.4} />
            </mesh>

            {/* Points décoratifs */}
            <mesh position={[-width*0.3, height*0.3, 0.019]}>
                <circleGeometry args={[0.012, 12]} />
                <meshStandardMaterial color="#3D405B" roughness={0.5} />
            </mesh>
            <mesh position={[width*0.32, -height*0.28, 0.019]}>
                <circleGeometry args={[0.015, 12]} />
                <meshStandardMaterial color="#81B29A" roughness={0.5} />
            </mesh>
        </group>
    );
}

// Composant pour un paysage scandinave minimaliste
function ScandinavianLandscape({ position, width = 1.0, height = 0.7 }: { position: [number, number, number]; width?: number; height?: number }) {
    return (
        <group position={position}>
            {/* Cadre bois clair */}
            <mesh position={[0, height/2 + 0.02, 0]} castShadow>
                <boxGeometry args={[width + 0.07, 0.035, 0.025]} />
                <meshStandardMaterial color="#D4C4B0" roughness={0.4} metalness={0.1} />
            </mesh>
            <mesh position={[0, -height/2 - 0.02, 0]} castShadow>
                <boxGeometry args={[width + 0.07, 0.035, 0.025]} />
                <meshStandardMaterial color="#D4C4B0" roughness={0.4} metalness={0.1} />
            </mesh>
            <mesh position={[-width/2 - 0.02, 0, 0]} castShadow>
                <boxGeometry args={[0.035, height, 0.025]} />
                <meshStandardMaterial color="#D4C4B0" roughness={0.4} metalness={0.1} />
            </mesh>
            <mesh position={[width/2 + 0.02, 0, 0]} castShadow>
                <boxGeometry args={[0.035, height, 0.025]} />
                <meshStandardMaterial color="#D4C4B0" roughness={0.4} metalness={0.1} />
            </mesh>

            {/* Ciel */}
            <mesh position={[0, height*0.2, -0.005]}>
                <planeGeometry args={[width, height*0.6]} />
                <meshStandardMaterial color="#E8DFD6" roughness={0.95} />
            </mesh>
            <mesh position={[0, height*0.35, -0.004]}>
                <planeGeometry args={[width, height*0.3]} />
                <meshStandardMaterial color="#D4C8BC" roughness={0.95} />
            </mesh>

            {/* Montagne arrière */}
            <mesh position={[width*0.15, -height*0.05, 0.001]}>
                <coneGeometry args={[width*0.35, height*0.5, 3]} />
                <meshStandardMaterial color="#C4B8AC" roughness={0.8} flatShading />
            </mesh>

            {/* Montagne avant */}
            <mesh position={[-width*0.1, -height*0.15, 0.002]}>
                <coneGeometry args={[width*0.3, height*0.45, 3]} />
                <meshStandardMaterial color="#8B7355" roughness={0.8} flatShading />
            </mesh>

            {/* Eau/Reflet */}
            <mesh position={[0, -height*0.35, 0.003]}>
                <planeGeometry args={[width, height*0.2]} />
                <meshStandardMaterial color="#B8C4C8" roughness={0.3} metalness={0.2} />
            </mesh>

            {/* Ligne d'horizon */}
            <mesh position={[0, -height*0.25, 0.004]}>
                <boxGeometry args={[width, 0.003, 0.001]} />
                <meshStandardMaterial color="#5C5552" roughness={0.5} />
            </mesh>
        </group>
    );
}

// Composant One Line Art (dessin au trait)
function OneLineArt({ position, width = 0.5, height = 0.7 }: { position: [number, number, number]; width?: number; height?: number }) {
    return (
        <group position={position}>
            {/* Cadre flottant */}
            <mesh position={[0, 0, -0.02]} castShadow>
                <boxGeometry args={[width + 0.06, height + 0.06, 0.04]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.3} metalness={0.1} />
            </mesh>
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[width + 0.02, height + 0.02, 0.03]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
            </mesh>

            {/* Fond blanc */}
            <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[width - 0.02, height - 0.02]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.95} />
            </mesh>

            {/* Dessin visage au trait */}
            {/* Contour du visage */}
            <mesh position={[0, 0, 0.015]} rotation={[0, 0, 0.1]}>
                <torusGeometry args={[width*0.18, 0.003, 8, 32, Math.PI * 1.2]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
            </mesh>
            {/* Œil */}
            <mesh position={[-width*0.05, height*0.05, 0.016]}>
                <torusGeometry args={[width*0.03, 0.002, 8, 16, Math.PI * 2]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
            </mesh>
            {/* Sourcil */}
            <mesh position={[-width*0.05, height*0.1, 0.016]} rotation={[0, 0, 0.2]}>
                <torusGeometry args={[width*0.04, 0.002, 8, 16, Math.PI * 0.6]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
            </mesh>
            {/* Nez */}
            <mesh position={[width*0.02, -height*0.02, 0.016]}>
                <boxGeometry args={[0.003, height*0.08, 0.001]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
            </mesh>
            {/* Lèvres */}
            <mesh position={[0, -height*0.1, 0.016]}>
                <torusGeometry args={[width*0.04, 0.002, 8, 16, Math.PI]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
            </mesh>
        </group>
    );
}

// Composant Bauhaus géométrique
function BauhausGeometric({ position, width = 0.6, height = 0.8 }: { position: [number, number, number]; width?: number; height?: number }) {
    return (
        <group position={position}>
            {/* Cadre blanc fin */}
            <mesh position={[0, height/2 + 0.01, 0]} castShadow>
                <boxGeometry args={[width + 0.02, 0.015, 0.02]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.2} metalness={0.3} />
            </mesh>
            <mesh position={[0, -height/2 - 0.01, 0]} castShadow>
                <boxGeometry args={[width + 0.02, 0.015, 0.02]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.2} metalness={0.3} />
            </mesh>
            <mesh position={[-width/2 - 0.01, 0, 0]} castShadow>
                <boxGeometry args={[0.015, height, 0.02]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.2} metalness={0.3} />
            </mesh>
            <mesh position={[width/2 + 0.01, 0, 0]} castShadow>
                <boxGeometry args={[0.015, height, 0.02]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.2} metalness={0.3} />
            </mesh>

            {/* Fond */}
            <mesh position={[0, 0, -0.005]}>
                <planeGeometry args={[width, height]} />
                <meshStandardMaterial color="#F5F5F0" roughness={0.95} />
            </mesh>

            {/* Cercle rouge */}
            <mesh position={[-width*0.15, height*0.2, 0.001]}>
                <circleGeometry args={[width*0.2, 32]} />
                <meshStandardMaterial color="#D32F2F" roughness={0.5} />
            </mesh>

            {/* Triangle jaune */}
            <mesh position={[width*0.15, height*0.15, 0.002]}>
                <coneGeometry args={[width*0.15, width*0.25, 3]} />
                <meshStandardMaterial color="#FBC02D" roughness={0.5} flatShading />
            </mesh>

            {/* Carré bleu */}
            <mesh position={[width*0.1, -height*0.2, 0.003]} rotation={[0, 0, Math.PI/6]}>
                <boxGeometry args={[width*0.22, width*0.22, 0.002]} />
                <meshStandardMaterial color="#1976D2" roughness={0.5} />
            </mesh>

            {/* Lignes noires */}
            <mesh position={[-width*0.2, -height*0.1, 0.004]}>
                <boxGeometry args={[0.006, height*0.5, 0.001]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
            </mesh>
            <mesh position={[0, -height*0.3, 0.004]}>
                <boxGeometry args={[width*0.6, 0.006, 0.001]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
            </mesh>

            {/* Petit cercle noir */}
            <mesh position={[-width*0.25, -height*0.25, 0.005]}>
                <circleGeometry args={[width*0.05, 24]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
            </mesh>
        </group>
    );
}

// Composant Horloge murale moderne
function WallClock({ position, radius = 0.25 }: { position: [number, number, number]; radius?: number }) {
    return (
        <group position={position}>
            {/* Cadre/Bordure de l'horloge */}
            <mesh position={[0, 0, -0.01]} castShadow>
                <cylinderGeometry args={[radius + 0.015, radius + 0.015, 0.04, 32]} />
                <meshStandardMaterial color="#2C2C2C" roughness={0.3} metalness={0.7} />
            </mesh>

            {/* Fond blanc de l'horloge */}
            <mesh position={[0, 0, 0.01]}>
                <circleGeometry args={[radius, 32]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.2} />
            </mesh>

            {/* Marques des heures (12, 3, 6, 9) */}
            <mesh position={[0, radius * 0.85, 0.015]}>
                <boxGeometry args={[0.008, radius * 0.12, 0.002]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
            </mesh>
            <mesh position={[radius * 0.85, 0, 0.015]}>
                <boxGeometry args={[radius * 0.12, 0.008, 0.002]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
            </mesh>
            <mesh position={[0, -radius * 0.85, 0.015]}>
                <boxGeometry args={[0.008, radius * 0.12, 0.002]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
            </mesh>
            <mesh position={[-radius * 0.85, 0, 0.015]}>
                <boxGeometry args={[radius * 0.12, 0.008, 0.002]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
            </mesh>

            {/* Petites marques pour les autres heures */}
            {Array.from({ length: 8 }).map((_, i) => {
                const angle = (Math.PI / 6) * (i + (i >= 3 ? 2 : 1));
                const x = Math.sin(angle) * radius * 0.88;
                const y = Math.cos(angle) * radius * 0.88;
                return (
                    <mesh key={i} position={[x, y, 0.015]} rotation={[0, 0, -angle]}>
                        <boxGeometry args={[0.004, radius * 0.08, 0.002]} />
                        <meshStandardMaterial color="#666" roughness={0.5} />
                    </mesh>
                );
            })}

            {/* Aiguille des heures (10h) */}
            <mesh position={[-radius * 0.15, radius * 0.25, 0.02]} rotation={[0, 0, Math.PI / 6]}>
                <boxGeometry args={[0.01, radius * 0.5, 0.003]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
            </mesh>

            {/* Aiguille des minutes (10 minutes) */}
            <mesh position={[radius * 0.08, radius * 0.4, 0.022]} rotation={[0, 0, -Math.PI / 18]}>
                <boxGeometry args={[0.006, radius * 0.7, 0.003]} />
                <meshStandardMaterial color="#2C2C2C" roughness={0.3} />
            </mesh>

            {/* Centre de l'horloge */}
            <mesh position={[0, 0, 0.025]}>
                <cylinderGeometry args={[0.015, 0.015, 0.01, 16]} />
                <meshStandardMaterial color="#D32F2F" roughness={0.4} metalness={0.5} />
            </mesh>
        </group>
    );
}

function Room() {
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

function HumanSilhouette() {
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

// --- Composants de Décoration ---

function Book({ position, color, rotation = [0, 0, 0] }: any) {
    return (
        <group position={position} rotation={rotation}>
            {/* Couverture (Dos + Plats) */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={[0.03, 0.22, 0.16]} />
                <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
            {/* Tranches (Pages) - Visibles sur 3 côtés */}
            <mesh position={[0.002, 0, 0.002]}>
                <boxGeometry args={[0.027, 0.21, 0.155]} />
                <meshStandardMaterial color="#FCF9F2" roughness={1} />
            </mesh>
            {/* Détail sur le dos (titre simulé) */}
            <mesh position={[-0.016, 0, 0]}>
                <boxGeometry args={[0.001, 0.14, 0.1]} />
                <meshStandardMaterial color="#FFF" transparent opacity={0.15} />
            </mesh>
        </group>
    );
}

function Books({ position, count = 5, seed = "1" }: any) {
    const colors = ['#4A6274', '#7B8C7C', '#A89F91', '#5E524D', '#3F4E4F', '#2C3E50', '#8E44AD', '#2980B9', '#C0392B', '#16A085'];
    const books = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash |= 0;
        }
        const startColor = Math.abs(hash);

        return Array.from({ length: count }).map((_, i) => {
            const s = Math.abs(hash + i);
            const isLast = i === count - 1;
            const tilt = isLast && count > 1 ? (Math.PI * 0.08) : ((s % 10) - 5) * 0.005;
            return {
                color: colors[(startColor + i) % colors.length],
                offset: i * 0.036,
                tilt: tilt,
                depthOffset: ((s % 7) - 3) * 0.005
            };
        });
    }, [count, seed]);

    return (
        <group position={position}>
            {books.map((b, i) => (
                <Book
                    key={i}
                    position={[b.offset, 0.11, b.depthOffset]}
                    color={b.color}
                    rotation={[0, 0, b.tilt]}
                />
            ))}
        </group>
    );
}

function Flower({ position, color = "#E91E63", seed = "1" }: any) {
    const stemPoints = useMemo(() => {
        const points = [];
        const h = 0.15;
        const segments = 8;
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            // Ajout d'une légère courbure sinusoïdale
            const x = Math.sin(t * Math.PI) * 0.01;
            const z = Math.cos(t * Math.PI) * 0.005;
            points.push(new THREE.Vector3(x, t * h, z));
        }
        return points;
    }, []);

    const stemCurve = useMemo(() => new THREE.CatmullRomCurve3(stemPoints), [stemPoints]);

    return (
        <group position={position}>
            {/* Tige */}
            <mesh castShadow>
                <tubeGeometry args={[stemCurve, 12, 0.003, 8, false]} />
                <meshStandardMaterial color="#2D5A27" />
            </mesh>

            {/* Feuilles sur la tige */}
            <group position={[0.01, 0.06, 0]} rotation={[0.5, 0, 1.2]}>
                <mesh castShadow>
                    <sphereGeometry args={[0.01, 12, 12]} />
                    <meshStandardMaterial color="#388E3C" roughness={0.8} />
                    <group scale={[2.5, 0.15, 0.8]}>
                        <mesh>
                            <sphereGeometry args={[0.01, 12, 12]} />
                            <meshStandardMaterial color="#388E3C" roughness={0.8} />
                        </mesh>
                    </group>
                </mesh>
            </group>

            <group position={[-0.01, 0.09, 0]} rotation={[-0.5, 0, -1.2]}>
                <mesh castShadow>
                    <sphereGeometry args={[0.01, 12, 12]} />
                    <meshStandardMaterial color="#388E3C" roughness={0.8} />
                    <group scale={[2, 0.15, 0.7]}>
                        <mesh>
                            <sphereGeometry args={[0.01, 12, 12]} />
                            <meshStandardMaterial color="#388E3C" roughness={0.8} />
                        </mesh>
                    </group>
                </mesh>
            </group>

            {/* Fleur principale (plus détaillée) */}
            <group position={stemPoints[stemPoints.length - 1]}>
                {/* Cœur de la fleur */}
                <mesh castShadow>
                    <sphereGeometry args={[0.014, 16, 16]} />
                    <meshStandardMaterial color="#FFD54F" roughness={0.8} />
                </mesh>

                {/* Pétales (Double rangée pour plus de volume) */}
                {Array.from({ length: 8 }).map((_, i) => (
                    <group key={`p1-${i}`} rotation={[0, (i * Math.PI * 2) / 8, 0.4]}>
                        <mesh position={[0.03, 0, 0]} scale={[1.5, 0.1, 0.6]} castShadow>
                            <sphereGeometry args={[0.025, 16, 16]} />
                            <meshStandardMaterial color={color} roughness={0.6} side={THREE.DoubleSide} />
                        </mesh>
                    </group>
                ))}
                {Array.from({ length: 5 }).map((_, i) => (
                    <group key={`p2-${i}`} rotation={[0, (i * Math.PI * 2) / 5 + 0.3, 0.8]}>
                        <mesh position={[0.02, 0.01, 0]} scale={[1, 0.1, 0.5]} castShadow>
                            <sphereGeometry args={[0.02, 16, 16]} />
                            <meshStandardMaterial color={color} roughness={0.7} side={THREE.DoubleSide} />
                        </mesh>
                    </group>
                ))}
            </group>
        </group>
    );
}

function Vase({ position, color, scale = 1, seed = "1" }: any) {
    const shapeIndex = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash) % 3;
    }, [seed]);

    const points = useMemo(() => {
        const shapes = [
            // Classique
            [[0, 0], [0.06, 0.01], [0.08, 0.08], [0.05, 0.18], [0.04, 0.22], [0.06, 0.25]],
            // Élancé
            [[0, 0], [0.05, 0.01], [0.04, 0.1], [0.06, 0.2], [0.03, 0.25], [0.035, 0.28]],
            // Boule
            [[0, 0], [0.04, 0.01], [0.1, 0.1], [0.1, 0.15], [0.03, 0.22], [0.04, 0.24]]
        ];
        return shapes[shapeIndex].map(p => new THREE.Vector2(p[0], p[1]));
    }, [shapeIndex]);

    const height = useMemo(() => {
        const lastPoint = points[points.length - 1];
        return lastPoint.y;
    }, [points]);

    const flowerColors = ['#E91E63', '#F06292', '#BA68C8', '#9575CD', '#FFAB91', '#FF8A65'];
    const hash = useMemo(() => {
        return seed.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0);
    }, [seed]);

    return (
        <group position={position} scale={scale}>
            <mesh castShadow receiveShadow>
                <latheGeometry args={[points, 32]} />
                <meshStandardMaterial color={color} roughness={0.2} metalness={0.3} />
            </mesh>

            {/* Bouquet de fleurs plus dense et varié */}
            <Flower
                position={[0, height - 0.02, 0]}
                color={flowerColors[hash % flowerColors.length]}
                seed={seed}
            />
            {shapeIndex === 2 && ( // Vase boule : bouquet complet
                <>
                    <group rotation={[0, 0, 0.35]}>
                        <Flower
                            position={[0.02, height - 0.04, 0.02]}
                            color={flowerColors[(hash + 1) % flowerColors.length]}
                            seed={seed + "_f2"}
                        />
                    </group>
                    <group rotation={[0, 0, -0.35]}>
                        <Flower
                            position={[-0.02, height - 0.04, -0.02]}
                            color={flowerColors[(hash + 2) % flowerColors.length]}
                            seed={seed + "_f3"}
                        />
                    </group>
                </>
            )}
            {shapeIndex === 1 && ( // Vase élancé : deux fleurs décalées
                <group rotation={[0.2, 0, 0.1]}>
                    <Flower
                        position={[0.01, height - 0.05, 0]}
                        color={flowerColors[(hash + 3) % flowerColors.length]}
                        seed={seed + "_f4"}
                    />
                </group>
            )}
        </group>
    );
}

function Lamp({ position }: any) {
    return (
        <group position={position}>
            {/* Base */}
            <mesh position={[0, 0.01, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.08, 0.02, 24]} />
                <meshStandardMaterial color="#222" metalness={0.8} />
            </mesh>
            {/* Tige */}
            <mesh position={[0, 0.2, 0]} castShadow>
                <cylinderGeometry args={[0.01, 0.01, 0.4, 12]} />
                <meshStandardMaterial color="#222" metalness={0.8} />
            </mesh>
            {/* Abat-jour */}
            <mesh position={[0, 0.4, 0]} castShadow>
                <cylinderGeometry args={[0.12, 0.18, 0.2, 24, 1, true]} />
                <meshStandardMaterial color="#F5F5F5" side={THREE.DoubleSide} />
            </mesh>
            {/* Ampoule (physique + lumière) */}
            <mesh position={[0, 0.38, 0]}>
                <sphereGeometry args={[0.025, 16, 16]} />
                <meshStandardMaterial color="#FFF5E1" emissive="#FFF5E1" emissiveIntensity={0.5} />
            </mesh>
            <pointLight position={[0, 0.38, 0]} intensity={0.4} color="#FFF5E1" />
        </group>
    );
}

function CompartmentLight({ width, depth, position }: any) {
    return (
        <group position={position}>
            {/* Ruban LED physique */}
            <mesh position={[0, -0.005, depth / 4]}>
                <boxGeometry args={[width * 0.9, 0.01, 0.01]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
            </mesh>
            {/* Lumière d'ambiance */}
            <pointLight
                position={[0, -0.1, depth / 4]}
                intensity={0.4}
                distance={1.5}
                decay={2}
                color="#fffde1"
                castShadow
                shadow-bias={-0.001}
            />
        </group>
    );
}

function CableHole({ width, height, depth, position }: any) {
    return (
        <group position={position}>
            {/* Cercle noir pour simuler le trou dans le fond */}
            <mesh position={[0, 0, -depth / 2 + 0.005]}>
                <circleGeometry args={[0.03, 32]} />
                <meshStandardMaterial color="#111" roughness={1} />
            </mesh>
            {/* Bordure du passe-câble (plastique noir) */}
            <mesh position={[0, 0, -depth / 2 + 0.006]}>
                <torusGeometry args={[0.03, 0.005, 16, 32]} />
                <meshStandardMaterial color="#222" roughness={0.5} />
            </mesh>
        </group>
    );
}

function ModernSculpture({ color }: { color: string }) {
    return (
        <group>
            {/* Socle de la sculpture */}
            <mesh position={[0, 0.005, 0]} castShadow>
                <boxGeometry args={[0.07, 0.01, 0.07]} />
                <meshStandardMaterial color="#1A1917" roughness={0.5} />
            </mesh>
            {/* Sculpture abstraite minimaliste (évite le simple cercle) */}
            <mesh position={[0, 0.05, 0]} castShadow>
                <octahedronGeometry args={[0.035, 0]} />
                <meshStandardMaterial color={color} metalness={0.8} roughness={0.1} />
            </mesh>
            <mesh position={[0, 0.1, 0]} castShadow>
                <sphereGeometry args={[0.015, 16, 16]} />
                <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} />
            </mesh>
            <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 4, 0, Math.PI / 4]} castShadow>
                <boxGeometry args={[0.01, 0.12, 0.01]} />
                <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
            </mesh>
        </group>
    );
}

function DecorObject({ position, type = 'sphere', color = '#D4AF37' }: any) {
    return (
        <group position={position}>
            {type === 'sphere' ? (
                <mesh castShadow>
                    <sphereGeometry args={[0.05, 16, 16]} />
                    <meshStandardMaterial color={color} metalness={0.6} roughness={0.2} />
                </mesh>
            ) : (
                <ModernSculpture color={color} />
            )}
        </group>
    );
}

function ShelfDecoration({ width, height, depth, seed }: { width: number, height: number, depth: number, seed: string }) {
    // Utiliser le seed pour avoir des décos stables par zone
    const decoType = useMemo(() => {
        // Hash simple du seed
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash |= 0;
        }
        const s = Math.abs(hash);

        if (width < 0.15 || depth < 0.15 || height < 0.15) return null; // Trop petit pour quoi que ce soit

        const types = [];
        if (width > 0.6) types.push('books_vase_sculpture');
        if (width > 0.45) types.push('books_vase');
        if (width > 0.35) types.push('vase_sculpture');
        if (width > 0.25) types.push('books');
        types.push('vase');
        types.push('sculpture');

        return types[s % types.length];
    }, [seed, width, height, depth]);

    if (!decoType) return null;

    const vaseColors = ['#90A4AE', '#A1887F', '#8D6E63', '#78909C', '#BDBDBD', '#E0E0E0', '#B0BEC5', '#D7CCC8'];
    const objColors = ['#D4AF37', '#C0C0C0', '#CD7F32', '#444', '#263238'];
    const hash = seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

    // Calcul du facteur d'échelle basé sur la hauteur du compartiment
    // Hauteur naturelle estimée : Vase+Fleur ~0.42m, Livres ~0.22m, Sculpture ~0.15m
    const margin = 0.04; // 4cm de marge en haut
    const availableHeight = height - margin;

    const vaseScale = Math.min(1.1, availableHeight / 0.42, width * 2);
    const booksScale = Math.min(1.0, availableHeight / 0.22);
    const sculptureScale = Math.min(1.0, availableHeight / 0.15);

    return (
        <group position={[0, 0, 0]}>
            {decoType === 'books' && (
                <group scale={booksScale}>
                    <Books position={[-width / 4, 0, -depth / 6]} count={Math.min(10, Math.floor(width * 15))} />
                </group>
            )}
            {decoType === 'vase' && (
                <Vase
                    position={[0, 0, 0]}
                    color={vaseColors[hash % vaseColors.length]}
                    seed={seed}
                    scale={vaseScale}
                />
            )}
            {decoType === 'books_vase' && (
                <>
                    <group scale={booksScale}>
                        <Books position={[-width / 3, 0, -depth / 6]} count={Math.max(2, Math.floor(width * 6))} />
                    </group>
                    <Vase
                        position={[width / 4, 0, depth / 10]}
                        color={vaseColors[hash % vaseColors.length]}
                        seed={seed + "_v"}
                        scale={Math.min(0.8, vaseScale)}
                    />
                </>
            )}
            {decoType === 'books_vase_sculpture' && (
                <>
                    <group scale={booksScale}>
                        <Books position={[-width / 2.5, 0, -depth / 8]} count={3} />
                    </group>
                    <Vase
                        position={[0, 0, depth / 10]}
                        color={vaseColors[hash % vaseColors.length]}
                        seed={seed + "_v"}
                        scale={Math.min(0.7, vaseScale)}
                    />
                    <group scale={sculptureScale}>
                        <DecorObject
                            position={[width / 3, 0.04, -depth / 10]}
                            type={hash % 2 === 0 ? 'sphere' : 'sculpture'}
                            color={objColors[hash % objColors.length]}
                        />
                    </group>
                </>
            )}
            {decoType === 'vase_sculpture' && (
                <>
                    <Vase
                        position={[-width / 6, 0, -depth / 10]}
                        color={vaseColors[(hash + 1) % vaseColors.length]}
                        seed={seed + "_v2"}
                        scale={Math.min(0.9, vaseScale)}
                    />
                    <group scale={sculptureScale}>
                        <DecorObject
                            position={[width / 6, 0.05, depth / 10]}
                            type={hash % 2 === 0 ? 'sphere' : 'sculpture'}
                            color={objColors[hash % objColors.length]}
                        />
                    </group>
                </>
            )}
            {decoType === 'sculpture' && (
                <group scale={sculptureScale}>
                    <DecorObject
                        position={[0, 0.05, 0]}
                        type={hash % 3 === 0 ? 'sculpture' : 'sphere'}
                        color={objColors[hash % objColors.length]}
                    />
                </group>
            )}
        </group>
    );
}

// Composant interne pour capturer le screenshot
function ScreenshotCapture({ onCapture }: { onCapture: (fn: () => string | null) => void }) {
    const { gl, scene, camera } = useThree();

    useEffect(() => {
        const captureScreenshot = () => {
            try {
                // Rendre une frame
                gl.render(scene, camera);
                // Capturer le canvas en base64
                const dataUrl = gl.domElement.toDataURL('image/png');
                return dataUrl;
            } catch (error) {
                console.error('Erreur lors de la capture:', error);
                return null;
            }
        };

        onCapture(captureScreenshot);
    }, [gl, scene, camera, onCapture]);

    return null;
}

const ThreeCanvas = forwardRef<ThreeCanvasHandle, ThreeViewerProps>((props, ref) => {
    const { onSelectZone } = props;
    const captureRef = useRef<(() => string | null) | null>(null);

    // Exposer la méthode de capture via la ref
    useImperativeHandle(ref, () => ({
        captureScreenshot: () => {
            if (captureRef.current) {
                return captureRef.current();
            }
            return null;
        }
    }), []);

    const handleCapture = (fn: () => string | null) => {
        captureRef.current = fn;
    };

    return (
        <div style={{ width: '100%', height: '100%', background: '#FAFAF9', position: 'relative' }}>
            <Canvas
                shadows
                dpr={[1, 2]}
                camera={{ position: [4, 2.5, 5], fov: 35 }}
                onPointerMissed={() => onSelectZone?.(null)}
                onCreated={({ gl }) => {
                    gl.setClearColor('#FAFAF9');
                    gl.toneMapping = THREE.ACESFilmicToneMapping;
                    gl.toneMappingExposure = 1.1;
                }}
                gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
            >
                {/* Screenshot capture temporairement désactivé pour éviter les erreurs SSR */}
                {/* <ScreenshotCapture onCapture={handleCapture} /> */}
                <OrbitControls
                    enableDamping
                    minDistance={1.5}
                    maxDistance={10}
                    maxPolarAngle={Math.PI / 2 - 0.05}
                    target={[0, 0.8, 0]}
                />
                <ambientLight intensity={0.4} />
                <hemisphereLight intensity={0.5} groundColor="#ffffff" color="#ffffff" />
                <pointLight position={[10, 10, 10]} intensity={1.0} />
                <directionalLight
                    position={[-5, 8, 5]}
                    intensity={1.0}
                    castShadow
                    shadow-mapSize={[2048, 2048]}
                    shadow-camera-left={-10}
                    shadow-camera-right={10}
                    shadow-camera-top={10}
                    shadow-camera-bottom={-10}
                    shadow-bias={-0.0001}
                />

                <Suspense fallback={null}>
                    <Room />
                    <Furniture
                        {...props}
                        imageUrl={props.imageUrl}
                    />
                    <HumanSilhouette />
                    <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={15} blur={2.5} far={1.5} />
                    <Environment preset="city" background={false} />
                </Suspense>
            </Canvas>
        </div>
    );
});

ThreeCanvas.displayName = 'ThreeCanvas';

export default ThreeCanvas;


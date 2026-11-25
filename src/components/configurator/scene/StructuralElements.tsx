import { useState } from 'react';
import * as THREE from 'three';
import { TexturedMaterial } from './TexturedMaterial';
import { isRealClick } from './pointer';
import type { HandleType } from '@/components/configurator/ZoneEditor/types';
import { legacyOrientation, shapeHasOrientation, type HandleModel, type ResolvedHandle } from '@/lib/configurator/handles';
import {
    LEGACY_HANDLE_OFFSET,
    layoutHandle,
    legacyHandleLength,
    legacyHandleType,
    modelHandleDimensions,
    modelHandleLength,
    safeFinishHex,
    type HandleFacade,
} from './handleGeometry';

interface PanelSegmentHitboxProps {
    panelId: string;
    position: [number, number, number];
    size: [number, number, number];
    isSelected: boolean;
    onSelect: (panelId: string | null) => void;
    isDeleted?: boolean;
}

export function PanelSegmentHitbox({
                                panelId,
                                position,
                                size,
                                isSelected,
                                onSelect,
                                isDeleted = false
                            }: PanelSegmentHitboxProps) {
    // Survol : la planche se teinte, on voit qu'un clic la choisit
    const [hovered, setHovered] = useState(false);

    return (
        <group position={position}>
            <mesh
                visible={false}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHovered(true);
                    document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => {
                    setHovered(false);
                    document.body.style.cursor = 'default';
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    // Un glissement pour tourner autour du meuble ne sélectionne pas de planche
                    if (!isRealClick(e)) return;
                    onSelect(isSelected ? null : panelId);
                }}
            >
                {/* Un peu plus profond que les zones des compartiments : sur la tranche d'un panneau c'est lui qui répond */}
                <boxGeometry args={[size[0] + 0.002, size[1] + 0.002, size[2] + 0.004]} />
                <meshBasicMaterial transparent opacity={0} />
            </mesh>

            {hovered && !isSelected && (
                <mesh>
                    <boxGeometry args={[size[0] + 0.003, size[1] + 0.003, size[2] + 0.003]} />
                    <meshBasicMaterial transparent opacity={0.4} color="#3B3E58" depthWrite={false} toneMapped={false} />
                </mesh>
            )}

            {isSelected && (
                <>
                    <mesh>
                        <boxGeometry args={[size[0] + 0.003, size[1] + 0.003, size[2] + 0.003]} />
                        <meshBasicMaterial
                            transparent
                            opacity={isDeleted ? 0.35 : 0.4}
                            color={isDeleted ? "#6A2025" : "#3B3E58"}
                            depthWrite={false}
                            toneMapped={false}
                        />
                    </mesh>
                    <mesh>
                        <boxGeometry args={[size[0] + 0.004, size[1] + 0.004, size[2] + 0.004]} />
                        <meshBasicMaterial color={isDeleted ? "#6A2025" : "#3B3E58"} wireframe transparent opacity={0.5} toneMapped={false} />
                    </mesh>
                    <lineSegments>
                        <edgesGeometry args={[new THREE.BoxGeometry(size[0] + 0.005, size[1] + 0.005, size[2] + 0.005)]} />
                        <lineBasicMaterial color={isDeleted ? "#6A2025" : "#3B3E58"} linewidth={4} toneMapped={false} />
                    </lineSegments>
                </>
            )}
        </group>
    );
}

interface StructuralPanelProps {
    position: [number, number, number];
    size: [number, number, number];
    hexColor: string;
    imageUrl?: string | null;
    castShadow?: boolean;
    receiveShadow?: boolean;
}

export function StructuralPanel({
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

// Repère local des poignées : l'axe long est X (posée horizontalement), Z sort de la façade. Une poignée verticale est
// la même tournée d'un quart de tour. Matériaux MeshStandardMaterial : l'export AR ne garde que ce type.
// Cotes (entraxe, largeur, saillie) : celles du plan du fabricant saisies dans l'admin, sinon celles de la forme
// (modelHandleDimensions).
const QUARTER_TURN = Math.PI / 2;
const FOOT_RADIUS = 0.004;
// Épaisseur d'une barre plate ou d'une lanière
const STRAP_THICKNESS = 0.004;
// Chapeau d'un bouton, un peu plus large que son corps
const KNOB_CAP_THICKNESS = 0.004;
const KNOB_BODY_RATIO = 0.89;
const DARK_INSET = <meshStandardMaterial color="#1a1a1a" metalness={0.2} roughness={0.8} />;

function ModelHandleMaterial({ finish }: { finish: string }) {
    return <meshStandardMaterial color={finish} metalness={0.85} roughness={0.3} />;
}

// Deux pieds entre la façade et la barre, aux vis (spacing : entraxe ; depth : longueur des pieds)
function HandleFeet({ spacing, depth, finish }: { spacing: number; depth: number; finish: string }) {
    if (depth <= 0) return null;
    return (
        <>
            {[-1, 1].map((sign) => (
                <mesh key={sign} position={[(sign * spacing) / 2, 0, depth / 2]} rotation={[QUARTER_TURN, 0, 0]} castShadow>
                    <cylinderGeometry args={[FOOT_RADIUS, FOOT_RADIUS, depth, 12]} />
                    <ModelHandleMaterial finish={finish} />
                </mesh>
            ))}
        </>
    );
}

function ModelHandleShape({ model, length }: { model: HandleModel; length: number }) {
    const finish = safeFinishHex(model.finish_hex);
    const { spacing, width, projection } = modelHandleDimensions(model, length);

    if (model.shape === 'knob') {
        // Corps cylindrique coiffé d'un chapeau un peu plus large (largeur : diamètre du chapeau)
        const capRadius = width / 2;
        const bodyHeight = Math.max(0.002, projection - KNOB_CAP_THICKNESS);
        return (
            <>
                <mesh position={[0, 0, bodyHeight / 2]} rotation={[QUARTER_TURN, 0, 0]} castShadow>
                    <cylinderGeometry args={[capRadius * KNOB_BODY_RATIO, capRadius * KNOB_BODY_RATIO, bodyHeight, 24]} />
                    <ModelHandleMaterial finish={finish} />
                </mesh>
                <mesh position={[0, 0, bodyHeight + KNOB_CAP_THICKNESS / 2]} rotation={[QUARTER_TURN, 0, 0]} castShadow>
                    <cylinderGeometry args={[capRadius, capRadius, KNOB_CAP_THICKNESS, 24]} />
                    <ModelHandleMaterial finish={finish} />
                </mesh>
            </>
        );
    }
    if (model.shape === 'recessed') {
        // Cuvette ronde encastrée dans la façade : bague (largeur : son diamètre) et fond sombre
        const ring = Math.max(0.001, projection);
        return (
            <>
                <mesh position={[0, 0, ring / 2]} rotation={[QUARTER_TURN, 0, 0]} castShadow>
                    <cylinderGeometry args={[width / 2, width / 2, ring, 32]} />
                    <ModelHandleMaterial finish={finish} />
                </mesh>
                <mesh position={[0, 0, ring + 0.0005]} rotation={[QUARTER_TURN, 0, 0]}>
                    <cylinderGeometry args={[width * 0.365, width * 0.365, 0.002, 32]} />
                    {DARK_INSET}
                </mesh>
            </>
        );
    }
    if (model.shape === 'cup') {
        // Cuvette oblongue encastrée : rebord à fleur de façade et creux sombre pour les doigts
        const rim = Math.max(0.001, projection);
        return (
            <>
                <mesh position={[0, 0, rim / 2]} castShadow>
                    <boxGeometry args={[length, width, rim]} />
                    <ModelHandleMaterial finish={finish} />
                </mesh>
                <mesh position={[0, 0, rim + 0.0005]}>
                    <boxGeometry args={[length * 0.8, width * 0.6, 0.002]} />
                    {DARK_INSET}
                </mesh>
            </>
        );
    }
    if (model.shape === 'leather') {
        // Lanière de cuir vissée par deux rivets métalliques, à l'entraxe
        const strapZ = Math.max(STRAP_THICKNESS / 2, projection - STRAP_THICKNESS / 2);
        return (
            <>
                <mesh position={[0, 0, strapZ]} castShadow>
                    <boxGeometry args={[length, width, STRAP_THICKNESS]} />
                    <meshStandardMaterial color={finish} metalness={0.05} roughness={0.85} />
                </mesh>
                {[-1, 1].map((sign) => (
                    <mesh key={sign} position={[(sign * spacing) / 2, 0, strapZ + 0.003]} rotation={[QUARTER_TURN, 0, 0]} castShadow>
                        <cylinderGeometry args={[0.004, 0.004, 0.003, 16]} />
                        <meshStandardMaterial color="#B8B8B8" metalness={0.9} roughness={0.25} />
                    </mesh>
                ))}
                <HandleFeet spacing={spacing} depth={strapZ - STRAP_THICKNESS / 2} finish={finish} />
            </>
        );
    }
    if (model.shape === 'profile') {
        // Profilé collé à la façade, sans pied
        return (
            <mesh position={[0, 0, projection / 2]} castShadow>
                <boxGeometry args={[length, width, Math.max(0.001, projection)]} />
                <ModelHandleMaterial finish={finish} />
            </mesh>
        );
    }
    if (model.shape === 'flat_bar') {
        const barZ = Math.max(STRAP_THICKNESS / 2, projection - STRAP_THICKNESS / 2);
        return (
            <>
                <mesh position={[0, 0, barZ]} castShadow>
                    <boxGeometry args={[length, width, STRAP_THICKNESS]} />
                    <ModelHandleMaterial finish={finish} />
                </mesh>
                <HandleFeet spacing={spacing} depth={barZ - STRAP_THICKNESS / 2} finish={finish} />
            </>
        );
    }
    // Barre ronde : largeur = diamètre, l'avant de la barre à la saillie
    const radius = width / 2;
    const axisZ = Math.max(radius, projection - radius);
    return (
        <>
            <mesh position={[0, 0, axisZ]} rotation={[0, 0, QUARTER_TURN]} castShadow>
                <cylinderGeometry args={[radius, radius, length, 16]} />
                <ModelHandleMaterial finish={finish} />
            </mesh>
            <HandleFeet spacing={spacing} depth={axisZ} finish={finish} />
        </>
    );
}

// Anciennes poignées, dessinées comme avant les modèles (barre noire, bouton sphérique, poignée encastrée)
function LegacyHandleShape({ type, length }: { type: HandleType; length: number }) {
    const legacyMaterial = <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />;

    if (type === 'knob') {
        return (
            <mesh castShadow>
                <sphereGeometry args={[0.02, 16, 16]} />
                {legacyMaterial}
            </mesh>
        );
    }
    if (type === 'recessed') {
        return (
            <mesh castShadow>
                <boxGeometry args={[0.08, 0.025, 0.015]} />
                <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.6} />
            </mesh>
        );
    }
    return (
        <mesh rotation={[0, 0, QUARTER_TURN]} castShadow>
            <cylinderGeometry args={[0.008, 0.008, length, 12]} />
            {legacyMaterial}
        </mesh>
    );
}

interface HandleProps {
    // Poignée choisie pour la façade ; absente : barre par défaut (verticale sur une porte, horizontale sur un tiroir)
    handle?: ResolvedHandle | null;
    // Dimensions réelles de la façade : la poignée y est bornée et placée
    facade: HandleFacade;
    // Centre de la face avant de la façade, dans le repère du parent
    origin: [number, number, number];
}

export function Handle({ handle, facade, origin }: HandleProps) {
    if (handle?.model) {
        const { model } = handle;
        const orientation = shapeHasOrientation(model.shape) ? handle.orientation : null;
        const layout = layoutHandle(facade, orientation, modelHandleLength(model.length_mm));
        return (
            <group
                position={[origin[0] + layout.x, origin[1] + layout.y, origin[2]]}
                rotation={[0, 0, layout.vertical ? QUARTER_TURN : 0]}
            >
                <ModelHandleShape model={model} length={layout.length} />
            </group>
        );
    }

    // Ancienne configuration, ou aucun modèle chargé : barre noire d'avant, dans l'orientation choisie
    const type = legacyHandleType(handle?.legacyType, handle?.orientation ?? (facade.kind === 'drawer' ? 'horizontal' : 'vertical'));
    const orientation = legacyOrientation(type);
    const layout = layoutHandle(facade, orientation, legacyHandleLength(type, facade));
    return (
        <group
            position={[origin[0] + layout.x, origin[1] + layout.y, origin[2] + LEGACY_HANDLE_OFFSET[facade.kind]]}
            rotation={[0, 0, layout.vertical ? QUARTER_TURN : 0]}
        >
            <LegacyHandleShape type={type} length={layout.length} />
        </group>
    );
}

export function DoorHinge({ position, side }: { position: [number, number, number]; side: 'left' | 'right' }) {
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
            <mesh position={[side === 'left' ? -0.008 : 0.008, 0, -0.012]} castShadow>
                <boxGeometry args={[0.012, 0.05, 0.008]} />
                {hingeMaterial}
            </mesh>
            <mesh position={[side === 'left' ? -0.002 : 0.002, 0, -0.008]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.004, 0.004, 0.055, 12]} />
                {hingeMaterial}
            </mesh>
            <mesh position={[side === 'left' ? 0.004 : -0.004, 0, -0.004]} castShadow>
                <boxGeometry args={[0.01, 0.045, 0.006]} />
                {hingeMaterial}
            </mesh>
        </group>
    );
}

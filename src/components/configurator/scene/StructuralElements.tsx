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
const QUARTER_TURN = Math.PI / 2;
// Barres sur pieds : axe de la barre à 2 cm de la façade, pieds à 10 % des bouts
const BAR_STANDOFF = 0.02;
const FOOT_RADIUS = 0.004;

function ModelHandleMaterial({ finish }: { finish: string }) {
    return <meshStandardMaterial color={finish} metalness={0.85} roughness={0.3} />;
}

// Deux pieds entre la façade et la barre (depth : longueur des pieds)
function HandleFeet({ length, depth, finish }: { length: number; depth: number; finish: string }) {
    return (
        <>
            {[-1, 1].map((sign) => (
                <mesh key={sign} position={[sign * length * 0.4, 0, depth / 2]} rotation={[QUARTER_TURN, 0, 0]} castShadow>
                    <cylinderGeometry args={[FOOT_RADIUS, FOOT_RADIUS, depth, 12]} />
                    <ModelHandleMaterial finish={finish} />
                </mesh>
            ))}
        </>
    );
}

function ModelHandleShape({ model, length }: { model: HandleModel; length: number }) {
    const finish = safeFinishHex(model.finish_hex);

    if (model.shape === 'knob') {
        // Corps cylindrique coiffé d'un chapeau un peu plus large
        return (
            <>
                <mesh position={[0, 0, 0.009]} rotation={[QUARTER_TURN, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.012, 0.012, 0.018, 24]} />
                    <ModelHandleMaterial finish={finish} />
                </mesh>
                <mesh position={[0, 0, 0.02]} rotation={[QUARTER_TURN, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.0135, 0.0135, 0.004, 24]} />
                    <ModelHandleMaterial finish={finish} />
                </mesh>
            </>
        );
    }
    if (model.shape === 'profile') {
        // Profilé collé à la façade, sans pied
        return (
            <mesh position={[0, 0, 0.006]} castShadow>
                <boxGeometry args={[length, 0.016, 0.012]} />
                <ModelHandleMaterial finish={finish} />
            </mesh>
        );
    }
    if (model.shape === 'flat_bar') {
        return (
            <>
                <mesh position={[0, 0, BAR_STANDOFF]} castShadow>
                    <boxGeometry args={[length, 0.012, 0.004]} />
                    <ModelHandleMaterial finish={finish} />
                </mesh>
                <HandleFeet length={length} depth={BAR_STANDOFF - 0.002} finish={finish} />
            </>
        );
    }
    return (
        <>
            <mesh position={[0, 0, BAR_STANDOFF]} rotation={[0, 0, QUARTER_TURN]} castShadow>
                <cylinderGeometry args={[0.006, 0.006, length, 16]} />
                <ModelHandleMaterial finish={finish} />
            </mesh>
            <HandleFeet length={length} depth={BAR_STANDOFF} finish={finish} />
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

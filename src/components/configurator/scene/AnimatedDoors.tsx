import { useRef } from 'react';
import * as THREE from 'three';
import { getSafeColor } from './utils';
import { TexturedMaterial } from './TexturedMaterial';
import { Handle } from './StructuralElements';
import { useSmoothedRotationY } from './useSmoothed';
import type { ResolvedHandle } from '@/lib/configurator/handles';

// Les portes ne gèrent pas elles-mêmes le pointeur : la scène les enveloppe dans un groupe qui s'en charge
// (survol, sélection, ouverture), ce qui garde un comportement identique pour toutes les façades.

type Vec3 = [number, number, number];

interface DoorProps {
    position: Vec3;
    width: number;
    height: number;
    side: 'left' | 'right';
    isOpen?: boolean;
    hexColor?: string | null;
    imageUrl?: string | null;
    // Poignée de la porte ; absente : barre verticale par défaut
    handle?: ResolvedHandle | null;
}

const DOOR_OPEN_ANGLE = Math.PI * 0.39;
// Face avant du panneau (posé à z = 0.014, épais de 0.018), où se fixe la poignée
const DOOR_FACE_Z = 0.023;

function useDoorSwing(side: 'left' | 'right', isOpen?: boolean) {
    const groupRef = useRef<THREE.Group>(null);
    useSmoothedRotationY(groupRef, isOpen ? (side === 'left' ? -DOOR_OPEN_ANGLE : DOOR_OPEN_ANGLE) : 0);
    return groupRef;
}

export function AnimatedDoor({ position, width, height, hexColor, imageUrl, side, isOpen, handle }: DoorProps) {
    const groupRef = useDoorSwing(side, isOpen);
    const safeHexColor = getSafeColor(hexColor);

    return (
        <group ref={groupRef} position={position}>
            <mesh position={[side === 'left' ? width/2 : -width/2, 0, 0.014]} castShadow>
                <boxGeometry args={[width - 0.005, height, 0.018]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
            <Handle
                handle={handle}
                facade={{ kind: 'door', hingeSide: side, width, height }}
                origin={[side === 'left' ? width/2 : -width/2, 0, DOOR_FACE_Z]}
            />
        </group>
    );
}

export function AnimatedMirrorDoor({ position, width, height, side, isOpen, handle }: Omit<DoorProps, 'hexColor' | 'imageUrl'>) {
    const groupRef = useDoorSwing(side, isOpen);

    return (
        <group ref={groupRef} position={position}>
            <mesh position={[side === 'left' ? width/2 : -width/2, 0, 0.014]} castShadow>
                <boxGeometry args={[width - 0.005, height, 0.018]} />
                <meshStandardMaterial
                    color="#A5D8FF"
                    transparent={true}
                    opacity={0.4}
                    metalness={0.9}
                    roughness={0.1}
                    envMapIntensity={2}
                />
            </mesh>
            <Handle
                handle={handle}
                facade={{ kind: 'door', hingeSide: side, width, height }}
                origin={[side === 'left' ? width/2 : -width/2, 0, DOOR_FACE_Z]}
            />
        </group>
    );
}

export function AnimatedPushDoor({ position, width, height, hexColor, imageUrl, side, isOpen }: Omit<DoorProps, 'handle'>) {
    const groupRef = useDoorSwing(side, isOpen);
    const safeHexColor = getSafeColor(hexColor);

    return (
        <group ref={groupRef} position={position}>
            <mesh position={[side === 'left' ? width/2 : -width/2, 0, 0.014]} castShadow>
                <boxGeometry args={[width - 0.005, height, 0.018]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
            <mesh position={[side === 'left' ? width - 0.08 : -width + 0.08, 0, 0.019]}>
                <cylinderGeometry args={[0.012, 0.012, 0.003, 16]} />
                <meshStandardMaterial color="#333" metalness={0.3} roughness={0.7} />
            </mesh>
        </group>
    );
}

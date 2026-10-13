import { useRef } from 'react';
import * as THREE from 'three';
import { getSafeColor } from './utils';
import { TexturedMaterial } from './TexturedMaterial';
import { Handle } from './StructuralElements';
import { useSmoothedPositionZ } from './useSmoothed';

// Les tiroirs ne gèrent pas eux-mêmes le pointeur : la scène les enveloppe dans un groupe qui s'en charge
// (survol, sélection, ouverture), ce qui garde un comportement identique pour toutes les façades.

interface DrawerProps {
    position: [number, number, number];
    width: number;
    height: number;
    depth: number;
    hexColor?: string | null;
    imageUrl?: string | null;
    isOpen?: boolean;
    handleType?: string;
}

// Un tiroir ouvert sort de 60 % de la profondeur du meuble
const DRAWER_TRAVEL = 0.6;

function useDrawerSlide(initialZ: number, depth: number, isOpen?: boolean) {
    const groupRef = useRef<THREE.Group>(null);
    useSmoothedPositionZ(groupRef, isOpen ? initialZ + depth * DRAWER_TRAVEL : initialZ);
    return groupRef;
}

export function AnimatedPushDrawer({ position, width, height, depth, hexColor, imageUrl, isOpen }: Omit<DrawerProps, 'handleType'>) {
    const initialZ = position[2];
    const groupRef = useDrawerSlide(initialZ, depth, isOpen);
    const safeHexColor = getSafeColor(hexColor);

    const boxDepth = depth * 0.8;
    const boxHeight = height * 0.8;

    return (
        <group ref={groupRef} position={[position[0], position[1], initialZ]}>
            <mesh castShadow>
                <boxGeometry args={[width - 0.01, height - 0.01, 0.02]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
            <mesh position={[0, -height * 0.3, 0.015]}>
                <cylinderGeometry args={[0.012, 0.012, 0.003, 16]} />
                <meshStandardMaterial color="#333" metalness={0.3} roughness={0.7} />
            </mesh>
            <mesh position={[0, 0, -boxDepth / 2]}>
                <boxGeometry args={[width - 0.02, boxHeight, boxDepth]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
        </group>
    );
}

export function AnimatedDrawer({ position, width, height, depth, hexColor, imageUrl, isOpen, handleType }: DrawerProps) {
    const initialZ = position[2];
    const groupRef = useDrawerSlide(initialZ, depth, isOpen);
    const safeHexColor = getSafeColor(hexColor);

    const boxDepth = depth * 0.8;
    const boxHeight = height * 0.8;

    return (
        <group ref={groupRef} position={[position[0], position[1], initialZ]}>
            <mesh castShadow>
                <boxGeometry args={[width - 0.01, height - 0.01, 0.02]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
            <Handle
                type={handleType || 'horizontal_bar'}
                position={[0, 0, 0.015]}
                side="center"
                height={height}
                width={width}
            />
            <mesh position={[0, -height / 2 + 0.05, -boxDepth / 2]} receiveShadow>
                <boxGeometry args={[width - 0.06, 0.01, boxDepth]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
            <mesh position={[-width / 2 + 0.03, -height / 2 + 0.05 + boxHeight / 2, -boxDepth / 2]} castShadow>
                <boxGeometry args={[0.012, boxHeight, boxDepth]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
            <mesh position={[width / 2 - 0.03, -height / 2 + 0.05 + boxHeight / 2, -boxDepth / 2]} castShadow>
                <boxGeometry args={[0.012, boxHeight, boxDepth]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
            <mesh position={[0, -height / 2 + 0.05 + boxHeight / 2, -boxDepth]} castShadow>
                <boxGeometry args={[width - 0.06, boxHeight, 0.012]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
        </group>
    );
}

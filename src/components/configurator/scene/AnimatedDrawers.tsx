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
    // La façade est agrandie (largeur et position) pour recouvrir les planches voisines, mais le
    // caisson doit lui rester entre les vraies parois latérales : largeur et centre X d'origine, avant
    // cet agrandissement.
    boxWidth: number;
    boxCenterX: number;
    // Position Y (locale, relative au groupe) du dessus de la plaque du bas du meuble : la façade est
    // agrandie pour recouvrir les planches voisines, mais le caisson doit lui rester posé sur la vraie
    // planche du bas, pas sur ce bord agrandi.
    boxBottomY: number;
    // Profondeur réellement disponible jusqu'à la vraie plaque du fond (pas toute la profondeur du
    // meuble, qui dépasserait dans le fond)
    boxDepth: number;
    depth: number;
    hexColor?: string | null;
    imageUrl?: string | null;
    isOpen?: boolean;
    handleType?: string;
}

// Un tiroir ouvert sort de 60 % de la profondeur du meuble
const DRAWER_TRAVEL = 0.6;

// Caisson du tiroir (système à coulisses type Legrabox) : toujours blanc, indépendamment de la couleur
// choisie pour la façade — ces coulisses sont de la quincaillerie vendue dans quelques finitions fixes.
// Cotes reprises du gabarit fabricant fourni (mm convertis en m) : épaisseur des coulisses latérales
// (28), hauteur des côtés (min 54), hauteur du bas (20) et épaisseur du bas (12).
const DRAWER_BOX_COLOR = '#F1F0EC';
const DRAWER_SIDE_THICKNESS = 0.028;
const DRAWER_SIDE_HEIGHT = 0.054;
const DRAWER_BOTTOM_WALL_HEIGHT = 0.020;
const DRAWER_BOTTOM_THICKNESS = 0.012;

function useDrawerSlide(initialZ: number, depth: number, isOpen?: boolean) {
    const groupRef = useRef<THREE.Group>(null);
    useSmoothedPositionZ(groupRef, isOpen ? initialZ + depth * DRAWER_TRAVEL : initialZ);
    return groupRef;
}

// Caisson à coulisses latérales : les côtés et le fond arrière montent à hauteur des côtés, le devant
// du fond (juste derrière la façade) est plus bas, comme sur un système Legrabox
function DrawerBox({ width, centerX, bottomY, depth }: { width: number; centerX: number; bottomY: number; depth: number }) {
    const profondeur = depth;
    const innerWidth = Math.max(width - DRAWER_SIDE_THICKNESS * 2, 0.02);
    const sideCenterY = bottomY + DRAWER_SIDE_HEIGHT / 2;
    const frontLipCenterY = bottomY + DRAWER_BOTTOM_WALL_HEIGHT / 2;
    const floorCenterY = bottomY + DRAWER_BOTTOM_THICKNESS / 2;
    const floorDepth = Math.max(profondeur - DRAWER_SIDE_THICKNESS, 0.02);
    const material = <meshStandardMaterial color={DRAWER_BOX_COLOR} roughness={0.55} metalness={0.1} />;

    return (
        <group>
            <mesh position={[centerX - width / 2 + DRAWER_SIDE_THICKNESS / 2, sideCenterY, -profondeur / 2]} castShadow receiveShadow>
                <boxGeometry args={[DRAWER_SIDE_THICKNESS, DRAWER_SIDE_HEIGHT, profondeur]} />
                {material}
            </mesh>
            <mesh position={[centerX + width / 2 - DRAWER_SIDE_THICKNESS / 2, sideCenterY, -profondeur / 2]} castShadow receiveShadow>
                <boxGeometry args={[DRAWER_SIDE_THICKNESS, DRAWER_SIDE_HEIGHT, profondeur]} />
                {material}
            </mesh>
            <mesh position={[centerX, sideCenterY, -profondeur + DRAWER_SIDE_THICKNESS / 2]} castShadow receiveShadow>
                <boxGeometry args={[innerWidth, DRAWER_SIDE_HEIGHT, DRAWER_SIDE_THICKNESS]} />
                {material}
            </mesh>
            <mesh position={[centerX, frontLipCenterY, -DRAWER_SIDE_THICKNESS / 2]} receiveShadow>
                <boxGeometry args={[innerWidth, DRAWER_BOTTOM_WALL_HEIGHT, DRAWER_SIDE_THICKNESS]} />
                {material}
            </mesh>
            <mesh position={[centerX, floorCenterY, -DRAWER_SIDE_THICKNESS - floorDepth / 2]} receiveShadow>
                <boxGeometry args={[innerWidth, DRAWER_BOTTOM_THICKNESS, floorDepth]} />
                {material}
            </mesh>
            {/* Patte de réglage visible sur les systèmes Legrabox, en bas à gauche de la façade */}
            <mesh position={[centerX - width / 2 + DRAWER_SIDE_THICKNESS + 0.03, frontLipCenterY, 0.002]}>
                <boxGeometry args={[0.018, 0.010, 0.003]} />
                <meshStandardMaterial color="#FAFAF8" roughness={0.4} />
            </mesh>
        </group>
    );
}

export function AnimatedPushDrawer({ position, width, height, boxWidth, boxCenterX, boxBottomY, boxDepth, depth, hexColor, imageUrl, isOpen }: Omit<DrawerProps, 'handleType'>) {
    const initialZ = position[2];
    const groupRef = useDrawerSlide(initialZ, depth, isOpen);
    const safeHexColor = getSafeColor(hexColor);

    return (
        <group ref={groupRef} position={[position[0], position[1], initialZ]}>
            <mesh castShadow>
                <boxGeometry args={[width - 0.005, height, 0.02]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
            <DrawerBox width={boxWidth} centerX={boxCenterX} bottomY={boxBottomY} depth={boxDepth} />
        </group>
    );
}

export function AnimatedDrawer({ position, width, height, boxWidth, boxCenterX, boxBottomY, boxDepth, depth, hexColor, imageUrl, isOpen, handleType }: DrawerProps) {
    const initialZ = position[2];
    const groupRef = useDrawerSlide(initialZ, depth, isOpen);
    const safeHexColor = getSafeColor(hexColor);

    return (
        <group ref={groupRef} position={[position[0], position[1], initialZ]}>
            <mesh castShadow>
                <boxGeometry args={[width - 0.005, height, 0.02]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
            <Handle
                type={handleType || 'horizontal_bar'}
                position={[0, 0, 0.015]}
                side="center"
                height={height}
                width={width}
            />
            <DrawerBox width={boxWidth} centerX={boxCenterX} bottomY={boxBottomY} depth={boxDepth} />
        </group>
    );
}

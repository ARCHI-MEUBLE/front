import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getSafeColor } from './utils';
import { TexturedMaterial } from './TexturedMaterial';
import { Handle } from './StructuralElements';

export function AnimatedDoor({ position, width, height, hexColor, imageUrl, side, isOpen, onClick, handleType }: any) {
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
            <mesh position={[side === 'left' ? width/2 : -width/2, 0, 0.014]} castShadow>
                <boxGeometry args={[width - 0.005, height, 0.018]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
            {/* Poignée */}
            <Handle
                type={handleType || 'vertical_bar'}
                position={[side === 'left' ? width - 0.04 : -width + 0.04, 0, 0.024]}
                side={side}
                height={height}
            />
        </group>
    );
}

export function AnimatedMirrorDoor({ position, width, height, side, isOpen, onClick, handleType }: any) {
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
            {/* Poignée */}
            <Handle
                type={handleType || 'vertical_bar'}
                position={[side === 'left' ? width - 0.04 : -width + 0.04, 0, 0.024]}
                side={side}
                height={height}
            />
        </group>
    );
}

export function AnimatedPushDoor({ position, width, height, hexColor, imageUrl, side, isOpen, onClick }: any) {
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
            <mesh position={[side === 'left' ? width/2 : -width/2, 0, 0.014]} castShadow>
                <boxGeometry args={[width - 0.005, height, 0.018]} />
                <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
            </mesh>
            {/* Petite encoche discrète pour indiquer push-to-open */}
            <mesh position={[side === 'left' ? width - 0.08 : -width + 0.08, 0, 0.019]}>
                <cylinderGeometry args={[0.012, 0.012, 0.003, 16]} />
                <meshStandardMaterial color="#333" metalness={0.3} roughness={0.7} />
            </mesh>
        </group>
    );
}

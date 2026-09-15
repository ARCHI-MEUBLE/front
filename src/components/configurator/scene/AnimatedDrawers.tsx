import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getSafeColor } from './utils';
import { TexturedMaterial } from './TexturedMaterial';
import { Handle } from './StructuralElements';

export function AnimatedPushDrawer({ position, width, height, depth, hexColor, imageUrl, isOpen, onClick }: any) {
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

export function AnimatedDrawer({ position, width, height, depth, hexColor, imageUrl, isOpen, onClick, handleType }: any) {
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

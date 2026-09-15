import * as THREE from 'three';
import { TexturedMaterial } from './TexturedMaterial';

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
    return (
        <group position={position}>
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

export function Handle({ type = 'vertical_bar', position, side, height, width }: { type?: string; position: [number, number, number]; side: string; height: number; width?: number }) {
    const handleMaterial = <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />;

    if (type === 'horizontal_bar') {
        const barLength = width ? Math.min(width * 0.4, 0.5) : Math.min(height * 0.4, 0.3);
        return (
            <mesh position={position} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.008, 0.008, barLength, 12]} />
                {handleMaterial}
            </mesh>
        );
    } else if (type === 'knob') {
        return (
            <mesh position={position}>
                <sphereGeometry args={[0.02, 16, 16]} />
                {handleMaterial}
            </mesh>
        );
    } else if (type === 'recessed') {
        return (
            <group position={position}>
                <mesh>
                    <boxGeometry args={[0.08, 0.025, 0.015]} />
                    <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.6} />
                </mesh>
            </group>
        );
    } else {
        return (
            <mesh position={position}>
                <cylinderGeometry args={[0.008, 0.008, Math.min(height * 0.25, 0.4), 12]} />
                {handleMaterial}
            </mesh>
        );
    }
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

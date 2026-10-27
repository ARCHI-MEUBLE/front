import { useMemo } from 'react';
import * as THREE from 'three';

// Fond de studio photo : le sol remonte en courbe vers le mur du fond, sans angle ni plinthe, avec un
// léger dégradé du sol (plus soutenu) vers le haut du mur (plus clair). Le meuble y est mis en valeur
// comme sur une photo de catalogue.

interface StudioCoveProps {
    // Position du mur du fond (z) et rayon de la courbe sol-mur (m)
    wallZ?: number;
    radius?: number;
    floorColor: string;
    wallColor: string;
}

const HALF_WIDTH = 20;
const FRONT_Z = 10;
const TOP_Y = 10;

export function StudioCove({ wallZ = -2.5, radius = 1.5, floorColor, wallColor }: StudioCoveProps) {
    const geometry = useMemo(() => {
        // Profil (z, y) : sol depuis l'avant, quart de cercle, puis mur jusqu'en haut
        const profile: [number, number][] = [];
        const coveStart = wallZ + radius;
        for (let z = FRONT_Z; z > coveStart; z -= 1) profile.push([z, 0]);
        const steps = 24;
        for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * (Math.PI / 2);
            profile.push([coveStart - radius * Math.sin(angle), radius - radius * Math.cos(angle)]);
        }
        for (let y = radius + 1; y <= TOP_Y; y += 1) profile.push([wallZ, y]);

        // Teinte le long du profil : sol devant -> haut du mur
        const floor = new THREE.Color(floorColor);
        const wall = new THREE.Color(wallColor);
        const tint = ([z, y]: [number, number]) => {
            const along = y > 0 ? y + (coveStart - z) * 0.3 : -(z - coveStart);
            const t = THREE.MathUtils.smoothstep(along, -2.5, 3);
            return floor.clone().lerp(wall, t);
        };

        const positions: number[] = [];
        const colors: number[] = [];
        for (const point of profile) {
            const color = tint(point);
            for (const x of [-HALF_WIDTH, HALF_WIDTH]) {
                positions.push(x, point[1], point[0]);
                colors.push(color.r, color.g, color.b);
            }
        }
        const indices: number[] = [];
        for (let i = 0; i < profile.length - 1; i++) {
            const a = i * 2;
            const b = a + 1;
            const c = a + 2;
            const d = a + 3;
            // Sens choisi pour que les faces regardent vers l'intérieur du studio
            indices.push(a, b, c, b, d, c);
        }

        const result = new THREE.BufferGeometry();
        result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        result.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        result.setIndex(indices);
        result.computeVertexNormals();
        return result;
    }, [wallZ, radius, floorColor, wallColor]);

    return (
        <mesh geometry={geometry} position={[0, -0.001, 0]} receiveShadow>
            <meshStandardMaterial vertexColors roughness={0.95} metalness={0} />
        </mesh>
    );
}

// Halo de lumière au sol sous le meuble, comme sous un projecteur de studio
export function FloorGlow({ radius }: { radius: number }) {
    const texture = useMemo(() => {
        if (typeof document === 'undefined') return null;
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, 'rgba(255, 252, 245, 0.55)');
        gradient.addColorStop(0.55, 'rgba(255, 252, 245, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 252, 245, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        const result = new THREE.CanvasTexture(canvas);
        result.colorSpace = THREE.SRGBColorSpace;
        return result;
    }, []);

    if (!texture) return null;
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0.3]} scale={[1, 0.75, 1]}>
            <circleGeometry args={[radius, 64]} />
            <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
        </mesh>
    );
}

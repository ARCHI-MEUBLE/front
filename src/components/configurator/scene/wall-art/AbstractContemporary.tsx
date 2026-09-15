import * as THREE from 'three';

export function AbstractContemporary({ position, width = 1.2, height = 0.9 }: { position: [number, number, number]; width?: number; height?: number }) {
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

export function BauhausGeometric({ position, width = 0.6, height = 0.8 }: { position: [number, number, number]; width?: number; height?: number }) {
    return (
        <group position={position}>
            {/* Cadre blanc fin */}
            <mesh position={[0, height/2 + 0.01, 0]} castShadow>
                <boxGeometry args={[width + 0.02, 0.015, 0.02]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.2} metalness={0.3} />
            </mesh>
            <mesh position={[0, -height/2 - 0.01, 0]} castShadow>
                <boxGeometry args={[width + 0.02, 0.015, 0.02]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.2} metalness={0.3} />
            </mesh>
            <mesh position={[-width/2 - 0.01, 0, 0]} castShadow>
                <boxGeometry args={[0.015, height, 0.02]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.2} metalness={0.3} />
            </mesh>
            <mesh position={[width/2 + 0.01, 0, 0]} castShadow>
                <boxGeometry args={[0.015, height, 0.02]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.2} metalness={0.3} />
            </mesh>

            {/* Fond */}
            <mesh position={[0, 0, -0.005]}>
                <planeGeometry args={[width, height]} />
                <meshStandardMaterial color="#F5F5F0" roughness={0.95} />
            </mesh>

            {/* Cercle rouge */}
            <mesh position={[-width*0.15, height*0.2, 0.001]}>
                <circleGeometry args={[width*0.2, 32]} />
                <meshStandardMaterial color="#D32F2F" roughness={0.5} />
            </mesh>

            {/* Triangle jaune */}
            <mesh position={[width*0.15, height*0.15, 0.002]}>
                <coneGeometry args={[width*0.15, width*0.25, 3]} />
                <meshStandardMaterial color="#FBC02D" roughness={0.5} flatShading />
            </mesh>

            {/* Carré bleu */}
            <mesh position={[width*0.1, -height*0.2, 0.003]} rotation={[0, 0, Math.PI/6]}>
                <boxGeometry args={[width*0.22, width*0.22, 0.002]} />
                <meshStandardMaterial color="#1976D2" roughness={0.5} />
            </mesh>

            {/* Lignes noires */}
            <mesh position={[-width*0.2, -height*0.1, 0.004]}>
                <boxGeometry args={[0.006, height*0.5, 0.001]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
            </mesh>
            <mesh position={[0, -height*0.3, 0.004]}>
                <boxGeometry args={[width*0.6, 0.006, 0.001]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
            </mesh>

            {/* Petit cercle noir */}
            <mesh position={[-width*0.25, -height*0.25, 0.005]}>
                <circleGeometry args={[width*0.05, 24]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
            </mesh>
        </group>
    );
}

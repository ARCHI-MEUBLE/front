export function ScandinavianLandscape({ position, width = 1.0, height = 0.7 }: { position: [number, number, number]; width?: number; height?: number }) {
    return (
        <group position={position}>
            {/* Cadre bois clair */}
            <mesh position={[0, height/2 + 0.02, 0]} castShadow>
                <boxGeometry args={[width + 0.07, 0.035, 0.025]} />
                <meshStandardMaterial color="#D4C4B0" roughness={0.4} metalness={0.1} />
            </mesh>
            <mesh position={[0, -height/2 - 0.02, 0]} castShadow>
                <boxGeometry args={[width + 0.07, 0.035, 0.025]} />
                <meshStandardMaterial color="#D4C4B0" roughness={0.4} metalness={0.1} />
            </mesh>
            <mesh position={[-width/2 - 0.02, 0, 0]} castShadow>
                <boxGeometry args={[0.035, height, 0.025]} />
                <meshStandardMaterial color="#D4C4B0" roughness={0.4} metalness={0.1} />
            </mesh>
            <mesh position={[width/2 + 0.02, 0, 0]} castShadow>
                <boxGeometry args={[0.035, height, 0.025]} />
                <meshStandardMaterial color="#D4C4B0" roughness={0.4} metalness={0.1} />
            </mesh>

            {/* Ciel */}
            <mesh position={[0, height*0.2, -0.005]}>
                <planeGeometry args={[width, height*0.6]} />
                <meshStandardMaterial color="#E8DFD6" roughness={0.95} />
            </mesh>
            <mesh position={[0, height*0.35, -0.004]}>
                <planeGeometry args={[width, height*0.3]} />
                <meshStandardMaterial color="#D4C8BC" roughness={0.95} />
            </mesh>

            {/* Montagne arrière */}
            <mesh position={[width*0.15, -height*0.05, 0.001]}>
                <coneGeometry args={[width*0.35, height*0.5, 3]} />
                <meshStandardMaterial color="#C4B8AC" roughness={0.8} flatShading />
            </mesh>

            {/* Montagne avant */}
            <mesh position={[-width*0.1, -height*0.15, 0.002]}>
                <coneGeometry args={[width*0.3, height*0.45, 3]} />
                <meshStandardMaterial color="#8B7355" roughness={0.8} flatShading />
            </mesh>

            {/* Eau/Reflet */}
            <mesh position={[0, -height*0.35, 0.003]}>
                <planeGeometry args={[width, height*0.2]} />
                <meshStandardMaterial color="#B8C4C8" roughness={0.3} metalness={0.2} />
            </mesh>

            {/* Ligne d'horizon */}
            <mesh position={[0, -height*0.25, 0.004]}>
                <boxGeometry args={[width, 0.003, 0.001]} />
                <meshStandardMaterial color="#5C5552" roughness={0.5} />
            </mesh>
        </group>
    );
}

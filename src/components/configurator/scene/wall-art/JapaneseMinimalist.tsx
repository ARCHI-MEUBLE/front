export function JapaneseMinimalist({ position, width = 0.8, height = 1.0 }: { position: [number, number, number]; width?: number; height?: number }) {
    return (
        <group position={position}>
            {/* Cadre noir fin */}
            <mesh position={[0, height/2 + 0.01, 0]} castShadow>
                <boxGeometry args={[width + 0.02, 0.015, 0.02]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.3} />
            </mesh>
            <mesh position={[0, -height/2 - 0.01, 0]} castShadow>
                <boxGeometry args={[width + 0.02, 0.015, 0.02]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.3} />
            </mesh>
            <mesh position={[-width/2 - 0.01, 0, 0]} castShadow>
                <boxGeometry args={[0.015, height, 0.02]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.3} />
            </mesh>
            <mesh position={[width/2 + 0.01, 0, 0]} castShadow>
                <boxGeometry args={[0.015, height, 0.02]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.2} metalness={0.3} />
            </mesh>

            {/* Fond crème */}
            <mesh position={[0, 0, -0.005]}>
                <planeGeometry args={[width, height]} />
                <meshStandardMaterial color="#F5F2E8" roughness={0.95} />
            </mesh>

            {/* Branche de cerisier */}
            <mesh position={[-width*0.1, -height*0.1, 0.001]} rotation={[0, 0, 0.3]}>
                <boxGeometry args={[width*0.5, 0.008, 0.002]} />
                <meshStandardMaterial color="#3E2723" roughness={0.8} />
            </mesh>
            <mesh position={[width*0.05, height*0.05, 0.001]} rotation={[0, 0, -0.5]}>
                <boxGeometry args={[width*0.25, 0.005, 0.002]} />
                <meshStandardMaterial color="#3E2723" roughness={0.8} />
            </mesh>

            {/* Fleurs de cerisier */}
            <mesh position={[-width*0.05, height*0.1, 0.002]}>
                <circleGeometry args={[0.025, 16]} />
                <meshStandardMaterial color="#FFCDD2" roughness={0.6} />
            </mesh>
            <mesh position={[width*0.08, height*0.15, 0.002]}>
                <circleGeometry args={[0.02, 16]} />
                <meshStandardMaterial color="#F8BBD9" roughness={0.6} />
            </mesh>
            <mesh position={[width*0.15, height*0.08, 0.002]}>
                <circleGeometry args={[0.022, 16]} />
                <meshStandardMaterial color="#FFCDD2" roughness={0.6} />
            </mesh>
            <mesh position={[-width*0.12, height*0.02, 0.002]}>
                <circleGeometry args={[0.018, 16]} />
                <meshStandardMaterial color="#F8BBD9" roughness={0.6} />
            </mesh>
            <mesh position={[width*0.02, height*0.2, 0.002]}>
                <circleGeometry args={[0.024, 16]} />
                <meshStandardMaterial color="#FFCDD2" roughness={0.6} />
            </mesh>

            {/* Sceau rouge signature */}
            <mesh position={[width*0.3, -height*0.35, 0.002]}>
                <boxGeometry args={[0.04, 0.05, 0.001]} />
                <meshStandardMaterial color="#C62828" roughness={0.5} />
            </mesh>
        </group>
    );
}

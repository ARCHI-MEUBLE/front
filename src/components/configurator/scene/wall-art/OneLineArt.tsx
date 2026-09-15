export function OneLineArt({ position, width = 0.5, height = 0.7 }: { position: [number, number, number]; width?: number; height?: number }) {
    return (
        <group position={position}>
            <mesh position={[0, 0, -0.02]} castShadow>
                <boxGeometry args={[width + 0.06, height + 0.06, 0.04]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.3} metalness={0.1} />
            </mesh>
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[width + 0.02, height + 0.02, 0.03]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
            </mesh>

            <mesh position={[0, 0, 0.01]}>
                <planeGeometry args={[width - 0.02, height - 0.02]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.95} />
            </mesh>

            <mesh position={[0, 0, 0.015]} rotation={[0, 0, 0.1]}>
                <torusGeometry args={[width*0.18, 0.003, 8, 32, Math.PI * 1.2]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
            </mesh>
            <mesh position={[-width*0.05, height*0.05, 0.016]}>
                <torusGeometry args={[width*0.03, 0.002, 8, 16, Math.PI * 2]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
            </mesh>
            <mesh position={[-width*0.05, height*0.1, 0.016]} rotation={[0, 0, 0.2]}>
                <torusGeometry args={[width*0.04, 0.002, 8, 16, Math.PI * 0.6]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
            </mesh>
            <mesh position={[width*0.02, -height*0.02, 0.016]}>
                <boxGeometry args={[0.003, height*0.08, 0.001]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
            </mesh>
            <mesh position={[0, -height*0.1, 0.016]}>
                <torusGeometry args={[width*0.04, 0.002, 8, 16, Math.PI]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
            </mesh>
        </group>
    );
}

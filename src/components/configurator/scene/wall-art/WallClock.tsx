export function WallClock({ position, radius = 0.25 }: { position: [number, number, number]; radius?: number }) {
    return (
        <group position={position}>
            <mesh position={[0, 0, -0.01]} castShadow>
                <cylinderGeometry args={[radius + 0.015, radius + 0.015, 0.04, 32]} />
                <meshStandardMaterial color="#2C2C2C" roughness={0.3} metalness={0.7} />
            </mesh>

            <mesh position={[0, 0, 0.01]}>
                <circleGeometry args={[radius, 32]} />
                <meshStandardMaterial color="#FFFFFF" roughness={0.2} />
            </mesh>

            <mesh position={[0, radius * 0.85, 0.015]}>
                <boxGeometry args={[0.008, radius * 0.12, 0.002]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
            </mesh>
            <mesh position={[radius * 0.85, 0, 0.015]}>
                <boxGeometry args={[radius * 0.12, 0.008, 0.002]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
            </mesh>
            <mesh position={[0, -radius * 0.85, 0.015]}>
                <boxGeometry args={[0.008, radius * 0.12, 0.002]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
            </mesh>
            <mesh position={[-radius * 0.85, 0, 0.015]}>
                <boxGeometry args={[radius * 0.12, 0.008, 0.002]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
            </mesh>

            {Array.from({ length: 8 }).map((_, i) => {
                const angle = (Math.PI / 6) * (i + (i >= 3 ? 2 : 1));
                const x = Math.sin(angle) * radius * 0.88;
                const y = Math.cos(angle) * radius * 0.88;
                return (
                    <mesh key={i} position={[x, y, 0.015]} rotation={[0, 0, -angle]}>
                        <boxGeometry args={[0.004, radius * 0.08, 0.002]} />
                        <meshStandardMaterial color="#666" roughness={0.5} />
                    </mesh>
                );
            })}

            <mesh position={[-radius * 0.15, radius * 0.25, 0.02]} rotation={[0, 0, Math.PI / 6]}>
                <boxGeometry args={[0.01, radius * 0.5, 0.003]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
            </mesh>

            <mesh position={[radius * 0.08, radius * 0.4, 0.022]} rotation={[0, 0, -Math.PI / 18]}>
                <boxGeometry args={[0.006, radius * 0.7, 0.003]} />
                <meshStandardMaterial color="#2C2C2C" roughness={0.3} />
            </mesh>

            <mesh position={[0, 0, 0.025]}>
                <cylinderGeometry args={[0.015, 0.015, 0.01, 16]} />
                <meshStandardMaterial color="#D32F2F" roughness={0.4} metalness={0.5} />
            </mesh>
        </group>
    );
}

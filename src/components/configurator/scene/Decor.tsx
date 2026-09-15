import { useMemo } from 'react';
import * as THREE from 'three';

export function Book({ position, color, rotation = [0, 0, 0], height = 0.22, thickness = 0.028, bookDepth = 0.14 }: any) {
    return (
        <group position={position} rotation={rotation}>
            <mesh castShadow receiveShadow>
                <boxGeometry args={[thickness, height, bookDepth]} />
                <meshStandardMaterial color={color} roughness={0.75} />
            </mesh>
            <mesh position={[0, 0, -0.002]}>
                <boxGeometry args={[thickness - 0.003, height - 0.005, bookDepth - 0.005]} />
                <meshStandardMaterial color="#F5F0E8" roughness={0.95} />
            </mesh>
            <mesh position={[0, height * 0.1, bookDepth / 2 + 0.001]}>
                <boxGeometry args={[thickness * 0.6, 0.004, 0.001]} />
                <meshStandardMaterial color="#FFFFFF" transparent opacity={0.45} />
            </mesh>
            <mesh position={[0, height * 0.05, bookDepth / 2 + 0.001]}>
                <boxGeometry args={[thickness * 0.45, 0.003, 0.001]} />
                <meshStandardMaterial color="#FFFFFF" transparent opacity={0.35} />
            </mesh>
            <mesh position={[0, -height * 0.28, bookDepth / 2 + 0.001]}>
                <boxGeometry args={[thickness * 0.5, 0.003, 0.001]} />
                <meshStandardMaterial color="#FFFFFF" transparent opacity={0.35} />
            </mesh>
            <mesh position={[0, height * 0.42, bookDepth / 2 + 0.001]}>
                <boxGeometry args={[thickness * 0.75, 0.005, 0.001]} />
                <meshStandardMaterial color="#FFFFFF" transparent opacity={0.5} />
            </mesh>
        </group>
    );
}

export function Books({ position, count = 5, seed = "1" }: any) {
    const colors = ['#5B7B7A', '#8B7355', '#6B5B4C', '#4A5568', '#7C6B5C', '#3C4A3E', '#6E5F50', '#4F5D65', '#8E7B6B', '#5C6B6A'];
    const books = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash |= 0;
        }
        const s = Math.abs(hash);

        let currentX = 0;
        return Array.from({ length: count }).map((_, i) => {
            const h = s + i * 7;
            const isLast = i === count - 1;
            const bookHeight = 0.18 + (h % 5) * 0.012;
            const bookThickness = 0.022 + (h % 3) * 0.005;
            const bookDepth = 0.11 + (h % 4) * 0.01;
            const tilt = isLast && count > 1 ? 0.06 : 0;
            const offset = currentX + bookThickness / 2;
            currentX += bookThickness + 0.002;
            return {
                color: colors[(s + i) % colors.length],
                height: bookHeight,
                thickness: bookThickness,
                depth: bookDepth,
                offset,
                tilt,
                depthOffset: ((h % 5) - 2) * 0.003
            };
        });
    }, [count, seed]);

    return (
        <group position={position}>
            {books.map((b, i) => (
                <Book
                    key={i}
                    position={[b.offset, b.height / 2, b.depthOffset]}
                    color={b.color}
                    height={b.height}
                    thickness={b.thickness}
                    bookDepth={b.depth}
                    rotation={[0, 0, b.tilt]}
                />
            ))}
        </group>
    );
}

export function Plant({ position, scale = 1, seed = "1" }: any) {
    const hash = useMemo(() => {
        let h = 0;
        for (let i = 0; i < seed.length; i++) {
            h = ((h << 5) - h) + seed.charCodeAt(i);
            h |= 0;
        }
        return Math.abs(h);
    }, [seed]);

    const potColor = ['#C67B5C', '#A0877C', '#8B7355', '#9C8B7A'][hash % 4];

    return (
        <group position={position} scale={scale}>
            <mesh position={[0, 0.04, 0]} castShadow>
                <cylinderGeometry args={[0.045, 0.035, 0.08, 16]} />
                <meshStandardMaterial color={potColor} roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.082, 0]}>
                <cylinderGeometry args={[0.048, 0.046, 0.008, 16]} />
                <meshStandardMaterial color={potColor} roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.08, 0]}>
                <cylinderGeometry args={[0.042, 0.042, 0.005, 16]} />
                <meshStandardMaterial color="#3E2723" roughness={1} />
            </mesh>
            {Array.from({ length: 6 }).map((_, i) => {
                const angle = (i / 6) * Math.PI * 2 + (hash % 10) * 0.3;
                const lean = 0.35 + (i % 3) * 0.15;
                const leafLen = 0.04 + (i % 2) * 0.015;
                return (
                    <group key={i} position={[0, 0.085, 0]} rotation={[lean, angle, 0]}>
                        <mesh position={[0, leafLen, 0]} scale={[0.3, 1, 0.08]} castShadow>
                            <sphereGeometry args={[leafLen, 8, 6]} />
                            <meshStandardMaterial color={i % 2 === 0 ? '#4A6B3C' : '#567D4A'} roughness={0.8} side={THREE.DoubleSide} />
                        </mesh>
                    </group>
                );
            })}
        </group>
    );
}

export function MagazineStack({ position, scale = 1, seed = "1" }: any) {
    const hash = useMemo(() => {
        let h = 0;
        for (let i = 0; i < seed.length; i++) {
            h = ((h << 5) - h) + seed.charCodeAt(i);
            h |= 0;
        }
        return Math.abs(h);
    }, [seed]);

    const colors = ['#8B7355', '#5B7B7A', '#A89080', '#6B5B4C', '#7C6B5C', '#4A5568', '#9C8B7A', '#6E5F50'];
    const count = 3 + (hash % 3);

    const magazines = useMemo(() => {
        return Array.from({ length: count }).map((_, i) => {
            const h = hash + i * 13;
            const magWidth = 0.14 + (h % 3) * 0.01;
            const magDepth = 0.10 + (h % 2) * 0.01;
            const magThickness = 0.004 + (h % 3) * 0.001;
            const offsetX = ((h % 7) - 3) * 0.003;
            const offsetZ = ((h % 5) - 2) * 0.004;
            const rotation = ((h % 9) - 4) * 0.04;
            return {
                color: colors[(hash + i) % colors.length],
                width: magWidth,
                depth: magDepth,
                thickness: magThickness,
                offsetX,
                offsetZ,
                rotation,
            };
        });
    }, [hash, count]);

    let currentY = 0;

    return (
        <group position={position} scale={scale}>
            {magazines.map((m, i) => {
                const y = currentY + m.thickness / 2;
                currentY += m.thickness + 0.0005;
                return (
                    <group key={i} position={[m.offsetX, y, m.offsetZ]} rotation={[0, m.rotation, 0]}>
                        <mesh castShadow receiveShadow>
                            <boxGeometry args={[m.width, m.thickness, m.depth]} />
                            <meshStandardMaterial color={m.color} roughness={0.6} />
                        </mesh>
                        <mesh position={[0.002, 0, 0]}>
                            <boxGeometry args={[m.width - 0.004, m.thickness - 0.001, m.depth - 0.003]} />
                            <meshStandardMaterial color="#F0EBE3" roughness={0.95} />
                        </mesh>
                    </group>
                );
            })}
        </group>
    );
}

export function Vase({ position, color, scale = 1, seed = "1" }: any) {
    const shapeIndex = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash) % 4;
    }, [seed]);

    const points = useMemo(() => {
        const shapes = [
            [[0, 0], [0.04, 0.005], [0.042, 0.18], [0.038, 0.2], [0.038, 0.22]],
            [[0, 0], [0.05, 0.005], [0.06, 0.08], [0.055, 0.14], [0.038, 0.19], [0.035, 0.21]],
            [[0, 0], [0.032, 0.005], [0.028, 0.08], [0.032, 0.14], [0.048, 0.19], [0.052, 0.21]],
            [[0, 0], [0.05, 0.005], [0.052, 0.1], [0.05, 0.12], [0.018, 0.17], [0.018, 0.23]]
        ];
        return shapes[shapeIndex].map(p => new THREE.Vector2(p[0], p[1]));
    }, [shapeIndex]);

    return (
        <group position={position} scale={scale}>
            <mesh castShadow receiveShadow>
                <latheGeometry args={[points, 32]} />
                <meshStandardMaterial color={color} roughness={0.4} metalness={0.05} />
            </mesh>
        </group>
    );
}

export function Lamp({ position }: any) {
    return (
        <group position={position}>
            <mesh position={[0, 0.01, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.08, 0.02, 24]} />
                <meshStandardMaterial color="#222" metalness={0.8} />
            </mesh>
            <mesh position={[0, 0.2, 0]} castShadow>
                <cylinderGeometry args={[0.01, 0.01, 0.4, 12]} />
                <meshStandardMaterial color="#222" metalness={0.8} />
            </mesh>
            <mesh position={[0, 0.4, 0]} castShadow>
                <cylinderGeometry args={[0.12, 0.18, 0.2, 24, 1, true]} />
                <meshStandardMaterial color="#F5F5F5" side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0.38, 0]}>
                <sphereGeometry args={[0.025, 16, 16]} />
                <meshStandardMaterial color="#FFF5E1" emissive="#FFF5E1" emissiveIntensity={0.5} />
            </mesh>
            <pointLight position={[0, 0.38, 0]} intensity={0.4} color="#FFF5E1" />
        </group>
    );
}

export function CompartmentLight({ width, depth, position }: any) {
    return (
        <group position={position}>
            <mesh position={[0, -0.005, depth / 4]}>
                <boxGeometry args={[width * 0.9, 0.01, 0.01]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
            </mesh>
            <pointLight
                position={[0, -0.1, depth / 4]}
                intensity={0.4}
                distance={1.5}
                decay={2}
                color="#fffde1"
                castShadow
                shadow-bias={-0.001}
            />
        </group>
    );
}

export function CableHole({ width, height, depth, position }: any) {
    return (
        <group position={position}>
            <mesh position={[0, 0, -depth / 2 + 0.005]}>
                <circleGeometry args={[0.03, 32]} />
                <meshStandardMaterial color="#111" roughness={1} />
            </mesh>
            <mesh position={[0, 0, -depth / 2 + 0.006]}>
                <torusGeometry args={[0.03, 0.005, 16, 32]} />
                <meshStandardMaterial color="#222" roughness={0.5} />
            </mesh>
        </group>
    );
}

export function ShelfDecoration({ width, height, depth, seed }: { width: number, height: number, depth: number, seed: string }) {
    const decoType = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            hash |= 0;
        }
        const s = Math.abs(hash);

        if (width < 0.15 || depth < 0.12 || height < 0.12) return null;

        const types = [];
        if (width > 0.6) types.push('books_vase', 'plant_books', 'magazines_vase');
        if (width > 0.45) types.push('books_vase', 'vase_plant', 'magazines_plant');
        if (width > 0.35) types.push('books', 'plant', 'magazines');
        if (width > 0.25) types.push('books', 'magazines');
        types.push('vase', 'plant');

        return types[s % types.length];
    }, [seed, width, height, depth]);

    if (!decoType) return null;

    const vaseColors = ['#C4B5A3', '#A89F91', '#B8AFA4', '#9C9388', '#D4CBC0', '#8B8178'];
    const hash = seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

    const margin = 0.03;
    const availableHeight = height - margin;
    const vaseScale = Math.min(1.0, availableHeight / 0.24, width * 2.5);
    const plantScale = Math.min(1.0, availableHeight / 0.18);
    const booksScale = Math.min(1.0, availableHeight / 0.22);

    return (
        <group position={[0, 0, 0]}>
            {decoType === 'books' && (
                <group scale={booksScale}>
                    <Books position={[-width / 4, 0, -depth / 8]} count={Math.min(8, Math.max(2, Math.floor(width * 12)))} seed={seed} />
                </group>
            )}
            {decoType === 'vase' && (
                <Vase position={[0, 0, 0]} color={vaseColors[hash % vaseColors.length]} seed={seed} scale={vaseScale} />
            )}
            {decoType === 'plant' && (
                <Plant position={[0, 0, 0]} seed={seed} scale={plantScale} />
            )}
            {decoType === 'books_vase' && (
                <>
                    <group scale={booksScale}>
                        <Books position={[-width / 3, 0, -depth / 8]} count={Math.max(2, Math.floor(width * 5))} seed={seed} />
                    </group>
                    <Vase position={[width / 4, 0, depth / 12]} color={vaseColors[hash % vaseColors.length]} seed={seed + "_v"} scale={Math.min(0.8, vaseScale)} />
                </>
            )}
            {decoType === 'books_plant' && (
                <>
                    <group scale={booksScale}>
                        <Books position={[-width / 4, 0, -depth / 8]} count={Math.max(2, Math.floor(width * 6))} seed={seed} />
                    </group>
                    <Plant position={[width / 4, 0, 0]} seed={seed + "_p3"} scale={Math.min(0.65, plantScale)} />
                </>
            )}
            {decoType === 'vase_plant' && (
                <>
                    <Vase position={[-width / 6, 0, 0]} color={vaseColors[hash % vaseColors.length]} seed={seed + "_v"} scale={Math.min(0.85, vaseScale)} />
                    <Plant position={[width / 5, 0, depth / 12]} seed={seed + "_p2"} scale={Math.min(0.7, plantScale)} />
                </>
            )}
            {decoType === 'plant_books' && (
                <>
                    <Plant position={[-width / 4, 0, 0]} seed={seed + "_p"} scale={Math.min(0.75, plantScale)} />
                    <group scale={booksScale}>
                        <Books position={[width / 6, 0, -depth / 8]} count={Math.max(2, Math.floor(width * 4))} seed={seed + "_b"} />
                    </group>
                </>
            )}
            {decoType === 'plant_vase' && (
                <>
                    <Plant position={[-width / 6, 0, 0]} seed={seed + "_p"} scale={Math.min(0.7, plantScale)} />
                    <Vase position={[width / 5, 0, 0]} color={vaseColors[(hash + 2) % vaseColors.length]} seed={seed + "_v2"} scale={Math.min(0.7, vaseScale)} />
                </>
            )}
            {decoType === 'magazines' && (
                <MagazineStack position={[0, 0, 0]} seed={seed} scale={Math.min(1.0, availableHeight / 0.04)} />
            )}
            {decoType === 'magazines_vase' && (
                <>
                    <MagazineStack position={[-width / 4, 0, 0]} seed={seed + "_m"} scale={Math.min(0.9, availableHeight / 0.04)} />
                    <Vase position={[width / 4, 0, depth / 12]} color={vaseColors[(hash + 1) % vaseColors.length]} seed={seed + "_v"} scale={Math.min(0.75, vaseScale)} />
                </>
            )}
            {decoType === 'magazines_plant' && (
                <>
                    <MagazineStack position={[-width / 5, 0, 0]} seed={seed + "_m"} scale={Math.min(0.9, availableHeight / 0.04)} />
                    <Plant position={[width / 4, 0, 0]} seed={seed + "_p"} scale={Math.min(0.65, plantScale)} />
                </>
            )}
        </group>
    );
}

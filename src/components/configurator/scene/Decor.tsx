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

    // Pas hash % 4 : ShelfDecoration choisit déjà « plante » avec ce reste, toutes les plantes avaient le même pot
    const potColor = ['#C67B5C', '#A0877C', '#8B7355', '#9C8B7A'][Math.floor(hash / 5) % 4];

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
                    // Ordre YXZ : la feuille s'incline d'abord, puis tourne autour du pot. Dans l'ordre par défaut
                    // (XYZ), elle tournait sur elle-même avant de pencher : les six feuilles partaient du même
                    // côté et la plante ressemblait à un éventail plat
                    <group key={i} position={[0, 0.085, 0]} rotation={[lean, angle, 0, 'YXZ']}>
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

// Silhouettes de vases (rayon, hauteur en m), du pied à la lèvre
const VASE_SHAPES: { outline: [number, number][]; branches: boolean }[] = [
    // Boule à col court
    { outline: [[0.03, 0], [0.045, 0.02], [0.06, 0.06], [0.058, 0.09], [0.045, 0.115], [0.025, 0.13], [0.022, 0.14], [0.027, 0.15]], branches: true },
    // Bouteille élancée
    { outline: [[0.035, 0], [0.042, 0.01], [0.045, 0.1], [0.04, 0.13], [0.018, 0.16], [0.014, 0.19], [0.018, 0.2]], branches: false },
    // Cylindre légèrement évasé
    { outline: [[0.038, 0], [0.041, 0.01], [0.039, 0.07], [0.044, 0.12], [0.054, 0.16]], branches: true },
    // Amphore à lèvre ouverte
    { outline: [[0.025, 0], [0.031, 0.015], [0.055, 0.07], [0.05, 0.11], [0.03, 0.145], [0.026, 0.16], [0.037, 0.18]], branches: false },
];

const VASE_WALL = 0.004;
const VASE_FLOOR = 0.006;
// Haut des branches (m) : un vase garni est plus haut qu'un vase seul
const BRANCHES_TOP = 0.27;
const BRANCHES_HEIGHT = 0.285;

// Rayon extérieur du vase à une hauteur donnée (interpolé sur la silhouette)
function radiusAt(outline: [number, number][], y: number): number {
    for (let i = 1; i < outline.length; i++) {
        const [r0, y0] = outline[i - 1];
        const [r1, y1] = outline[i];
        if (y <= y1) return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-6, y1 - y0);
    }
    return outline[outline.length - 1][0];
}

// Profil fermé : paroi extérieure en montant, lèvre, paroi intérieure en descendant. Le vase a une épaisseur et
// une ouverture visible ; une surface seule, ouverte en haut, se voyait au travers et ressemblait à une colonne.
function vaseProfile(outline: [number, number][]): THREE.Vector2[] {
    const outer = [[0, 0] as [number, number], ...outline];
    const inner = outline
        .slice(1)
        .reverse()
        .map(([r, y]) => [Math.max(0.002, r - VASE_WALL), Math.max(VASE_FLOOR, y)] as [number, number]);
    return [...outer, ...inner, [0, VASE_FLOOR]].map(([r, y]) => new THREE.Vector2(r, y));
}

// Quelques branches d'eucalyptus qui sortent du col : le vase se lit tout de suite comme une décoration
function VaseBranches({ outline, seed }: { outline: [number, number][]; seed: number }) {
    const neckHeight = outline[outline.length - 1][1];
    const base = neckHeight - 0.03;
    const count = 3 + (seed % 2);
    const shadowY = neckHeight - 0.012;
    return (
        <>
            {Array.from({ length: count }).map((_, i) => {
                const yaw = (i / count) * Math.PI * 2 + (seed % 7) * 0.4;
                const tilt = 0.18 + (i % 3) * 0.12;
                const stem = (BRANCHES_TOP - base) * (0.8 + ((seed + i) % 3) * 0.1);
                return (
                    // Ordre YXZ : la branche penche, puis tourne autour du col (même raison que pour les plantes)
                    <group key={i} position={[0, base, 0]} rotation={[tilt, yaw, 0, 'YXZ']}>
                        <mesh position={[0, stem / 2, 0]}>
                            <cylinderGeometry args={[0.0012, 0.0016, stem, 5]} />
                            <meshStandardMaterial color="#6E6250" roughness={0.9} />
                        </mesh>
                        {Array.from({ length: 5 }).map((__, j) => {
                            const t = 0.35 + j * 0.15;
                            const side = j % 2 === 0 ? 1 : -1;
                            return (
                                <mesh
                                    key={j}
                                    position={[side * 0.009, stem * Math.min(t, 0.97), 0]}
                                    rotation={[0, 0, side * 0.9]}
                                    scale={[1, 0.62, 0.18]}
                                >
                                    <sphereGeometry args={[0.011, 8, 6]} />
                                    <meshStandardMaterial color={j % 2 === 0 ? '#7F9177' : '#8FA087'} roughness={0.85} side={THREE.DoubleSide} />
                                </mesh>
                            );
                        })}
                    </group>
                );
            })}
            {/* Ombre du col : l'intérieur du vase paraît creux, vu de dessus */}
            <mesh position={[0, shadowY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[Math.max(0.004, radiusAt(outline, shadowY) - VASE_WALL - 0.001), 20]} />
                <meshStandardMaterial color="#3A3329" roughness={1} />
            </mesh>
        </>
    );
}

// fitHeight (m) : hauteur libre au-dessus du vase ; il rétrécit pour y tenir, branches comprises
export function Vase({ position, color, scale = 1, seed = "1", fitHeight }: any) {
    const hash = useMemo(() => {
        let h = 0;
        for (let i = 0; i < seed.length; i++) {
            h = ((h << 5) - h) + seed.charCodeAt(i);
            h |= 0;
        }
        return Math.abs(h);
    }, [seed]);

    // ShelfDecoration a déjà choisi « vase » avec hash % n : réutiliser hash % 4 donnait toujours la même forme
    const shape = VASE_SHAPES[Math.floor(hash / 7) % VASE_SHAPES.length];
    const points = useMemo(() => vaseProfile(shape.outline), [shape]);
    const totalHeight = shape.branches ? BRANCHES_HEIGHT : shape.outline[shape.outline.length - 1][1];
    const finalScale = fitHeight ? Math.min(scale, fitHeight / totalHeight) : scale;
    // Les couleurs claires sont émaillées, les autres mates (terre cuite, céramique brute)
    const glazed = new THREE.Color(color).getHSL({ h: 0, s: 0, l: 0 }).l > 0.7;

    return (
        <group position={position} scale={finalScale}>
            <mesh castShadow receiveShadow>
                <latheGeometry args={[points, 40]} />
                <meshStandardMaterial color={color} roughness={glazed ? 0.3 : 0.75} metalness={0} />
            </mesh>
            {shape.branches && <VaseBranches outline={shape.outline} seed={hash} />}
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

    // Céramiques qui se détachent du bois : blanc émaillé, terre cuite, sauge, bleu nuit et bleu brume du site, anthracite
    const vaseColors = ['#ECE7DD', '#C47A5A', '#8E9B80', '#3B3E58', '#B2B6CC', '#5B5651'];
    const hash = seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

    const margin = 0.03;
    const availableHeight = height - margin;
    // La hauteur est gérée par chaque vase (fitHeight) : un vase garni de branches est plus haut qu'un vase seul
    const vaseScale = Math.min(1.0, width * 2.5);
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
                <Vase position={[0, 0, 0]} color={vaseColors[hash % vaseColors.length]} seed={seed} scale={vaseScale} fitHeight={availableHeight} />
            )}
            {decoType === 'plant' && (
                <Plant position={[0, 0, 0]} seed={seed} scale={plantScale} />
            )}
            {decoType === 'books_vase' && (
                <>
                    <group scale={booksScale}>
                        <Books position={[-width / 3, 0, -depth / 8]} count={Math.max(2, Math.floor(width * 5))} seed={seed} />
                    </group>
                    <Vase position={[width / 4, 0, depth / 12]} color={vaseColors[hash % vaseColors.length]} seed={seed + "_v"} scale={Math.min(0.8, vaseScale)} fitHeight={availableHeight} />
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
                    <Vase position={[-width / 6, 0, 0]} color={vaseColors[hash % vaseColors.length]} seed={seed + "_v"} scale={Math.min(0.85, vaseScale)} fitHeight={availableHeight} />
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
                    <Vase position={[width / 5, 0, 0]} color={vaseColors[(hash + 2) % vaseColors.length]} seed={seed + "_v2"} scale={Math.min(0.7, vaseScale)} fitHeight={availableHeight} />
                </>
            )}
            {decoType === 'magazines' && (
                <MagazineStack position={[0, 0, 0]} seed={seed} scale={Math.min(1.0, availableHeight / 0.04)} />
            )}
            {decoType === 'magazines_vase' && (
                <>
                    <MagazineStack position={[-width / 4, 0, 0]} seed={seed + "_m"} scale={Math.min(0.9, availableHeight / 0.04)} />
                    <Vase position={[width / 4, 0, depth / 12]} color={vaseColors[(hash + 1) % vaseColors.length]} seed={seed + "_v"} scale={Math.min(0.75, vaseScale)} fitHeight={availableHeight} />
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

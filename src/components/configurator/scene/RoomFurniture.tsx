import { useMemo } from 'react';
import * as THREE from 'three';
import { Lamp, Plant, Vase } from './Decor';
import { useRoomLights, WARM_LIGHT } from './roomLights';

// Meubles et objets du décor des scènes Salon et Chambre. Unités : mètres, sol à y = 0. Chaque objet est
// construit centré sur son origine, face vers +z ; la scène le place et l'oriente.

type Vec3 = [number, number, number];

// Tirage pseudo-aléatoire fixe : parquet, plantes et piles de livres gardent la même forme d'un rendu à l'autre
function seededRandom(seed: number) {
    let s = seed;
    return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

// Parquet à lames dessiné une fois sur un canvas, répété sur tout le sol
export function useParquetTexture(baseColor: string, seed = 7) {
    return useMemo(() => {
        if (typeof document === 'undefined') return null;
        const size = 512;
        const rows = 10;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const random = seededRandom(seed);
        const base = new THREE.Color(baseColor);
        const rowHeight = size / rows;
        for (let row = 0; row < rows; row++) {
            // Les joints sont décalés d'une rangée à l'autre ; la dernière lame déborde et reprend à gauche
            let x = -random() * 200;
            while (x < size) {
                const length = 140 + random() * 200;
                const shade = base.clone().offsetHSL(0, (random() - 0.5) * 0.04, (random() - 0.5) * 0.08);
                ctx.fillStyle = `#${shade.getHexString()}`;
                ctx.fillRect(x, row * rowHeight, length, rowHeight);
                if (x + length > size) ctx.fillRect(x - size, row * rowHeight, length, rowHeight);
                ctx.fillStyle = 'rgba(60, 40, 20, 0.35)';
                ctx.fillRect(x, row * rowHeight, 1.5, rowHeight);
                x += length;
            }
            ctx.fillStyle = 'rgba(60, 40, 20, 0.3)';
            ctx.fillRect(0, row * rowHeight, size, 1.5);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(10, 10);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        return texture;
    }, [baseColor, seed]);
}

// ── Sol ──────────────────────────────────────────────────────────────

// Tapis posé au sol, avec une bordure
export function Rug({ position, size, color, border }: { position: Vec3; size: [number, number]; color: string; border: string }) {
    const [width, depth] = size;
    return (
        <group position={position}>
            <mesh position={[0, 0.003, 0]} receiveShadow>
                <boxGeometry args={[width, 0.006, depth]} />
                <meshStandardMaterial color={border} roughness={1} />
            </mesh>
            <mesh position={[0, 0.0065, 0]} receiveShadow>
                <boxGeometry args={[width - 0.16, 0.002, depth - 0.16]} />
                <meshStandardMaterial color={color} roughness={1} />
            </mesh>
        </group>
    );
}

// ── Assises ──────────────────────────────────────────────────────────

interface SofaProps {
    position: Vec3;
    rotationY?: number;
    width?: number;
    // Nombre de coussins d'assise : 1 pour un fauteuil
    seats?: number;
    color?: string;
    accent?: string;
    // Plaid posé sur l'accoudoir gauche
    throwColor?: string;
}

// Canapé (ou fauteuil avec seats = 1), assise tournée vers +z
export function Sofa({ position, rotationY = 0, width = 2.0, seats = 2, color = '#6E7C86', accent = '#C9A66B', throwColor }: SofaProps) {
    const depth = 0.9;
    const legHeight = 0.06;
    const armWidth = seats === 1 ? 0.16 : 0.18;
    const innerWidth = width - armWidth * 2;
    const seatWidth = innerWidth / seats;
    const fabric = <meshStandardMaterial color={color} roughness={0.95} />;

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
                <mesh key={`${sx}${sz}`} position={[sx * (width / 2 - 0.08), legHeight / 2, sz * (depth / 2 - 0.08)]}>
                    <cylinderGeometry args={[0.02, 0.015, legHeight, 10]} />
                    <meshStandardMaterial color="#3B2F25" roughness={0.6} />
                </mesh>
            )))}
            {/* Socle et dossier */}
            <mesh position={[0, legHeight + 0.13, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, 0.26, depth]} />
                {fabric}
            </mesh>
            <mesh position={[0, legHeight + 0.4, -depth / 2 + 0.09]} castShadow>
                <boxGeometry args={[width, 0.8, 0.18]} />
                {fabric}
            </mesh>
            {/* Accoudoirs */}
            {[-1, 1].map((sx) => (
                <mesh key={sx} position={[sx * (width / 2 - armWidth / 2), legHeight + 0.31, 0]} castShadow>
                    <boxGeometry args={[armWidth, 0.62, depth]} />
                    {fabric}
                </mesh>
            ))}
            {/* Coussins d'assise et de dossier */}
            {Array.from({ length: seats }, (_, i) => {
                const x = -innerWidth / 2 + seatWidth * (i + 0.5);
                return (
                    <group key={`cushion-${i}`}>
                        <mesh position={[x, legHeight + 0.33, 0.08]} castShadow>
                            <boxGeometry args={[seatWidth - 0.015, 0.14, depth - 0.2]} />
                            <meshStandardMaterial color={color} roughness={1} />
                        </mesh>
                        <mesh position={[x, legHeight + 0.58, -depth / 2 + 0.26]} rotation={[-0.12, 0, 0]} castShadow>
                            <boxGeometry args={[seatWidth - 0.015, 0.4, 0.16]} />
                            <meshStandardMaterial color={color} roughness={1} />
                        </mesh>
                    </group>
                );
            })}
            {/* Coussins décoratifs */}
            <mesh position={[innerWidth / 2 - 0.2, legHeight + 0.55, -depth / 2 + 0.38]} rotation={[-0.2, -0.3, 0.1]} scale={[0.2, 0.19, 0.07]} castShadow>
                <sphereGeometry args={[1, 16, 12]} />
                <meshStandardMaterial color={accent} roughness={1} />
            </mesh>
            {seats > 1 && (
                <mesh position={[-innerWidth / 2 + 0.2, legHeight + 0.55, -depth / 2 + 0.38]} rotation={[-0.2, 0.25, -0.08]} scale={[0.2, 0.19, 0.07]} castShadow>
                    <sphereGeometry args={[1, 16, 12]} />
                    <meshStandardMaterial color="#E6DDCF" roughness={1} />
                </mesh>
            )}
            {/* Plaid replié sur l'accoudoir gauche, qui retombe à l'extérieur */}
            {throwColor && (
                <group position={[-width / 2 + armWidth / 2, legHeight + 0.62, 0.05]}>
                    <mesh position={[0, 0.012, 0]} castShadow>
                        <boxGeometry args={[armWidth + 0.03, 0.025, 0.5]} />
                        <meshStandardMaterial color={throwColor} roughness={1} />
                    </mesh>
                    <mesh position={[-armWidth / 2 - 0.01, -0.2, 0]} castShadow>
                        <boxGeometry args={[0.025, 0.42, 0.5]} />
                        <meshStandardMaterial color={throwColor} roughness={1} />
                    </mesh>
                </group>
            )}
        </group>
    );
}

// Pouf rond en tricot
export function Pouf({ position, color = '#CBBBA0' }: { position: Vec3; color?: string }) {
    return (
        <group position={position}>
            <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.24, 0.25, 0.4, 32]} />
                <meshStandardMaterial color={color} roughness={1} />
            </mesh>
            <mesh position={[0, 0.4, 0]} scale={[0.24, 0.035, 0.24]} castShadow>
                <sphereGeometry args={[1, 24, 12]} />
                <meshStandardMaterial color={color} roughness={1} />
            </mesh>
        </group>
    );
}

// Banc rembourré en bout de lit
export function Bench({ position, rotationY = 0, color = '#C8B9A6' }: { position: Vec3; rotationY?: number; color?: string }) {
    const width = 1.3;
    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, 0.12, 0.4]} />
                <meshStandardMaterial color={color} roughness={1} />
            </mesh>
            {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
                <mesh key={`${sx}${sz}`} position={[sx * (width / 2 - 0.06), 0.17, sz * 0.14]} castShadow>
                    <boxGeometry args={[0.035, 0.34, 0.035]} />
                    <meshStandardMaterial color="#8B6B4A" roughness={0.6} />
                </mesh>
            )))}
        </group>
    );
}

// ── Tables et rangements ─────────────────────────────────────────────

// Petite table ronde, avec une lampe posée dessus
export function SideTable({ position, withLamp = true }: { position: Vec3; withLamp?: boolean }) {
    const height = 0.52;
    return (
        <group position={position}>
            <mesh position={[0, height - 0.015, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.24, 0.24, 0.03, 32]} />
                <meshStandardMaterial color="#A07A55" roughness={0.6} />
            </mesh>
            <mesh position={[0, (height - 0.03) / 2, 0]} castShadow>
                <cylinderGeometry args={[0.025, 0.025, height - 0.03, 12]} />
                <meshStandardMaterial color="#2B2B2B" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.01, 0]}>
                <cylinderGeometry args={[0.16, 0.16, 0.02, 24]} />
                <meshStandardMaterial color="#2B2B2B" metalness={0.7} roughness={0.3} />
            </mesh>
            {withLamp && <Lamp position={[0, height, 0]} />}
        </group>
    );
}

// Table basse ronde garnie : livres, tasse, petite plante
export function CoffeeTable({ position }: { position: Vec3 }) {
    const height = 0.4;
    const radius = 0.36;
    return (
        <group position={position}>
            <mesh position={[0, height - 0.02, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[radius, radius, 0.04, 40]} />
                <meshStandardMaterial color="#9C7652" roughness={0.55} />
            </mesh>
            {[0, 1, 2, 3].map((i) => {
                const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
                return (
                    <mesh key={i} position={[Math.cos(angle) * radius * 0.65, (height - 0.04) / 2, Math.sin(angle) * radius * 0.65]} castShadow>
                        <cylinderGeometry args={[0.018, 0.014, height - 0.04, 10]} />
                        <meshStandardMaterial color="#6E5139" roughness={0.6} />
                    </mesh>
                );
            })}
            <BookStack position={[-0.1, height, 0.06]} count={3} seed={4} />
            <Mug position={[0.14, height, -0.06]} />
            <Plant position={[0.02, height, -0.18]} scale={1.3} seed="table" />
        </group>
    );
}

// Table de chevet avec sa lampe ; « items » pose aussi des livres et un verre
export function Nightstand({ position, items = false }: { position: Vec3; items?: boolean }) {
    const height = 0.5;
    return (
        <group position={position}>
            <mesh position={[0, height / 2 + 0.02, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.45, height - 0.04, 0.4]} />
                <meshStandardMaterial color="#B89A76" roughness={0.7} />
            </mesh>
            <mesh position={[0, height / 2 + 0.06, 0.201]}>
                <boxGeometry args={[0.41, 0.004, 0.002]} />
                <meshStandardMaterial color="#6B5640" />
            </mesh>
            <mesh position={[0, height / 2 + 0.13, 0.205]}>
                <boxGeometry args={[0.08, 0.012, 0.01]} />
                <meshStandardMaterial color="#3B2F25" metalness={0.6} roughness={0.3} />
            </mesh>
            {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
                <mesh key={`${sx}${sz}`} position={[sx * 0.19, 0.02, sz * 0.16]}>
                    <cylinderGeometry args={[0.012, 0.012, 0.04, 8]} />
                    <meshStandardMaterial color="#3B2F25" />
                </mesh>
            )))}
            <Lamp position={[0, height, -0.06]} />
            {items && (
                <>
                    <BookStack position={[0.1, height, 0.1]} count={2} seed={9} />
                    <Glass position={[-0.14, height, 0.12]} />
                </>
            )}
        </group>
    );
}

// Panier en osier avec une couverture
export function Basket({ position, blanket = '#D9CBB4' }: { position: Vec3; blanket?: string }) {
    return (
        <group position={position}>
            <mesh position={[0, 0.17, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.2, 0.17, 0.34, 28, 1, true]} />
                <meshStandardMaterial color="#B08A5A" roughness={1} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0.01, 0]}>
                <cylinderGeometry args={[0.17, 0.17, 0.02, 28]} />
                <meshStandardMaterial color="#9A7646" roughness={1} />
            </mesh>
            <mesh position={[0, 0.33, 0]} scale={[0.19, 0.09, 0.19]} castShadow>
                <sphereGeometry args={[1, 20, 12]} />
                <meshStandardMaterial color={blanket} roughness={1} />
            </mesh>
        </group>
    );
}

// ── Petits objets ────────────────────────────────────────────────────

// Livres posés à plat les uns sur les autres
export function BookStack({ position, count = 3, seed = 1 }: { position: Vec3; count?: number; seed?: number }) {
    const books = useMemo(() => {
        const random = seededRandom(seed + 1);
        const colors = ['#2F4858', '#8C3B2E', '#D8C9A7', '#4F6D4A', '#C0A062', '#3A3A48'];
        let y = 0;
        return Array.from({ length: count }, () => {
            const thickness = 0.022 + random() * 0.018;
            const book = {
                y: y + thickness / 2,
                size: [0.15 + random() * 0.06, thickness, 0.21 + random() * 0.05] as Vec3,
                rotation: (random() - 0.5) * 0.35,
                color: colors[Math.floor(random() * colors.length)],
            };
            y += thickness;
            return book;
        });
    }, [count, seed]);

    return (
        <group position={position}>
            {books.map((book, i) => (
                <mesh key={i} position={[0, book.y, 0]} rotation={[0, book.rotation, 0]} castShadow>
                    <boxGeometry args={book.size} />
                    <meshStandardMaterial color={book.color} roughness={0.8} />
                </mesh>
            ))}
        </group>
    );
}

// Tasse avec son anse
export function Mug({ position, color = '#EDE6DA' }: { position: Vec3; color?: string }) {
    return (
        <group position={position}>
            <mesh position={[0, 0.045, 0]} castShadow>
                <cylinderGeometry args={[0.038, 0.034, 0.09, 20]} />
                <meshStandardMaterial color={color} roughness={0.35} />
            </mesh>
            <mesh position={[0.045, 0.048, 0]} rotation={[0, 0, Math.PI / 2]}>
                <torusGeometry args={[0.022, 0.006, 8, 16, Math.PI]} />
                <meshStandardMaterial color={color} roughness={0.35} />
            </mesh>
        </group>
    );
}

// Verre d'eau
export function Glass({ position }: { position: Vec3 }) {
    return (
        <mesh position={[position[0], position[1] + 0.05, position[2]]}>
            <cylinderGeometry args={[0.032, 0.028, 0.1, 20]} />
            <meshStandardMaterial color="#DCEBF2" transparent opacity={0.45} roughness={0.05} metalness={0.1} />
        </mesh>
    );
}

// ── Luminaires et plantes ────────────────────────────────────────────

// Lampadaire, allumé avec les lumières de la pièce
export function FloorLamp({ position }: { position: Vec3 }) {
    const lit = !!useRoomLights();
    return (
        <group position={position}>
            <mesh position={[0, 0.012, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.15, 0.024, 32]} />
                <meshStandardMaterial color="#2B2B2B" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.78, 0]} castShadow>
                <cylinderGeometry args={[0.012, 0.012, 1.52, 12]} />
                <meshStandardMaterial color="#2B2B2B" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, 1.58, 0]} castShadow>
                <cylinderGeometry args={[0.17, 0.23, 0.3, 32, 1, true]} />
                <meshStandardMaterial color="#F3EEE4" roughness={0.9} side={THREE.DoubleSide} emissive={WARM_LIGHT} emissiveIntensity={lit ? 0.8 : 0} />
            </mesh>
            <mesh position={[0, 1.55, 0]}>
                <sphereGeometry args={[0.04, 16, 12]} />
                <meshStandardMaterial color="#FFF5E1" emissive="#FFF5E1" emissiveIntensity={lit ? 3 : 0} />
            </mesh>
            <pointLight position={[0, 1.5, 0]} intensity={lit ? 3 : 0} distance={5} color={WARM_LIGHT} />
        </group>
    );
}

// Applique murale : platine, bras et abat-jour orienté vers le haut ; position : la platine contre le mur
export function WallSconce({ position }: { position: Vec3 }) {
    const lit = !!useRoomLights();
    const brass = <meshStandardMaterial color="#B8925A" metalness={0.8} roughness={0.3} />;
    return (
        <group position={position}>
            <mesh position={[0, 0, 0.008]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.045, 0.045, 0.016, 24]} />
                {brass}
            </mesh>
            <mesh position={[0, 0.02, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 0.13, 8]} />
                {brass}
            </mesh>
            <mesh position={[0, 0.08, 0.13]}>
                <cylinderGeometry args={[0.1, 0.06, 0.14, 24, 1, true]} />
                <meshStandardMaterial color="#F3EEE4" roughness={0.9} side={THREE.DoubleSide} emissive={WARM_LIGHT} emissiveIntensity={lit ? 0.9 : 0} />
            </mesh>
            <mesh position={[0, 0.06, 0.13]}>
                <sphereGeometry args={[0.025, 12, 10]} />
                <meshStandardMaterial color="#FFF5E1" emissive="#FFF5E1" emissiveIntensity={lit ? 3 : 0} />
            </mesh>
            <pointLight position={[0, 0.1, 0.16]} intensity={lit ? 1.4 : 0} distance={3} color={WARM_LIGHT} />
        </group>
    );
}

// Grande plante en pot, posée au sol
export function FloorPlant({ position, seed = 3, potColor = '#E8E1D6' }: { position: Vec3; seed?: number; potColor?: string }) {
    const leaves = useMemo(() => {
        const random = seededRandom(seed);
        return Array.from({ length: 16 }, (_, i) => {
            const angle = (i / 16) * Math.PI * 2 * 2.6 + random() * 0.6;
            const height = 0.6 + (i / 16) * 0.7 + random() * 0.1;
            const reach = 0.08 + random() * 0.14;
            return {
                position: [Math.cos(angle) * reach, height, Math.sin(angle) * reach] as Vec3,
                rotation: [random() * 0.8 - 0.4, -angle, 0.6 + random() * 0.5] as Vec3,
                color: i % 3 === 0 ? '#4E7340' : i % 3 === 1 ? '#3F6334' : '#5C8549',
            };
        });
    }, [seed]);

    return (
        <group position={position}>
            <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
                <cylinderGeometry args={[0.2, 0.16, 0.44, 24]} />
                <meshStandardMaterial color={potColor} roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.43, 0]}>
                <cylinderGeometry args={[0.185, 0.185, 0.01, 24]} />
                <meshStandardMaterial color="#3E2C20" roughness={1} />
            </mesh>
            <mesh position={[0, 0.85, 0]} castShadow>
                <cylinderGeometry args={[0.012, 0.016, 0.85, 8]} />
                <meshStandardMaterial color="#5B4632" roughness={0.9} />
            </mesh>
            {leaves.map((leaf, i) => (
                <mesh key={i} position={leaf.position} rotation={leaf.rotation} scale={[0.11, 0.015, 0.075]} castShadow>
                    <sphereGeometry args={[1, 12, 8]} />
                    <meshStandardMaterial color={leaf.color} roughness={0.7} />
                </mesh>
            ))}
        </group>
    );
}

// ── Murs ─────────────────────────────────────────────────────────────

// Fenêtre (vitre lumineuse, croisillons, appui) et rideaux qui tombent jusqu'au sol.
// position : centre de la vitre ; la face donne vers +z.
export function WallWindow({ position, rotationY = 0, width = 1.2, height = 1.4, curtain = '#E9E2D4' }: { position: Vec3; rotationY?: number; width?: number; height?: number; curtain?: string }) {
    const frame = 0.06;
    const rodY = height / 2 + 0.18;
    const curtainLength = position[1] + rodY - 0.02;
    const frameMaterial = <meshStandardMaterial color="#F7F5F0" roughness={0.5} />;
    // Lumières allumées : c'est le soir, la vitre montre un ciel de nuit
    const night = !!useRoomLights();

    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            {/* Vitre : un ciel clair, légèrement lumineux (ou bleu nuit le soir) */}
            <mesh position={[0, 0, 0.005]}>
                <planeGeometry args={[width, height]} />
                <meshStandardMaterial
                    color={night ? '#1C2638' : '#CFE3F1'}
                    emissive={night ? '#26334D' : '#E4F0F8'}
                    emissiveIntensity={night ? 0.5 : 0.55}
                    roughness={0.1}
                />
            </mesh>
            {/* Cadre et croisillons */}
            <mesh position={[0, height / 2 + frame / 2, 0.03]}><boxGeometry args={[width + frame * 2, frame, 0.06]} />{frameMaterial}</mesh>
            <mesh position={[0, -height / 2 - frame / 2, 0.03]}><boxGeometry args={[width + frame * 2, frame, 0.06]} />{frameMaterial}</mesh>
            <mesh position={[-width / 2 - frame / 2, 0, 0.03]}><boxGeometry args={[frame, height, 0.06]} />{frameMaterial}</mesh>
            <mesh position={[width / 2 + frame / 2, 0, 0.03]}><boxGeometry args={[frame, height, 0.06]} />{frameMaterial}</mesh>
            <mesh position={[0, 0, 0.025]}><boxGeometry args={[0.035, height, 0.04]} />{frameMaterial}</mesh>
            <mesh position={[0, height * 0.15, 0.025]}><boxGeometry args={[width, 0.035, 0.04]} />{frameMaterial}</mesh>
            {/* Appui */}
            <mesh position={[0, -height / 2 - frame - 0.012, 0.08]} castShadow>
                <boxGeometry args={[width + 0.2, 0.025, 0.16]} />
                {frameMaterial}
            </mesh>
            {/* Tringle et rideaux (plis : des cylindres aplatis côte à côte) */}
            <mesh position={[0, rodY, 0.12]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.01, 0.01, width + 0.9, 10]} />
                <meshStandardMaterial color="#2B2B2B" metalness={0.8} roughness={0.3} />
            </mesh>
            {[-1, 1].map((side) => (
                <group key={side} position={[side * (width / 2 + 0.12), rodY - curtainLength / 2, 0.12]}>
                    {Array.from({ length: 6 }, (_, i) => (
                        <mesh key={i} position={[(i - 2.5) * 0.055, 0, i % 2 === 0 ? 0.012 : -0.012]} scale={[1, 1, 0.45]} castShadow>
                            <cylinderGeometry args={[0.034, 0.034, curtainLength, 12]} />
                            <meshStandardMaterial color={curtain} roughness={1} />
                        </mesh>
                    ))}
                </group>
            ))}
        </group>
    );
}

// Télévision fixée au mur ; position : centre de l'écran
export function WallTv({ position, width }: { position: Vec3; width: number }) {
    const height = width * 0.5625;
    return (
        <group position={position}>
            <mesh castShadow>
                <boxGeometry args={[width, height, 0.035]} />
                <meshStandardMaterial color="#141518" roughness={0.4} metalness={0.3} />
            </mesh>
            <mesh position={[0, 0, 0.018]}>
                <planeGeometry args={[width - 0.02, height - 0.02]} />
                <meshStandardMaterial color="#1E242C" roughness={0.12} metalness={0.4} />
            </mesh>
        </group>
    );
}

// Miroir rond au mur ; position : centre
export function RoundMirror({ position, radius = 0.35 }: { position: Vec3; radius?: number }) {
    return (
        <group position={position}>
            <mesh>
                <circleGeometry args={[radius, 48]} />
                <meshStandardMaterial color="#CBD5DA" metalness={0.65} roughness={0.18} />
            </mesh>
            <mesh>
                <torusGeometry args={[radius, 0.018, 12, 64]} />
                <meshStandardMaterial color="#B8925A" metalness={0.8} roughness={0.3} />
            </mesh>
        </group>
    );
}

// Grand miroir posé au sol, appuyé contre le mur (le pied à position, le haut contre le mur)
export function FloorMirror({ position, width = 0.55, height = 1.65 }: { position: Vec3; width?: number; height?: number }) {
    return (
        <group position={position} rotation={[-0.07, 0, 0]}>
            <mesh position={[0, height / 2, 0]} castShadow>
                <boxGeometry args={[width, height, 0.03]} />
                <meshStandardMaterial color="#2E2A26" roughness={0.5} />
            </mesh>
            <mesh position={[0, height / 2, 0.016]}>
                <planeGeometry args={[width - 0.06, height - 0.06]} />
                <meshStandardMaterial color="#CBD5DA" metalness={0.65} roughness={0.18} />
            </mesh>
        </group>
    );
}

// Étagère murale avec quelques objets
export function WallShelf({ position, width = 0.8 }: { position: Vec3; width?: number }) {
    return (
        <group position={position}>
            <mesh castShadow receiveShadow>
                <boxGeometry args={[width, 0.03, 0.2]} />
                <meshStandardMaterial color="#A07A55" roughness={0.6} />
            </mesh>
            <BookStack position={[-width / 2 + 0.14, 0.015, 0]} count={2} seed={21} />
            <Vase position={[0.02, 0.015, 0]} color="#C4B5A3" scale={0.8} seed="shelf" fitHeight={0.3} />
            <Plant position={[width / 2 - 0.12, 0.015, 0]} scale={1.3} seed="shelf-plant" />
        </group>
    );
}

// ── Lit ──────────────────────────────────────────────────────────────

// Lit double, tête de lit vers -z
export function Bed({ position, rotationY = 0, linen = '#F4F1EC', throwColor = '#8A9A7B' }: { position: Vec3; rotationY?: number; linen?: string; throwColor?: string }) {
    const width = 1.7;
    const length = 2.1;
    const wood = '#A88B6A';
    return (
        <group position={position} rotation={[0, rotationY, 0]}>
            {/* Cadre et tête de lit */}
            <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
                <boxGeometry args={[width, 0.3, length]} />
                <meshStandardMaterial color={wood} roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.58, -length / 2 - 0.04]} castShadow>
                <boxGeometry args={[width + 0.06, 1.16, 0.08]} />
                <meshStandardMaterial color="#C8B9A6" roughness={1} />
            </mesh>
            {/* Matelas, couette et plaid */}
            <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
                <boxGeometry args={[width - 0.1, 0.22, length - 0.1]} />
                <meshStandardMaterial color="#FAF8F4" roughness={1} />
            </mesh>
            <mesh position={[0, 0.55, 0.27]} castShadow receiveShadow>
                <boxGeometry args={[width - 0.04, 0.09, length - 0.6]} />
                <meshStandardMaterial color={linen} roughness={1} />
            </mesh>
            <mesh position={[0, 0.555, length / 2 - 0.3]} castShadow>
                <boxGeometry args={[width - 0.02, 0.1, 0.42]} />
                <meshStandardMaterial color={throwColor} roughness={1} />
            </mesh>
            {/* Oreillers et coussins */}
            {[-1, 1].map((sx) => (
                <mesh key={sx} position={[sx * 0.38, 0.63, -length / 2 + 0.3]} rotation={[-0.25, 0, 0]} scale={[0.32, 0.08, 0.2]} castShadow>
                    <sphereGeometry args={[1, 20, 12]} />
                    <meshStandardMaterial color="#FFFFFF" roughness={1} />
                </mesh>
            ))}
            {[-1, 1].map((sx) => (
                <mesh key={`deco-${sx}`} position={[sx * 0.22, 0.66, -length / 2 + 0.44]} rotation={[-0.45, sx * 0.15, 0]} scale={[0.15, 0.12, 0.045]} castShadow>
                    <sphereGeometry args={[1, 16, 12]} />
                    <meshStandardMaterial color={throwColor} roughness={1} />
                </mesh>
            ))}
        </group>
    );
}

import { TexturedMaterial } from './TexturedMaterial';

// Épaisseur du revêtement : assez fine pour ne pas se lire comme une planche en plus
const LINING = 0.003;

// Intérieur d'une niche : le fond et les quatre côtés du compartiment, habillés d'une couleur propre.
// `position` est le centre du compartiment, `depth` la profondeur libre devant le panneau arrière.
export function NicheLining({
                                width,
                                height,
                                depth,
                                position,
                                hexColor,
                                imageUrl
                            }: {
    width: number;
    height: number;
    depth: number;
    position: [number, number, number];
    hexColor: string;
    imageUrl?: string | null;
}) {
    const sideDepth = depth - LINING;
    const sideZ = LINING / 2;
    const material = <TexturedMaterial hexColor={hexColor} imageUrl={imageUrl} />;

    return (
        <group position={position}>
            <mesh position={[0, 0, -depth / 2 + LINING / 2]} receiveShadow>
                <boxGeometry args={[width, height, LINING]} />
                {material}
            </mesh>
            {[1, -1].map((side) => (
                <mesh key={`y${side}`} position={[0, side * (height / 2 - LINING / 2), sideZ]} receiveShadow>
                    <boxGeometry args={[width, LINING, sideDepth]} />
                    {material}
                </mesh>
            ))}
            {[1, -1].map((side) => (
                <mesh key={`x${side}`} position={[side * (width / 2 - LINING / 2), 0, sideZ]} receiveShadow>
                    <boxGeometry args={[LINING, height - 2 * LINING, sideDepth]} />
                    {material}
                </mesh>
            ))}
        </group>
    );
}

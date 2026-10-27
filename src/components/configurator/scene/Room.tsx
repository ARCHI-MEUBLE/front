import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { JapaneseMinimalist, ScandinavianLandscape, BauhausGeometric } from './wall-art';
import { Vase } from './Decor';
import { FloorGlow, StudioCove } from './StudioCove';
import {
    Basket, Bed, Bench, CoffeeTable, FloorLamp, FloorMirror, FloorPlant, Nightstand, Pouf, RoundMirror, Rug,
    SideTable, Sofa, WallSconce, WallShelf, WallTv, WallWindow, useParquetTexture,
} from './RoomFurniture';

// Inclinaison de chaque feuille de la plante. Fixe : tirée au hasard à chaque rendu, la plante changeait de
// forme à chaque clic sur le meuble.
const PLANT_LEAF_TILTS: [number, number][] = Array.from({ length: 12 }, (_, i) => [
    0.4 + 0.4 * Math.sin(i * 12.9898),
    0.4 + 0.4 * Math.sin(i * 78.233),
]);

// Pièce autour du meuble : neutre (studio clair), salon ou chambre
export type RoomScene = 'neutral' | 'living' | 'bedroom';

export const ROOM_SCENES: { id: RoomScene; label: string }[] = [
    { id: 'neutral', label: 'Neutre' },
    { id: 'living', label: 'Salon' },
    { id: 'bedroom', label: 'Chambre' },
];

const ROOM_COLORS: Record<RoomScene, { floor: string; wall: string; baseboard: string }> = {
    // Studio : dégradé crème, du sol (plus soutenu) au haut du mur (fond de page ArchiMeuble)
    // (teintes plus marquées qu'à l'écran : l'éclairage blanc et le tone mapping les désaturent)
    neutral: { floor: '#C9B392', wall: '#E9DAC3', baseboard: '#E9DAC3' },
    // Teintes du parquet volontairement soutenues : l'éclairage de la scène les éclaircit beaucoup
    living: { floor: '#7E5636', wall: '#ECE5DA', baseboard: '#F6F2EC' },
    bedroom: { floor: '#8F6C49', wall: '#DCE3D9', baseboard: '#F4F1EA' },
};

interface RoomProps {
    scene?: RoomScene;
    // Dimensions du meuble (m) : le décor se range de part et d'autre, sans jamais passer devant
    furnitureWidth?: number;
    furnitureDepth?: number;
    furnitureHeight?: number;
}

export function Room({ scene = 'neutral', furnitureWidth = 1.5, furnitureDepth = 0.5, furnitureHeight = 0.73 }: RoomProps) {
    const colors = ROOM_COLORS[scene];
    const parquet = useParquetTexture(colors.floor);
    const half = furnitureWidth / 2;
    const top = furnitureHeight;

    // Studio neutre : le fond reste loin derrière (la courbe commence derrière les meubles les plus
    // profonds). Salon et chambre : le meuble est posé contre le mur du fond, et le mur de gauche se
    // rapproche pour fermer la pièce.
    const furnished = scene !== 'neutral';
    const wallZ = furnished ? -furnitureDepth / 2 - 0.02 : -2.5;
    const leftX = furnished ? -(half + 2.4) : -5;
    // Objets accrochés au mur du fond, juste devant lui
    const onWall = wallZ + 0.03;
    // Télé du salon, proportionnée au meuble
    const tvWidth = Math.min(1.4, Math.max(0.9, furnitureWidth * 0.7));

    return (
        <group>
            {/* Studio neutre : fond courbe de photographe, halo sous le meuble, une grande plante à gauche
                et deux vases en céramique à droite */}
            {!furnished && (
                <>
                    <StudioCove wallZ={wallZ} radius={1.5} floorColor={colors.floor} wallColor={colors.wall} />
                    <FloorGlow radius={Math.max(1.4, furnitureWidth * 0.85)} />
                    <FloorPlant position={[-(half + 0.75), 0, -0.45]} seed={5} potColor="#E9E2D6" />
                    <Vase position={[half + 0.42, 0, -0.5]} color="#CDBFAE" scale={3.2} seed="studio-tall" fitHeight={0.75} />
                    <Vase position={[half + 0.68, 0, -0.2]} color="#8F7F6A" scale={2.2} seed="studio-low" fitHeight={0.4} />
                </>
            )}

            {furnished && (
                <>
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
                        <planeGeometry args={[20, 20]} />
                        {parquet ? (
                            <meshStandardMaterial key={scene} map={parquet} roughness={0.65} metalness={0.05} />
                        ) : (
                            <meshStandardMaterial color={colors.floor} roughness={0.8} metalness={0.1} />
                        )}
                    </mesh>

                    <mesh position={[0, 5, wallZ]} receiveShadow>
                        <planeGeometry args={[20, 10]} />
                        <meshStandardMaterial color={colors.wall} roughness={0.9} />
                    </mesh>

                    <mesh position={[leftX, 5, wallZ + 5]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
                        <planeGeometry args={[10, 10]} />
                        <meshStandardMaterial color={colors.wall} roughness={0.9} />
                    </mesh>

                    <mesh position={[0, 0.05, wallZ + 0.01]}>
                        <boxGeometry args={[20, 0.1, 0.02]} />
                        <meshStandardMaterial color={colors.baseboard} />
                    </mesh>

                    <mesh position={[leftX + 0.01, 0.05, wallZ + 5]}>
                        <boxGeometry args={[0.02, 0.1, 10]} />
                        <meshStandardMaterial color={colors.baseboard} />
                    </mesh>
                </>
            )}

            {/* Salon : télé au mur au-dessus d'un meuble bas, canapé de côté face à la pièce, table basse,
                pouf, fenêtre à rideaux sur le mur de gauche ; lampadaire, plante et panier à droite */}
            {scene === 'living' && (
                <>
                    {top <= 1.3 ? (
                        <WallTv position={[0, top + 0.5 + tvWidth * 0.28, onWall]} width={tvWidth} />
                    ) : (
                        <JapaneseMinimalist position={[0, top + 0.55, onWall]} width={1.0} height={0.75} />
                    )}
                    {/* Appliques de part et d'autre de la télé (ou du tableau) */}
                    {[-1, 1].map((side) => (
                        <WallSconce key={side} position={[side * ((top <= 1.3 ? tvWidth : 1.0) / 2 + 0.3), top <= 1.3 ? top + 0.5 + tvWidth * 0.28 : top + 0.55, wallZ]} />
                    ))}
                    <Rug position={[-(half + 0.6), 0, wallZ + 1.5]} size={[2.2, 2.4]} color="#BFB3A2" border="#8F7F6A" />
                    <Sofa position={[-(half + 1.4), 0, wallZ + 1.5]} rotationY={Math.PI / 2} throwColor="#D8CBB5" />
                    <SideTable position={[-(half + 1.4), 0, wallZ + 0.26]} />
                    <CoffeeTable position={[-(half + 0.5), 0, wallZ + 1.5]} />
                    <Pouf position={[-(half + 0.25), 0, wallZ + 2.35]} />
                    <WallWindow position={[leftX + 0.01, 1.5, wallZ + 1.5]} rotationY={Math.PI / 2} width={1.3} height={1.4} />
                    <ScandinavianLandscape position={[-(half + 1.0), 1.65, onWall]} width={0.6} height={0.75} />
                    <WallShelf position={[-(half + 1.0), 2.3, wallZ + 0.11]} width={0.9} />
                    <FloorLamp position={[half + 0.4, 0, wallZ + 0.35]} />
                    <FloorPlant position={[half + 0.95, 0, wallZ + 0.35]} />
                    <Basket position={[half + 0.6, 0, wallZ + 1.0]} />
                    <BauhausGeometric position={[half + 0.95, 2.05, onWall]} width={0.5} height={0.65} />
                </>
            )}

            {/* Chambre : le meuble sert de commode contre le mur, lit à sa droite tête contre le mur entre deux
                chevets, banc au pied du lit ; à gauche miroir sur pied, fauteuil, lampadaire, fenêtre et plante */}
            {scene === 'bedroom' && (
                <>
                    {top <= 1.3 ? (
                        <RoundMirror position={[0, top + 0.6, onWall]} radius={0.32} />
                    ) : (
                        <ScandinavianLandscape position={[0, top + 0.5, onWall]} width={0.8} height={0.55} />
                    )}
                    {/* Appliques de part et d'autre du miroir (ou du tableau) */}
                    {[-1, 1].map((side) => (
                        <WallSconce key={side} position={[side * 0.62, top <= 1.3 ? top + 0.6 : top + 0.5, wallZ]} />
                    ))}
                    <Rug position={[half + 1.45, 0, wallZ + 1.55]} size={[2.6, 2.3]} color="#E2D8C8" border="#B3A48D" />
                    <Bed position={[half + 1.45, 0, wallZ + 1.13]} />
                    <Nightstand position={[half + 0.33, 0, wallZ + 0.22]} items />
                    <Nightstand position={[half + 2.57, 0, wallZ + 0.22]} />
                    <Bench position={[half + 1.45, 0, wallZ + 2.5]} />
                    <ScandinavianLandscape position={[half + 1.45, 1.6, onWall]} width={0.9} height={0.55} />
                    <FloorMirror position={[-(half + 0.5), 0, wallZ + 0.14]} />
                    <Sofa position={[-(half + 1.35), 0, wallZ + 1.0]} rotationY={Math.PI / 4} width={0.85} seats={1} color="#B9A58C" accent="#8A9A7B" />
                    <FloorLamp position={[leftX + 0.35, 0, wallZ + 0.35]} />
                    <WallWindow position={[leftX + 0.01, 1.5, wallZ + 1.9]} rotationY={Math.PI / 2} width={1.2} height={1.4} curtain="#C9D2C3" />
                    <FloorPlant position={[leftX + 0.4, 0, wallZ + 3.1]} seed={11} potColor="#C67B5C" />
                    <Basket position={[-(half + 0.45), 0, wallZ + 1.9]} blanket="#8A9A7B" />
                    <JapaneseMinimalist position={[-(half + 1.4), 1.75, onWall]} width={0.7} height={0.55} />
                </>
            )}
        </group>
    );
}

export function HumanSilhouette() {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        const loader = new THREE.TextureLoader();
        loader.load('/images/human-silhouette.png', (t) => {
            setTexture(t);
        });
    }, []);

    if (!texture) return null;

    return (
        <group position={[1.4, 0.85, 0.9]}>
            <sprite scale={[1.1, 1.7, 1]}>
                <spriteMaterial
                    map={texture}
                    transparent
                    opacity={0.12}
                    depthWrite={false}
                />
            </sprite>
        </group>
    );
}

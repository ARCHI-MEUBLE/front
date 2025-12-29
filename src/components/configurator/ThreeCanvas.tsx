import React, { Suspense, useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Float, useTexture } from '@react-three/drei';
import * as THREE from 'three';

import { Zone } from './ZoneEditor/types';
import { ComponentColors } from './MaterialSelector';

interface ThreeViewerProps {
  width: number;
  height: number;
  depth: number;
  color: string;
  hasSocle: boolean;
  rootZone: Zone | null;
  selectedZoneId?: string | null;
  onSelectZone?: (id: string | null) => void;
  isBuffet?: boolean;
  doorsOpen?: boolean;
  showDecorations?: boolean;
  onToggleDoors?: () => void;
  componentColors?: ComponentColors;
  doorType?: 'none' | 'single' | 'double';
  doorSide?: 'left' | 'right';
  useMultiColor?: boolean;
}

const TEXTURE_MAPPING: Record<string, string> = {
  '#D8C7A1': 'chene_halifax',
  '#5D4037': 'noyer',
  '#8B5A2B': 'chene_brun',
  '#E8E6E3': 'meleze',
  '#FFFFFF': 'blanc_premium',
  '#1A1A1A': 'noir_graphite',
};

function useFurnitureMaterial(hexColor: string) {
  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);
  const normalizedColor = hexColor?.toUpperCase() || '#D8C7A1';
  const textureName = TEXTURE_MAPPING[normalizedColor];
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!textureName) {
      setTexture(null);
      return;
    }
    textureLoader.load(
      `/textures/${textureName}.png`,
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(2, 2);
        setTexture(tex);
      },
      undefined,
      () => {
        console.warn(`Failed to load texture: ${textureName}`);
        setTexture(null);
      }
    );
  }, [textureName, textureLoader]);

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: texture ? '#ffffff' : normalizedColor,
      map: texture,
      roughness: texture ? 0.7 : 0.4,
      metalness: 0.1,
      envMapIntensity: 1.0
    });
    return mat;
  }, [normalizedColor, texture]);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return material;
}

function AnimatedDoor({ position, width, height, hexColor, side, isOpen, onClick }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const targetRot = isOpen ? (side === 'left' ? -Math.PI * 0.7 : Math.PI * 0.7) : 0;
  const material = useFurnitureMaterial(hexColor);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot, 0.1);
    }
  });

  return (
    <group 
      ref={groupRef} 
      position={position} 
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick(e);
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      <mesh position={[side === 'left' ? width/2 : -width/2, 0, 0.01]} castShadow>
        <boxGeometry args={[width - 0.005, height - 0.01, 0.018]} />
        <primitive object={material} attach="material" />
      </mesh>
      {/* Poignée (Verticale et proportionnelle) */}
      <mesh position={[side === 'left' ? width - 0.04 : -width + 0.04, 0, 0.02]}>
        <cylinderGeometry args={[0.008, 0.008, Math.min(height * 0.25, 0.4), 12]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

function AnimatedDrawer({ position, width, height, depth, hexColor, isOpen, onClick }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const initialZ = position[2];
  const targetZ = isOpen ? initialZ + depth * 0.6 : initialZ; // Sortie de 60% de la profondeur
  const material = useFurnitureMaterial(hexColor);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.1);
    }
  });

  const boxDepth = depth * 0.8;
  const boxHeight = height * 0.8; // Proportionnelle à la hauteur du tiroir (80%)

  return (
    <group 
      ref={groupRef} 
      position={[position[0], position[1], initialZ]}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick(e);
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default';
      }}
    >
      {/* Façade */}
      <mesh castShadow>
        <boxGeometry args={[width - 0.01, height - 0.01, 0.02]} />
        <primitive object={material} attach="material" />
      </mesh>
      {/* Poignée (Horizontale et proportionnelle) */}
      <mesh position={[0, 0, 0.015]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.006, 0.006, Math.min(width * 0.4, 0.5), 12]} />
        <meshStandardMaterial color="#111" metalness={0.8} />
      </mesh>
      {/* Fond du tiroir (boîte simplifiée) */}
      <mesh position={[0, -height / 2 + 0.05, -boxDepth / 2]} receiveShadow>
        <boxGeometry args={[width - 0.06, 0.01, boxDepth]} />
        <meshStandardMaterial color="#eee" />
      </mesh>
      {/* Côtés du tiroir */}
      <mesh position={[-width / 2 + 0.03, -height / 2 + 0.05 + boxHeight / 2, -boxDepth / 2]} castShadow>
        <boxGeometry args={[0.012, boxHeight, boxDepth]} />
        <meshStandardMaterial color="#ddd" />
      </mesh>
      <mesh position={[width / 2 - 0.03, -height / 2 + 0.05 + boxHeight / 2, -boxDepth / 2]} castShadow>
        <boxGeometry args={[0.012, boxHeight, boxDepth]} />
        <meshStandardMaterial color="#ddd" />
      </mesh>
      {/* Arrière du tiroir */}
      <mesh position={[0, -height / 2 + 0.05 + boxHeight / 2, -boxDepth]} castShadow>
        <boxGeometry args={[width - 0.06, boxHeight, 0.012]} />
        <meshStandardMaterial color="#ddd" />
      </mesh>
    </group>
  );
}

function Furniture({ 
  width, height, depth, color, hasSocle, rootZone, isBuffet, 
  doorsOpen, showDecorations, onToggleDoors, componentColors,
  doorType = 'none',
  doorSide = 'left',
  useMultiColor = false,
  selectedZoneId,
  onSelectZone
}: ThreeViewerProps) {
  const [openCompartments, setOpenCompartments] = useState<Record<string, boolean>>({});

  // Synchronisation avec l'état global doorsOpen
  useEffect(() => {
    if (rootZone) {
      const newOpenStates: Record<string, boolean> = {};
      const applyOpenState = (zone: Zone) => {
        if (zone.type === 'leaf' && (zone.content === 'drawer' || zone.content === 'door' || zone.content === 'door_right' || zone.content === 'door_double')) {
          newOpenStates[zone.id] = doorsOpen || false;
        }
        if (zone.children) {
          zone.children.forEach(applyOpenState);
        }
      };
      applyOpenState(rootZone);
      setOpenCompartments(newOpenStates);
    }
  }, [doorsOpen, rootZone]);

  const toggleCompartment = (id: string) => {
    setOpenCompartments(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  const { w, h, d, sideHeight, yOffset, thickness } = useMemo(() => {
    const w = (width || 1500) / 1000;
    const h = (height || 730) / 1000;
    const d = (depth || 500) / 1000;
    const thickness = 0.019;
    const sideHeight = hasSocle ? h - 0.1 : h;
    const yOffset = hasSocle ? 0.1 : 0;
    return { w, h, d, sideHeight, yOffset, thickness };
  }, [width, height, depth, hasSocle]);

  // En mode couleur unie, toutes les pièces utilisent la même couleur
  // En mode multi-couleur, chaque composant peut avoir sa propre couleur
  const structureColor = useMultiColor
    ? (componentColors?.structure?.hex || color || '#D8C7A1')
    : (color || '#D8C7A1');

  const shelfColor = useMultiColor
    ? (componentColors?.shelves?.hex || structureColor)
    : structureColor;

  const doorColor = useMultiColor
    ? (componentColors?.doors?.hex || structureColor)
    : structureColor;

  const backColor = useMultiColor
    ? (componentColors?.back?.hex || structureColor)
    : structureColor;

  const drawerColor = useMultiColor
    ? (componentColors?.drawers?.hex || structureColor)
    : structureColor;

  const baseColor = useMultiColor
    ? (componentColors?.base?.hex || structureColor)
    : structureColor;

  const mainMat = useFurnitureMaterial(structureColor);
  const shelfMat = useFurnitureMaterial(shelfColor);
  const doorMat = useFurnitureMaterial(doorColor);
  const backMat = useFurnitureMaterial(backColor);
  const drawerMat = useFurnitureMaterial(drawerColor);
  const baseMat = useFurnitureMaterial(baseColor);

  // Check if any zone has a zone-specific door
  const hasZoneSpecificDoors = useMemo(() => {
    if (!rootZone) return false;

    const checkZone = (zone: Zone): boolean => {
      if (zone.type === 'leaf' && (zone.content === 'door' || zone.content === 'door_right' || zone.content === 'door_double')) {
        return true;
      }
      if (zone.children) {
        return zone.children.some(child => checkZone(child));
      }
      return false;
    };

    return checkZone(rootZone);
  }, [rootZone]);

  const elements = useMemo(() => {
    const items: React.ReactNode[] = [];
    if (!rootZone) return items;

    const parseZone = (zone: Zone, x: number, y: number, z: number, width: number, height: number) => {
      if (zone.type === 'leaf') {
        // Ajouter l'éclairage si activé
        if (zone.hasLight) {
          items.push(
            <CompartmentLight 
              key={`${zone.id}-light`} 
              width={width} 
              depth={d} 
              position={[x, y + height/2, 0]} 
            />
          );
        }

        // Ajouter le passe-câble si activé
        if (zone.hasCableHole) {
          items.push(
            <CableHole
              key={`${zone.id}-cable`}
              width={width}
              height={height}
              depth={d}
              position={[x, y, 0]}
            />
          );
        }

        // Hitbox de sélection pour toutes les zones leaf
        items.push(
          <mesh
            key={`${zone.id}-hitbox`}
            position={[x, y, 0]}
            visible={true}
            onPointerOver={(e) => {
              e.stopPropagation();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
              document.body.style.cursor = 'default';
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectZone?.(selectedZoneId === zone.id ? null : zone.id);
              // Si c'est un tiroir ou une porte, on bascule aussi l'ouverture
              if (zone.content === 'drawer' || zone.content === 'door' || zone.content === 'door_right' || zone.content === 'door_double') {
                toggleCompartment(zone.id);
              }
            }}
          >
            <boxGeometry args={[width + 0.002, height + 0.002, d + 0.002]} />
            <meshBasicMaterial 
              transparent 
              opacity={selectedZoneId === zone.id ? 0.5 : 0} 
              color="#FF9800"
              depthWrite={false}
              toneMapped={false}
            />
            {selectedZoneId === zone.id && (
              <>
                {/* Grillage (Wireframe) pour effet de sélection */}
                <mesh>
                  <boxGeometry args={[width + 0.002, height + 0.002, d + 0.002]} />
                  <meshBasicMaterial color="#FF9800" wireframe transparent opacity={0.4} toneMapped={false} />
                </mesh>
                {/* Bordures plus marquées */}
                <lineSegments>
                  <edgesGeometry args={[new THREE.BoxGeometry(width + 0.002, height + 0.002, d + 0.002)]} />
                  <lineBasicMaterial color="#FF9800" linewidth={4} toneMapped={false} />
                </lineSegments>
              </>
            )}
          </mesh>
        );

        if (zone.content === 'shelf') {
          items.push(
            <mesh key={zone.id} position={[x, y, z]} castShadow receiveShadow>
              <boxGeometry args={[width, thickness, d]} />
              <primitive object={shelfMat} attach="material" />
            </mesh>
          );
          // Ajouter des décorations sur l'étagère
          if (showDecorations) {
            items.push(
              <group key={`${zone.id}-deco`} position={[x, y + thickness/2, z]}>
                <ShelfDecoration width={width} height={height} depth={d} seed={zone.id} />
              </group>
            );
          }
        } else if (zone.content === 'drawer') {
          items.push(
            <AnimatedDrawer
              key={zone.id}
              position={[x, y, d / 2]}
              width={width}
              height={height}
              depth={d}
              hexColor={drawerColor}
              isOpen={openCompartments[zone.id]}
              onClick={() => {
                toggleCompartment(zone.id);
                onSelectZone?.(selectedZoneId === zone.id ? null : zone.id);
              }}
            />
          );
        } else if (zone.content === 'dressing') {
          items.push(
            <mesh key={zone.id} position={[x, y + height/2 - 0.05, z]} rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[0.01, 0.01, width - 0.02, 16]} />
              <meshStandardMaterial color="#aaa" metalness={0.9} />
            </mesh>
          );
        } else if (zone.content === 'door' || zone.content === 'door_right' || zone.content === 'door_double') {
          // Porte spécifique à cette zone uniquement
          const isDouble = zone.content === 'door_double';
          const isRight = zone.content === 'door_right';

          items.push(
            <group key={zone.id} position={[x, y, d/2]}>
              {(isDouble || !isRight) && (
                <AnimatedDoor
                  side="left"
                  position={[-width/2, 0, 0]}
                  width={isDouble ? width/2 : width}
                  height={height}
                  hexColor={doorColor}
                  isOpen={openCompartments[zone.id]}
                  onClick={() => {
                    toggleCompartment(zone.id);
                    onSelectZone?.(selectedZoneId === zone.id ? null : zone.id);
                  }}
                />
              )}
              {(isDouble || isRight) && (
                <AnimatedDoor
                  side="right"
                  position={[width/2, 0, 0]}
                  width={isDouble ? width/2 : width}
                  height={height}
                  hexColor={doorColor}
                  isOpen={openCompartments[zone.id]}
                  onClick={() => {
                    toggleCompartment(zone.id);
                    onSelectZone?.(selectedZoneId === zone.id ? null : zone.id);
                  }}
                />
              )}
            </group>
          );
        } else {
          // Niche vide : Ajouter des décorations au fond de la niche
          if (showDecorations) {
            items.push(
              <group key={`${zone.id}-deco`} position={[x, y - height/2 + thickness/2, z]}>
                <ShelfDecoration width={width} height={height} depth={d} seed={zone.id} />
              </group>
            );
          }
        }
      } else if (zone.children) {
        let currentPos = 0;
        zone.children.forEach((child, i) => {
          const ratio = (zone.splitRatios ? zone.splitRatios[i] : (zone.splitRatio && i === 0 ? zone.splitRatio : (zone.splitRatio && i === 1 ? 100 - zone.splitRatio : 100 / zone.children!.length))) / 100;
          
          if (zone.type === 'horizontal') {
            const childHeight = height * ratio;
            // Rendu de haut en bas pour correspondre à l'UI 2D (index 0 = haut)
            parseZone(child, x, (y + height/2) - currentPos - childHeight/2, z, width, childHeight);
            currentPos += childHeight;
            if (i < zone.children!.length - 1) {
              items.push(
                <mesh key={`${zone.id}-sep-${i}`} position={[x, (y + height/2) - currentPos, z]} castShadow receiveShadow>
                  <boxGeometry args={[width, thickness, d]} />
                  <primitive object={shelfMat} attach="material" />
                </mesh>
              );
            }
          } else {
            const childWidth = width * ratio;
            parseZone(child, x - width/2 + currentPos + childWidth/2, y, z, childWidth, height);
            currentPos += childWidth;
            if (i < zone.children!.length - 1) {
              items.push(
                <mesh key={`${zone.id}-sep-${i}`} position={[x - width/2 + currentPos, y, z]} castShadow receiveShadow>
                  <boxGeometry args={[thickness, height, d]} />
                  <primitive object={mainMat} attach="material" />
                </mesh>
              );
            }
          }
        });
      }
    };

    parseZone(rootZone, 0, sideHeight/2 + yOffset, 0, w - (thickness * 2), sideHeight - (thickness * 2));
    return items;
  }, [
    rootZone, w, sideHeight, yOffset, thickness, d,
    mainMat, shelfMat, drawerColor, doorColor, backColor, baseColor,
    openCompartments, showDecorations, selectedZoneId, onSelectZone
  ]);

  return (
    <group>
      {/* Structure */}
      <mesh position={[-w/2 + thickness/2, sideHeight/2 + yOffset, 0]} castShadow receiveShadow>
        <boxGeometry args={[thickness, sideHeight, d]} />
        <primitive object={mainMat} attach="material" />
      </mesh>
      <mesh position={[w/2 - thickness/2, sideHeight/2 + yOffset, 0]} castShadow receiveShadow>
        <boxGeometry args={[thickness, sideHeight, d]} />
        <primitive object={mainMat} attach="material" />
      </mesh>
      <mesh position={[0, h - thickness/2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, thickness, d]} />
        <primitive object={mainMat} attach="material" />
      </mesh>

      {/* Décorations sur le dessus */}
      {showDecorations && (
        <group position={[0, h, 0]}>
          {w > 0.6 && (
            <Lamp position={[w/2 - 0.2, 0, 0]} />
          )}
          {w > 0.8 && (
            <Vase position={[-w/2 + 0.3, 0, 0.05]} color="#E0E0E0" scale={1.2} seed="top-vase" />
          )}
          {w > 1.2 && (
            <Books position={[0, 0, -0.05]} count={Math.min(6, Math.floor(w * 3))} seed="top-books" />
          )}
          {w > 1.6 && (
            <Vase position={[w/2 - 0.5, 0, -0.1]} color="#BDBDBD" scale={0.9} seed="top-vase-2" />
          )}
        </group>
      )}

      <mesh position={[0, yOffset + thickness/2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, thickness, d]} />
        <primitive object={mainMat} attach="material" />
      </mesh>

      {/* Dynamic Elements */}
      {elements}

      {/* Doors with Animation - Only render if no zone-specific doors */}
      {rootZone && doorType !== 'none' && !hasZoneSpecificDoors && (
        <group position={[0, sideHeight/2 + yOffset, d/2]}>
          {(doorType === 'double' || (doorType === 'single' && doorSide === 'left')) && (
            <AnimatedDoor
              side="left"
              position={[-w/2, 0, 0]}
              width={doorType === 'double' ? w/2 : w}
              height={sideHeight}
              hexColor={doorColor}
              isOpen={doorsOpen}
              onClick={() => {
                onToggleDoors?.();
                onSelectZone?.(selectedZoneId === 'root' ? null : 'root');
              }}
            />
          )}
          {(doorType === 'double' || (doorType === 'single' && doorSide === 'right')) && (
            <AnimatedDoor
              side="right"
              position={[w/2, 0, 0]}
              width={doorType === 'double' ? w/2 : w}
              height={sideHeight}
              hexColor={doorColor}
              isOpen={doorsOpen}
              onClick={() => {
                onToggleDoors?.();
                onSelectZone?.(selectedZoneId === 'root' ? null : 'root');
              }}
            />
          )}
        </group>
      )}

      {/* Click Detector for Doors (invisible large area) - Only render if no zone-specific doors */}
      {/* We keep it as a fallback for when clicking between doors or for the root selection if doors are closed */}
      {doorType !== 'none' && !hasZoneSpecificDoors && (
        <mesh
          position={[0, sideHeight/2 + yOffset, d/2 + 0.01]}
          visible={false}
          onClick={(e) => {
            e.stopPropagation();
            onToggleDoors?.();
            onSelectZone?.(selectedZoneId === 'root' ? null : 'root');
          }}
        >
          <boxGeometry args={[w, sideHeight, 0.02]} />
        </mesh>
      )}

      {/* Socle */}
      {hasSocle && (
        <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, 0.1, d - 0.02]} />
          <primitive object={baseMat} attach="material" />
        </mesh>
      )}

      {/* Back Panel */}
      <mesh position={[0, sideHeight/2 + yOffset, -d/2 + 0.002]} receiveShadow>
        <boxGeometry args={[w - 0.01, sideHeight - 0.01, 0.004]} />
        <primitive object={backMat} attach="material" />
      </mesh>
    </group>
  );
}

function Room() {
  return (
    <group>
      {/* Sol (Parquet clair) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#E5DACE" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Tapis */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 1]} receiveShadow>
        <planeGeometry args={[4, 3]} />
        <meshStandardMaterial color="#D1D1D1" roughness={1} />
      </mesh>

      {/* Mur Arrière */}
      <mesh position={[0, 5, -2]} receiveShadow>
        <planeGeometry args={[20, 10]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
      </mesh>

      {/* Mur Gauche */}
      <mesh position={[-5, 5, 3]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.9} />
      </mesh>

      {/* Plinthe */}
      <mesh position={[0, 0.05, -1.99]}>
        <boxGeometry args={[20, 0.1, 0.02]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>

      {/* Interrupteur (Détail Tylko) */}
      <mesh position={[-4.98, 1.2, 0]}>
        <boxGeometry args={[0.02, 0.1, 0.1]} />
        <meshStandardMaterial color="#f0f0f0" />
      </mesh>

      {/* Plante décorative */}
      <group position={[-1.8, 0, -1]}>
        <mesh position={[0, 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.1, 0.3, 16]} />
          <meshStandardMaterial color="#444444" />
        </mesh>
        {Array.from({ length: 12 }).map((_, i) => (
          <mesh 
            key={i} 
            position={[0, 0.5, 0]} 
            rotation={[Math.random() * 0.8, i * Math.PI/6, Math.random() * 0.8]}
            castShadow
          >
            <capsuleGeometry args={[0.03, 0.6, 4, 8]} />
            <meshStandardMaterial color="#2D5A27" roughness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Cadre au mur */}
      <mesh position={[-2.5, 2.2, -1.98]}>
        <boxGeometry args={[0.8, 1.2, 0.02]} />
        <meshStandardMaterial color="#111111" />
      </mesh>
    </group>
  );
}

function HumanSilhouette() {
  const texture = useTexture('/images/human-silhouette.png');

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

// --- Composants de Décoration ---

function Book({ position, color, rotation = [0, 0, 0] }: any) {
  return (
    <group position={position} rotation={rotation}>
      {/* Couverture (Dos + Plats) */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.03, 0.22, 0.16]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Tranches (Pages) - Visibles sur 3 côtés */}
      <mesh position={[0.002, 0, 0.002]}>
        <boxGeometry args={[0.027, 0.21, 0.155]} />
        <meshStandardMaterial color="#FCF9F2" roughness={1} />
      </mesh>
      {/* Détail sur le dos (titre simulé) */}
      <mesh position={[-0.016, 0, 0]}>
        <boxGeometry args={[0.001, 0.14, 0.1]} />
        <meshStandardMaterial color="#FFF" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

function Books({ position, count = 5, seed = "1" }: any) {
  const colors = ['#4A6274', '#7B8C7C', '#A89F91', '#5E524D', '#3F4E4F', '#2C3E50', '#8E44AD', '#2980B9', '#C0392B', '#16A085'];
  const books = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    const startColor = Math.abs(hash);

    return Array.from({ length: count }).map((_, i) => {
      const s = Math.abs(hash + i);
      const isLast = i === count - 1;
      const tilt = isLast && count > 1 ? (Math.PI * 0.08) : ((s % 10) - 5) * 0.005;
      return {
        color: colors[(startColor + i) % colors.length],
        offset: i * 0.036,
        tilt: tilt,
        depthOffset: ((s % 7) - 3) * 0.005
      };
    });
  }, [count, seed]);

  return (
    <group position={position}>
      {books.map((b, i) => (
        <Book 
          key={i} 
          position={[b.offset, 0.11, b.depthOffset]} 
          color={b.color} 
          rotation={[0, 0, b.tilt]} 
        />
      ))}
    </group>
  );
}

function Flower({ position, color = "#E91E63", seed = "1" }: any) {
  const stemPoints = useMemo(() => {
    const points = [];
    const h = 0.15;
    const segments = 8;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      // Ajout d'une légère courbure sinusoïdale
      const x = Math.sin(t * Math.PI) * 0.01;
      const z = Math.cos(t * Math.PI) * 0.005;
      points.push(new THREE.Vector3(x, t * h, z));
    }
    return points;
  }, []);

  const stemCurve = useMemo(() => new THREE.CatmullRomCurve3(stemPoints), [stemPoints]);

  return (
    <group position={position}>
      {/* Tige */}
      <mesh castShadow>
        <tubeGeometry args={[stemCurve, 12, 0.003, 8, false]} />
        <meshStandardMaterial color="#2D5A27" />
      </mesh>
      
      {/* Feuilles sur la tige */}
      <group position={[0.01, 0.06, 0]} rotation={[0.5, 0, 1.2]}>
        <mesh castShadow>
          <sphereGeometry args={[0.01, 12, 12]} />
          <meshStandardMaterial color="#388E3C" roughness={0.8} />
          <group scale={[2.5, 0.15, 0.8]}>
            <mesh>
              <sphereGeometry args={[0.01, 12, 12]} />
              <meshStandardMaterial color="#388E3C" roughness={0.8} />
            </mesh>
          </group>
        </mesh>
      </group>

      <group position={[-0.01, 0.09, 0]} rotation={[-0.5, 0, -1.2]}>
        <mesh castShadow>
          <sphereGeometry args={[0.01, 12, 12]} />
          <meshStandardMaterial color="#388E3C" roughness={0.8} />
          <group scale={[2, 0.15, 0.7]}>
            <mesh>
              <sphereGeometry args={[0.01, 12, 12]} />
              <meshStandardMaterial color="#388E3C" roughness={0.8} />
            </mesh>
          </group>
        </mesh>
      </group>

      {/* Fleur principale (plus détaillée) */}
      <group position={stemPoints[stemPoints.length - 1]}>
        {/* Cœur de la fleur */}
        <mesh castShadow>
          <sphereGeometry args={[0.014, 16, 16]} />
          <meshStandardMaterial color="#FFD54F" roughness={0.8} />
        </mesh>

        {/* Pétales (Double rangée pour plus de volume) */}
        {Array.from({ length: 8 }).map((_, i) => (
          <group key={`p1-${i}`} rotation={[0, (i * Math.PI * 2) / 8, 0.4]}>
            <mesh position={[0.03, 0, 0]} scale={[1.5, 0.1, 0.6]} castShadow>
              <sphereGeometry args={[0.025, 16, 16]} />
              <meshStandardMaterial color={color} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <group key={`p2-${i}`} rotation={[0, (i * Math.PI * 2) / 5 + 0.3, 0.8]}>
            <mesh position={[0.02, 0.01, 0]} scale={[1, 0.1, 0.5]} castShadow>
              <sphereGeometry args={[0.02, 16, 16]} />
              <meshStandardMaterial color={color} roughness={0.7} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function Vase({ position, color, scale = 1, seed = "1" }: any) {
  const shapeIndex = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 3;
  }, [seed]);

  const points = useMemo(() => {
    const shapes = [
      // Classique
      [[0, 0], [0.06, 0.01], [0.08, 0.08], [0.05, 0.18], [0.04, 0.22], [0.06, 0.25]],
      // Élancé
      [[0, 0], [0.05, 0.01], [0.04, 0.1], [0.06, 0.2], [0.03, 0.25], [0.035, 0.28]],
      // Boule
      [[0, 0], [0.04, 0.01], [0.1, 0.1], [0.1, 0.15], [0.03, 0.22], [0.04, 0.24]]
    ];
    return shapes[shapeIndex].map(p => new THREE.Vector2(p[0], p[1]));
  }, [shapeIndex]);

  const height = useMemo(() => {
    const lastPoint = points[points.length - 1];
    return lastPoint.y;
  }, [points]);

  const flowerColors = ['#E91E63', '#F06292', '#BA68C8', '#9575CD', '#FFAB91', '#FF8A65'];
  const hash = useMemo(() => {
    return seed.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0);
  }, [seed]);

  return (
    <group position={position} scale={scale}>
      <mesh castShadow receiveShadow>
        <latheGeometry args={[points, 32]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.3} />
      </mesh>
      
      {/* Bouquet de fleurs plus dense et varié */}
      <Flower 
        position={[0, height - 0.02, 0]} 
        color={flowerColors[hash % flowerColors.length]} 
        seed={seed} 
      />
      {shapeIndex === 2 && ( // Vase boule : bouquet complet
        <>
          <group rotation={[0, 0, 0.35]}>
            <Flower 
              position={[0.02, height - 0.04, 0.02]} 
              color={flowerColors[(hash + 1) % flowerColors.length]} 
              seed={seed + "_f2"} 
            />
          </group>
          <group rotation={[0, 0, -0.35]}>
            <Flower 
              position={[-0.02, height - 0.04, -0.02]} 
              color={flowerColors[(hash + 2) % flowerColors.length]} 
              seed={seed + "_f3"} 
            />
          </group>
        </>
      )}
      {shapeIndex === 1 && ( // Vase élancé : deux fleurs décalées
        <group rotation={[0.2, 0, 0.1]}>
          <Flower 
            position={[0.01, height - 0.05, 0]} 
            color={flowerColors[(hash + 3) % flowerColors.length]} 
            seed={seed + "_f4"} 
          />
        </group>
      )}
    </group>
  );
}

function Lamp({ position }: any) {
  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.01, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.02, 24]} />
        <meshStandardMaterial color="#222" metalness={0.8} />
      </mesh>
      {/* Tige */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.01, 0.01, 0.4, 12]} />
        <meshStandardMaterial color="#222" metalness={0.8} />
      </mesh>
      {/* Abat-jour */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 0.2, 24, 1, true]} />
        <meshStandardMaterial color="#F5F5F5" side={THREE.DoubleSide} />
      </mesh>
      {/* Ampoule (physique + lumière) */}
      <mesh position={[0, 0.38, 0]}>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshStandardMaterial color="#FFF5E1" emissive="#FFF5E1" emissiveIntensity={0.5} />
      </mesh>
      <pointLight position={[0, 0.38, 0]} intensity={0.4} color="#FFF5E1" />
    </group>
  );
}

function CompartmentLight({ width, depth, position }: any) {
  return (
    <group position={position}>
      {/* Ruban LED physique */}
      <mesh position={[0, -0.005, depth / 4]}>
        <boxGeometry args={[width * 0.9, 0.01, 0.01]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} />
      </mesh>
      {/* Lumière d'ambiance */}
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

function CableHole({ width, height, depth, position }: any) {
  return (
    <group position={position}>
      {/* Cercle noir pour simuler le trou dans le fond */}
      <mesh position={[0, 0, -depth / 2 + 0.005]}>
        <circleGeometry args={[0.03, 32]} />
        <meshStandardMaterial color="#111" roughness={1} />
      </mesh>
      {/* Bordure du passe-câble (plastique noir) */}
      <mesh position={[0, 0, -depth / 2 + 0.006]}>
        <torusGeometry args={[0.03, 0.005, 16, 32]} />
        <meshStandardMaterial color="#222" roughness={0.5} />
      </mesh>
    </group>
  );
}

function ModernSculpture({ color }: { color: string }) {
  return (
    <group>
      {/* Socle de la sculpture */}
      <mesh position={[0, 0.005, 0]} castShadow>
        <boxGeometry args={[0.07, 0.01, 0.07]} />
        <meshStandardMaterial color="#1A1917" roughness={0.5} />
      </mesh>
      {/* Sculpture abstraite minimaliste (évite le simple cercle) */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <octahedronGeometry args={[0.035, 0]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.1, 0]} castShadow>
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 4, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.01, 0.12, 0.01]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

function DecorObject({ position, type = 'sphere', color = '#D4AF37' }: any) {
  return (
    <group position={position}>
      {type === 'sphere' ? (
        <mesh castShadow>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.2} />
        </mesh>
      ) : (
        <ModernSculpture color={color} />
      )}
    </group>
  );
}

function ShelfDecoration({ width, height, depth, seed }: { width: number, height: number, depth: number, seed: string }) {
  // Utiliser le seed pour avoir des décos stables par zone
  const decoType = useMemo(() => {
    // Hash simple du seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    const s = Math.abs(hash);

    if (width < 0.15 || depth < 0.15 || height < 0.15) return null; // Trop petit pour quoi que ce soit
    
    const types = [];
    if (width > 0.6) types.push('books_vase_sculpture');
    if (width > 0.45) types.push('books_vase');
    if (width > 0.35) types.push('vase_sculpture');
    if (width > 0.25) types.push('books');
    types.push('vase');
    types.push('sculpture');
    
    return types[s % types.length];
  }, [seed, width, height, depth]);

  if (!decoType) return null;

  const vaseColors = ['#90A4AE', '#A1887F', '#8D6E63', '#78909C', '#BDBDBD', '#E0E0E0', '#B0BEC5', '#D7CCC8'];
  const objColors = ['#D4AF37', '#C0C0C0', '#CD7F32', '#444', '#263238'];
  const hash = seed.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

  // Calcul du facteur d'échelle basé sur la hauteur du compartiment
  // Hauteur naturelle estimée : Vase+Fleur ~0.42m, Livres ~0.22m, Sculpture ~0.15m
  const margin = 0.04; // 4cm de marge en haut
  const availableHeight = height - margin;
  
  const vaseScale = Math.min(1.1, availableHeight / 0.42, width * 2);
  const booksScale = Math.min(1.0, availableHeight / 0.22);
  const sculptureScale = Math.min(1.0, availableHeight / 0.15);

  return (
    <group position={[0, 0, 0]}>
      {decoType === 'books' && (
        <group scale={booksScale}>
          <Books position={[-width / 4, 0, -depth / 6]} count={Math.min(10, Math.floor(width * 15))} />
        </group>
      )}
      {decoType === 'vase' && (
        <Vase 
          position={[0, 0, 0]} 
          color={vaseColors[hash % vaseColors.length]} 
          seed={seed}
          scale={vaseScale}
        />
      )}
      {decoType === 'books_vase' && (
        <>
          <group scale={booksScale}>
            <Books position={[-width / 3, 0, -depth / 6]} count={Math.max(2, Math.floor(width * 6))} />
          </group>
          <Vase 
            position={[width / 4, 0, depth / 10]} 
            color={vaseColors[hash % vaseColors.length]} 
            seed={seed + "_v"}
            scale={Math.min(0.8, vaseScale)} 
          />
        </>
      )}
      {decoType === 'books_vase_sculpture' && (
        <>
          <group scale={booksScale}>
            <Books position={[-width / 2.5, 0, -depth / 8]} count={3} />
          </group>
          <Vase 
            position={[0, 0, depth / 10]} 
            color={vaseColors[hash % vaseColors.length]} 
            seed={seed + "_v"}
            scale={Math.min(0.7, vaseScale)} 
          />
          <group scale={sculptureScale}>
            <DecorObject 
              position={[width / 3, 0.04, -depth / 10]} 
              type={hash % 2 === 0 ? 'sphere' : 'sculpture'}
              color={objColors[hash % objColors.length]}
            />
          </group>
        </>
      )}
      {decoType === 'vase_sculpture' && (
        <>
          <Vase 
            position={[-width / 6, 0, -depth / 10]} 
            color={vaseColors[(hash + 1) % vaseColors.length]} 
            seed={seed + "_v2"}
            scale={Math.min(0.9, vaseScale)}
          />
          <group scale={sculptureScale}>
            <DecorObject 
              position={[width / 6, 0.05, depth / 10]} 
              type={hash % 2 === 0 ? 'sphere' : 'sculpture'}
              color={objColors[hash % objColors.length]}
            />
          </group>
        </>
      )}
      {decoType === 'sculpture' && (
        <group scale={sculptureScale}>
          <DecorObject 
            position={[0, 0.05, 0]} 
            type={hash % 3 === 0 ? 'sculpture' : 'sphere'} 
            color={objColors[hash % objColors.length]}
          />
        </group>
      )}
    </group>
  );
}

export default function ThreeCanvas(props: ThreeViewerProps) {
  const { onSelectZone } = props;

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px', background: '#FAFAF9', position: 'relative' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [4, 2.5, 5], fov: 35 }}
        onPointerMissed={() => onSelectZone?.(null)}
        onCreated={({ gl }) => {
          gl.setClearColor('#FAFAF9');
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
        }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      >
        <OrbitControls
          enableDamping
          minDistance={1.5}
          maxDistance={10}
          maxPolarAngle={Math.PI / 2 - 0.05}
          target={[0, 0.8, 0]}
        />
        <ambientLight intensity={0.4} />
        <hemisphereLight intensity={0.5} groundColor="#ffffff" color="#ffffff" />
        <pointLight position={[10, 10, 10]} intensity={1.0} />
        <directionalLight 
          position={[-5, 8, 5]} 
          intensity={1.0} 
          castShadow 
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
          shadow-bias={-0.0001}
        />

        <Suspense fallback={null}>
          <Room />
          <Furniture {...props} />
          <HumanSilhouette />
          <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={15} blur={2.5} far={1.5} />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}

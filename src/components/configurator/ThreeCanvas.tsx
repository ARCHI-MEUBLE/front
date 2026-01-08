import React, { Suspense, useMemo, useRef, useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
// On retire useFrame de l'import react-three/fiber
import { Canvas, useThree, RootState } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Float, useTexture } from '@react-three/drei';
import * as THREE from 'three';

import { Zone } from './ZoneEditor/types';
import { ComponentColors } from './MaterialSelector';
import type { ThreeCanvasHandle } from './types';

export type { ThreeCanvasHandle };

// --- Hooks Utilitaires ---

// On supprime useAnimationFrame car il causait des erreurs de contexte R3F
// Les composants utilisent maintenant requestAnimationFrame directement dans useEffect

interface ThreeViewerProps {
  width: number;
  height: number;
  depth: number;
  color: string;
  imageUrl?: string | null;
  hasSocle: boolean;
  socle?: string;
  rootZone: Zone | null;
  selectedZoneIds?: string[];
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

// Couleur par défaut (beige/bois naturel)
const DEFAULT_MATERIAL_COLOR = '#D8C7A1';

// Fonction utilitaire pour obtenir une couleur valide
function getSafeColor(hexColor: string | null | undefined): string {
  if (hexColor && hexColor !== '' && hexColor !== 'null' && hexColor !== 'undefined' && hexColor.startsWith('#')) {
    return hexColor;
  }
  return DEFAULT_MATERIAL_COLOR;
}

// Composant pour un matériau avec support de texture
function TexturedMaterial({ hexColor, imageUrl }: { hexColor: string; imageUrl?: string | null }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const textureRef = useRef<THREE.Texture | null>(null);
  const currentImageUrlRef = useRef<string | null>(null);

  // Couleur de fallback - calculée de manière synchrone à chaque render
  const safeColor = getSafeColor(hexColor);

  useEffect(() => {
    // Si pas d'URL d'image, utiliser la couleur hex
    if (!imageUrl) {
      // Dispose de la texture précédente si elle existe
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      setTexture(null);
      currentImageUrlRef.current = null;
      return;
    }

    // Si c'est la même URL, ne pas recharger
    if (currentImageUrlRef.current === imageUrl && textureRef.current) {
      return;
    }

    currentImageUrlRef.current = imageUrl;

    const loader = new THREE.TextureLoader();
    loader.load(
      imageUrl,
      (loadedTexture) => {
        // Vérifier que l'URL n'a pas changé pendant le chargement
        if (currentImageUrlRef.current !== imageUrl) {
          loadedTexture.dispose();
          return;
        }

        // Dispose de l'ancienne texture
        if (textureRef.current) {
          textureRef.current.dispose();
        }

        loadedTexture.wrapS = loadedTexture.wrapT = THREE.RepeatWrapping;
        loadedTexture.repeat.set(2, 2);
        textureRef.current = loadedTexture;
        setTexture(loadedTexture);
      },
      undefined,
      () => {
        console.warn('Failed to load texture:', imageUrl);
        if (currentImageUrlRef.current === imageUrl) {
          setTexture(null);
        }
      }
    );

    return () => {
      // Cleanup seulement si on démonte le composant
    };
  }, [imageUrl]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
    };
  }, []);

  // Utiliser une clé unique pour forcer React à recréer le matériau proprement
  // quand la couleur ou la texture change
  const materialKey = texture ? `tex-${currentImageUrlRef.current}` : `col-${safeColor}`;

  // Si on a une texture chargée, l'utiliser
  if (texture) {
    return (
      <meshStandardMaterial
        key={materialKey}
        attach="material"
        map={texture}
        color="#ffffff"
        roughness={0.7}
        metalness={0.1}
      />
    );
  }

  // Sinon utiliser la couleur hex (pendant le chargement ou en fallback)
  return (
    <meshStandardMaterial
      key={materialKey}
      attach="material"
      color={safeColor}
      roughness={0.4}
      metalness={0.1}
    />
  );
}

// Composant pour rendre différents types de poignées
function Handle({ type = 'vertical_bar', position, side, height, width }: { type?: string; position: [number, number, number]; side: string; height: number; width?: number }) {
  const handleMaterial = <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />;

  if (type === 'horizontal_bar') {
    // Barre horizontale (utilise width si disponible, sinon height)
    const barLength = width ? Math.min(width * 0.4, 0.5) : Math.min(height * 0.4, 0.3);
    return (
      <mesh position={position} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.008, 0.008, barLength, 12]} />
        {handleMaterial}
      </mesh>
    );
  } else if (type === 'knob') {
    // Bouton rond
    return (
      <mesh position={position}>
        <sphereGeometry args={[0.02, 16, 16]} />
        {handleMaterial}
      </mesh>
    );
  } else if (type === 'recessed') {
    // Poignée encastrée (encoche)
    return (
      <group position={position}>
        <mesh>
          <boxGeometry args={[0.08, 0.025, 0.015]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.6} />
        </mesh>
      </group>
    );
  } else {
    // Barre verticale (défaut)
    return (
      <mesh position={position}>
        <cylinderGeometry args={[0.008, 0.008, Math.min(height * 0.25, 0.4), 12]} />
        {handleMaterial}
      </mesh>
    );
  }
}

// --- Composants Animés (Utilisant requestAnimationFrame manuel pour plus de robustesse) ---

function AnimatedDoor({ position, width, height, hexColor, imageUrl, side, isOpen, onClick, handleType }: any) {
  const groupRef = useRef<THREE.Group>(null);
  // Réduire l'angle d'ouverture à 70° (0.39 * PI) pour éviter les collisions entre portes adjacentes
  const targetRot = isOpen ? (side === 'left' ? -Math.PI * 0.39 : Math.PI * 0.39) : 0;

  // S'assurer que la couleur est valide
  const safeHexColor = getSafeColor(hexColor);

  useEffect(() => {
    let animationFrameId: number;
    
    const animate = () => {
      if (groupRef.current) {
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot, 0.1);
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetRot]);

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
        <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
      </mesh>
      {/* Poignée */}
      <Handle
        type={handleType || 'vertical_bar'}
        position={[side === 'left' ? width - 0.04 : -width + 0.04, 0, 0.02]}
        side={side}
        height={height}
      />
    </group>
  );
}

function AnimatedMirrorDoor({ position, width, height, side, isOpen, onClick, handleType }: any) {
  const groupRef = useRef<THREE.Group>(null);
  // Réduire l'angle d'ouverture à 70° (0.39 * PI) pour éviter les collisions entre portes adjacentes
  const targetRot = isOpen ? (side === 'left' ? -Math.PI * 0.39 : Math.PI * 0.39) : 0;

  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      if (groupRef.current) {
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot, 0.1);
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetRot]);

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
      {/* Porte avec effet vitré */}
      <mesh position={[side === 'left' ? width/2 : -width/2, 0, 0.01]} castShadow>
        <boxGeometry args={[width - 0.005, height - 0.01, 0.018]} />
        <meshStandardMaterial
          color="#A5D8FF"
          transparent={true}
          opacity={0.4}
          metalness={0.9}
          roughness={0.1}
          envMapIntensity={2}
        />
      </mesh>
      {/* Poignée */}
      <Handle
        type={handleType || 'vertical_bar'}
        position={[side === 'left' ? width - 0.04 : -width + 0.04, 0, 0.02]}
        side={side}
        height={height}
      />
    </group>
  );
}

function AnimatedPushDoor({ position, width, height, hexColor, imageUrl, side, isOpen, onClick }: any) {
  const groupRef = useRef<THREE.Group>(null);
  // Réduire l'angle d'ouverture à 70° (0.39 * PI) pour éviter les collisions entre portes adjacentes
  const targetRot = isOpen ? (side === 'left' ? -Math.PI * 0.39 : Math.PI * 0.39) : 0;

  // S'assurer que la couleur est valide
  const safeHexColor = getSafeColor(hexColor);

  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      if (groupRef.current) {
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRot, 0.1);
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetRot]);

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
        <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
      </mesh>
      {/* Petite encoche discrète pour indiquer push-to-open */}
      <mesh position={[side === 'left' ? width - 0.08 : -width + 0.08, 0, 0.015]}>
        <cylinderGeometry args={[0.012, 0.012, 0.003, 16]} />
        <meshStandardMaterial color="#333" metalness={0.3} roughness={0.7} />
      </mesh>
    </group>
  );
}

function AnimatedPushDrawer({ position, width, height, depth, hexColor, imageUrl, isOpen, onClick }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const initialZ = position[2];
  const targetZ = isOpen ? initialZ + depth * 0.6 : initialZ;

  // S'assurer que la couleur est valide
  const safeHexColor = getSafeColor(hexColor);

  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      if (groupRef.current) {
        groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.1);
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetZ]);

  const boxDepth = depth * 0.8;
  const boxHeight = height * 0.8;

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
      {/* Façade sans poignée */}
      <mesh castShadow>
        <boxGeometry args={[width - 0.01, height - 0.01, 0.02]} />
        <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
      </mesh>
      {/* Petite encoche discrète pour indiquer push-to-open */}
      <mesh position={[0, -height * 0.3, 0.015]}>
        <cylinderGeometry args={[0.012, 0.012, 0.003, 16]} />
        <meshStandardMaterial color="#333" metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Corps du tiroir (visible quand ouvert) */}
      <mesh position={[0, 0, -boxDepth / 2]}>
        <boxGeometry args={[width - 0.02, boxHeight, boxDepth]} />
        <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
      </mesh>
    </group>
  );
}

function AnimatedDrawer({ position, width, height, depth, hexColor, imageUrl, isOpen, onClick, handleType }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const initialZ = position[2];
  const targetZ = isOpen ? initialZ + depth * 0.6 : initialZ;

  // S'assurer que la couleur est valide
  const safeHexColor = getSafeColor(hexColor);

  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      if (groupRef.current) {
        groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.1);
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetZ]);

  const boxDepth = depth * 0.8;
  const boxHeight = height * 0.8;

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
        <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
      </mesh>
      {/* Poignée */}
      <Handle
        type={handleType || 'horizontal_bar'}
        position={[0, 0, 0.015]}
        side="center"
        height={height}
        width={width}
      />
      {/* Fond du tiroir */}
      <mesh position={[0, -height / 2 + 0.05, -boxDepth / 2]} receiveShadow>
        <boxGeometry args={[width - 0.06, 0.01, boxDepth]} />
        <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
      </mesh>
      {/* Côtés du tiroir */}
      <mesh position={[-width / 2 + 0.03, -height / 2 + 0.05 + boxHeight / 2, -boxDepth / 2]} castShadow>
        <boxGeometry args={[0.012, boxHeight, boxDepth]} />
        <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
      </mesh>
      <mesh position={[width / 2 - 0.03, -height / 2 + 0.05 + boxHeight / 2, -boxDepth / 2]} castShadow>
        <boxGeometry args={[0.012, boxHeight, boxDepth]} />
        <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
      </mesh>
      {/* Arrière du tiroir */}
      <mesh position={[0, -height / 2 + 0.05 + boxHeight / 2, -boxDepth]} castShadow>
        <boxGeometry args={[width - 0.06, boxHeight, 0.012]} />
        <TexturedMaterial hexColor={safeHexColor} imageUrl={imageUrl} />
      </mesh>
    </group>
  );
}

function Furniture({ 
  width, height, depth, color, imageUrl, hasSocle, socle, rootZone, isBuffet, 
  doorsOpen, showDecorations, onToggleDoors, componentColors,
  doorType = 'none',
  doorSide = 'left',
  useMultiColor = false,
  selectedZoneIds = [],
  onSelectZone
}: ThreeViewerProps) {
  const [openCompartments, setOpenCompartments] = useState<Record<string, boolean>>({});

  // Synchronisation avec l'état global doorsOpen
  useEffect(() => {
    if (rootZone) {
      const newOpenStates: Record<string, boolean> = {};
      const applyOpenState = (zone: Zone) => {
        if (zone.type === 'leaf' && (zone.content === 'drawer' || zone.content === 'push_drawer' || zone.content === 'door' || zone.content === 'door_right' || zone.content === 'door_double' || zone.content === 'push_door')) {
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

  const toggleCompartment = useCallback((id: string) => {
    setOpenCompartments(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);
  const { w, h, d, sideHeight, yOffset, thickness, compartmentGap } = useMemo(() => {
    const w = (width || 1500) / 1000;
    const h = (height || 730) / 1000;
    const d = (depth || 500) / 1000;
    const thickness = 0.019;
    const sideHeight = hasSocle ? h - 0.1 : h;
    const yOffset = hasSocle ? 0.1 : 0;
    // Gap pour éviter les collisions entre compartiments adjacents
    const compartmentGap = 0.020; // 20mm d'espace entre les éléments mobiles (portes, tiroirs)
    return { w, h, d, sideHeight, yOffset, thickness, compartmentGap };
  }, [width, height, depth, hasSocle]);

  // Couleur par défaut
  const DEFAULT_COLOR = '#D8C7A1';

  // Couleur de base (structure) - utilisée comme fallback pour tout
  const baseStructureColor = color || DEFAULT_COLOR;
  const baseStructureImageUrl = imageUrl || null;

  // Calcul des couleurs finales - simplifié et robuste
  const finalStructureColor = useMemo(() => {
    if (!useMultiColor) return baseStructureColor;
    const hex = componentColors?.structure?.hex;
    return (hex && hex !== '') ? hex : baseStructureColor;
  }, [useMultiColor, componentColors?.structure?.hex, baseStructureColor]);

  const finalStructureImageUrl = useMemo(() => {
    if (!useMultiColor) return baseStructureImageUrl;
    return componentColors?.structure?.imageUrl ?? baseStructureImageUrl;
  }, [useMultiColor, componentColors?.structure?.imageUrl, baseStructureImageUrl]);

  const finalShelfColor = useMemo(() => {
    if (!useMultiColor) return baseStructureColor;
    const hex = componentColors?.shelves?.hex;
    return (hex && hex !== '') ? hex : finalStructureColor;
  }, [useMultiColor, componentColors?.shelves?.hex, baseStructureColor, finalStructureColor]);

  const finalShelfImageUrl = useMemo(() => {
    if (!useMultiColor) return baseStructureImageUrl;
    return componentColors?.shelves?.imageUrl ?? finalStructureImageUrl;
  }, [useMultiColor, componentColors?.shelves?.imageUrl, baseStructureImageUrl, finalStructureImageUrl]);

  const finalDoorColor = useMemo(() => {
    if (!useMultiColor) return baseStructureColor;
    const hex = componentColors?.doors?.hex;
    return (hex && hex !== '') ? hex : finalStructureColor;
  }, [useMultiColor, componentColors?.doors?.hex, baseStructureColor, finalStructureColor]);

  const finalDoorImageUrl = useMemo(() => {
    if (!useMultiColor) return baseStructureImageUrl;
    return componentColors?.doors?.imageUrl ?? finalStructureImageUrl;
  }, [useMultiColor, componentColors?.doors?.imageUrl, baseStructureImageUrl, finalStructureImageUrl]);

  const finalBackColor = useMemo(() => {
    if (!useMultiColor) return baseStructureColor;
    const hex = componentColors?.back?.hex;
    return (hex && hex !== '') ? hex : finalStructureColor;
  }, [useMultiColor, componentColors?.back?.hex, baseStructureColor, finalStructureColor]);

  const finalBackImageUrl = useMemo(() => {
    if (!useMultiColor) return baseStructureImageUrl;
    return componentColors?.back?.imageUrl ?? finalStructureImageUrl;
  }, [useMultiColor, componentColors?.back?.imageUrl, baseStructureImageUrl, finalStructureImageUrl]);

  const finalDrawerColor = useMemo(() => {
    if (!useMultiColor) return baseStructureColor;
    const hex = componentColors?.drawers?.hex;
    return (hex && hex !== '') ? hex : finalStructureColor;
  }, [useMultiColor, componentColors?.drawers?.hex, baseStructureColor, finalStructureColor]);

  const finalDrawerImageUrl = useMemo(() => {
    if (!useMultiColor) return baseStructureImageUrl;
    return componentColors?.drawers?.imageUrl ?? finalStructureImageUrl;
  }, [useMultiColor, componentColors?.drawers?.imageUrl, baseStructureImageUrl, finalStructureImageUrl]);

  const finalBaseColor = useMemo(() => {
    if (!useMultiColor) return baseStructureColor;
    const hex = componentColors?.base?.hex;
    return (hex && hex !== '') ? hex : finalStructureColor;
  }, [useMultiColor, componentColors?.base?.hex, baseStructureColor, finalStructureColor]);

  const finalBaseImageUrl = useMemo(() => {
    if (!useMultiColor) return baseStructureImageUrl;
    return componentColors?.base?.imageUrl ?? finalStructureImageUrl;
  }, [useMultiColor, componentColors?.base?.imageUrl, baseStructureImageUrl, finalStructureImageUrl]);

  const separatorColor = finalStructureColor;
  const separatorImageUrl = finalStructureImageUrl;

  // Check if any zone has a zone-specific door
  const hasZoneSpecificDoors = useMemo(() => {
    if (!rootZone) return false;

    const checkZone = (zone: Zone): boolean => {
      if (zone.type === 'leaf' && (zone.content === 'door' || zone.content === 'door_right' || zone.content === 'door_double' || zone.content === 'push_door')) {
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

    // Debug: afficher la rootZone reçue
    // console.log('🎨 ThreeCanvas - rootZone reçue:', JSON.stringify(rootZone, null, 2));
    // console.log('🎨 ThreeCanvas - rootZone.type:', rootZone.type);
    // console.log('🎨 ThreeCanvas - rootZone.children:', rootZone.children?.length || 0, 'enfants');

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
              // On appelle onSelectZone avec l'id de la zone.
              onSelectZone?.(zone.id);
              
              // On bascule l'ouverture si c'est un compartiment mobile
              if (zone.content === 'drawer' || zone.content === 'push_drawer' || zone.content === 'door' || zone.content === 'door_right' || zone.content === 'door_double' || zone.content === 'push_door' || zone.content === 'mirror_door') {
                toggleCompartment(zone.id);
              }
            }}
          >
            <boxGeometry args={[width + 0.002, height + 0.002, d + 0.002]} />
            <meshBasicMaterial 
              transparent 
              opacity={selectedZoneIds.includes(zone.id) ? 0.5 : 0.01} 
              color="#FF9800"
              depthWrite={false}
              toneMapped={false}
            />
            {selectedZoneIds.includes(zone.id) && (
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
              <TexturedMaterial hexColor={finalShelfColor} imageUrl={finalShelfImageUrl} />
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
          // Utiliser la couleur spécifique de la zone si disponible
          const drawerHexColor = zone.zoneColor?.hex || finalDrawerColor;
          const drawerImageUrl = zone.zoneColor?.imageUrl !== undefined ? zone.zoneColor.imageUrl : finalDrawerImageUrl;
          items.push(
            <AnimatedDrawer
              key={zone.id}
              position={[x, y, d / 2]}
              width={width - compartmentGap}
              height={height - compartmentGap}
              depth={d}
              hexColor={drawerHexColor}
              imageUrl={drawerImageUrl}
              handleType={zone.handleType}
              isOpen={openCompartments[zone.id]}
              onClick={(e: any) => {
                e.stopPropagation();
                onSelectZone?.(zone.id);
                toggleCompartment(zone.id);
              }}
            />
          );
        } else if (zone.content === 'push_drawer') {
          // Tiroir push-to-open sans poignée - utiliser la couleur spécifique de la zone si disponible
          const drawerHexColor = zone.zoneColor?.hex || finalDrawerColor;
          const drawerImageUrl = zone.zoneColor?.imageUrl !== undefined ? zone.zoneColor.imageUrl : finalDrawerImageUrl;
          items.push(
            <AnimatedPushDrawer
              key={zone.id}
              position={[x, y, d / 2]}
              width={width - compartmentGap}
              height={height - compartmentGap}
              depth={d}
              hexColor={drawerHexColor}
              imageUrl={drawerImageUrl}
              isOpen={openCompartments[zone.id]}
              onClick={(e: any) => {
                e.stopPropagation();
                onSelectZone?.(zone.id);
                toggleCompartment(zone.id);
              }}
            />
          );
        }

        // Rendu de la penderie (Dressing) - Indépendant du contenu principal
        if (zone.hasDressing || zone.content === 'dressing') {
          items.push(
            <mesh key={`${zone.id}-dressing`} position={[x, y + height / 2 - 0.05, z]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.01, 0.01, width - 0.02, 16]} />
              <meshStandardMaterial color="#aaa" metalness={0.9} />
            </mesh>
          );
        }

        // Rendu des portes (Indépendant du type de zone : feuille ou parent)
        const doorToRender = zone.doorContent || (zone.type === 'leaf' && (zone.content === 'door' || zone.content === 'door_right' || zone.content === 'door_double' || zone.content === 'push_door' || zone.content === 'mirror_door') ? zone.content : null);

        if (doorToRender) {
          const isDouble = doorToRender === 'door_double';
          const isRight = doorToRender === 'door_right';
          const isPush = doorToRender === 'push_door';
          const isMirror = doorToRender === 'mirror_door';
          
          const doorHexColor = zone.zoneColor?.hex || finalDoorColor;
          const doorImageUrl = zone.zoneColor?.imageUrl !== undefined ? zone.zoneColor.imageUrl : finalDoorImageUrl;

          if (isMirror) {
            items.push(
              <group key={`${zone.id}-door`} position={[x, y, d/2]}>
                <AnimatedMirrorDoor
                  side="left"
                  position={[-width/2 + compartmentGap/2, 0, 0]}
                  width={width - compartmentGap}
                  height={height - compartmentGap}
                  handleType={zone.handleType}
                  isOpen={openCompartments[zone.id]}
                  onClick={() => {
                    toggleCompartment(zone.id);
                    onSelectZone?.(selectedZoneIds.includes(zone.id) ? null : zone.id);
                  }}
                />
              </group>
            );
          } else if (isPush) {
            items.push(
              <group key={`${zone.id}-door`} position={[x, y, d/2]}>
                <AnimatedPushDoor
                  side="left"
                  position={[-width/2 + compartmentGap/2, 0, 0]}
                  width={width - compartmentGap}
                  height={height - compartmentGap}
                  hexColor={doorHexColor}
                  imageUrl={doorImageUrl}
                  isOpen={openCompartments[zone.id]}
                  onClick={(e: any) => {
                    e.stopPropagation();
                    onSelectZone?.(zone.id);
                    toggleCompartment(zone.id);
                  }}
                />
              </group>
            );
          } else {
            items.push(
              <group key={`${zone.id}-door`} position={[x, y, d/2]}>
                {(isDouble || !isRight) && (
                  <AnimatedDoor
                    side="left"
                    position={[-width/2 + compartmentGap/2, 0, 0]}
                    width={isDouble ? (width - compartmentGap)/2 : width - compartmentGap}
                    height={height - compartmentGap}
                    hexColor={doorHexColor}
                    imageUrl={doorImageUrl}
                    handleType={zone.handleType}
                    isOpen={openCompartments[zone.id]}
                    onClick={(e: any) => {
                      e.stopPropagation();
                      onSelectZone?.(zone.id);
                    }}
                  />
                )}
                {(isDouble || isRight) && (
                  <AnimatedDoor
                    side="right"
                    position={[width/2 - compartmentGap/2, 0, 0]}
                    width={isDouble ? (width - compartmentGap)/2 : width - compartmentGap}
                    height={height - compartmentGap}
                    hexColor={doorHexColor}
                    imageUrl={doorImageUrl}
                    handleType={zone.handleType}
                    isOpen={openCompartments[zone.id]}
                    onClick={(e: any) => {
                      e.stopPropagation();
                      onSelectZone?.(zone.id);
                    }}
                  />
                )}
              </group>
            );
          }
        }

        if (zone.content === 'glass_shelf') {
          // Étagère en verre transparente
          items.push(
            <mesh key={zone.id} position={[x, y, z]} castShadow receiveShadow>
              <boxGeometry args={[width, thickness, d]} />
              <meshPhysicalMaterial
                color="#ffffff"
                transparent
                opacity={0.3}
                roughness={0.1}
                metalness={0.1}
                transmission={0.9}
                thickness={0.5}
              />
            </mesh>
          );
        } else if (zone.content === 'mirror_door') {
          // Porte avec miroir
          items.push(
            <group key={zone.id} position={[x, y, d/2]}>
              <AnimatedMirrorDoor
                side="left"
                position={[-width/2 + compartmentGap/2, 0, 0]}
                width={width - compartmentGap}
                height={height - compartmentGap}
                handleType={zone.handleType}
                isOpen={openCompartments[zone.id]}
                onClick={(e: any) => {
                  e.stopPropagation();
                  onSelectZone?.(zone.id);
                  toggleCompartment(zone.id);
                }}
              />
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
      }
      
      // --- Gestion des Portes sur les Groupes ---
      // Si la zone a des enfants (groupe) et qu'elle a un contenu de type porte
      const groupDoor = zone.doorContent || (zone.children && zone.children.length > 0 ? zone.content : null);
      if (zone.children && zone.children.length > 0 && groupDoor && groupDoor.includes('door') && groupDoor !== 'empty') {
        const doorToRender = groupDoor;
        const isDouble = doorToRender === 'door_double';
        const isRight = doorToRender === 'door_right';
        const isPush = doorToRender === 'push_door';
        const isMirror = doorToRender === 'mirror_door';
        
        const doorHexColor = zone.zoneColor?.hex || finalDoorColor;
        const doorImageUrl = zone.zoneColor?.imageUrl !== undefined ? zone.zoneColor.imageUrl : finalDoorImageUrl;

        if (isMirror) {
          items.push(
            <group key={`${zone.id}-group-door`} position={[x, y, d/2]}>
              <AnimatedMirrorDoor
                side="left"
                position={[-width/2 + compartmentGap/2, 0, 0]}
                width={width - compartmentGap}
                height={height - compartmentGap}
                handleType={zone.handleType}
                isOpen={openCompartments[zone.id]}
                onClick={(e: any) => {
                  e.stopPropagation();
                  onSelectZone?.(zone.id);
                  toggleCompartment(zone.id);
                }}
              />
            </group>
          );
        } else if (isPush) {
          items.push(
            <group key={`${zone.id}-group-door`} position={[x, y, d/2]}>
              <AnimatedPushDoor
                side="left"
                position={[-width/2 + compartmentGap/2, 0, 0]}
                width={width - compartmentGap}
                height={height - compartmentGap}
                hexColor={doorHexColor}
                imageUrl={doorImageUrl}
                isOpen={openCompartments[zone.id]}
                onClick={(e: any) => {
                  e.stopPropagation();
                  onSelectZone?.(zone.id);
                  toggleCompartment(zone.id);
                }}
              />
            </group>
          );
        } else {
          items.push(
            <group key={`${zone.id}-group-door`} position={[x, y, d/2]}>
              {(isDouble || !isRight) && (
                <AnimatedDoor
                  side="left"
                  position={[-width/2 + compartmentGap/2, 0, 0]}
                  width={isDouble ? (width - compartmentGap)/2 : width - compartmentGap}
                  height={height - compartmentGap}
                  hexColor={doorHexColor}
                  imageUrl={doorImageUrl}
                  handleType={zone.handleType}
                  isOpen={openCompartments[zone.id]}
                  onClick={(e: any) => {
                    e.stopPropagation();
                    onSelectZone?.(zone.id);
                    toggleCompartment(zone.id);
                  }}
                />
              )}
              {(isDouble || isRight) && (
                <AnimatedDoor
                  side="right"
                  position={[width/2 - compartmentGap/2, 0, 0]}
                  width={isDouble ? (width - compartmentGap)/2 : width - compartmentGap}
                  height={height - compartmentGap}
                  hexColor={doorHexColor}
                  imageUrl={doorImageUrl}
                  handleType={zone.handleType}
                  isOpen={openCompartments[zone.id]}
                  onClick={(e: any) => {
                    e.stopPropagation();
                    onSelectZone?.(zone.id);
                    toggleCompartment(zone.id);
                  }}
                />
              )}
            </group>
          );
        }
      }

      if (zone.children && zone.children.length > 0) {
        console.log('🎨 parseZone - zone avec enfants:', zone.id, 'type:', zone.type, 'enfants:', zone.children.length);
        let currentPos = 0;
        zone.children.forEach((child, i) => {
          // Calcul du ratio pour chaque enfant
          let ratio: number;
          if (zone.splitRatios && zone.splitRatios.length === zone.children!.length) {
            // Ratios explicites pour chaque enfant
            ratio = zone.splitRatios[i] / 100;
          } else if (zone.children!.length === 2 && zone.splitRatio !== undefined) {
            // Mode splitRatio pour exactement 2 enfants
            ratio = (i === 0 ? zone.splitRatio : 100 - zone.splitRatio) / 100;
          } else {
            // Par défaut: distribution égale
            ratio = 1 / zone.children!.length;
          }
          console.log('🎨 parseZone - enfant', i, 'ratio:', ratio);
          
          if (zone.type === 'horizontal') {
            const childHeight = height * ratio;
            // Rendu de haut en bas pour correspondre à l'UI 2D (index 0 = haut)
            parseZone(child, x, (y + height/2) - currentPos - childHeight/2, z, width, childHeight);
            currentPos += childHeight;
            if (i < zone.children!.length - 1) {
              items.push(
                <mesh key={`${zone.id}-sep-${i}`} position={[x, (y + height/2) - currentPos, z]} castShadow receiveShadow>
                  <boxGeometry args={[width, thickness, d]} />
                  <TexturedMaterial hexColor={finalShelfColor} imageUrl={finalShelfImageUrl} />
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
                  <TexturedMaterial hexColor={separatorColor} imageUrl={separatorImageUrl} />
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
    rootZone, w, sideHeight, yOffset, thickness, compartmentGap, d,
    finalStructureColor, finalShelfColor, finalDrawerColor, finalDoorColor, finalBackColor, finalBaseColor,
    finalStructureImageUrl, finalShelfImageUrl, finalDrawerImageUrl, finalDoorImageUrl, finalBackImageUrl, finalBaseImageUrl,
    separatorColor, separatorImageUrl,
    openCompartments, showDecorations, selectedZoneIds, onSelectZone, toggleCompartment
  ]);

  // Note: On n'utilise plus de key={colorKey} car cela causait des remontages
  // et des flashs blancs lors des changements de couleur

  return (
    <group>
      {/* Côtés */}
      <mesh position={[-w/2 + thickness/2, sideHeight/2 + yOffset, 0]} castShadow receiveShadow>
        <boxGeometry args={[thickness, sideHeight, d]} />
        <TexturedMaterial hexColor={finalStructureColor} imageUrl={finalStructureImageUrl} />
      </mesh>
      <mesh position={[w/2 - thickness/2, sideHeight/2 + yOffset, 0]} castShadow receiveShadow>
        <boxGeometry args={[thickness, sideHeight, d]} />
        <TexturedMaterial hexColor={finalStructureColor} imageUrl={finalStructureImageUrl} />
      </mesh>
      <mesh position={[0, h - thickness/2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, thickness, d]} />
        <TexturedMaterial hexColor={finalStructureColor} imageUrl={finalStructureImageUrl} />
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
        <TexturedMaterial hexColor={finalStructureColor} imageUrl={finalStructureImageUrl} />
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
              hexColor={finalDoorColor}
              imageUrl={finalDoorImageUrl}
              isOpen={doorsOpen}
              onClick={() => {
                onToggleDoors?.();
                onSelectZone?.(selectedZoneIds.includes('root') ? null : 'root');
              }}
            />
          )}
          {(doorType === 'double' || (doorType === 'single' && doorSide === 'right')) && (
            <AnimatedDoor
              side="right"
              position={[w/2, 0, 0]}
              width={doorType === 'double' ? w/2 : w}
              height={sideHeight}
              hexColor={finalDoorColor}
              imageUrl={finalDoorImageUrl}
              isOpen={doorsOpen}
              onClick={() => {
                onToggleDoors?.();
                onSelectZone?.(selectedZoneIds.includes('root') ? null : 'root');
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
            onSelectZone?.(selectedZoneIds.includes('root') ? null : 'root');
          }}
        >
          <boxGeometry args={[w, sideHeight, 0.02]} />
        </mesh>
      )}

      {/* Socle */}
      {hasSocle && (
        <>
          {socle === 'metal' ? (
            <group position={[0, 0, 0]}>
              {/* Pieds métal */}
              <mesh position={[-w/2 + 0.05, 0.05, -d/2 + 0.05]} castShadow>
                <boxGeometry args={[0.03, 0.1, 0.03]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.8} />
              </mesh>
              <mesh position={[w/2 - 0.05, 0.05, -d/2 + 0.05]} castShadow>
                <boxGeometry args={[0.03, 0.1, 0.03]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.8} />
              </mesh>
              <mesh position={[-w/2 + 0.05, 0.05, d/2 - 0.05]} castShadow>
                <boxGeometry args={[0.03, 0.1, 0.03]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.8} />
              </mesh>
              <mesh position={[w/2 - 0.05, 0.05, d/2 - 0.05]} castShadow>
                <boxGeometry args={[0.03, 0.1, 0.03]} />
                <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.8} />
              </mesh>
            </group>
          ) : (
            /* Socle plein (bois) */
            <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
              <boxGeometry args={[w, 0.1, d - 0.02]} />
              <TexturedMaterial hexColor={finalBaseColor} imageUrl={finalBaseImageUrl} />
            </mesh>
          )}
        </>
      )}

      {/* Back Panel */}
      <mesh position={[0, sideHeight/2 + yOffset, -d/2 + 0.002]} receiveShadow>
        <boxGeometry args={[w - 0.01, sideHeight - 0.01, 0.004]} />
        <TexturedMaterial hexColor={finalBackColor} imageUrl={finalBackImageUrl} />
      </mesh>
    </group>
  );
}

// ============================================
// TABLEAUX ARTISTIQUES MODERNES
// ============================================

// Composant pour un tableau style minimaliste japonais
function JapaneseMinimalist({ position, width = 0.8, height = 1.0 }: { position: [number, number, number]; width?: number; height?: number }) {
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

// Composant pour un tableau abstrait contemporain
function AbstractContemporary({ position, width = 1.2, height = 0.9 }: { position: [number, number, number]; width?: number; height?: number }) {
  return (
    <group position={position}>
      {/* Cadre flottant blanc */}
      <mesh position={[0, 0, -0.02]} castShadow>
        <boxGeometry args={[width + 0.08, height + 0.08, 0.04]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[width + 0.04, height + 0.04, 0.03]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>

      {/* Fond */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[width - 0.04, height - 0.04]} />
        <meshStandardMaterial color="#FAFAFA" roughness={0.9} />
      </mesh>

      {/* Arc doré */}
      <mesh position={[width*0.2, -height*0.05, 0.016]} rotation={[0, 0, -0.3]}>
        <ringGeometry args={[width*0.12, width*0.18, 32, 1, 0, Math.PI]} />
        <meshStandardMaterial color="#F2CC8F" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>

      {/* Cercle bleu foncé */}
      <mesh position={[-width*0.2, height*0.15, 0.015]}>
        <circleGeometry args={[width*0.18, 32]} />
        <meshStandardMaterial color="#4A5F7F" roughness={0.6} />
      </mesh>

      {/* Cercle vert */}
      <mesh position={[width*0.25, height*0.25, 0.017]}>
        <circleGeometry args={[width*0.06, 24]} />
        <meshStandardMaterial color="#81B29A" roughness={0.5} />
      </mesh>

      {/* Ligne graphique */}
      <mesh position={[-width*0.1, -height*0.25, 0.018]}>
        <boxGeometry args={[width*0.4, 0.008, 0.001]} />
        <meshStandardMaterial color="#3D405B" roughness={0.4} />
      </mesh>

      {/* Points décoratifs */}
      <mesh position={[-width*0.3, height*0.3, 0.019]}>
        <circleGeometry args={[0.012, 12]} />
        <meshStandardMaterial color="#3D405B" roughness={0.5} />
      </mesh>
      <mesh position={[width*0.32, -height*0.28, 0.019]}>
        <circleGeometry args={[0.015, 12]} />
        <meshStandardMaterial color="#81B29A" roughness={0.5} />
      </mesh>
    </group>
  );
}

// Composant pour un paysage scandinave minimaliste
function ScandinavianLandscape({ position, width = 1.0, height = 0.7 }: { position: [number, number, number]; width?: number; height?: number }) {
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

// Composant One Line Art (dessin au trait)
function OneLineArt({ position, width = 0.5, height = 0.7 }: { position: [number, number, number]; width?: number; height?: number }) {
  return (
    <group position={position}>
      {/* Cadre flottant */}
      <mesh position={[0, 0, -0.02]} castShadow>
        <boxGeometry args={[width + 0.06, height + 0.06, 0.04]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[width + 0.02, height + 0.02, 0.03]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>

      {/* Fond blanc */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[width - 0.02, height - 0.02]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.95} />
      </mesh>

      {/* Dessin visage au trait */}
      {/* Contour du visage */}
      <mesh position={[0, 0, 0.015]} rotation={[0, 0, 0.1]}>
        <torusGeometry args={[width*0.18, 0.003, 8, 32, Math.PI * 1.2]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
      </mesh>
      {/* Œil */}
      <mesh position={[-width*0.05, height*0.05, 0.016]}>
        <torusGeometry args={[width*0.03, 0.002, 8, 16, Math.PI * 2]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
      </mesh>
      {/* Sourcil */}
      <mesh position={[-width*0.05, height*0.1, 0.016]} rotation={[0, 0, 0.2]}>
        <torusGeometry args={[width*0.04, 0.002, 8, 16, Math.PI * 0.6]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
      </mesh>
      {/* Nez */}
      <mesh position={[width*0.02, -height*0.02, 0.016]}>
        <boxGeometry args={[0.003, height*0.08, 0.001]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
      </mesh>
      {/* Lèvres */}
      <mesh position={[0, -height*0.1, 0.016]}>
        <torusGeometry args={[width*0.04, 0.002, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
      </mesh>
    </group>
  );
}

// Composant Bauhaus géométrique
function BauhausGeometric({ position, width = 0.6, height = 0.8 }: { position: [number, number, number]; width?: number; height?: number }) {
  return (
    <group position={position}>
      {/* Cadre blanc fin */}
      <mesh position={[0, height/2 + 0.01, 0]} castShadow>
        <boxGeometry args={[width + 0.02, 0.015, 0.02]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.2} metalness={0.3} />
      </mesh>
      <mesh position={[0, -height/2 - 0.01, 0]} castShadow>
        <boxGeometry args={[width + 0.02, 0.015, 0.02]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.2} metalness={0.3} />
      </mesh>
      <mesh position={[-width/2 - 0.01, 0, 0]} castShadow>
        <boxGeometry args={[0.015, height, 0.02]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.2} metalness={0.3} />
      </mesh>
      <mesh position={[width/2 + 0.01, 0, 0]} castShadow>
        <boxGeometry args={[0.015, height, 0.02]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.2} metalness={0.3} />
      </mesh>

      {/* Fond */}
      <mesh position={[0, 0, -0.005]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#F5F5F0" roughness={0.95} />
      </mesh>

      {/* Cercle rouge */}
      <mesh position={[-width*0.15, height*0.2, 0.001]}>
        <circleGeometry args={[width*0.2, 32]} />
        <meshStandardMaterial color="#D32F2F" roughness={0.5} />
      </mesh>

      {/* Triangle jaune */}
      <mesh position={[width*0.15, height*0.15, 0.002]}>
        <coneGeometry args={[width*0.15, width*0.25, 3]} />
        <meshStandardMaterial color="#FBC02D" roughness={0.5} flatShading />
      </mesh>

      {/* Carré bleu */}
      <mesh position={[width*0.1, -height*0.2, 0.003]} rotation={[0, 0, Math.PI/6]}>
        <boxGeometry args={[width*0.22, width*0.22, 0.002]} />
        <meshStandardMaterial color="#1976D2" roughness={0.5} />
      </mesh>

      {/* Lignes noires */}
      <mesh position={[-width*0.2, -height*0.1, 0.004]}>
        <boxGeometry args={[0.006, height*0.5, 0.001]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
      </mesh>
      <mesh position={[0, -height*0.3, 0.004]}>
        <boxGeometry args={[width*0.6, 0.006, 0.001]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
      </mesh>

      {/* Petit cercle noir */}
      <mesh position={[-width*0.25, -height*0.25, 0.005]}>
        <circleGeometry args={[width*0.05, 24]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
      </mesh>
    </group>
  );
}

// Composant Horloge murale moderne
function WallClock({ position, radius = 0.25 }: { position: [number, number, number]; radius?: number }) {
  return (
    <group position={position}>
      {/* Cadre/Bordure de l'horloge */}
      <mesh position={[0, 0, -0.01]} castShadow>
        <cylinderGeometry args={[radius + 0.015, radius + 0.015, 0.04, 32]} />
        <meshStandardMaterial color="#2C2C2C" roughness={0.3} metalness={0.7} />
      </mesh>

      {/* Fond blanc de l'horloge */}
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[radius, 32]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.2} />
      </mesh>

      {/* Marques des heures (12, 3, 6, 9) */}
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

      {/* Petites marques pour les autres heures */}
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

      {/* Aiguille des heures (10h) */}
      <mesh position={[-radius * 0.15, radius * 0.25, 0.02]} rotation={[0, 0, Math.PI / 6]}>
        <boxGeometry args={[0.01, radius * 0.5, 0.003]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
      </mesh>

      {/* Aiguille des minutes (10 minutes) */}
      <mesh position={[radius * 0.08, radius * 0.4, 0.022]} rotation={[0, 0, -Math.PI / 18]}>
        <boxGeometry args={[0.006, radius * 0.7, 0.003]} />
        <meshStandardMaterial color="#2C2C2C" roughness={0.3} />
      </mesh>

      {/* Centre de l'horloge */}
      <mesh position={[0, 0, 0.025]}>
        <cylinderGeometry args={[0.015, 0.015, 0.01, 16]} />
        <meshStandardMaterial color="#D32F2F" roughness={0.4} metalness={0.5} />
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

      {/* Interrupteur */}
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

      {/* ========== TABLEAUX ARTISTIQUES MODERNES ========== */}

      {/* Tableau principal - Japonais minimaliste (centre) - NOUVEAU DESIGN */}
      <JapaneseMinimalist position={[0.3, 2.6, -1.97]} width={1.2} height={0.95} />

      {/* Tableau scandinave (gauche) */}
      <ScandinavianLandscape position={[-2.2, 2.4, -1.97]} width={0.8} height={0.95} />

      {/* Bauhaus géométrique (droite haut) */}
      <BauhausGeometric position={[2.5, 2.8, -1.97]} width={0.65} height={0.8} />

      {/* Horloge murale (droite bas) - REMPLACE LE TABLEAU NOIR */}
      <WallClock position={[2.5, 1.8, -1.97]} radius={0.25} />

      {/* Bauhaus géométrique (extrême gauche) */}
      <BauhausGeometric position={[-3.5, 2.2, -1.97]} width={0.55} height={0.7} />

    </group>
  );
}

function HumanSilhouette() {
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

// Composant interne pour capturer le screenshot
function ScreenshotCapture({ onCapture }: { onCapture: (fn: () => string | null) => void }) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    const captureScreenshot = () => {
      try {
        // Rendre une frame
        gl.render(scene, camera);
        // Capturer le canvas en base64
        const dataUrl = gl.domElement.toDataURL('image/png');
        return dataUrl;
      } catch (error) {
        console.error('Erreur lors de la capture:', error);
        return null;
      }
    };

    onCapture(captureScreenshot);
  }, [gl, scene, camera, onCapture]);

  return null;
}

const ThreeCanvas = forwardRef<ThreeCanvasHandle, ThreeViewerProps>((props, ref) => {
  const { onSelectZone } = props;
  const captureRef = useRef<(() => string | null) | null>(null);

  // Exposer la méthode de capture via la ref
  useImperativeHandle(ref, () => ({
    captureScreenshot: () => {
      if (captureRef.current) {
        return captureRef.current();
      }
      return null;
    }
  }), []);

  const handleCapture = (fn: () => string | null) => {
    captureRef.current = fn;
  };

  return (
    <div style={{ width: '100%', height: '100%', background: '#FAFAF9', position: 'relative' }}>
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
        {/* Screenshot capture temporairement désactivé pour éviter les erreurs SSR */}
        {/* <ScreenshotCapture onCapture={handleCapture} /> */}
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
          <Furniture
            {...props}
            imageUrl={props.imageUrl}
          />
          <HumanSilhouette />
          <ContactShadows position={[0, 0, 0]} opacity={0.4} scale={15} blur={2.5} far={1.5} />
          <Environment preset="city" background={false} />
        </Suspense>
      </Canvas>
    </div>
  );
});

ThreeCanvas.displayName = 'ThreeCanvas';

export default ThreeCanvas;

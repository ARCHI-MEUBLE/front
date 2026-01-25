import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface Drilling {
  id: string;
  type: string;
  typeName: string;
  x: number;      // position en cm depuis le bord gauche
  y: number;      // position en cm depuis le bas
  diameter: number; // diamètre en mm
  price: number;
}

interface FacadeCartPreviewProps {
  width: number;    // en mm
  height: number;   // en mm
  depth: number;    // en mm
  colorHex: string;
  textureUrl?: string | null;
  drillings?: Drilling[];
}

function FacadePanel({
  width,
  height,
  depth,
  colorHex,
  textureUrl,
  drillings = [],
}: FacadeCartPreviewProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [textureLoaded, setTextureLoaded] = useState(false);

  // Normaliser les dimensions pour l'affichage (scale down)
  // width/height sont en mm, on convertit en unités 3D
  const scale = 0.001; // 1mm = 0.001 unité 3D
  const w = width * scale;
  const h = height * scale;
  const d = Math.max(depth * scale, 0.01);

  // Charger la texture
  useEffect(() => {
    if (!textureUrl) {
      setTexture(null);
      setTextureLoaded(false);
      return;
    }

    const loader = new THREE.TextureLoader();

    loader.load(
      textureUrl,
      (loadedTexture) => {
        loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
        loadedTexture.needsUpdate = true;
        setTexture(loadedTexture);
        setTextureLoaded(true);
      },
      undefined,
      (error) => {
        console.warn('Texture loading failed:', textureUrl, error);
        setTexture(null);
        setTextureLoaded(false);
      }
    );

    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [textureUrl]);

  // Mettre à jour le matériau quand la texture change
  useEffect(() => {
    if (meshRef.current && meshRef.current.material) {
      (meshRef.current.material as THREE.MeshStandardMaterial).needsUpdate = true;
    }
  }, [texture, textureLoaded]);

  // Convertir les positions des trous
  // x, y sont en cm depuis le coin bas-gauche de la façade
  const drillingsPositions = useMemo(() => {
    return drillings.map((drilling) => {
      // Convertir cm en mm puis en unités 3D
      const xPos = (drilling.x * 10 * scale) - (w / 2); // centrer sur la façade
      const yPos = (drilling.y * 10 * scale) - (h / 2); // centrer sur la façade
      const radius = (drilling.diameter / 2) * scale;
      return { xPos, yPos, radius, id: drilling.id };
    });
  }, [drillings, w, h, scale]);

  return (
    <group>
      {/* Panneau principal */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          key={textureLoaded ? 'textured' : 'colored'}
          color={textureLoaded ? '#ffffff' : colorHex}
          map={texture}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Trous (perçages) - cercles noirs sur les faces avant et arrière */}
      {drillingsPositions.map((drill) => (
        <group key={drill.id}>
          {/* Cercle sur la face avant */}
          <mesh position={[drill.xPos, drill.yPos, d / 2 + 0.0001]}>
            <circleGeometry args={[drill.radius, 32]} />
            <meshBasicMaterial color="#1a1a1a" side={THREE.DoubleSide} />
          </mesh>
          {/* Cercle sur la face arrière */}
          <mesh position={[drill.xPos, drill.yPos, -d / 2 - 0.0001]}>
            <circleGeometry args={[drill.radius, 32]} />
            <meshBasicMaterial color="#1a1a1a" side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function FacadeCartPreview({
  width,
  height,
  depth,
  colorHex,
  textureUrl,
  drillings,
}: FacadeCartPreviewProps) {
  // Calculer la distance de caméra en fonction des dimensions
  const maxDim = Math.max(width, height) * 0.001;
  const cameraZ = maxDim * 2.5;

  return (
    <Canvas
      camera={{ position: [0, 0, cameraZ], fov: 35 }}
      style={{ background: '#F5F5F4' }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-3, 3, 2]} intensity={0.4} />

      <FacadePanel
        width={width}
        height={height}
        depth={depth}
        colorHex={colorHex}
        textureUrl={textureUrl}
        drillings={drillings}
      />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={2}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2}
      />
    </Canvas>
  );
}

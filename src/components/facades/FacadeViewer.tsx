import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Canvas, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { FacadeConfig, FacadeDrilling } from '@/types/facade';

interface FacadeViewerProps {
  config: FacadeConfig;
  showGrid?: boolean;
}

export interface FacadeViewerHandle {
  captureScreenshot: () => string | null;
}

// Composant pour une face unique
function FacadeFace({ 
  colorHex,
  textureUrl,
  position, 
  rotation, 
  args, 
  side 
}: { 
  colorHex: string;
  textureUrl: string;
  position: [number, number, number]; 
  rotation?: [number, number, number]; 
  args: [number, number]; 
  side?: typeof THREE.FrontSide | typeof THREE.DoubleSide;
}) {
  // Logique simple: texture_url vide/null → couleur, sinon → texture
  const hasTexture = !!(textureUrl && textureUrl.trim() !== '');
  
  return (
    <mesh castShadow receiveShadow position={position} rotation={rotation}>
      <planeGeometry args={args} />
      {hasTexture ? (
        <FaceMaterialWithTexture textureUrl={textureUrl} />
      ) : (
        <meshStandardMaterial
          color={colorHex}
          roughness={0.7}
          metalness={0.1}
          side={side || THREE.FrontSide}
        />
      )}
    </mesh>
  );
}

// Composant séparé pour le matériau avec texture
function FaceMaterialWithTexture({ textureUrl }: { textureUrl: string }) {
  const texture = useLoader(THREE.TextureLoader, textureUrl);
  
  // Étirer la texture pour couvrir toute la face
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.repeat.set(1, 1);

  return (
    <meshStandardMaterial
      color="#ffffff"
      map={texture}
      roughness={0.7}
      metalness={0.1}
      side={THREE.FrontSide}
    />
  );
}

// Composant principal de la façade
function FacadePanel({ config }: { config: FacadeConfig }) {
  const { width, height, depth, material, drillings } = config;
  
  // Conversion mm -> mètres pour Three.js
  const w = width / 1000;
  const h = height / 1000;
  const d = depth / 1000;

  const colorHex = material.color_hex || '#D8C7A1';
  const textureUrl = material.texture_url || '';

  return (
    <group>
      {/* Face avant */}
      <FacadeFace 
        colorHex={colorHex}
        textureUrl={textureUrl}
        position={[0, 0, d / 2]} 
        args={[w, h]} 
        side={THREE.FrontSide}
      />

      {/* Face arrière */}
      <FacadeFace 
        colorHex={colorHex}
        textureUrl={textureUrl}
        position={[0, 0, -d / 2]} 
        rotation={[0, Math.PI, 0]}
        args={[w, h]} 
        side={THREE.FrontSide}
      />

      {/* Haut - couleur uniquement pour les bords */}
      <FacadeFace 
        colorHex={colorHex}
        textureUrl=""
        position={[0, h / 2, 0]} 
        rotation={[Math.PI / 2, 0, 0]}
        args={[w, d]} 
        side={THREE.DoubleSide}
      />

      {/* Bas - couleur uniquement pour les bords */}
      <FacadeFace 
        colorHex={colorHex}
        textureUrl=""
        position={[0, -h / 2, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
        args={[w, d]} 
        side={THREE.DoubleSide}
      />

      {/* Gauche - couleur uniquement pour les bords */}
      <FacadeFace 
        colorHex={colorHex}
        textureUrl=""
        position={[-w / 2, 0, 0]} 
        rotation={[0, Math.PI / 2, 0]}
        args={[d, h]} 
        side={THREE.DoubleSide}
      />

      {/* Droite - couleur uniquement pour les bords */}
      <FacadeFace 
        colorHex={colorHex}
        textureUrl=""
        position={[w / 2, 0, 0]} 
        rotation={[0, -Math.PI / 2, 0]}
        args={[d, h]} 
        side={THREE.DoubleSide}
      />

      {/* Rendu des perçages */}
      {drillings.map((drilling: FacadeDrilling) => (
        <Drilling
          key={drilling.id}
          drilling={drilling}
          panelWidth={w}
          panelHeight={h}
          panelDepth={d}
        />
      ))}

      {/* Cadre/bordure */}
      <EdgesHelper width={w} height={h} depth={d} />
    </group>
  );
}

// Composant pour les perçages (visibles uniquement sur la face arrière)
function Drilling({
  drilling,
  panelWidth,
  panelHeight,
  panelDepth,
}: {
  drilling: FacadeDrilling;
  panelWidth: number;
  panelHeight: number;
  panelDepth: number;
}) {
  // Conversion des pourcentages en position réelle
  const xPos = (drilling.x / 100 - 0.5) * panelWidth;
  const yPos = (drilling.y / 100 - 0.5) * panelHeight;
  const zPos = -panelDepth / 2 - 0.001; // Sur la face arrière

  if (drilling.type === 'circular' || drilling.diameter) {
    // Perçage circulaire - cercle noir sur la face arrière
    const radius = (drilling.diameter || 30) / 1000 / 2;
    return (
      <mesh position={[xPos, yPos, zPos]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[radius, 32]} />
        <meshStandardMaterial
          color="#000000"
          roughness={1}
          metalness={0}
          side={THREE.FrontSide}
        />
      </mesh>
    );
  } else if (drilling.type === 'rectangular' || (drilling.width && drilling.height)) {
    // Perçage rectangulaire - rectangle noir sur la face arrière
    const w = (drilling.width || 100) / 1000;
    const h = (drilling.height || 50) / 1000;
    return (
      <mesh position={[xPos, yPos, zPos]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color="#000000"
          roughness={1}
          metalness={0}
          side={THREE.FrontSide}
        />
      </mesh>
    );
  }

  return null;
}

// Helper pour afficher les bordures
function EdgesHelper({
  width,
  height,
  depth,
}: {
  width: number;
  height: number;
  depth: number;
}) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const edges = new THREE.EdgesGeometry(geometry);

  return (
    <lineSegments geometry={edges}>
      <lineBasicMaterial color="#1A1917" linewidth={2} />
    </lineSegments>
  );
}

// Grille de référence optionnelle
function Grid({ width, height }: { width: number; height: number }) {
  const divisions = 10;
  
  return (
    <group position={[0, 0, -0.01]}>
      <gridHelper
        args={[Math.max(width, height), divisions, '#E8E6E3', '#E8E6E3']}
        rotation={[Math.PI / 2, 0, 0]}
      />
    </group>
  );
}

// Composant de capture de screenshot
function ScreenshotCapture({
  onCapture,
}: {
  onCapture: (fn: () => string | null) => void;
}) {
  const { gl, scene, camera } = useThree();

  React.useEffect(() => {
    const captureScreenshot = () => {
      try {
        gl.render(scene, camera);
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

// Composant principal exporté
const FacadeViewer = forwardRef<FacadeViewerHandle, FacadeViewerProps>(
  ({ config, showGrid = false }, ref) => {
    const captureRef = useRef<(() => string | null) | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        captureScreenshot: () => {
          if (captureRef.current) {
            return captureRef.current();
          }
          return null;
        },
      }),
      []
    );

    const handleCapture = (fn: () => string | null) => {
      captureRef.current = fn;
    };

    return (
      <div className="w-full h-full bg-[#FAFAF9] relative">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 0, 2], fov: 45 }}
          onCreated={({ gl }) => {
            gl.setClearColor('#FAFAF9');
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.0;
          }}
          gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        >
          <ScreenshotCapture onCapture={handleCapture} />

          <OrbitControls
            enableDamping
            minDistance={0.5}
            maxDistance={5}
            maxPolarAngle={Math.PI / 2}
            target={[0, 0, 0]}
          />

          <ambientLight intensity={0.5} />
          <hemisphereLight intensity={0.5} groundColor="#ffffff" color="#ffffff" />
          <directionalLight
            position={[3, 5, 2]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />

          {showGrid && (
            <Grid
              width={config.width / 1000}
              height={config.height / 1000}
            />
          )}

          <FacadePanel config={config} />
          
          <ContactShadows
            position={[0, -config.height / 2000 - 0.01, 0]}
            opacity={0.3}
            scale={Math.max(config.width, config.height) / 1000 * 1.5}
            blur={2}
            far={1}
          />

          <Environment preset="city" background={false} />
        </Canvas>
      </div>
    );
  }
);

FacadeViewer.displayName = 'FacadeViewer';

export default FacadeViewer;

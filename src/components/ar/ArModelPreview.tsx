import { Component, Suspense, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, ContactShadows, Environment, OrbitControls, useGLTF } from '@react-three/drei';

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

// Un fichier illisible ne doit pas emporter la page : l'aperçu disparaît, le bouton AR reste
class PreviewBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Aperçu du meuble sur la page /ar, avant de le poser dans la pièce : on le fait tourner au doigt
export default function ArModelPreview({ url }: { url: string }) {
  return (
    <PreviewBoundary>
      <Canvas camera={{ position: [2.4, 1.4, 3.2], fov: 35 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 5, 4]} intensity={1.1} />
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.15}>
            <Model url={url} />
          </Bounds>
          <Environment preset="city" />
        </Suspense>
        <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={6} blur={2.5} far={2} />
        <OrbitControls makeDefault enablePan={false} minPolarAngle={0.3} maxPolarAngle={Math.PI / 2 - 0.05} />
      </Canvas>
    </PreviewBoundary>
  );
}

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Élément HTML accroché à un point de la scène 3D, à la place du <Html> de drei.
// Le <Html> de drei démonte son arbre React de façon synchrone pendant le rendu de la scène : React 19
// refuse (« Attempted to synchronously unmount a root while React was already rendering ») et le
// démontage reporté retirait ensuite un nœud déjà enlevé, d'où l'erreur « removeChild: The node to be
// removed is not a child of this node » (en quittant l'étape Division en vue 3D, par exemple).
// Ici le démontage attend la fin du rendu en cours.

interface ScreenHtmlProps {
    position: [number, number, number];
    // Centre l'élément sur le point (sinon son coin haut-gauche y est posé)
    center?: boolean;
    // z-index de l'objet le plus proche et du plus éloigné de la caméra
    zIndexRange?: [number, number];
    style?: CSSProperties;
    children: ReactNode;
}

const objectPosition = new THREE.Vector3();
const cameraPosition = new THREE.Vector3();
const cameraDirection = new THREE.Vector3();
const projected = new THREE.Vector3();

export function ScreenHtml({ position, center = false, zIndexRange = [16777271, 0], style, children }: ScreenHtmlProps) {
    const gl = useThree((state) => state.gl);
    const camera = useThree((state) => state.camera);
    const size = useThree((state) => state.size);
    const connected = useThree((state) => state.events.connected) as HTMLElement | undefined;
    const target = connected || (gl.domElement.parentNode as HTMLElement | null);

    const group = useRef<THREE.Group>(null);
    const element = useRef<HTMLDivElement | null>(null);
    const root = useRef<Root | null>(null);
    const last = useRef({ x: NaN, y: NaN, z: NaN, visible: true });

    // Un élément neuf à chaque montage : l'ancien, retiré plus tard, ne doit pas être celui qu'on réutilise
    // (en développement, React monte, démonte et remonte aussitôt chaque composant)
    useLayoutEffect(() => {
        const el = document.createElement('div');
        el.style.cssText = 'position:absolute;top:0;left:0;transform-origin:0 0;';
        const currentRoot = createRoot(el);
        element.current = el;
        root.current = currentRoot;
        last.current = { x: NaN, y: NaN, z: NaN, visible: true };
        target?.appendChild(el);
        return () => {
            if (element.current === el) {
                element.current = null;
                root.current = null;
            }
            // Après le rendu en cours : démonter maintenant laisserait le DOM incohérent
            setTimeout(() => {
                currentRoot.unmount();
                el.remove();
            }, 0);
        };
    }, [target]);

    useLayoutEffect(() => {
        root.current?.render(
            <div style={{ position: 'absolute', transform: center ? 'translate3d(-50%,-50%,0)' : 'none', ...style }}>{children}</div>
        );
    });

    // Suit le point à l'écran à chaque image ; masqué quand il passe derrière la caméra
    useFrame(() => {
        const el = element.current;
        if (!group.current || !el) return;
        objectPosition.setFromMatrixPosition(group.current.matrixWorld);
        cameraPosition.setFromMatrixPosition(camera.matrixWorld);
        camera.getWorldDirection(cameraDirection);
        const visible = cameraDirection.dot(projected.copy(objectPosition).sub(cameraPosition)) > 0;

        projected.copy(objectPosition).project(camera);
        const x = Math.round(((projected.x + 1) / 2) * size.width);
        const y = Math.round(((1 - projected.y) / 2) * size.height);

        const near = (camera as THREE.PerspectiveCamera).near ?? 0.1;
        const far = (camera as THREE.PerspectiveCamera).far ?? 1000;
        const slope = (zIndexRange[1] - zIndexRange[0]) / (far - near);
        const z = Math.round(slope * objectPosition.distanceTo(cameraPosition) + zIndexRange[1] - slope * far);

        const previous = last.current;
        if (x !== previous.x || y !== previous.y) el.style.transform = `translate3d(${x}px,${y}px,0)`;
        if (z !== previous.z) el.style.zIndex = String(z);
        if (visible !== previous.visible) el.style.display = visible ? 'block' : 'none';
        last.current = { x, y, z, visible };
    });

    return <group ref={group} position={position} />;
}

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getSafeColor } from './utils';

export function TexturedMaterial({ hexColor, imageUrl }: { hexColor: string; imageUrl?: string | null }) {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);
    const textureRef = useRef<THREE.Texture | null>(null);
    const currentImageUrlRef = useRef<string | null>(null);

    const safeColor = getSafeColor(hexColor);

    useEffect(() => {
        if (!imageUrl) {
            if (textureRef.current) {
                textureRef.current.dispose();
                textureRef.current = null;
            }
            setTexture(null);
            currentImageUrlRef.current = null;
            return;
        }

        if (currentImageUrlRef.current === imageUrl && textureRef.current) {
            return;
        }

        currentImageUrlRef.current = imageUrl;
        console.log('[TexturedMaterial] Loading texture:', imageUrl);

        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        loader.load(
            imageUrl,
            (loadedTexture) => {
                console.log('[TexturedMaterial] Texture loaded successfully:', imageUrl);
                if (currentImageUrlRef.current !== imageUrl) {
                    loadedTexture.dispose();
                    return;
                }

                if (textureRef.current) {
                    textureRef.current.dispose();
                }

                loadedTexture.wrapS = loadedTexture.wrapT = THREE.RepeatWrapping;
                loadedTexture.repeat.set(1, 1);
                loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
                loadedTexture.magFilter = THREE.LinearFilter;
                loadedTexture.anisotropy = 16;
                loadedTexture.needsUpdate = true;
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
        };
    }, [imageUrl]);

    useEffect(() => {
        return () => {
            if (textureRef.current) {
                textureRef.current.dispose();
                textureRef.current = null;
            }
        };
    }, []);

    const materialKey = texture ? `tex-${currentImageUrlRef.current}` : `col-${safeColor}`;

    if (texture) {
        return (
            <meshStandardMaterial
                key={materialKey}
                attach="material"
                map={texture}
                color="#ffffff"
                roughness={0.7}
                metalness={0.1}
                polygonOffset
                polygonOffsetFactor={1}
                polygonOffsetUnits={1}
            />
        );
    }

    return (
        <meshStandardMaterial
            key={materialKey}
            attach="material"
            color={safeColor}
            roughness={0.4}
            metalness={0.1}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
        />
    );
}

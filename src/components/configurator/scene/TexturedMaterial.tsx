import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getSafeColor } from './utils';

export function TexturedMaterial({ hexColor, imageUrl }: { hexColor: string; imageUrl?: string | null }) {
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
        console.log('[TexturedMaterial] Loading texture:', imageUrl);

        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        loader.load(
            imageUrl,
            (loadedTexture) => {
                console.log('[TexturedMaterial] Texture loaded successfully:', imageUrl);
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
                polygonOffset
                polygonOffsetFactor={1}
                polygonOffsetUnits={1}
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
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
        />
    );
}

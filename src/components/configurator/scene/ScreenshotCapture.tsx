import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

export function ScreenshotCapture({ onCapture }: { onCapture: (fn: () => string | null) => void }) {
    const { gl, scene, camera } = useThree();

    useEffect(() => {
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

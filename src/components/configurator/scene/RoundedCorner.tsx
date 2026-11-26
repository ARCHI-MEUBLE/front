import { useMemo } from 'react';
import * as THREE from 'three';
import { TexturedMaterial } from './TexturedMaterial';

// Bord avant arrondi plein (voir char=="Z" côté back, procedure_real.py / construire_bord_arrondi,
// même géométrie, portée ici 1:1) : un bloc qui court sur toute la hauteur, plein (width) à l'avant
// du meuble, dont le bord extérieur se rapproche ensuite en courbe de la planche latérale qu'il
// recouvre pour arriver flush avec elle à l'arrière (depth = la portion de la profondeur, côté
// arrière, sur laquelle se fait cette courbe ; le reste, côté avant, est un bloc droit plein).
// Construit en sommets/faces bruts (pas de ExtrudeGeometry + rotation) pour éviter toute ambiguïté
// de signe/axe : les coordonnées sont du vrai XYZ monde du début à la fin, comme côté Python.
interface RoundedCornerProps {
    outerX: number; // bord extérieur du meuble à ce niveau (le côté qu'on arrondit)
    innerX: number; // bord où il rejoint la planche latérale plate (outerX ± width)
    frontZ: number;
    backZ: number;
    bottomY: number;
    topY: number;
    width: number; // de combien il dépasse la planche latérale, à l'avant ("largeur")
    depth: number; // profondeur (côté arrière) de la partie courbe ("profondeur de l'arrondi")
    hexColor: string;
    imageUrl?: string | null;
}

export function RoundedCorner({ outerX, innerX, frontZ, backZ, bottomY, topY, width, depth, hexColor, imageUrl }: RoundedCornerProps) {
    const geometry = useMemo(() => {
        const signX = innerX > outerX ? 1 : -1;
        const signZ = frontZ > backZ ? 1 : -1;
        const centerX = innerX;
        const centerZ = backZ + signZ * depth;
        const nArc = 16;

        // Bord intérieur (flush, toute la profondeur) -> bord avant (plein) -> bord extérieur droit
        // (plein, côté avant) -> courbe (quart d'ellipse, width x depth) qui ramène au bord
        // intérieur, flush, à l'arrière (referme le contour, pas besoin du dernier point de l'arc).
        const profil: [number, number][] = [[innerX, backZ], [innerX, frontZ], [outerX, frontZ], [outerX, centerZ]];
        for (let k = 1; k < nArc; k++) {
            const theta = Math.PI + (Math.PI / 2) * (k / nArc);
            const u = width * Math.cos(theta);
            const w = depth * Math.sin(theta);
            profil.push([centerX + signX * u, centerZ + signZ * w]);
        }

        const bas = profil.map(([x, z]) => new THREE.Vector3(x, bottomY, z));
        const haut = profil.map(([x, z]) => new THREE.Vector3(x, topY, z));
        const n = profil.length;
        const vertices: THREE.Vector3[] = [...bas, ...haut];

        const faces: [number, number, number][] = [];
        for (let i = 1; i < n - 1; i++) faces.push([0, i + 1, i]);
        for (let i = 1; i < n - 1; i++) faces.push([n, n + i, n + i + 1]);
        for (let i = 0; i < n; i++) {
            const j = (i + 1) % n;
            faces.push([i, j, n + j]);
            faces.push([i, n + j, n + i]);
        }

        const positions = new Float32Array(faces.length * 9);
        faces.forEach(([a, b, c], fi) => {
            [a, b, c].forEach((idx, vi) => {
                const v = vertices[idx];
                const o = fi * 9 + vi * 3;
                positions[o] = v.x;
                positions[o + 1] = v.y;
                positions[o + 2] = v.z;
            });
        });

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.computeVertexNormals();
        return geo;
    }, [outerX, innerX, frontZ, backZ, bottomY, topY, width, depth]);

    return (
        <mesh geometry={geometry} castShadow receiveShadow>
            {/* DoubleSide : le sens des faces n'est pas garanti identique des deux côtés (gauche/droite
                sont des miroirs), on ne cherche pas à le faire correspondre précisément ici */}
            <TexturedMaterial hexColor={hexColor} imageUrl={imageUrl} side={THREE.DoubleSide} />
        </mesh>
    );
}

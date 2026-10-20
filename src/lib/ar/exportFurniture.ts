import * as THREE from 'three';

// Export du meuble du configurateur pour la réalité augmentée (GLB pour Android et le QR code, USDZ pour iPhone).
// La scène du configurateur contient, en plus des planches, des zones cliquables invisibles, des contours et des voiles
// de sélection (matériaux « basic »), des lumières : on n'en garde que les surfaces du meuble.

const isVisibleInTree = (object: THREE.Object3D) => {
  for (let current: THREE.Object3D | null = object; current; current = current.parent) {
    if (!current.visible) return false;
  }
  return true;
};

// Verre (matériau « physique », que Quick Look et Scene Viewer rendent mal) : verre teinté semi-transparent standard
function exportMaterial(material: THREE.Material): THREE.Material {
  const physical = material as THREE.MeshPhysicalMaterial;
  if (!physical.isMeshPhysicalMaterial) return material;
  return new THREE.MeshStandardMaterial({
    name: material.name || 'verre',
    color: physical.color,
    roughness: 0.05,
    metalness: 0,
    transparent: true,
    opacity: physical.transmission > 0 ? 0.3 : Math.min(physical.opacity, 0.6),
    side: physical.side,
  });
}

// Copie à plat du meuble : chaque maillage garde sa place (transformations cuites), origine au centre du dessous
export function prepareFurnitureForExport(source: THREE.Object3D): THREE.Group {
  source.updateMatrixWorld(true);
  const sourceInverse = source.matrixWorld.clone().invert();
  const root = new THREE.Group();
  root.name = 'Meuble';

  source.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh || !isVisibleInTree(mesh)) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const isFurnitureSurface = materials.every(
      (material) => (material as THREE.MeshStandardMaterial).isMeshStandardMaterial && material.visible && material.opacity > 0
    );
    if (!isFurnitureSurface) return;

    const copy = new THREE.Mesh(
      mesh.geometry,
      Array.isArray(mesh.material) ? mesh.material.map(exportMaterial) : exportMaterial(mesh.material)
    );
    copy.name = mesh.name;
    // Position par rapport au meuble, quelle que soit la place du meuble dans sa scène
    copy.applyMatrix4(new THREE.Matrix4().multiplyMatrices(sourceInverse, mesh.matrixWorld));
    root.add(copy);
  });

  const box = new THREE.Box3().setFromObject(root);
  if (!box.isEmpty()) {
    const offset = new THREE.Vector3(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    root.children.forEach((child) => child.position.add(offset));
  }
  root.updateMatrixWorld(true);
  return root;
}

// Une texture chargée depuis un autre site sans autorisation (CORS) ne peut pas être relue pour l'export :
// on retombe alors sur la couleur seule
function withoutTextures(root: THREE.Group): THREE.Group {
  const copy = root.clone();
  copy.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const strip = (material: THREE.Material) => {
      const standard = material as THREE.MeshStandardMaterial;
      if (!standard.map) return material;
      const plain = standard.clone();
      plain.map = null;
      return plain;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(strip) : strip(mesh.material);
  });
  return copy;
}

async function retryWithoutTextures<T>(root: THREE.Group, run: (scene: THREE.Group) => Promise<T>): Promise<T> {
  try {
    return await run(root);
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== 'SecurityError') throw error;
    console.warn('Textures non exportables (CORS) : export en couleurs unies');
    return run(withoutTextures(root));
  }
}

export async function furnitureToGlb(root: THREE.Group): Promise<ArrayBuffer> {
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  return retryWithoutTextures(root, async (scene) => {
    const result = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: true, maxTextureSize: 1024 });
    if (!(result instanceof ArrayBuffer)) throw new Error('Export GLB inattendu');
    return result;
  });
}

// Adresse blob: à libérer avec URL.revokeObjectURL
export async function furnitureToUsdzUrl(root: THREE.Group): Promise<string> {
  const { USDZExporter } = await import('three/examples/jsm/exporters/USDZExporter.js');
  const usdz = await retryWithoutTextures(root, (scene) =>
    new USDZExporter().parseAsync(scene, { quickLookCompatible: true, maxTextureSize: 1024 })
  );
  return URL.createObjectURL(new Blob([usdz], { type: 'model/vnd.usdz+zip' }));
}

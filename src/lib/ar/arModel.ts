// Prépare le GLB du générateur pour la réalité augmentée (Scene Viewer sur Android, Quick Look sur iPhone).
// Le générateur Python (trimesh) écrit des planches sans matériau, colorées par sommet, avec l'origine dans un coin
// du meuble. Les visionneuses AR appliquent alors le matériau par défaut du format, entièrement métallique (meuble
// sombre), lisent les couleurs de sommets comme des valeurs linéaires (teintes délavées) et posent le meuble décalé
// par rapport au point visé.
// On ne réécrit que le JSON du GLB : un matériau mat par couleur et un nœud racine qui met l'origine au centre du
// dessous du meuble. Le binaire (sommets, couleurs) est recopié tel quel.

const GLB_MAGIC = 0x46546c67; // « glTF »
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;

// Bois et panneaux laqués : mats, pas métalliques
const ROUGHNESS = 0.8;

type Vec3 = [number, number, number];

interface GltfAccessor {
  bufferView?: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: string;
  min?: number[];
  max?: number[];
  sparse?: unknown;
}

interface GltfBufferView {
  buffer: number;
  byteOffset?: number;
  byteLength: number;
  byteStride?: number;
}

interface GltfPrimitive {
  attributes: Record<string, number>;
  material?: number;
}

interface GltfMaterial {
  name?: string;
  pbrMetallicRoughness?: {
    baseColorFactor?: number[];
    metallicFactor?: number;
    roughnessFactor?: number;
    [key: string]: unknown;
  };
  alphaMode?: string;
  [key: string]: unknown;
}

interface GltfNode {
  name?: string;
  mesh?: number;
  children?: number[];
  matrix?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
}

interface Gltf {
  scene?: number;
  scenes?: { nodes?: number[] }[];
  nodes?: GltfNode[];
  meshes?: { primitives: GltfPrimitive[] }[];
  accessors?: GltfAccessor[];
  bufferViews?: GltfBufferView[];
  buffers?: { uri?: string; byteLength: number }[];
  materials?: GltfMaterial[];
}

function parseGlb(data: Uint8Array): { json: Gltf; bin: Uint8Array | null } {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (data.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC || view.getUint32(4, true) !== 2) {
    throw new Error('Fichier GLB invalide');
  }
  const jsonLength = view.getUint32(12, true);
  if (view.getUint32(16, true) !== CHUNK_JSON || 20 + jsonLength > data.byteLength) {
    throw new Error('Fichier GLB invalide');
  }
  const json = JSON.parse(new TextDecoder().decode(data.subarray(20, 20 + jsonLength))) as Gltf;

  let bin: Uint8Array | null = null;
  const binStart = 20 + jsonLength;
  if (binStart + 8 <= data.byteLength && view.getUint32(binStart + 4, true) === CHUNK_BIN) {
    const binLength = view.getUint32(binStart, true);
    bin = data.subarray(binStart + 8, Math.min(binStart + 8 + binLength, data.byteLength));
  }
  return { json, bin };
}

// Les morceaux d'un GLB font un multiple de 4 octets : espaces pour le JSON, zéros pour le binaire
function pad4(bytes: Uint8Array, fill: number): Uint8Array {
  const padding = (4 - (bytes.byteLength % 4)) % 4;
  if (padding === 0) return bytes;
  const padded = new Uint8Array(bytes.byteLength + padding).fill(fill);
  padded.set(bytes);
  return padded;
}

function buildGlb(json: Gltf, bin: Uint8Array | null): Uint8Array {
  const jsonChunk = pad4(new TextEncoder().encode(JSON.stringify(json)), 0x20);
  const binChunk = bin ? pad4(bin, 0) : null;
  const total = 20 + jsonChunk.byteLength + (binChunk ? 8 + binChunk.byteLength : 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonChunk.byteLength, true);
  view.setUint32(16, CHUNK_JSON, true);
  out.set(jsonChunk, 20);
  if (binChunk) {
    const start = 20 + jsonChunk.byteLength;
    view.setUint32(start, binChunk.byteLength, true);
    view.setUint32(start + 4, CHUNK_BIN, true);
    out.set(binChunk, start + 8);
  }
  return out;
}

const COMPONENT_COUNT: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

// Octets par composante, lecture et diviseur des entiers normalisés (les couleurs en octets valent 0-255)
const COMPONENT_READERS: Record<number, [number, (view: DataView, offset: number) => number, number]> = {
  5121: [1, (view, offset) => view.getUint8(offset), 255],
  5123: [2, (view, offset) => view.getUint16(offset, true), 65535],
  5126: [4, (view, offset) => view.getFloat32(offset, true), 1],
};

// Valeurs d'un accesseur rangé dans le binaire du GLB, ou null s'il est stocké autrement (non utilisé par le générateur)
function readAccessor(json: Gltf, bin: Uint8Array, index: number): number[][] | null {
  const accessor = json.accessors?.[index];
  if (!accessor || accessor.bufferView === undefined || accessor.sparse) return null;
  const bufferView = json.bufferViews?.[accessor.bufferView];
  const reader = COMPONENT_READERS[accessor.componentType];
  const size = COMPONENT_COUNT[accessor.type];
  if (!bufferView || bufferView.buffer !== 0 || json.buffers?.[0]?.uri !== undefined || !reader || !size) return null;

  const [bytes, read, divisor] = reader;
  const stride = bufferView.byteStride ?? bytes * size;
  const start = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  if (accessor.count === 0 || start + stride * (accessor.count - 1) + bytes * size > bin.byteLength) return null;

  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const values: number[][] = [];
  for (let i = 0; i < accessor.count; i++) {
    const element: number[] = [];
    for (let c = 0; c < size; c++) element.push(read(view, start + i * stride + c * bytes) / divisor);
    values.push(element);
  }
  return values;
}

// Le générateur donne une seule couleur à chaque planche : on la récupère si tous les sommets la partagent
function uniformColor(colors: number[][]): number[] | null {
  const [first] = colors;
  const same = colors.every((color) => color.every((value, i) => Math.abs(value - first[i]) < 1e-3));
  return same ? [first[0], first[1], first[2], first[3] ?? 1] : null;
}

// Les couleurs du configurateur sont des hex sRGB ; un baseColorFactor glTF est linéaire
const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

const toHex = (color: number[]) =>
  '#' + color.slice(0, 3).map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('');

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

// Matrices glTF : 16 nombres rangés par colonnes
function multiply(a: number[], b: number[]): number[] {
  const out = new Array<number>(16).fill(0);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 4; k++) out[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
    }
  }
  return out;
}

function localMatrix(node: GltfNode): number[] {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

// Boîte englobante de la scène, d'après les min/max que le format impose sur chaque POSITION
function sceneBounds(json: Gltf, roots: number[]): { min: Vec3; max: Vec3 } | null {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];

  const visit = (index: number, parent: number[], depth: number) => {
    const node = json.nodes?.[index];
    if (!node || depth > 64) return;
    const matrix = multiply(parent, localMatrix(node));
    for (const primitive of node.mesh !== undefined ? json.meshes?.[node.mesh]?.primitives ?? [] : []) {
      const accessor = json.accessors?.[primitive.attributes.POSITION];
      if (!accessor?.min || !accessor.max) continue;
      for (const cx of [accessor.min[0], accessor.max[0]]) {
        for (const cy of [accessor.min[1], accessor.max[1]]) {
          for (const cz of [accessor.min[2], accessor.max[2]]) {
            for (let i = 0; i < 3; i++) {
              const value = matrix[i] * cx + matrix[4 + i] * cy + matrix[8 + i] * cz + matrix[12 + i];
              min[i] = Math.min(min[i], value);
              max[i] = Math.max(max[i], value);
            }
          }
        }
      }
    }
    for (const child of node.children ?? []) visit(child, matrix, depth + 1);
  };

  roots.forEach((root) => visit(root, IDENTITY, 0));
  return Number.isFinite(min[0]) ? { min, max } : null;
}

export function prepareGlbForAr(data: Uint8Array): Uint8Array {
  const { json, bin } = parseGlb(data);
  const materials = (json.materials ??= []);

  // Matériaux déjà présents (planches texturées) : sans facteur explicite, le format les rend métalliques
  for (const material of materials) {
    const pbr = (material.pbrMetallicRoughness ??= {});
    pbr.metallicFactor ??= 0;
    pbr.roughnessFactor ??= ROUGHNESS;
  }

  const materialByColor = new Map<string, number>();
  const materialFor = (srgb: number[]) => {
    const key = srgb.map((value) => value.toFixed(4)).join(',');
    let index = materialByColor.get(key);
    if (index === undefined) {
      const opaque = srgb[3] >= 0.999;
      index =
        materials.push({
          name: toHex(srgb),
          pbrMetallicRoughness: {
            baseColorFactor: [srgbToLinear(srgb[0]), srgbToLinear(srgb[1]), srgbToLinear(srgb[2]), srgb[3]],
            metallicFactor: 0,
            roughnessFactor: ROUGHNESS,
          },
          // Verre : le générateur lui donne une couleur semi-transparente
          ...(opaque ? {} : { alphaMode: 'BLEND' }),
        }) - 1;
      materialByColor.set(key, index);
    }
    return index;
  };

  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      if (primitive.material !== undefined) continue;
      const colorAccessor = primitive.attributes.COLOR_0;
      const colors = colorAccessor !== undefined && bin ? readAccessor(json, bin, colorAccessor) : null;
      const color = colors ? uniformColor(colors) : null;
      if (color) {
        primitive.material = materialFor(color);
        delete primitive.attributes.COLOR_0;
      } else {
        // Plusieurs couleurs sur une même planche, ou aucune : matériau blanc mat, les couleurs de sommets restent
        primitive.material = materialFor([1, 1, 1, 1]);
      }
    }
  }

  // Origine au centre du dessous du meuble : c'est ce point que les visionneuses posent sur le sol visé
  const scene = json.scenes?.[json.scene ?? 0];
  const roots = scene?.nodes ?? [];
  const bounds = sceneBounds(json, roots);
  if (scene && bounds) {
    const { min, max } = bounds;
    const nodes = (json.nodes ??= []);
    const root =
      nodes.push({
        name: 'Meuble',
        translation: [-(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2],
        children: roots,
      }) - 1;
    scene.nodes = [root];
  }

  return buildGlb(json, bin);
}

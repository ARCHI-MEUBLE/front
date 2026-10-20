import { describe, expect, it } from 'vitest';
import { prepareGlbForAr } from './arModel';
import { arModelFileFromUrl, isArModelFile } from './arModelFile';

// GLB minimal, construit comme ceux du générateur Python : pas de matériau, couleurs par sommet (octets),
// origine dans un coin du meuble
function makeGlb(json: object, bin: Uint8Array): Uint8Array {
  const text = new TextEncoder().encode(JSON.stringify(json));
  const jsonChunk = new Uint8Array(Math.ceil(text.byteLength / 4) * 4).fill(0x20);
  jsonChunk.set(text);
  const total = 20 + jsonChunk.byteLength + 8 + bin.byteLength;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonChunk.byteLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  out.set(jsonChunk, 20);
  view.setUint32(20 + jsonChunk.byteLength, bin.byteLength, true);
  view.setUint32(24 + jsonChunk.byteLength, 0x004e4942, true);
  out.set(bin, 28 + jsonChunk.byteLength);
  return out;
}

function readGlb(glb: Uint8Array) {
  const view = new DataView(glb.buffer, glb.byteOffset, glb.byteLength);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + jsonLength)));
  const binLength = view.getUint32(20 + jsonLength, true);
  return { json, bin: glb.subarray(28 + jsonLength, 28 + jsonLength + binLength), total: view.getUint32(8, true) };
}

// 3 sommets en float (36 octets), puis deux jeux de couleurs RGBA en octets (12 octets chacun)
function fixture() {
  const bin = new Uint8Array(60);
  new Float32Array(bin.buffer, 0, 9).set([0, 0, 0, 1, 0, 0, 0, 0.5, 0.4]);
  bin.set([216, 199, 161, 255, 216, 199, 161, 255, 216, 199, 161, 255], 36);
  bin.set([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255], 48);
  const json = {
    asset: { version: '2.0' },
    scene: 0,
    scenes: [{ nodes: [0, 1, 2] }],
    nodes: [{ mesh: 0 }, { mesh: 1, translation: [1, 0, 0] }, { mesh: 2 }],
    meshes: [
      { primitives: [{ attributes: { POSITION: 0, COLOR_0: 1 } }] },
      { primitives: [{ attributes: { POSITION: 0, COLOR_0: 2 } }] },
      { primitives: [{ attributes: { POSITION: 0 }, material: 0 }] },
    ],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1] } }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 0.5, 0.4] },
      { bufferView: 1, componentType: 5121, normalized: true, count: 3, type: 'VEC4' },
      { bufferView: 2, componentType: 5121, normalized: true, count: 3, type: 'VEC4' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 12 },
      { buffer: 0, byteOffset: 48, byteLength: 12 },
    ],
    buffers: [{ byteLength: 60 }],
  };
  return { glb: makeGlb(json, bin), bin };
}

describe('prepareGlbForAr', () => {
  it('donne à chaque planche un matériau mat de sa couleur, lue en sRGB', () => {
    const { json } = readGlb(prepareGlbForAr(fixture().glb));
    const plank = json.meshes[0].primitives[0];
    expect(plank.attributes.COLOR_0).toBeUndefined();

    const material = json.materials[plank.material];
    expect(material.name).toBe('#d8c7a1');
    expect(material.pbrMetallicRoughness.metallicFactor).toBe(0);
    expect(material.pbrMetallicRoughness.roughnessFactor).toBe(0.8);
    // 216/255 en sRGB ≈ 0,687 en linéaire (et non 0,847 comme le lirait une visionneuse sans conversion)
    expect(material.pbrMetallicRoughness.baseColorFactor[0]).toBeCloseTo(0.6867, 3);
    expect(material.alphaMode).toBeUndefined();
  });

  it('garde les couleurs de sommets quand une planche en a plusieurs', () => {
    const { json } = readGlb(prepareGlbForAr(fixture().glb));
    const multicolor = json.meshes[1].primitives[0];
    expect(multicolor.attributes.COLOR_0).toBe(2);
    expect(json.materials[multicolor.material].pbrMetallicRoughness.baseColorFactor).toEqual([1, 1, 1, 1]);
  });

  it('rend mats les matériaux existants qui ne précisent pas leur aspect métallique', () => {
    const { json } = readGlb(prepareGlbForAr(fixture().glb));
    expect(json.meshes[2].primitives[0].material).toBe(0);
    expect(json.materials[0].pbrMetallicRoughness).toMatchObject({ metallicFactor: 0, roughnessFactor: 0.8 });
  });

  it("met l'origine au centre du dessous du meuble", () => {
    const { json } = readGlb(prepareGlbForAr(fixture().glb));
    // Planches de x = 0 à 2 (la seconde est décalée de 1), y de 0 à 0,5, z de 0 à 0,4
    expect(json.scenes[0].nodes).toHaveLength(1);
    const root = json.nodes[json.scenes[0].nodes[0]];
    expect(root.children).toEqual([0, 1, 2]);
    expect(root.translation[0]).toBeCloseTo(-1);
    expect(root.translation[1]).toBeCloseTo(0);
    expect(root.translation[2]).toBeCloseTo(-0.2);
  });

  it('recopie le binaire tel quel et écrit un GLB cohérent', () => {
    const { glb, bin } = fixture();
    const out = prepareGlbForAr(glb);
    const read = readGlb(out);
    expect(read.total).toBe(out.byteLength);
    expect(out.byteLength % 4).toBe(0);
    expect(Array.from(read.bin)).toEqual(Array.from(bin));
  });

  it("refuse ce qui n'est pas un GLB", () => {
    expect(() => prepareGlbForAr(new TextEncoder().encode('<html>Erreur</html>'))).toThrow('Fichier GLB invalide');
  });
});

describe('noms de fichiers acceptés', () => {
  it("n'accepte que les GLB du générateur", () => {
    expect(isArModelFile('meuble_6ad74b733d9a7.glb')).toBe(true);
    expect(isArModelFile('../meuble_x.glb')).toBe(false);
    expect(isArModelFile('meuble_x.glb.php')).toBe(false);
    expect(isArModelFile('autre.glb')).toBe(false);
  });

  it("extrait le nom depuis l'adresse renvoyée par le générateur", () => {
    expect(arModelFileFromUrl('/models/meuble_6ad74b733d9a7.glb')).toBe('meuble_6ad74b733d9a7.glb');
    expect(arModelFileFromUrl('https://site.fr/models/meuble_ab12.glb?v=2')).toBe('meuble_ab12.glb');
    expect(arModelFileFromUrl('/models/meuble_ab12.dxf')).toBeNull();
    expect(arModelFileFromUrl(null)).toBeNull();
  });
});

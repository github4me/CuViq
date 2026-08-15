import { mkdir, writeFile } from "node:fs/promises";

const fixtureDirectory = new URL("../tests/fixtures/", import.meta.url);
await mkdir(fixtureDirectory, { recursive: true });

const positions = new Float32Array([
  -1, -1,  1,  1, -1,  1,  1,  1,  1, -1,  1,  1,
  -1, -1, -1, -1,  1, -1,  1,  1, -1,  1, -1, -1,
]);
const indices = new Uint16Array([
  0, 1, 2, 0, 2, 3, 1, 7, 6, 1, 6, 2,
  7, 4, 5, 7, 5, 6, 4, 0, 3, 4, 3, 5,
  3, 2, 6, 3, 6, 5, 4, 7, 1, 4, 1, 0,
]);
const binary = Buffer.alloc(positions.byteLength + indices.byteLength);
Buffer.from(positions.buffer).copy(binary, 0);
Buffer.from(indices.buffer).copy(binary, positions.byteLength);

const gltf = {
  asset: { version: "2.0", generator: "CuViq test fixture" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, translation: [2, 0, 0] }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
  materials: [{ pbrMetallicRoughness: { baseColorFactor: [0.08, 0.32, 0.8, 1], metallicFactor: 0.65, roughnessFactor: 0.28 } }],
  buffers: [{ uri: "cube.bin", byteLength: binary.byteLength }],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: positions.byteLength, target: 34962 },
    { buffer: 0, byteOffset: positions.byteLength, byteLength: indices.byteLength, target: 34963 },
  ],
  accessors: [
    { bufferView: 0, componentType: 5126, count: 8, type: "VEC3", min: [-1, -1, -1], max: [1, 1, 1] },
    { bufferView: 1, componentType: 5123, count: indices.length, type: "SCALAR" },
  ],
};

await writeFile(new URL("cube.bin", fixtureDirectory), binary);
await writeFile(new URL("cube.gltf", fixtureDirectory), JSON.stringify(gltf));
await writeFile(new URL("empty.gltf", fixtureDirectory), JSON.stringify({ asset: { version: "2.0" }, scenes: [{}], scene: 0 }));
await writeFile(new URL("malformed.gltf", fixtureDirectory), "{not valid JSON");
await writeFile(new URL("missing-resource.gltf", fixtureDirectory), JSON.stringify({
  ...gltf,
  buffers: [{ uri: "does-not-exist.bin", byteLength: binary.byteLength }],
}));
await writeFile(new URL("decoder-required.gltf", fixtureDirectory), JSON.stringify({
  asset: { version: "2.0" },
  extensionsUsed: ["KHR_draco_mesh_compression"],
  extensionsRequired: ["KHR_draco_mesh_compression"],
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, mode: 4, extensions: { KHR_draco_mesh_compression: { bufferView: 0, attributes: { POSITION: 0 } } } }] }],
  buffers: [{ uri: "data:application/octet-stream;base64,AAAA", byteLength: 3 }],
  bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 3 }],
  accessors: [{ componentType: 5126, count: 1, type: "VEC3" }],
}));

const embeddedGltf = structuredClone(gltf);
delete embeddedGltf.buffers[0].uri;
const jsonData = Buffer.from(JSON.stringify(embeddedGltf));
const paddedJsonLength = Math.ceil(jsonData.length / 4) * 4;
const paddedBinLength = Math.ceil(binary.length / 4) * 4;
const glb = Buffer.alloc(12 + 8 + paddedJsonLength + 8 + paddedBinLength, 0x20);
glb.writeUInt32LE(0x46546c67, 0);
glb.writeUInt32LE(2, 4);
glb.writeUInt32LE(glb.length, 8);
glb.writeUInt32LE(paddedJsonLength, 12);
glb.writeUInt32LE(0x4e4f534a, 16);
jsonData.copy(glb, 20);
const binHeader = 20 + paddedJsonLength;
glb.writeUInt32LE(paddedBinLength, binHeader);
glb.writeUInt32LE(0x004e4942, binHeader + 4);
binary.copy(glb, binHeader + 8);
await writeFile(new URL("cube.glb", fixtureDirectory), glb);

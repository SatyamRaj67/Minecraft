import { ChunkDrawCall } from "./GeometryPass";
import { mat4 } from "wgpu-matrix";
import { TERRAIN_VERTEX_STRIDE_BYTES } from "@/platform/gpu/GpuLimits";

export function createDebugCubeChunk(
  device: GPUDevice,
  layout: GPUBindGroupLayout,
): ChunkDrawCall {
  const vertexCount = 24; // 4 verts per face * 6 faces
  const vertexData = new ArrayBuffer(vertexCount * TERRAIN_VERTEX_STRIDE_BYTES);
  const floatView = new Float32Array(vertexData);
  const uintView = new Uint32Array(vertexData);

  let vIdx = 0;

  // Helper to pack vertex data matching the terrain.vert.wgsl layout
  function addVert(
    x: number,
    y: number,
    z: number,
    u: number,
    v: number,
    layer: number,
    normIdx: number,
  ) {
    const baseF = (vIdx * TERRAIN_VERTEX_STRIDE_BYTES) / 4;
    const baseU = baseF;

    floatView[baseF + 0] = x;
    floatView[baseF + 1] = y;
    floatView[baseF + 2] = z;
    floatView[baseF + 3] = u;
    floatView[baseF + 4] = v;

    uintView[baseU + 5] = layer;

    // Pack normal (3 bits) and light level (5 bits). Max light is 31.
    const lightPacked = 31 & 0x1f;
    uintView[baseU + 6] = (normIdx & 0x7) | (lightPacked << 3);

    vIdx++;
  }

  // --- VERTICES ---
  // Normals mappings: 0:+Y, 1:-Y, 2:+Z, 3:-Z, 4:+X, 5:-X
  const size = 1.0;
  const hs = size / 2.0;

  // Top (+Y, norm 0)
  addVert(-hs, hs, -hs, 0, 0, 0, 0);
  addVert(-hs, hs, hs, 0, 1, 0, 0);
  addVert(hs, hs, hs, 1, 1, 0, 0);
  addVert(hs, hs, -hs, 1, 0, 0, 0);

  // Bottom (-Y, norm 1)
  addVert(-hs, -hs, hs, 0, 0, 0, 1);
  addVert(-hs, -hs, -hs, 0, 1, 0, 1);
  addVert(hs, -hs, -hs, 1, 1, 0, 1);
  addVert(hs, -hs, hs, 1, 0, 0, 1);

  // South (+Z, norm 2)
  addVert(-hs, -hs, hs, 0, 1, 0, 2);
  addVert(hs, -hs, hs, 1, 1, 0, 2);
  addVert(hs, hs, hs, 1, 0, 0, 2);
  addVert(-hs, hs, hs, 0, 0, 0, 2);

  // North (-Z, norm 3)
  addVert(hs, -hs, -hs, 0, 1, 0, 3);
  addVert(-hs, -hs, -hs, 1, 1, 0, 3);
  addVert(-hs, hs, -hs, 1, 0, 0, 3);
  addVert(hs, hs, -hs, 0, 0, 0, 3);

  // East (+X, norm 4)
  addVert(hs, -hs, hs, 0, 1, 0, 4);
  addVert(hs, -hs, -hs, 1, 1, 0, 4);
  addVert(hs, hs, -hs, 1, 0, 0, 4);
  addVert(hs, hs, hs, 0, 0, 0, 4);

  // West (-X, norm 5)
  addVert(-hs, -hs, -hs, 0, 1, 0, 5);
  addVert(-hs, -hs, hs, 1, 1, 0, 5);
  addVert(-hs, hs, hs, 1, 0, 0, 5);
  addVert(-hs, hs, -hs, 0, 0, 0, 5);

  // --- INDICES ---
  const indices = new Uint32Array(36);
  for (let i = 0; i < 6; i++) {
    indices[i * 6 + 0] = i * 4 + 0;
    indices[i * 6 + 1] = i * 4 + 1;
    indices[i * 6 + 2] = i * 4 + 2;
    indices[i * 6 + 3] = i * 4 + 0;
    indices[i * 6 + 4] = i * 4 + 2;
    indices[i * 6 + 5] = i * 4 + 3;
  }

  // --- BUFFERS ---
  const vertexBuffer = device.createBuffer({
    label: "DebugCube_VB",
    size: vertexData.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(vertexBuffer, 0, vertexData);

  const indexBuffer = device.createBuffer({
    label: "DebugCube_IB",
    size: indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(indexBuffer, 0, indices);

  // --- OBJECT UBO & BIND GROUP ---
  // ObjectUBO has `model` (64 bytes) and `normalMat` (64 bytes)
  const uboData = new Float32Array(32);

  // Notice your camera starts at (0, 80, 0).
  // Let's place the cube slightly in front of the camera at (0, 80, -5)
  const modelMatrix = mat4.translation([0, 80, -5]);
  const normalMatrix = mat4.identity(); // Translation doesn't affect normals

  uboData.set(modelMatrix, 0);
  uboData.set(normalMatrix, 16);

  const objectUboBuffer = device.createBuffer({
    label: "DebugCube_UBO",
    size: 128,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(objectUboBuffer, 0, uboData);

  const objectBindGroup = device.createBindGroup({
    label: "DebugCube_BG",
    layout: layout,
    entries: [
      {
        binding: 0, // binding 0 in group 2
        resource: { buffer: objectUboBuffer },
      },
    ],
  });

  return {
    vertexBuffer,
    indexBuffer,
    indexCount: 36,
    modelMatrix, // For your interface
    objectBindGroup,
  };
}

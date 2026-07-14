import { ChunkMeshResult } from "@/world/chunk/ChunkManager";
import { TERRAIN_VERTEX_STRIDE_BYTES } from "@/platform/gpu/GpuLimits";

export class SimpleMesher {
  static generateFlatChunk(cx: number, cz: number): ChunkMeshResult {
    // 16x16 blocks, 6 faces per block, 4 vertices per face
    const blocksCount = 16 * 16;
    const vertexCount = blocksCount * 24;
    const indexCount = blocksCount * 36;

    const vertexData = new ArrayBuffer(
      vertexCount * TERRAIN_VERTEX_STRIDE_BYTES,
    );
    const floatView = new Float32Array(vertexData);
    const uintView = new Uint32Array(vertexData);
    const indices = new Uint32Array(indexCount);

    let vIdx = 0;
    let iIdx = 0;

    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        const y = 0; // The floor is at Y=0

        // Helper to generate a single square face
        const addFace = (
          v0: number[],
          v1: number[],
          v2: number[],
          v3: number[],
          normIdx: number,
          texLayer: number,
        ) => {
          const baseV = vIdx;
          const packedNL = (normIdx & 0x7) | (31 << 3); // Max lighting

          const addVert = (pos: number[], u: number, v: number) => {
            const fOffset = vIdx * (TERRAIN_VERTEX_STRIDE_BYTES / 4);
            floatView[fOffset + 0] = pos[0]!;
            floatView[fOffset + 1] = pos[1]!;
            floatView[fOffset + 2] = pos[2]!;
            floatView[fOffset + 3] = u;
            floatView[fOffset + 4] = v;
            uintView[fOffset + 5] = texLayer;
            uintView[fOffset + 6] = packedNL;
            vIdx++;
          };

          // Add 4 vertices for the face
          addVert(v0, 0, 1); // Bottom-left
          addVert(v1, 1, 1); // Bottom-right
          addVert(v2, 1, 0); // Top-right
          addVert(v3, 0, 0); // Top-left

          // Emit 2 triangles (Counter-Clockwise winding)
          indices[iIdx++] = baseV + 0;
          indices[iIdx++] = baseV + 1;
          indices[iIdx++] = baseV + 2;
          indices[iIdx++] = baseV + 0;
          indices[iIdx++] = baseV + 2;
          indices[iIdx++] = baseV + 3;
        };

        // Define the 8 corners of the cube
        const p000 = [x, y, z];
        const p100 = [x + 1, y, z];
        const p010 = [x, y + 1, z];
        const p110 = [x + 1, y + 1, z];
        const p001 = [x, y, z + 1];
        const p101 = [x + 1, y, z + 1];
        const p011 = [x, y + 1, z + 1];
        const p111 = [x + 1, y + 1, z + 1];

        // --- Generate all 6 faces for the block ---
        // Top (+Y) -> grass_block_top (Layer 12)
        addFace(p011, p111, p110, p010, 0, 12);

        // Bottom (-Y) -> dirt (Layer 9)
        addFace(p000, p100, p101, p001, 1, 9);

        // South (+Z) -> grass_block_side (Layer 13)
        addFace(p101, p001, p011, p111, 2, 13);

        // North (-Z) -> grass_block_side (Layer 13)
        addFace(p000, p100, p110, p010, 3, 13);

        // East (+X) -> grass_block_side (Layer 13)
        addFace(p100, p101, p111, p110, 4, 13);

        // West (-X) -> grass_block_side (Layer 13)
        addFace(p001, p000, p010, p011, 5, 13);
      }
    }

    return {
      vertexBuffer: vertexData,
      indexBuffer: indices.buffer,
      vertexCount,
      indexCount,
      chunkX: cx,
      chunkZ: cz,
    };
  }
}

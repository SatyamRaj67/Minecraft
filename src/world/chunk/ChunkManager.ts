import {
  CHUNK_SIZE_X,
  CHUNK_SIZE_Y,
  CHUNK_SIZE_Z,
  TERRAIN_VERTEX_STRIDE_BYTES,
} from "@/platform/gpu/GpuLimits";
import { Chunk, chunkKey, ChunkState, worldToChunkCoord } from "./Chunk";
import { ChunkMeshResult } from "@/renderer/geometry/ChunkMesher";
import { Logger } from "@/debug/Logger";
import { ChunkDrawCall } from "@/renderer/passes/GeometryPass";
import { Frustum } from "@/core/math/Frustum";

const MAX_UPLOADS_PER_FRAME = 2;
const MAX_UNLOADS_PER_FRAME = 4;

export class ChunkManager {
  private chunks = new Map<number, Chunk>(); // key → Chunk

  private playerCX = 0;
  private playerCZ = 0;

  constructor(private device: GPUDevice) {}

  setPlayerPosition(worldX: number, worldZ: number): void {
    const newCX = worldToChunkCoord(worldX, CHUNK_SIZE_X);
    const newCZ = worldToChunkCoord(worldZ, CHUNK_SIZE_Z);

    if (newCX !== this.playerCX || newCZ !== this.playerCZ) {
      this.playerCX = newCX;
      this.playerCZ = newCZ;
      // this.rebuildLoadList();
    }
  }

  update(requestGenFn: (cx: number, cz: number) => void): void {
    // TODO: LOADING UNLOADING MECHANISM
  }

  recieveMesh(result: ChunkMeshResult): void {
    const key = chunkKey(result.chunkX, result.chunkZ);
    const chunk = this.chunks.get(key);
    if (!chunk || chunk.state === ChunkState.UNLOADING) return;
    chunk.state = ChunkState.READY;

    // TODO: Do something to the pending meshes dude
  }

  buildDrawList(frustum: Frustum): ChunkDrawCall[] {
    const list: ChunkDrawCall[] = [];
    let culled = 0;

    for (const chunk of this.chunks.values()) {
      if (chunk.state !== ChunkState.RENDERABLE) continue;
      if (!chunk.gpuVertexBuffer || !chunk.gpuIndexBuffer) continue;

      const inFrustum = frustum.testAABB(
        chunk.worldMinX,
        0,
        chunk.worldMinZ,
        chunk.worldMaxX,
        CHUNK_SIZE_Y,
        chunk.worldMaxZ,
      );

      if (!inFrustum) {
        culled++;
        continue;
      }

      list.push({
        vertexBuffer: chunk.gpuVertexBuffer,
        indexBuffer: chunk.gpuIndexBuffer,
        indexCount: chunk.gpuIndexCount,
        modelMatrix: this.buildModelMatrix(chunk),
        objectBindGroup: this.getOrCreateObjectBindGroup(chunk),
      });
    }

    // TODO: Update frame stats with culled count
    return list;
  }

  private uploadMesh(result: ChunkMeshResult): void {
    const key = chunkKey(result.chunkX, result.chunkZ);
    const chunk = this.chunks.get(key);
    if (!chunk) return;

    this.freeChunkGpu(chunk);

    if (result.vertexCount === 0) {
      chunk.state = ChunkState.RENDERABLE;
      chunk.gpuIndexCount = 0;
      return;
    }

    const vbSize = result.vertexCount * TERRAIN_VERTEX_STRIDE_BYTES;
    const ibSize = result.indexCount * 4;

    chunk.gpuVertexBuffer = this.device.createBuffer({
      size: vbSize,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      label: `chunk_vb_${result.chunkX}_${result.chunkZ}`,
    });

    chunk.gpuIndexBuffer = this.device.createBuffer({
      size: ibSize,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      label: `chunk_ib_${result.chunkX}_${result.chunkZ}`,
    });

    this.device.queue.writeBuffer(
      chunk.gpuVertexBuffer,
      0,
      result.vertexBuffer,
    );
    this.device.queue.writeBuffer(chunk.gpuIndexBuffer, 0, result.indexBuffer);

    chunk.gpuIndexCount = result.indexCount;
    chunk.state = ChunkState.RENDERABLE;
    chunk.meshDirty = false;

    // TODO: Emit on the globalBus that the chunk has been loaded, so that the renderer can pick it up and render it

    Logger.verbose(
      "ChunkManager",
      `Uploaded chunk (${result.chunkX}, ${result.chunkZ}) — ${result.vertexCount} verts`,
    );
  }

  private unloadChunk(key: number, chunk: Chunk): void {
    chunk.state = ChunkState.UNLOADING;
    this.freeChunkGpu(chunk);
    this.chunks.delete(key);

    // TODO: Emit on the GlobalBus that the chunk has been unloaded, so that the renderer can stop rendering it
  }

  private freeChunkGpu(chunk: Chunk): void {
    chunk.gpuVertexBuffer?.destroy();
    chunk.gpuIndexBuffer?.destroy();
    chunk.gpuVertexBuffer = null;
    chunk.gpuIndexBuffer = null;
    chunk.gpuIndexCount = 0;
  }

  private modelMatrices = new Map<number, Float32Array>();

  private buildModelMatrix(chunk: Chunk): Float32Array {
    const key = chunkKey(chunk.cx, chunk.cz);
    let m = this.modelMatrices.get(key);
    if (!m) {
      m = new Float32Array(16);
      // Identity with translation to chunk world origin
      m[0] = 1;
      m[5] = 1;
      m[10] = 1;
      m[15] = 1;
      m[12] = chunk.worldMinX;
      m[13] = 0;
      m[14] = chunk.worldMinZ;
      this.modelMatrices.set(key, m);
    }
    return m;
  }
  private objectBindGroups = new Map<number, GPUBindGroup>();

  registerObjectBindGroup(cx: number, cz: number, bg: GPUBindGroup): void {
    this.objectBindGroups.set(chunkKey(cx, cz), bg);
  }

  private getOrCreateObjectBindGroup(chunk: Chunk): GPUBindGroup {
    const bg = this.objectBindGroups.get(chunkKey(chunk.cx, chunk.cz));
    if (!bg)
      throw new Error(
        `ChunkManager: missing object bind group for (${chunk.cx}, ${chunk.cz})`,
      );
    return bg;
  }

  destroy(): void {
    for (const chunk of this.chunks.values()) this.freeChunkGpu(chunk);
    this.chunks.clear();
    this.modelMatrices.clear();
    this.objectBindGroups.clear();
  }
}

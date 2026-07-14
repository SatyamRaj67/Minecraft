import {
  CHUNK_SIZE_X,
  CHUNK_SIZE_Y,
  CHUNK_SIZE_Z,
  TERRAIN_VERTEX_STRIDE_BYTES,
} from "@/platform/gpu/GpuLimits";
import {
  Chunk,
  chunkKey,
  chunkManhattanDistance,
  ChunkState,
  worldToChunkCoord,
} from "./Chunk";
import { ChunkDrawCall } from "@/renderer/passes/GeometryPass";
import { FrameStats } from "@/debug/FrameStats";
import { EngineEvent, globalBus } from "@/core/events/EventBus";
import { Logger } from "@/debug/Logger";
import { Frustum } from "@/core/math/Frustum";

// ! Till Chunk Mesher is not built
export interface ChunkMeshResult {
  vertexBuffer: ArrayBuffer;
  indexBuffer: ArrayBuffer;
  vertexCount: number;
  indexCount: number;
  chunkX: number;
  chunkZ: number;
}

const MAX_UPLOADS_PER_FRAME = 2;
const MAX_UNLOADS_PER_FRAME = 4;

export class ChunkManager {
  private chunks = new Map<number, Chunk>();
  private pendingMeshes: ChunkMeshResult[] = [];
  private uploadQueue: number[] = [];

  private playerCX = Infinity;
  private playerCZ = Infinity;

  public RENDER_DISTANCE_CHUNKS = 8;

  constructor(private device: GPUDevice) {}

  setPlayerPosition(worldX: number, worldZ: number): void {
    const newCX = worldToChunkCoord(worldX, CHUNK_SIZE_X);
    const newCZ = worldToChunkCoord(worldZ, CHUNK_SIZE_Z);

    if (newCX !== this.playerCX || newCZ !== this.playerCZ) {
      this.playerCX = newCX;
      this.playerCZ = newCZ;
      this.rebuildLoadList();
    }
  }

  buildDrawList(frustum: Frustum): ChunkDrawCall[] {
    const list: ChunkDrawCall[] = [];
    let culled = 0;

    for (const chunk of this.chunks.values()) {
      if (chunk.state !== ChunkState.RENDERABLE) continue;
      if (!chunk.gpuVertexBuffer || !chunk.gpuIndexBuffer) continue;
      if (chunk.gpuIndexCount <= 0) continue;

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

    FrameStats.set("culledChunks", culled);
    return list;
  }

  //   === Called Each Frame ===
  update(requestGenFn: (cx: number, cz: number) => void): void {
    let uploads = 0;
    while (this.pendingMeshes.length > 0 && uploads < MAX_UPLOADS_PER_FRAME) {
      const mesh = this.pendingMeshes.shift()!;
      this.uploadMesh(mesh);
      uploads++;
    }

    for (const key of this.uploadQueue) {
      const chunk = this.chunks.get(key);
      if (chunk && chunk.state === ChunkState.EMPTY) {
        chunk.state = ChunkState.GENERATING;
        requestGenFn(chunk.cx, chunk.cz);
      }
    }

    let unloads = 0;
    for (const [key, chunk] of this.chunks) {
      if (unloads >= MAX_UNLOADS_PER_FRAME) break;
      const dist = chunkManhattanDistance(
        chunk.cx,
        chunk.cz,
        this.playerCX,
        this.playerCZ,
      );
      if (dist > this.RENDER_DISTANCE_CHUNKS + 2) {
        this.unloadChunk(key, chunk);
        unloads++;
      }
    }

    FrameStats.set("activeChunks", this.chunks.size);
  }

  receiveMesh(result: ChunkMeshResult): void {
    const key = chunkKey(result.chunkX, result.chunkZ);
    const chunk = this.chunks.get(key);
    if (!chunk || chunk.state === ChunkState.UNLOADING) return;
    chunk.state = ChunkState.READY;
    this.pendingMeshes.push(result);
  }

  getBlock(cx: number, cz: number, lx: number, y: number, lz: number): number {
    const chunk = this.chunks.get(chunkKey(cx, cz));

    if (!chunk || chunk.state !== ChunkState.RENDERABLE) return 0;
    return chunk.getBlock(lx, y, lz);
  }

  // === Private Helpers ===
  private rebuildLoadList(): void {
    const R = this.RENDER_DISTANCE_CHUNKS;
    const toLoad: Array<{ key: number; dist: number; cx: number; cz: number }> =
      [];

    for (let dx = -R; dx <= R; dx++) {
      for (let dz = -R; dz <= R; dz++) {
        const cx = this.playerCX + dx;
        const cz = this.playerCZ + dz;
        const key = chunkKey(cx, cz);

        if (!this.chunks.has(key)) {
          const chunk = new Chunk(cx, cz);
          this.chunks.set(key, chunk);
        }

        toLoad.push({
          key,
          dist: Math.abs(dx) + Math.abs(dz),
          cx,
          cz,
        });
      }
    }

    // Sort by Manhattan distance to player
    toLoad.sort((a, b) => a.dist - b.dist);
    this.uploadQueue = toLoad.map((t) => t.key);
  }

  private uploadMesh(result: ChunkMeshResult): void {
    const key = chunkKey(result.chunkX, result.chunkZ);
    const chunk = this.chunks.get(key);
    if (!chunk) return;

    this.freeChunkGpu(chunk);

    if (result.vertexCount > 0) {
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
      this.device.queue.writeBuffer(
        chunk.gpuIndexBuffer,
        0,
        result.indexBuffer,
      );
      chunk.gpuIndexCount = result.indexCount;
    } else {
      chunk.gpuIndexCount = 0;
    }

    chunk.state = ChunkState.RENDERABLE;
    chunk.meshDirty = false;

    globalBus.emit(EngineEvent.CHUNK_LOADED, {
      cx: result.chunkX,
      cz: result.chunkZ,
    });
    Logger.verbose(
      "ChunkManager",
      `Uploaded chunk (${result.chunkX}, ${result.chunkZ}) — ` +
        `${result.vertexCount}verts`,
    );
  }

  private unloadChunk(key: number, chunk: Chunk): void {
    chunk.state = ChunkState.UNLOADING;
    this.freeChunkGpu(chunk);
    this.objectBindGroups.delete(chunkKey(chunk.cx, chunk.cz));
    this.modelMatrices.delete(chunkKey(chunk.cx, chunk.cz));
    this.chunks.delete(key);
    globalBus.emit(EngineEvent.CHUNK_UNLOADED, { cx: chunk.cx, cz: chunk.cz });
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

  getChunksWithoutBindGroups(): Array<{
    cx: number;
    cz: number;
    modelMatrix: Float32Array;
  }> {
    const result: Array<{ cx: number; cz: number; modelMatrix: Float32Array }> =
      [];
    for (const chunk of this.chunks.values()) {
      if (chunk.state !== ChunkState.RENDERABLE) continue;
      if (this.objectBindGroups.has(chunkKey(chunk.cx, chunk.cz))) continue;
      result.push({
        cx: chunk.cx,
        cz: chunk.cz,
        modelMatrix: this.buildModelMatrix(chunk),
      });
    }
    return result;
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

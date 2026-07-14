import {
  CHUNK_SIZE_X,
  CHUNK_SIZE_Z,
  CHUNK_VOLUME,
} from "@platform/gpu/GpuLimits";

export const enum ChunkState {
  EMPTY = 0,
  GENERATING = 1,
  READY = 2,
  MESHING = 3,
  RENDERABLE = 4,
  UNLOADING = 5,
}

export class Chunk {
  /**Block IDs - the single source of truth for chunk content. */
  readonly blocks: Uint16Array = new Uint16Array(CHUNK_VOLUME);

  /** Per-block combined sky+block light level (0-15 each, packed in u8). */
  readonly lightMap: Uint8Array = new Uint8Array(CHUNK_VOLUME);

  state: ChunkState = ChunkState.EMPTY;

  gpuVertexBuffer: GPUBuffer | null = null;
  gpuIndexBuffer: GPUBuffer | null = null;
  gpuIndexCount: number = 0;

  /** Chunk-local mesh dirty flag - for block changes */
  meshDirty: boolean = true;

  constructor(
    readonly cx: number, // Chunk X coordinate (world_x >> 4)
    readonly cz: number, // Chunk Z coordinate (world_z >> 4)
  ) {}

  getBlock(lx: number, y: number, lz: number): number {
    return this.blocks[this.idx(lx, y, lz)] ?? 0;
  }

  /** World-space AABB min corner (Y=0 always). */
  get worldMinX(): number {
    return this.cx * CHUNK_SIZE_X;
  }
  get worldMinZ(): number {
    return this.cz * CHUNK_SIZE_Z;
  }
  get worldMaxX(): number {
    return this.worldMinX + CHUNK_SIZE_X;
  }
  get worldMaxZ(): number {
    return this.worldMinZ + CHUNK_SIZE_Z;
  }

  private idx(lx: number, y: number, lz: number): number {
    return y * CHUNK_SIZE_X * CHUNK_SIZE_Z + lz * CHUNK_SIZE_X + lx;
  }
}

// === Chunk Coordinate Utils ===

export function worldToChunkCoord(
  worldCoord: number,
  chunkSize: number,
): number {
  return Math.floor(worldCoord / chunkSize);
}

export function chunkKey(cx: number, cz: number): number {
  // Pack two signed 16-bit integers into a 32-bit key
  // Supports ±32767 chunk coordinates = ±524,272 blocks from origin
  return ((cx & 0xffff) << 16) | (cz & 0xffff);
}

export function chunkKeyToCoords(key: number): { cx: number; cz: number } {
  const cx = ((key >> 16) << 16) >> 16; // Sign-extend upper 16 bits
  const cz = ((key & 0xffff) << 16) >> 16; // Sign-extend lower 16 bits
  return { cx, cz };
}

export function chunkManhattanDistance(
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  return Math.abs(ax - bx) + Math.abs(az - bz);
}

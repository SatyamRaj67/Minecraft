import { CTransform, CVelocity } from "@/core/ecs/Component";
import { Query } from "@/core/ecs/Query";
import { System } from "@/core/ecs/System";
import { World } from "@/core/ecs/World";
import { Logger } from "@/debug/Logger";
import { T_PX, T_PY, T_PZ } from "./components/TransformComponent";
import { V_VX, V_VY, V_VZ } from "./components/VelocityComponent";
import { entityIndex } from "@/core/ecs/Entity";
import { ChunkManager } from "../chunk/ChunkManager";
import {
  CHUNK_SIZE_X,
  CHUNK_SIZE_Y,
  CHUNK_SIZE_Z,
} from "@/platform/gpu/GpuLimits";
import { isOpaqueCube } from "../blocks/BlockModelRegistry";
import { EngineEvent, globalBus } from "@/core/events/EventBus";
import { FrameStats } from "@/debug/FrameStats";

// === Physics Constants ===
const GRAVITY = 28.0; // m/s²
const TERMINAL_VEL_Y = -78.4; // m/s  downward
const TERMINAL_VEL_XZ = 100.0; // m/s  horizontal

// === Player AABB Half Extents ===
const AABB_HW = 0.3; // half-width (full width = 0.6)
const AABB_H = 1.8; // full height
const AABB_HH = AABB_H;

export class PhysicsSystem implements System {
  readonly name = "PhysicsSystem";
  readonly dependencies: string[] = [];

  private collision: boolean = true;
  gravity: boolean = true;

  private groundedMap = new Map<number, boolean>();

  private moversQuery!: Query;

  private tBuf = new Float32Array(CTransform.stride);
  private vBuf = new Float32Array(CVelocity.stride);

  constructor(private chunkManager: ChunkManager) {}

  onInit(world: World): void {
    this.moversQuery = world.query({ all: [CTransform, CVelocity], none: [] });

    globalBus.on(EngineEvent.KEY_DOWN, ({ code }) => {
      if (code === "KeyC") this.collision = !this.collision;
    });

    Logger.info("PhysicsSystem: initialized");
  }

  execute(world: World, dt: number): void {
    world.flushQueries();

    const tBuf = this.tBuf;
    const vBuf = this.vBuf;

    this.moversQuery.forEach((entity, denseIdx, archetype) => {
      archetype.readComponent(entity, CTransform.id, tBuf);
      archetype.readComponent(entity, CVelocity.id, vBuf);

      const px = tBuf[T_PX]!,
        py = tBuf[T_PY]!,
        pz = tBuf[T_PZ]!;
      let vx = vBuf[V_VX]!,
        vy = vBuf[V_VY]!,
        vz = vBuf[V_VZ]!;

      //  const grounded = this.groundedMap.get(entityIndex(entity)) ?? false;
      if (this.gravity) {
        vy -= GRAVITY * dt;
        if (vy < TERMINAL_VEL_Y) vy = TERMINAL_VEL_Y;
      }

      // Clamp horizontal velocity
      vx = Math.max(-TERMINAL_VEL_XZ, Math.min(TERMINAL_VEL_XZ, vx));
      vz = Math.max(-TERMINAL_VEL_XZ, Math.min(TERMINAL_VEL_XZ, vz));

      // === Move One Axis at a time ===
      let npx = px,
        npy = py,
        npz = pz;
      let isGrounded = false;

      // X axis
      npx = px + vx * dt;
      if (this.collision && this.aabbCollidesWorld(npx, py, pz)) {
        npx = px;
        vx = 0;
      }

      // Y axis
      npy = py + vy * dt;
      if (this.collision && this.aabbCollidesWorld(npx, npy, pz)) {
        if (vy <= 0) isGrounded = true;
        npy = py;
        vy = 0;
      }

      // Z axis
      npz = pz + vz * dt;
      if (this.collision && this.aabbCollidesWorld(npx, npy, npz)) {
        npz = pz;
        vz = 0;
      }

      this.groundedMap.set(entityIndex(entity), isGrounded);

      if (isGrounded) {
        vx *= Math.pow(0.1, dt);
        vz *= Math.pow(0.1, dt);
      }

      tBuf[T_PX] = npx;
      tBuf[T_PY] = npy;
      tBuf[T_PZ] = npz;

      vBuf[V_VX] = vx;
      vBuf[V_VY] = vy;
      vBuf[V_VZ] = vz;

      archetype.writeComponent(entity, CTransform.id, tBuf);
      archetype.writeComponent(entity, CVelocity.id, vBuf);
    });

    FrameStats.set("collision", this.collision ? 1 : 0);
  }

  isGrounded(entityIdx: number): boolean {
    return this.groundedMap.get(entityIdx) ?? false;
  }

  // === AABB World Collision Detection ===
  private aabbCollidesWorld(px: number, py: number, pz: number): boolean {
    const minBX = Math.floor(px - AABB_HW);
    const maxBX = Math.floor(px + AABB_HW);
    const minBY = Math.floor(py);
    const maxBY = Math.floor(py + AABB_HH - 0.001);
    const minBZ = Math.floor(pz - AABB_HW);
    const maxBZ = Math.floor(pz + AABB_HW);

    for (let by = minBY; by <= maxBY; by++) {
      for (let bx = minBX; bx <= maxBX; bx++) {
        for (let bz = minBZ; bz <= maxBZ; bz++) {
          if (this.isSolid(bx, by, bz)) return true;
        }
      }
    }

    return false;
  }

  private isSolid(bx: number, by: number, bz: number): boolean {
    if (by < 0 || by >= CHUNK_SIZE_Y) return false; // Out of world bounds

    const cx = Math.floor(bx / CHUNK_SIZE_X);
    const cz = Math.floor(bz / CHUNK_SIZE_Z);

    const lx = ((bx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
    const lz = ((bz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;

    const blockId = this.chunkManager.getBlock(cx, cz, lx, by, lz);
    return isOpaqueCube(blockId);
  }
}

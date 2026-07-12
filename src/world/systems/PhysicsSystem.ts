import { CTransform, CVelocity } from "@/core/ecs/Component";
import { Query } from "@/core/ecs/Query";
import { System } from "@/core/ecs/System";
import { World } from "@/core/ecs/World";
import { Logger } from "@/debug/Logger";
import { T_PX, T_PY, T_PZ } from "./components/TransformComponent";
import { V_VX, V_VY, V_VZ } from "./components/VelocityComponent";
import { entityIndex } from "@/core/ecs/Entity";

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

  private groundedMap = new Map<number, boolean>();

  private moversQuery!: Query;

  private tBuf = new Float32Array(CTransform.stride);
  private vBuf = new Float32Array(CVelocity.stride);

  onInit(world: World): void {
    this.moversQuery = world.query({ all: [CTransform, CVelocity], none: [] });
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

      const grounded = this.groundedMap.get(entityIndex(entity)) ?? false;
      if (!grounded) {
        // vy -= GRAVITY * dt;
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
      // TODO: Add collision

      // Y axis
      npy = py + vy * dt;
      // TODO: Add collision

      // Z axis
      npz = pz + vz * dt;
      // TODO: Add collision

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
  }

  isGrounded(entityIdx: number): boolean {
    return this.groundedMap.get(entityIdx) ?? false;
  }
}

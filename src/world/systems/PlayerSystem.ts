import type { System } from "@core/ecs/System";
import { CTransform, CVelocity } from "@core/ecs/Component";
import { Renderer } from "@/renderer/Renderer";
import { InputManager } from "@/platform/web/InputManager";
import { Logger } from "@/debug/Logger";
import {
  PITCH_MAX,
  PITCH_MIN,
  T_PITCH,
  T_PX,
  T_PY,
  T_PZ,
  T_YAW,
  transformMake,
} from "./components/TransformComponent";
import { EngineEvent, globalBus } from "@/core/ecs/events/EventBus";
import { V_VX, V_VY, V_VZ, velocityMake } from "./components/VelocityComponent";
import { FrameStats } from "@/debug/FrameStats";
import { Entity, entityIndex } from "@/core/ecs/Entity";
import { World } from "@/core/ecs/World";
import { PhysicsSystem } from "./PhysicsSystem";

// === Movement Constants ===
const WALK_SPEED = 4.317; // m/s
const SPRINT_SPEED = 5.612; // m/s
const FLY_SPEED = 10.0; // m/s
const JUMP_IMPULSE = 8.4; // m/s upward
const MOUSE_SENS = 0.0015; // rad per pixel

export class PlayerSystem implements System {
  readonly name = "PlayerSystem";
  readonly dependencies: string[] = ["PhysicsSystem"];

  private playerEntity: Entity | null = null;
  private flyMode = true;
  private spawnY = 80;

  private tBuf = new Float32Array(CTransform.stride);
  private vBuf = new Float32Array(CVelocity.stride);

  constructor(
    private input: InputManager,
    private renderer: Renderer,
    private physics: PhysicsSystem,
    private onPositionChanged?: (x: number, z: number) => void,
  ) {}

  onInit(world: World): void {
    this.playerEntity = this.spawnPlayer(world);
    Logger.info("PlayerSystem: initialized");

    globalBus.on(EngineEvent.MOUSE_BUTTON, ({ button, pressed }) => {
      if (button === 0 && pressed && !this.input.isPointerLocked) {
        this.input.requestPointerLock();
      }
    });

    // Fly mode toggle
    globalBus.on(EngineEvent.KEY_DOWN, ({ code }) => {
      if (code === "KeyF") this.flyMode = !this.flyMode;
    });
  }

  execute(world: World, dt: number): void {
    if (!this.playerEntity) return;
    const entity = this.playerEntity;

    world.getComponent(entity, CTransform, this.tBuf);
    world.getComponent(entity, CVelocity, this.vBuf);

    if (this.input.isPointerLocked) {
      const { dx, dy } = this.input.mouseDelta;
      this.tBuf[T_YAW]! += dx * MOUSE_SENS;
      this.tBuf[T_PITCH]! -= dy * MOUSE_SENS;
      this.tBuf[T_PITCH] = Math.max(
        PITCH_MIN,
        Math.min(PITCH_MAX, this.tBuf[T_PITCH]!),
      );
    }

    const yaw = this.tBuf[T_YAW]!;
    const pitch = this.tBuf[T_PITCH]!;

    // === Keyboard Movement ===
    const sprinting = this.input.isKeyDown("ShiftLeft");
    const speed = this.flyMode
      ? FLY_SPEED
      : sprinting
        ? SPRINT_SPEED
        : WALK_SPEED;

    const sinYaw = Math.sin(yaw);
    const cosYaw = Math.cos(yaw);

    let moveX = 0,
      moveZ = 0;

    // Forward/back: move along camera's horizontal facing direction
    if (this.input.isKeyDown("KeyW") || this.input.isKeyDown("ArrowUp")) {
      moveX += sinYaw;
      moveZ += -cosYaw;
    }
    if (this.input.isKeyDown("KeyS") || this.input.isKeyDown("ArrowDown")) {
      moveX += -sinYaw;
      moveZ += cosYaw;
    }
    // Strafe
    if (this.input.isKeyDown("KeyA") || this.input.isKeyDown("ArrowLeft")) {
      moveX += -cosYaw;
      moveZ += -sinYaw;
    }
    if (this.input.isKeyDown("KeyD") || this.input.isKeyDown("ArrowRight")) {
      moveX += cosYaw;
      moveZ += sinYaw;
    }

    // Normalize diagonal movement
    const moveLen = Math.hypot(moveX, moveZ);
    if (moveLen > 0) {
      moveX = (moveX / moveLen) * speed;
      moveZ = (moveZ / moveLen) * speed;
    }

    this.vBuf[V_VX] = moveX;
    this.vBuf[V_VZ] = moveZ;

    // === FLY MODE VERTICAL MOVEMENT ===
    if (this.flyMode) {
      let vy = 0;
      if (this.input.isKeyDown("Space")) vy = FLY_SPEED;
      if (this.input.isKeyDown("ShiftLeft")) vy = -FLY_SPEED;
      this.vBuf[V_VY] = vy;
    } else {
      // Jump impulse
      const grounded = this.physics.isGrounded(entityIndex(entity));
      if (this.input.isKeyJustPressed("Space") && grounded) {
        this.vBuf[V_VY] = JUMP_IMPULSE;
      }
    }

    world.setComponent(entity, CVelocity, this.vBuf);
    world.setComponent(entity, CTransform, this.tBuf);

    // === Push Camera State to Renderer
    this.renderer.camera.position[0] = this.tBuf[T_PX]!;
    this.renderer.camera.position[1] = this.tBuf[T_PY]! + 1.62; // Eye height
    this.renderer.camera.position[2] = this.tBuf[T_PZ]!;
    this.renderer.camera.yaw = yaw;
    this.renderer.camera.pitch = pitch;

    const pos = this.getPosition();
    FrameStats.set("cameraX", pos[0]);
    FrameStats.set("cameraY", pos[1]);
    FrameStats.set("cameraZ", pos[2]);
    FrameStats.set("cameraYaw", this.renderer.camera.yaw);
    FrameStats.set("cameraPitch", this.renderer.camera.pitch);
    FrameStats.set("pointerLocked", this.input.isPointerLocked ? 1 : 0);
    FrameStats.set("flyMode", this.flyMode ? 1 : 0);

    // === Update Chunk Loader Position ===
    const px = this.tBuf[T_PX]!;
    const pz = this.tBuf[T_PZ]!;
    this.onPositionChanged?.(px, pz);
  }

  onDestroy(world: World): void {
    if (this.playerEntity) world.despawn(this.playerEntity);
  }

  getPosition(): [number, number, number] {
    return [this.tBuf[T_PX]!, this.tBuf[T_PY]!, this.tBuf[T_PZ]!];
  }

  private spawnPlayer(world: World): Entity {
    const entity = world.spawn();
    const t = transformMake(8, this.spawnY, 9, 0, -0.3);
    const v = velocityMake();
    world.addComponent(entity, CTransform, t);
    world.addComponent(entity, CVelocity, v);
    return entity;
  }
}

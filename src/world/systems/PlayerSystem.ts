import type { System } from "@core/ecs/System";
import { CTransform, CVelocity } from "@core/ecs/Component";
import { Renderer } from "@/renderer/Renderer";
import { InputManager } from "@/platform/web/InputManager";
import { Logger } from "@/debug/Logger";
import {
  PITCH_MAX,
  PITCH_MIN,
  T_PITCH,
  T_YAW,
} from "./components/TransformComponent";
import { EngineEvent, globalBus } from "@/core/ecs/events/EventBus";
import { V_VX, V_VY, V_VZ } from "./components/VelocityComponent";

// === Movement Constants ===
const WALK_SPEED = 4.317; // m/s
const SPRINT_SPEED = 5.612; // m/s
const FLY_SPEED = 10.0; // m/s
const JUMP_IMPULSE = 8.4; // m/s upward
const MOUSE_SENS = 0.0015; // rad per pixel

export class PlayerSystem implements System {
  readonly name = "PlayerSystem";
  readonly dependencies: string[] = [];

  private playerEntity: null = null;
  private flyMode = false;
  private spawnY = 80;

  private tBuf = new Float32Array(CTransform.stride);
  private vBuf = new Float32Array(CVelocity.stride);

  constructor(
    private input: InputManager,
    private renderer: Renderer,
  ) {}

  onInit(): void {
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

  execute(dt: number): void {
    if (this.playerEntity) return;

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
      moveX += -sinYaw;
      moveZ += -cosYaw;
    }
    if (this.input.isKeyDown("KeyS") || this.input.isKeyDown("ArrowDown")) {
      moveX += sinYaw;
      moveZ += cosYaw;
    }
    // Strafe
    if (this.input.isKeyDown("KeyA") || this.input.isKeyDown("ArrowLeft")) {
      moveX += -cosYaw;
      moveZ += sinYaw;
    }
    if (this.input.isKeyDown("KeyD") || this.input.isKeyDown("ArrowRight")) {
      moveX += cosYaw;
      moveZ += -sinYaw;
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
      // TODO: JUMP IMPULSE
    }
  }
}

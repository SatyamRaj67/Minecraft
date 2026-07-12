import { System } from "@/core/ecs/System";
import { World } from "@/core/ecs/World";
import { Logger } from "@/debug/Logger";
import { Renderer } from "@/renderer/Renderer";

const DEFAULT_FOV_Y = Math.PI / 3; // 60 degrees
const SPRINT_FOV_Y = Math.PI / 2.8; // ~64.3 degrees
const FOV_LERP_SPEED = 8.0; // FOV Interpolation speed

export class CameraSystem implements System {
  readonly name = "CameraSystem";
  readonly dependencies: string[] = ["PlayerSystem"];

  // Shake State
  private shakeX = 0;
  private shakeY = 0;
  private shakeDecay = 8.0; // Exponential decary per second

  // FOV Interpolation
  private currentFovY = DEFAULT_FOV_Y;
  private targetFovY = DEFAULT_FOV_Y;

  constructor(private renderer: Renderer) {}

  onInit(_world: World): void {
    this.renderer.camera.fovY = DEFAULT_FOV_Y;
    Logger.info("CameraSystem: initialized");
  }

  execute(_world: World, dt: number): void {
    // === FOV Interpolation ===
    const fovDelta = this.targetFovY - this.currentFovY;
    this.currentFovY += fovDelta * Math.min(FOV_LERP_SPEED * dt, 1.0);
    this.renderer.camera.fovY = this.currentFovY;

    // === Camera Shake ===
    if (Math.abs(this.shakeX) > 0.0001 || Math.abs(this.shakeY) > 0.0001) {
      const decay = Math.pow(this.shakeDecay, -dt);
      this.shakeX *= decay;
      this.shakeY *= decay;

      // Apply shake as pitch/yaw offset on top of what PlayerSystem set
      this.renderer.camera.yaw += this.shakeX;
      this.renderer.camera.pitch += this.shakeY;
    }
  }

  //   === Public APIs to play ===

  /**Trigger a camera shake, intensity is in radians of angular offset */
  shake(intensity: number, decay = 8.0): void {
    this.shakeX += (Math.random() * 2 - 1) * intensity;
    this.shakeY += (Math.random() * 2 - 1) * intensity;
    this.shakeDecay = decay;
  }

  /** Set sprint FOV transition */
  setSprinting(active: boolean): void {
    this.targetFovY = active ? SPRINT_FOV_Y : DEFAULT_FOV_Y;
  }

  setFov(fovY: number): void {
    this.targetFovY = fovY;
  }

  get fovY(): number {
    return this.currentFovY;
  }
}

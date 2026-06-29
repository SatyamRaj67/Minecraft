/**
 * Renderer.ts —  Frame render graph orchestrator
 *
 * * Sequence of actions to be done:
 * 1. materialSystem.applyPendingReloads()    — atomic hot-swap
 * 2. Update frustum from camera matrices
 * 3. chunkManager.buildDrawList(frustum)     — CPU cull
 * 4. geometryPass.visibleChunks = drawList   — inject into pass
 * 5. Upload camera UBO via queue.writeBuffer
 * 6. renderGraph.reset() + rebuild passes
 * 7. renderGraph.compile()                   — sort, validate
 * 8. encoder = device.createCommandEncoder()
 * 9. renderGraph.execute(encoder, swapView)  — record all passes
 * 10. device.queue.submit([encoder.finish()])
 * 11. gpuTimestamps.resolve(encoder)          — async timing readback
 */

import { m4Multiply, m4Perspective, mat4 } from "@/core/math/Mat4";
import { vec3, Vec3Like } from "@/core/math/Vec3";
import { Logger } from "@/debug/Logger";
import { createUniformBuffer, type GpuBuffer } from "@/platform/gpu/GpuBuffer";
import { CAMERA_UBO_SIZE, FRAMES_IN_FLIGHT } from "@/platform/gpu/GpuLimits";

// === Camera State ===

export interface CameraState {
  position: Vec3Like; // vec3
  yaw: number; // radians
  pitch: number; // radians
  fovY: number; // radians
  near: number;
  far: number;
}

export class Renderer {
  // Camera UBO
  private cameraUBOs: GpuBuffer[] = [];
  private cameraUboFrame: number = 0;
  private cameraUboData = new Float32Array(CAMERA_UBO_SIZE / 4);

  private viewMatrix = mat4();
  private projMatrix = mat4();
  private vpMatrix = mat4(); // view-projection matrix

  private eye = vec3();
  private center = vec3();

  private width: number = 0;
  private height: number = 0;

  camera: CameraState = {
    position: vec3(0, 80, 0),
    yaw: 0,
    pitch: 0,
    fovY: Math.PI / 3,
    near: 0.1,
    far: 1000,
  };

  constructor(
    private device: GPUDevice,
    private context: GPUCanvasContext,
    private format: GPUTextureFormat,
  ) {
    // TODO: Initialize Render Graph
    // TODO: Initialize Geomtery Pass
    // TODO: Initialize Material System
  }

  async init(width: number, height: number): Promise<void> {
    this.width = width;
    this.height = height;

    // TODO: Initialize Geometry Pass

    for (let i = 0; i < FRAMES_IN_FLIGHT; i++) {
      this.cameraUBOs.push(
        createUniformBuffer(this.device, CAMERA_UBO_SIZE, `CameraUBO[${i}]`),
      );
    }

    // TODO: Register Terrain Material

    Logger.info(`Renderer: initialized ${width}×${height}`);
  }

  renderFrame() // TODO: chunkManager: ChunkManager,
  // TODO: _arena: Arena
  : void {
    this.updateCameraMatrices();
  }

  private updateCameraMatrices(): void {
    const cam = this.camera;
    const aspect = this.width / this.height;

    m4Perspective(this.projMatrix, cam.fovY, aspect, cam.near, cam.far);

    const cosP = Math.cos(cam.pitch);
    const fwdX = Math.cos(cam.yaw) * cosP;
    const fwdY = Math.sin(cam.pitch);
    const fwdZ = Math.sin(cam.yaw) * cosP;

    this.eye[0] = cam.position[0]!;
    this.eye[1] = cam.position[1]!;
    this.eye[2] = cam.position[2]!;
    this.center[0] = this.eye[0] + fwdX;
    this.center[1] = this.eye[1] + fwdY;
    this.center[2] = this.eye[2] + fwdZ;

    m4Multiply(this.vpMatrix, this.viewMatrix, this.projMatrix);

    // Offsets: view@0, proj@16, viewProj@32, (invProj@48 — skip for now), pos@64, time@67
    this.cameraUboData.set(this.viewMatrix, 0);
    this.cameraUboData.set(this.projMatrix, 16);
    this.cameraUboData.set(this.vpMatrix, 32);
    this.cameraUboData[64] = cam.position[0]!;
    this.cameraUboData[65] = cam.position[1]!;
    this.cameraUboData[66] = cam.position[2]!;
    this.cameraUboData[67] = performance.now() / 1000;
    this.cameraUboData[68] = cam.near;
    this.cameraUboData[69] = cam.far;
  }

  onResize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    // TODO: Update swapchain size in render graph
    // TODO: Notify geometry pass of resize

    Logger.verbose("Renderer", `Resized to ${width}×${height}`);
  }

  destroy(): void {
    for (const ubo of this.cameraUBOs) ubo.destroy();

    // TODO: KILL SWITCH
    // Destroy render graph, geometry pass, material system, etc.

    Logger.info("Renderer: destroyed");
  }
}

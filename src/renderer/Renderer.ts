import { assert } from "@/debug/Assert";
import { Logger } from "@/debug/Logger";
import { GeometryPass } from "./passes/GeometryPass";
import { vec3, Vec3 } from "wgpu-matrix";
import { CAMERA_UBO_SIZE, FRAMES_IN_FLIGHT } from "@/platform/gpu/GpuLimits";
import { RenderGraph } from "./graph/RenderGraph";
import { createUniformBuffer, GpuBuffer } from "@/platform/gpu/GpuBuffer";
import { MaterialSystem } from "./materials/MaterialSystem";
import { FrameStats } from "@/debug/FrameStats";

// === Camera State ===
export interface CameraState {
  position: Vec3; // vec3
  yaw: number; // radians
  pitch: number; // radians
  fovY: number; // radians
  near: number;
  far: number;
}

export class Renderer {
  private graph: RenderGraph;
  private geometryPass: GeometryPass;
  private materials: MaterialSystem;

  private width: number = 1;
  private height: number = 1;

  private cameraUBOs: GpuBuffer[] = [];
  private cameraUboFrame = 0;
  private cameraUboData = new Float32Array(CAMERA_UBO_SIZE / 4);

  camera: CameraState = {
    position: vec3.create(0, 80, 0),
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
    this.graph = new RenderGraph(device, 1, 1);
    this.geometryPass = new GeometryPass();
    this.materials = new MaterialSystem(device);
  }

  async init(width: number, height: number): Promise<void> {
    this.width = width;
    this.height = height;

    this.geometryPass.onInit(this.device, this.format);

    // Camera UBO Ring (FRAMES_IN_FLIGHT staging buffers)
    for (let i = 0; i < FRAMES_IN_FLIGHT; i++) {
      this.cameraUBOs.push(
        createUniformBuffer(this.device, CAMERA_UBO_SIZE, `Camera UBO ${i}`),
      );
    }

    this.graph.updateSwapchainSize(width, height);
    Logger.info(`Renderer: initialized ${width}x${height}`);
  }

  renderFrame(): void {
    this.materials.applyPendingReloads();

    const uboSlot = this.cameraUBOs[this.cameraUboFrame % FRAMES_IN_FLIGHT];
    assert(uboSlot !== undefined, "Camera UBO ring not initialized");
    uboSlot.write(this.device, this.cameraUboData);
    this.cameraUboFrame++;

    this.graph.reset();

    // ! ADD ALL NEESSARY PASSES HERE

    this.graph.compile();

    const encoder = this.device.createCommandEncoder({
      label: `Frame_${FrameStats.frameNumber}`,
    });
    const swapTexture = this.context.getCurrentTexture();
    const swapView = swapTexture.createView();

    this.graph.execute(encoder, swapView);

    this.device.queue.submit([encoder.finish()]);

    FrameStats.set("vramBytes", 0);
  }

  onResize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    Logger.verbose("Renderer", `Resized to ${width}×${height}`);
  }

  destroy(): void {
    Logger.info("Renderer: destroyed");
  }
}

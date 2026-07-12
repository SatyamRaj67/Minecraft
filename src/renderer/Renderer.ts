import { assert } from "@/debug/Assert";
import { Logger } from "@/debug/Logger";
import { ChunkDrawCall, GeometryPass } from "./passes/GeometryPass";
import { mat4, vec3, Vec3 } from "wgpu-matrix";
import {
  BindGroup,
  CAMERA_UBO_SIZE,
  FrameBinding,
  FRAMES_IN_FLIGHT,
  GPU_COLOR_FORMAT,
  GPU_DEPTH_FORMAT,
  GPU_NORMAL_FORMAT,
  MaterialBinding,
} from "@/platform/gpu/GpuLimits";
import { RenderGraph } from "./graph/RenderGraph";
import { createUniformBuffer, GpuBuffer } from "@/platform/gpu/GpuBuffer";
import { MaterialSystem } from "./materials/MaterialSystem";
import { FrameStats } from "@/debug/FrameStats";
import { TextureAtlasPacker } from "@assets/TextureAtlasPacker";

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
  private atlas: TextureAtlasPacker;

  private cameraUBOs: GpuBuffer[] = [];
  private cameraUboFrame = 0;
  private cameraUboData: Float32Array<ArrayBuffer> = new Float32Array(
    CAMERA_UBO_SIZE / 4,
  );

  // Frame-level bind group (group 0) — camera + lighting, rebuilt on resize
  private frameBindGroup!: GPUBindGroup;
  private frameBindGroupLayout!: GPUBindGroupLayout;

  // Material bind group layout (group 1) — texture array + sampler
  private materialBindGroup!: GPUBindGroup;
  private atlasView!: GPUTextureView;
  private atlasSampler!: GPUSampler;

  // Per-chunk object UBOs and bind groups (group 2) — model matrices
  private objectUBOs = new Map<number, GpuBuffer>(); // chunkKey → UBO
  private objectBindGroups = new Map<number, GPUBindGroup>(); // chunkKey → BG
  private objectBindGroupLayout!: GPUBindGroupLayout;

  // ! TEMP
  private debugDrawCalls: ChunkDrawCall[] = [];

  private viewMatrix = mat4.create();
  private projMatrix = mat4.create();
  private vpMatrix = mat4.create();
  private eye = vec3.create();
  private center = vec3.create();
  private up = vec3.create(0, 1, 0);

  private width: number = 1;
  private height: number = 1;

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
    this.atlas = new TextureAtlasPacker();
  }

  async init(width: number, height: number): Promise<void> {
    this.width = width;
    this.height = height;

    // Camera UBO Ring (FRAMES_IN_FLIGHT staging buffers)
    for (let i = 0; i < FRAMES_IN_FLIGHT; i++) {
      this.cameraUBOs.push(
        createUniformBuffer(this.device, CAMERA_UBO_SIZE, `Camera UBO ${i}`),
      );
    }

    let atlasResult;
    try {
      atlasResult = await this.atlas.pack(
        this.device,
        "/assets/textures/block/",
        false, // no mipmaps — pixel-art look
      );
      Logger.info(
        `Renderer: atlas loaded - ${atlasResult.totalLayers} layers, ${atlasResult.missing.length} missing`,
      );
    } catch (err) {
      Logger.warn(
        "Renderer: atlas load failed, using fallback 1-layer texture",
        { err },
      );
      atlasResult = this.createFallbackAtlas();
    }

    this.atlasView = atlasResult.view;

    this.atlasSampler = this.device.createSampler({
      label: "AtlasSampler",
      magFilter: "nearest",
      minFilter: "nearest",
      mipmapFilter: "nearest",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    });

    this.geometryPass.onInit(this.device, this.format);

    this.buildBindGroupLayouts();

    this.rebuildFrameBindGroup();
    this.rebuildMaterialBindGroup();

    // const debugChunk = createDebugCubeChunk(
    //   this.device,
    //   this.objectBindGroupLayout,
    // );
    // this.debugDrawCalls = [debugChunk];
    this.geometryPass.setDrawCalls(this.debugDrawCalls);

    this.graph.updateSwapchainSize(width, height);
    Logger.info(`Renderer: initialized ${width}x${height}`);
  }

  // === Resize ===
  onResize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.graph.updateSwapchainSize(width, height);
    this.geometryPass.onResize?.(width, height);

    Logger.verbose("Renderer", `Resized to ${width}×${height}`);
  }

  // === Render Frame ===
  renderFrame(): void {
    this.materials.applyPendingReloads();

    this.updateCameraMatrices();

    const uboSlot = this.cameraUBOs[this.cameraUboFrame % FRAMES_IN_FLIGHT];
    assert(uboSlot !== undefined, "Camera UBO ring not initialized");
    uboSlot.write(this.device, this.cameraUboData);
    this.cameraUboFrame++;

    // const drawList = ;

    this.graph.reset();
    this.graph.declareResource({
      handle: "gbuffer_albedo",
      format: GPU_COLOR_FORMAT,
    });
    this.graph.declareResource({
      handle: "gbuffer_normal",
      format: GPU_NORMAL_FORMAT,
    });
    this.graph.declareResource({
      handle: "gbuffer_depth",
      format: GPU_DEPTH_FORMAT,
    });

    // ! ADD ALL NEESSARY PASSES HERE
    this.graph.addPass({
      name: "GeometryPass",
      pass: this.geometryPass,
      reads: [],
      writes: ["gbuffer_albedo", "gbuffer_normal", "gbuffer_depth"],
    });

    this.graph.compile();

    const encoder = this.device.createCommandEncoder({
      label: `Frame_${FrameStats.frameNumber}`,
    });
    const swapTexture = this.context.getCurrentTexture();
    const swapView = swapTexture.createView();

    this.graph.execute(encoder, swapView);
    this.device.queue.submit([encoder.finish()]);

    FrameStats.set("vramBytes", this.estimateVramUsage());
  }

  // === Camera Shit ===
  private updateCameraMatrices(): void {
    const cam = this.camera;
    const aspect = this.width / Math.max(this.height, 1);

    mat4.perspective(cam.fovY, aspect, cam.near, cam.far, this.projMatrix);

    // Compute forward vector from yaw + pitch
    const cosP = Math.cos(cam.pitch);
    const fwdX = Math.sin(cam.yaw) * cosP;
    const fwdY = Math.sin(cam.pitch);
    const fwdZ = -Math.cos(cam.yaw) * cosP; // -Z is forward in right-handed

    this.eye[0] = cam.position[0]!;
    this.eye[1] = cam.position[1]!;
    this.eye[2] = cam.position[2]!;
    this.center[0] = this.eye[0] + fwdX;
    this.center[1] = this.eye[1] + fwdY;
    this.center[2] = this.eye[2] + fwdZ;

    mat4.lookAt(this.eye, this.center, this.up, this.viewMatrix);
    mat4.multiply(this.projMatrix, this.viewMatrix, this.vpMatrix);

    // Pack UBO:
    // view@0(16f),
    // proj@16(16f),
    // viewProj@32(16f),
    // pos@64(3f),
    // time@67,
    // near@68,
    // far@69
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

  // === Bind Group Management ===
  private buildBindGroupLayouts(): void {
    const pipeline = this.geometryPass.getPipeline();

    this.frameBindGroupLayout = pipeline.getBindGroupLayout(BindGroup.FRAME);
    this.objectBindGroupLayout = pipeline.getBindGroupLayout(BindGroup.OBJECT);

    Logger.verbose("Renderer", "Bind group layouts extracted from pipeline");
  }

  private rebuildFrameBindGroup(): void {
    const ubo = this.cameraUBOs[0]!;

    this.frameBindGroup = this.device.createBindGroup({
      label: "FrameBindGroup",
      layout: this.frameBindGroupLayout,
      entries: [
        {
          binding: FrameBinding.CAMERA_UBO,
          resource: { buffer: ubo.buffer },
        },
      ],
    });

    this.geometryPass.frameBindGroup = this.frameBindGroup;
  }

  private rebuildMaterialBindGroup(): void {
    const matLayout = this.geometryPass
      .getPipeline()
      .getBindGroupLayout(BindGroup.MATERIAL);

    this.materialBindGroup = this.device.createBindGroup({
      label: "MaterialBindGroup",
      layout: matLayout,
      entries: [
        {
          binding: MaterialBinding.ALBEDO_ATLAS,
          resource: this.atlasView,
        },
        {
          binding: MaterialBinding.ATLAS_SAMPLER,
          resource: this.atlasSampler,
        },
      ],
    });

    this.geometryPass.materialBindGroup = this.materialBindGroup;
  }

  // === Helpers ===
  private estimateVramUsage(): number {
    let total = 0;
    for (const ubo of this.cameraUBOs) total += ubo.byteSize;
    for (const ubo of this.objectUBOs.values()) total += ubo.byteSize;
    return total;
  }

  private createFallbackAtlas(): {
    view: GPUTextureView;
    layerMap: Map<
      string,
      import("@assets/TextureAtlasPacker").TextureLayerInfo
    >;
    totalLayers: number;
    missing: string[];
  } {
    const texture = this.device.createTexture({
      label: "FallbackAtlas",
      size: {
        width: 16,
        height: 16,
        depthOrArrayLayers: 1,
      },
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });

    // Fill with magenta
    const data = new Uint8Array(16 * 16 * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;
      data[i + 1] = 0;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }

    this.device.queue.writeTexture(
      { texture: texture },
      data,
      { bytesPerRow: 64 },
      { width: 16, height: 16, depthOrArrayLayers: 1 },
    );
    return {
      view: texture.createView({ dimension: "2d-array", arrayLayerCount: 1 }),
      layerMap: new Map(),
      totalLayers: 1,
      missing: [],
    };
  }

  destroy(): void {
    for (const ubo of this.cameraUBOs) ubo.destroy();
    for (const ubo of this.objectUBOs.values()) ubo.destroy();
    this.graph.destroy();
    this.materials.destroy();
    this.geometryPass.onDestroy();
    Logger.info("Renderer: destroyed");
  }
}

import { RenderPass } from "./RenderPass";
import { Logger } from "@/debug/Logger";
import {
  BindGroup,
  GPU_COLOR_FORMAT,
  GPU_DEPTH_FORMAT,
  GPU_NORMAL_FORMAT,
  TERRAIN_VERTEX_STRIDE_BYTES,
} from "@/platform/gpu/GpuLimits";
import { FrameStats } from "@/debug/FrameStats";

import terrainVert from "../shaders/terrain/terrain.vert.wgsl";
import terrainFrag from "../shaders/terrain/terrain.frag.wgsl";

export interface ChunkDrawCall {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexCount: number;

  /** Pre-computed model matrix for the chunk's origin (16 floats, column-major) */
  modelMatrix: Float32Array;
  objectBindGroup: GPUBindGroup;
}

export class GeometryPass implements RenderPass {
  readonly name = "GeometryPass";
  lastDrawCallCount = 0;

  private device!: GPUDevice;
  private pipeline!: GPURenderPipeline;

  // ! ADDED FOR SIMPLICITY ONLY FOR NOW..
  private drawCalls: ChunkDrawCall[] = [];

  frameBindGroup!: GPUBindGroup;
  materialBindGroup!: GPUBindGroup;

  onInit(device: GPUDevice, _format: GPUTextureFormat): void {
    this.device = device;
    this.pipeline = this.buildPipeline(device, _format);

    Logger.info("GeometryPass initialized");
  }

  getPipeline(): GPURenderPipeline {
    return this.pipeline;
  }

  onResize(_w: number, _h: number): void {}

  setDrawCalls(drawCalls: ChunkDrawCall[]): void {
    this.drawCalls = drawCalls;
  }

  execute(
    encoder: GPUCommandEncoder,
    resources: ReadonlyMap<string, GPUTextureView>,
  ): void {
    const albedoView = resources.get("swapchain");
    const normalView = resources.get("gbuffer_normal");
    const depthView = resources.get("gbuffer_depth");

    if (!albedoView || !normalView || !depthView) {
      Logger.error("GeometryPass: missing required resource views");
      return;
    }

    if (!this.frameBindGroup || !this.materialBindGroup) {
      Logger.warn("GeometryPass: bind groups not yet assigned — skipping draw");
      return;
    }

    const renderPassDescriptor: GPURenderPassDescriptor = {
      label: "GeometryPass",
      colorAttachments: [
        {
          view: albedoView,
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0.53, g: 0.81, b: 0.98, a: 1 },
        },
        {
          view: normalView,
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0.5, g: 0.5, b: 1.0, a: 1 },
        },
      ],
      depthStencilAttachment: {
        view: depthView,
        depthLoadOp: "clear",
        depthStoreOp: "store",
        depthClearValue: 1.0,
      },
    };

    const passEncoder = encoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(BindGroup.FRAME, this.frameBindGroup);
    passEncoder.setBindGroup(BindGroup.MATERIAL, this.materialBindGroup);

    this.lastDrawCallCount = 0;

    for (const draw of this.drawCalls) {
      passEncoder.setBindGroup(BindGroup.OBJECT, draw.objectBindGroup);
      passEncoder.setVertexBuffer(0, draw.vertexBuffer);
      passEncoder.setIndexBuffer(draw.indexBuffer, "uint32");
      passEncoder.drawIndexed(draw.indexCount, 1, 0, 0, 0);

      this.lastDrawCallCount++;
      FrameStats.increment("chunkDraws");
      FrameStats.increment("triangles", draw.indexCount / 3);
    }

    passEncoder.end();
    FrameStats.set("drawCalls", this.lastDrawCallCount);
  }

  onDestroy(): void {}

  private buildPipeline(device: GPUDevice, format: GPUTextureFormat): GPURenderPipeline {
    const shaderModule = device.createShaderModule({
      label: "terrain-shader",
      code: terrainVert + "\n" + terrainFrag,
    });

    return device.createRenderPipeline({
      label: "GeometryPass/Pipeline",
      layout: "auto",
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: TERRAIN_VERTEX_STRIDE_BYTES, // 28 bytes
            attributes: [
              // position: vec3f @ offset 0
              { shaderLocation: 0, offset: 0, format: "float32x3" },
              // texcoord: vec2f @ offset 12
              { shaderLocation: 1, offset: 12, format: "float32x2" },
              // textureLayer: u32 @ offset 20
              { shaderLocation: 2, offset: 20, format: "uint32" },
              // packedNL: u32 @ offset 24
              { shaderLocation: 3, offset: 24, format: "uint32" },
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_main",
        targets: [
          { format: format }, // albedo
          { format: GPU_NORMAL_FORMAT }, // normals
        ],
      },
      depthStencil: {
        format: GPU_DEPTH_FORMAT,
        depthWriteEnabled: true,
        depthCompare: "less",
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "none",
      },
    });
  }
}

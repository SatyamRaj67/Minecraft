import terrainVert from "../shaders/terrain/terrain.vert.wgsl";
import terrainFrag from "../shaders/terrain/terrain.frag.wgsl";
import { RenderPass } from "./RenderPass";
import {
  BindGroup,
  CAMERA_UBO_SIZE,
  GPU_COLOR_FORMAT,
  GPU_DEPTH_FORMAT,
  GPU_NORMAL_FORMAT,
  TERRAIN_ATTR_PACKED_NL,
  TERRAIN_ATTR_POSITION,
  TERRAIN_ATTR_TEXCOORD,
  TERRAIN_VERTEX_STRIDE_BYTES,
} from "@/platform/gpu/GpuLimits";
import { createUniformBuffer, GpuBuffer } from "@/platform/gpu/GpuBuffer";
import { Logger } from "@/debug/Logger";

export interface ChunkDrawCall {
  vertexBuffer: GPUBuffer;
  indexBuffer: GPUBuffer;
  indexCount: number;

  modelMatrix: Float32Array;
  objectBindGroup: GPUBindGroup;
}

export class GeometryPass implements RenderPass {
  readonly name = "GeometryPass";
  lastDrawCallCount = 0;

  private device!: GPUDevice;
  private pipeline!: GPURenderPipeline;
  private cameraUbo!: GpuBuffer;
  private cameraData = new Float32Array(CAMERA_UBO_SIZE / 4);

  visibleChunks: ChunkDrawCall[] = [];
  frameBindGroup!: GPUBindGroup;

  onInit(device: GPUDevice, _format: GPUTextureFormat): void {
    this.device = device;
    this.cameraUbo = createUniformBuffer(
      device,
      CAMERA_UBO_SIZE,
      "GeometryPass/CameraUBO",
    );
    this.pipeline = this.buildPipeline(device);
    Logger.info("GeometryPass initialized");
  }

  onResize(_w: number, _h: number): void {
    // TODO: Handle resize if needed
  }

  execute(
    encoder: GPUCommandEncoder,
    resources: ReadonlyMap<string, GPUTextureView>,
  ): void {
    const albedoView = resources.get("gbuffer_albedo");
    const normalView = resources.get("gbuffer_normal");
    const depthView = resources.get("gbuffer_depth");

    if (!albedoView || !normalView || !depthView) {
      Logger.error("GeometryPass: missing required resource views");
      return;
    }

    this.device.queue.writeBuffer(this.cameraUbo.buffer, 0, this.cameraData);

    const pass = encoder.beginRenderPass({
      label: "GeometryPass",
      colorAttachments: [
        {
          view: albedoView,
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
        },
        {
          view: normalView,
          loadOp: "clear",
          storeOp: "store",
          clearValue: {
            r: 0.5,
            g: 0.5,
            b: 1.0,
            a: 1,
          },
        },
      ],
      depthStencilAttachment: {
        view: depthView,
        depthLoadOp: "clear",
        depthStoreOp: "store",
        depthClearValue: 1.0,
      },
    });

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(BindGroup.FRAME, this.frameBindGroup);

    this.lastDrawCallCount = 0;

    for (const chunk of this.visibleChunks) {
      pass.setBindGroup(BindGroup.OBJECT, chunk.objectBindGroup);
      pass.setVertexBuffer(0, chunk.vertexBuffer);
      pass.setIndexBuffer(chunk.indexBuffer, "uint32");
      pass.drawIndexed(chunk.indexCount);

      this.lastDrawCallCount++;
      // TODO: Update FrameStats for the chunks and triangles
    }

    pass.end();

    // TODO: Update FrameStats for draw calls
  }

  onDestroy(): void {
    this.cameraUbo.destroy();
  }

  setCameraData(data: Float32Array): void {
    this.cameraData.set(data.subarray(0, this.cameraData.length));
  }

  private buildPipeline(device: GPUDevice): GPURenderPipeline {
    const module = device.createShaderModule({
      label: "terrain",
      code: terrainVert + "\n" + terrainFrag,
    });

    return device.createRenderPipeline({
      label: "GeometryPass/Pipeline",
      layout: "auto",
      vertex: {
        module,
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: TERRAIN_VERTEX_STRIDE_BYTES,
            attributes: [
              // Position: vec3f @ offset 0
              {
                shaderLocation: 0,
                offset: TERRAIN_ATTR_POSITION,
                format: "float32x3",
              },
              // Texcoord: vec2f @ offset 12
              {
                shaderLocation: 1,
                offset: TERRAIN_ATTR_TEXCOORD,
                format: "float32x2",
              },
              // Packed Normal and Light @ offset 20
              {
                shaderLocation: 2,
                offset: TERRAIN_ATTR_PACKED_NL,
                format: "uint32",
              },
            ],
          },
        ],
      },
      fragment: {
        module,
        entryPoint: "fs_main",
        targets: [
          { format: GPU_COLOR_FORMAT }, // albedo
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
        cullMode: "back",
        frontFace: "ccw",
      },
    });
  }
}

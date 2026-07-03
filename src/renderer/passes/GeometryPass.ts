import triangleVert from "../shaders/learn/triangle.vert.wgsl";
import redFrag from "../shaders/learn/red.frag.wgsl";
import { RenderPass } from "./RenderPass";
import { Logger } from "@/debug/Logger";
import {
  createIndexBuffer,
  createVertexBuffer,
  GpuBuffer,
} from "@/platform/gpu/GpuBuffer";

export class GeometryPass implements RenderPass {
  readonly name = "GeometryPass";
  lastDrawCallCount = 0;

  private device!: GPUDevice;
  private pipeline!: GPURenderPipeline;

  private vbArray!: Float32Array;
  private ibArray!: Uint16Array;

  private vertexBuffer!: GpuBuffer;
  private indexBuffer!: GpuBuffer;

  onInit(device: GPUDevice, _format: GPUTextureFormat): void {
    this.device = device;
    this.pipeline = this.buildPipeline(device, _format);

    this.vbArray = new Float32Array([
      // POSITION (x, y, z, w)      // COLOR (r, g, b, a)
      0.0,
      0.5,
      0.0,
      1.0,
      1.0,
      0.0,
      0.0,
      1.0, // Vertex 0
      -0.5,
      -0.5,
      0.0,
      1.0,
      0.0,
      1.0,
      0.0,
      1.0, // Vertex 1
      0.5,
      -0.5,
      0.0,
      1.0,
      0.0,
      0.0,
      1.0,
      1.0, // Vertex 2
    ]);
    this.ibArray = new Uint16Array([0, 1, 2, 0]);

    this.vertexBuffer = createVertexBuffer(
      device,
      this.vbArray.byteLength,
      `geometryPass_vb`,
    );
    this.indexBuffer = createIndexBuffer(
      device,
      this.ibArray.byteLength,
      `geometryPass_ib`,
    );
    this.vertexBuffer.write(device, this.vbArray);
    this.indexBuffer.write(device, this.ibArray);

    Logger.info("GeometryPass initialized");
  }

  onResize(_w: number, _h: number): void {}

  execute(
    encoder: GPUCommandEncoder,
    resources: ReadonlyMap<string, GPUTextureView>,
  ): void {
    const swapChainView = resources.get("swapChain");
    if (!swapChainView) {
      Logger.error("GeometryPass: swapChain resource not found");
      return;
    }

    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: swapChainView,
          clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };

    const passEncoder = encoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setVertexBuffer(0, this.vertexBuffer.buffer);
    passEncoder.setIndexBuffer(this.indexBuffer.buffer, "uint16");
    passEncoder.drawIndexed(3);
    passEncoder.end();

    this.lastDrawCallCount = 1;
  }

  onDestroy(): void {}

  private buildPipeline(
    device: GPUDevice,
    format: GPUTextureFormat,
  ): GPURenderPipeline {
    const shaderModule = device.createShaderModule({
      label: "triangle-shader",
      code: triangleVert + "\n" + redFrag,
    });

    return device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: 8 * 4, // 4 floats for position + 4 floats for color
            stepMode: "vertex",
            attributes: [
              // position: vec4<f32> @ offset 0
              { shaderLocation: 0, offset: 0, format: "float32x4" },
              // color: vec4<f32> @ offset 16
              { shaderLocation: 1, offset: 4 * 4, format: "float32x4" },
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_main",
        targets: [{ format }],
      },
      primitive: {
        topology: "triangle-list",
      },
    });
  }
}

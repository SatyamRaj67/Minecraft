import triangleVert from "../shaders/learn/triangle.vert.wgsl";
import redFrag from "../shaders/learn/red.frag.wgsl";
import { RenderPass } from "./RenderPass";
import { Logger } from "@/debug/Logger";

export class GeometryPass implements RenderPass {
  readonly name = "GeometryPass";
  lastDrawCallCount = 0;

  private device!: GPUDevice;
  private pipeline!: GPURenderPipeline;

  onInit(device: GPUDevice, _format: GPUTextureFormat): void {
    this.device = device;
    this.pipeline = this.buildPipeline(device, _format);
    Logger.info("GeometryPass initialized");
  }

  onResize(_w: number, _h: number): void {
    // TODO: Handle resize if needed
  }

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
        }
      ]
    }

    const passEncoder = encoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(this.pipeline);
    passEncoder.draw(3);
    passEncoder.end();

    this.lastDrawCallCount = 1;
  }

  onDestroy(): void {}

  private buildPipeline(
    device: GPUDevice,
    format: GPUTextureFormat,
  ): GPURenderPipeline {
    const module = device.createShaderModule({
      label: "triangle-shader",
      code: triangleVert + "\n" + redFrag,
    });

    return device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module,
        entryPoint: "vs_main",
      },
      fragment: {
        module,
        entryPoint: "fs_main",
        targets: [{ format }],
      },
      primitive: {
        topology: "triangle-list",
      },
    });
  }
}

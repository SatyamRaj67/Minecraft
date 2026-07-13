import { RenderPass } from "./RenderPass";
import compositeShaderWGSL from "../shaders/composite.wgsl?raw";
import { Logger } from "@/debug/Logger";

export class CompositePass implements RenderPass {
  readonly name = "CompositePass";
  private device!: GPUDevice;
  private pipeline!: GPURenderPipeline;
  private bindGroupLayout!: GPUBindGroupLayout;

  onInit(device: GPUDevice, _format: GPUTextureFormat): void {
    this.device = device;
    this.pipeline = this.buildPipeline(device, _format);

    this.bindGroupLayout = this.pipeline.getBindGroupLayout(0);
    Logger.info("CompositePass initialized");
  }

  getPipeline(): GPURenderPipeline {
    return this.pipeline;
  }

  onResize(_w: number, _h: number): void {}

  execute(
    encoder: GPUCommandEncoder,
    resources: ReadonlyMap<string, GPUTextureView>,
  ): void {
    const albedoView = resources.get("gbuffer_albedo");
    const swapchainView = resources.get("swapchain");

    if (!albedoView || !swapchainView) {
      Logger.error("CompositePass: missing required resource views");
      return;
    }

    const bindGroup = this.device.createBindGroup({
      label: "CompositePass/BindGroup",
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: albedoView,
        },
      ],
    });

    const renderPassDescriptor: GPURenderPassDescriptor = {
      label: "Composite RenderPass",
      colorAttachments: [
        {
          view: swapchainView,
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
        },
      ],
    };

    const passEncoder = encoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(this.pipeline);
    passEncoder.setBindGroup(0, bindGroup);
    passEncoder.draw(3, 1, 0, 0);
    passEncoder.end();
  }

  onDestroy(): void {}

  private buildPipeline(
    device: GPUDevice,
    format: GPUTextureFormat,
  ): GPURenderPipeline {
    const shaderModule = device.createShaderModule({
      label: "composite-shader",
      code: compositeShaderWGSL,
    });

    return device.createRenderPipeline({
      label: "CompositePass/Pipeline",
      layout: "auto",
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_main",
        targets: [
          {
            format: format,
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "none",
      },
    });
  }
}

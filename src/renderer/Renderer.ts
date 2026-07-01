import { assert } from "@/debug/Assert";
import { Logger } from "@/debug/Logger";
import { GeometryPass } from "./passes/GeometryPass";

// === Camera State ===

export class Renderer {
  private width: number = 0;
  private height: number = 0;

  private geometryPass: GeometryPass;

  constructor(
    private device: GPUDevice,
    private context: GPUCanvasContext,
    private format: GPUTextureFormat,
  ) {
    this.geometryPass = new GeometryPass();
  }

  async init(width: number, height: number): Promise<void> {
    this.width = width;
    this.height = height;

    this.geometryPass.onInit(this.device, this.format);

    Logger.info(`Renderer: initialized ${width}x${height}`);
  }

  renderFrame(): void {
    const commandEncoder = this.device.createCommandEncoder({
      label: `Frame Command Encoder`,
    });

    const textureView = this.context.getCurrentTexture().createView();

    const resources = new Map<string, GPUTextureView>();
    resources.set("swapChain", textureView);

    this.geometryPass.execute(commandEncoder, resources);

    this.device.queue.submit([commandEncoder.finish()]);
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

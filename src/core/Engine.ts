import { assert } from "@/debug/Assert";
import { Logger } from "@/debug/Logger";
import { GpuContext } from "@/platform/gpu/GpuContext";
import { Renderer } from "@/renderer/Renderer";

export interface EngineConfig {
  canvas: HTMLCanvasElement;
  powerPreference: GPUPowerPreference;
}

export class Engine {
  private renderer!: Renderer;

  private rafHandle: number | null = null;
  private lastTimestamp = 0;
  private running = false;
  constructor() {}

  async init(config: EngineConfig): Promise<void> {
    Logger.info("Engine: initializing...");

    const gpu = await GpuContext.create({
      canvas: config.canvas,
      powerPreference: config.powerPreference,
      validation: import.meta.env.DEV,
    });

    this.renderer = new Renderer(gpu.device, gpu.context, gpu.format);

    await this.renderer.init(config.canvas.width, config.canvas.height);

    // === Canvas Resize Observer ===
    const resizeObserver = new ResizeObserver(() => {
      const w = config.canvas.clientWidth * devicePixelRatio;
      const h = config.canvas.clientHeight * devicePixelRatio;

      config.canvas.width = w;
      config.canvas.height = h;

      this.renderer.onResize(w, h);
    });
    resizeObserver.observe(config.canvas);

    Logger.info("Engine: initialization complete");
  }

  // === GAME LOOP ===
  start(): void {
    assert(!this.running, "Engine is already running");
    this.running = true;
    this.lastTimestamp = performance.now();
    this.rafHandle = requestAnimationFrame((ts) => this.loop(ts));
    Logger.info("Engine: Game Loop 🚀 Ignition Sequence initiated...");
  }

  stop(): void {
    this.running = false;
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    let dt = (timestamp - this.lastTimestamp) / 1000; // seconds
    if (dt > 0.1) dt = 0.1;

    this.renderer.renderFrame();

    this.rafHandle = requestAnimationFrame((ts) => this.loop(ts));
  }

  destroy(): void {
    this.stop();

    this.renderer.destroy();

    Logger.info("Engine: destroyed");
  }
}

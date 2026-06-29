/**
 * Engine - Top-level orchestrator
 *
 * Frame lifecycle
 * 1. inputManager.update()          — flush DOM events → EventBus
 * 2. frameArena.reset()             — reclaim frame-scoped memory
 * 3. FrameStats.beginFrame()        — zero counters
 * 4. world.flushQueries()           — revalidate ECS queries if dirty
 * 5. for each system: system.execute(world, dt)
 * 6. world.flushDeferred()          — apply pending structural changes
 * 7. chunkManager.update()          — load/unload, upload pending meshes
 * 8. renderer.renderFrame()         — build + compile + execute RenderGraph
 * 9. FrameStats.endFrame()          — record CPU frame time
 * 10. debugOverlay.render()         — HUD metrics (DEV only)
 * 11. requestAnimationFrame(loop)    — schedule next frame
 */

const WORLD_SEED = 69420;

export interface EngineConfig {
  canvas: HTMLCanvasElement;
  powerPreference: GPUPowerPreference;
}

import { Logger } from "@/debug/Logger";
import { GpuContext } from "@/platform/gpu/GpuContext";

export class Engine {
  private rafHandle: number | null = null;
  private lastTimestamp = 0;
  private running = false;
  constructor() {}

  async init(config: EngineConfig): Promise<void> {
    Logger.info("Engine: initializing...");

    // Create GPU context
    const gpu = await GpuContext.create({
      canvas: config.canvas,
      powerPreference: config.powerPreference,
      validation: import.meta.env.DEV,
    });

    // TODO: Subsystems like InputManager, ChunkManger and god hell

    // TODO: Renderer

    // TODO: Crash Reporter

    // === Canvas Resize Observer ===
    const resizeObserver = new ResizeObserver(() => {
      const w = config.canvas.clientWidth * devicePixelRatio;
      const h = config.canvas.clientHeight * devicePixelRatio;

      config.canvas.width = w;
      config.canvas.height = h;
    });
    resizeObserver.observe(config.canvas);
  }

  // TODO: Init Systems through the sorted Systems by Khan's Alpgorithm

  // TODO: Start the game through GlobalBus

  // TODO: Registration of System into the Engine

  // === GAME LOOP ===
  start(): void {
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

    // TODO: Emit in GlobalBus and stop all the actions to happen.
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    let dt = (timestamp - this.lastTimestamp) / 1000; // seconds
    if (dt > 0.1) dt = 0.1; // clamp to avoid spiral of death

    // TODO: GAME LOOP

    // TODO: Start Frame
    // TODO: Update InputManager
    // TODO: Update Systems
    // TODO: Update ChunkManager
    // TODO: Render Frame
    // TODO: End Frame

    // Schedule the Next Frame
    this.rafHandle = requestAnimationFrame((ts) => this.loop(ts));
  }

  destroy(): void {
    this.stop();

    // TODO: Kill Switch
    // We need to Kill all the instances alongside the Systems that we have added.

    Logger.info("Engine: destroyed");
  }
}

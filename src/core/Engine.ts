import { assert } from "@/debug/Assert";
import { FrameStats } from "@/debug/FrameStats";
import { Logger } from "@/debug/Logger";
import { GpuContext } from "@/platform/gpu/GpuContext";
import { InputManager } from "@/platform/web/InputManager";
import { Renderer } from "@/renderer/Renderer";
import { EngineEvent, globalBus } from "./events/EventBus";
import { System, topologicalSort } from "./ecs/System";
import { DebugOverlay } from "@/debug/DebugOverlay";
import { PlayerSystem } from "@/world/systems/PlayerSystem";
import { CameraSystem } from "@/world/systems/CameraSystem";
import { World } from "./ecs/World";
import { PhysicsSystem } from "@/world/systems/PhysicsSystem";
import { ChunkManager } from "@/world/chunk/ChunkManager";
import { SimpleMesher } from "./temp";
import { chunkKey } from "@/world/chunk/Chunk";

export interface EngineConfig {
  canvas: HTMLCanvasElement;
  powerPreference: GPUPowerPreference;
}

export class Engine {
  private world: World = new World();
  private systems: System[] = [];
  private sortedSystems: System[] | null = null;

  // Subsystems
  private renderer!: Renderer;
  private input!: InputManager;
  private chunks!: ChunkManager;
  private debugOverlay!: DebugOverlay;

  // Game Systems
  private physics!: PhysicsSystem;
  private player!: PlayerSystem;
  private camera!: CameraSystem;

  private rafHandle: number | null = null;
  private lastTimestamp: number = 0;
  private running = false;
  constructor() {}

  async init(config: EngineConfig): Promise<void> {
    Logger.info("Engine: initializing...");

    const gpu = await GpuContext.create({
      canvas: config.canvas,
      powerPreference: config.powerPreference,
      validation: __DEV__,
    });

    // === Subsystems ===
    this.input = new InputManager(config.canvas);

    this.chunks = new ChunkManager(gpu.device);

    this.renderer = new Renderer(gpu.device, gpu.context, gpu.format);
    await this.renderer.init(config.canvas.width, config.canvas.height);

    // === ECS systems ===
    this.physics = new PhysicsSystem(this.chunks);
    this.player = new PlayerSystem(
      this.input,
      this.renderer,
      this.physics,
      (x, z) => this.chunks.setPlayerPosition(x, z),
    );
    this.camera = new CameraSystem(this.renderer);

    this.registerSystem(this.physics);
    this.registerSystem(this.player);
    this.registerSystem(this.camera);

    // === Debug Overlay ===
    this.debugOverlay = new DebugOverlay(
      config.canvas.parentElement ?? document.body,
    );
    this.debugOverlay.resize(config.canvas.width, config.canvas.height);

    globalBus.on(EngineEvent.KEY_DOWN, ({ code }) => {
      if (code === "F3") this.debugOverlay.toggle();
      if (code === "Escape") this.input.exitPointerLock();
    });

    // === Canvas Resize Observer ===
    const resizeObserver = new ResizeObserver(() => {
      const w = config.canvas.clientWidth * devicePixelRatio;
      const h = config.canvas.clientHeight * devicePixelRatio;

      config.canvas.width = w;
      config.canvas.height = h;

      this.renderer.onResize(w, h);
      this.debugOverlay.resize(w, h);
      globalBus.emit(EngineEvent.RESOLUTION_CHANGED, { width: w, height: h });
    });
    resizeObserver.observe(config.canvas);

    if (!this.sortedSystems) this.compileSystems();
    for (const system of this.sortedSystems ?? []) {
      system.onInit?.(this.world);
    }

    this.chunks.setPlayerPosition(8, 8);

    globalBus.emit(EngineEvent.ENGINE_INIT, {});
    Logger.info("Engine: initialization complete");
  }

  // === System Management ===
  registerSystem(system: System): void {
    this.systems.push(system);
    this.sortedSystems = null; // Invalidate sorted cache
  }

  private compileSystems(): void {
    this.sortedSystems = topologicalSort(this.systems);
    Logger.info(
      `Engine: compiled ${this.sortedSystems.length} systems in dependency order`,
    );
    for (const s of this.sortedSystems) {
      Logger.verbose("Engine", `System: ${s.name}`);
    }
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
    globalBus.emit(EngineEvent.ENGINE_SHUTDOWN, {});
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    let dt = (timestamp - this.lastTimestamp) / 1000; // seconds
    this.lastTimestamp = timestamp;

    // Clamp dt to 100ms to prevent spiral of death on tab switch / freeze
    if (dt > 0.1) dt = 0.1;

    FrameStats.beginFrame();

    // Input
    this.input.update();

    if (!this.sortedSystems) this.compileSystems();
    this.world.flushQueries();

    for (const system of this.sortedSystems!) {
      system.execute(this.world, dt);
    }
    this.world.flushDeferred();

    this.chunks.update((cx, cz) => {
      const meshResult = SimpleMesher.generateFlatChunk(cx, cz);

      const key = chunkKey(cx, cz);
      const chunk = (this.chunks as any).chunks.get(key);

      if (chunk) {
        for (let x = 0; x < 16; x++) {
          for (let z = 0; z < 16; z++) {
            // Fill Y=0 with Dirt (ID 4)
            chunk.blocks[0 * 256 + z * 16 + x] = 4;
          }
        }
      }

      this.chunks.receiveMesh(meshResult);
    });

    this.renderer.renderFrame(this.chunks);

    if (__DEV__) {
      this.debugOverlay.render();
    }

    FrameStats.endFrame();

    this.rafHandle = requestAnimationFrame((ts) => this.loop(ts));
  }

  destroy(): void {
    this.stop();

    for (const system of this.sortedSystems ?? []) {
      system.onDestroy?.(this.world);
    }
    this.chunks.destroy();
    this.renderer.destroy();
    this.input.destroy();
    this.debugOverlay.destroy();

    Logger.info("Engine: destroyed");
  }
}

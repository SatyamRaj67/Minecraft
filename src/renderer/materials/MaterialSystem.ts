// === Material Descriptor ===

import { assert } from "@/debug/Assert";
import { Logger } from "@/debug/Logger";
import { FRAMES_IN_FLIGHT } from "@/platform/gpu/GpuLimits";

export interface MaterialDescriptor {
  name: string;
  vertSource: string;
  fragSource: string;
  vertEntryPoint: string;
  fragEntryPoint: string;
  vertexBuffers: GPUVertexBufferLayout[];
  colorTargets: GPUColorTargetState[];
  depthStencil?: GPUDepthStencilState;
  cullMode: GPUCullMode;
  topology: GPUPrimitiveTopology;
}

// === Material ===

export class Material {
  constructor(
    readonly name: string,
    readonly pipeline: GPURenderPipeline,
    readonly desc: MaterialDescriptor,
  ) {}
}

// === Defer the destroy entry ===

interface DestroyEntry {
  pipeline: GPURenderPipeline;
  framesRemain: number;
}

// === Material System ===

export class MaterialSystem {
  private materials = new Map<string, Material>();
  private pendingReloads = new Map<string, Material>();
  private destroyQueue: DestroyEntry[] = [];

  constructor(private device: GPUDevice) {
    if (__DEV__) {
      this.setupHMR();
    }
  }

  //   === Register Material ===
  async register(desc: MaterialDescriptor): Promise<Material> {
    const pipeline = await this.compilePipeline(desc);
    const material = new Material(desc.name, pipeline, desc);
    this.materials.set(desc.name, material);
    Logger.info(`MaterialSystem: registered material '${desc.name}'`);
    return material;
  }

  get(name: string): Material {
    const material = this.materials.get(name);
    assert(
      material !== undefined,
      `MaterialSystem: unknown material '${name}'`,
    );
    return material;
  }

  has(name: string): boolean {
    return this.materials.has(name);
  }

  //   === Frame Lifecycle ===
  applyPendingReloads(): void {
    for (const [name, newMaterial] of this.pendingReloads) {
      const old = this.materials.get(name);
      if (old) {
        // Queue old pipeline for deferred destruction
        this.destroyQueue.push({
          pipeline: old.pipeline,
          framesRemain: FRAMES_IN_FLIGHT + 1,
        });
      }
      this.materials.set(name, newMaterial);
      Logger.info(`MaterialSystem: hot-reloaded material '${name}'`);
    }
    this.pendingReloads.clear();

    // Process destroy queue
    for (let i = this.destroyQueue.length - 1; i >= 0; i--) {
      const entry = this.destroyQueue[i]!;
      entry.framesRemain--;
      if (entry.framesRemain <= 0) {
        this.destroyQueue.splice(i, 1);
      }
    }
  }

  // === HOT MODULE REPLACEMENT (HMR) ===
  private setupHMR(): void {
    if (!import.meta.hot) return;

    import.meta.hot.on(
      "wgsl-update",
      async (data: { file: string; source: string }) => {
        const name = this.fileToMaterialName(data.file);
        if (!name) return;

        const old = this.materials.get(name);
        if (!old) return;

        try {
          Logger.info(
            `MaterialSystem: recompiling '${name}' after shader change`,
          );
          const pipeline = await this.compilePipeline(old.desc);
          this.pendingReloads.set(name, new Material(name, pipeline, old.desc));
        } catch (err) {
          Logger.error(`MaterialSystem: hot-reload FAILED for '${name}'`, {
            err,
          });
          // Old pipeline continues running — no visual glitch
        }
      },
    );
  }

  private fileToMaterialName(filePath: string): string | null {
    // Map 'src/renderer/materials/BasicMaterial.vert.wgsl' to 'BasicMaterial'
    const match = filePath.match(/shaders\/([^/]+)\//);
    return match?.[1] ?? null;
  }

  //   === Compile Pipeline ===
  private async compilePipeline(
    desc: MaterialDescriptor,
  ): Promise<GPURenderPipeline> {
    const shaderModule = this.device.createShaderModule({
      label: `shader:${desc.name}`,
      code: `${desc.vertSource}\n${desc.fragSource}`,
    });

    if (__DEV__) {
      const info = await shaderModule.getCompilationInfo();
      const errors = info.messages.filter((m) => m.type === "error");

      if (errors.length > 0) {
        const details = errors
          .map((e) => `Line ${e.lineNum}, Col ${e.linePos}: ${e.message}`)
          .join("\n");

        throw new Error(
          `WGSL compilation errors in '${desc.name}':\n${details}`,
        );
      }

      const warnings = info.messages.filter((m) => m.type === "warning");
      for (const w of warnings) {
        Logger.warn(
          `WGSL warning in '${desc.name}' line ${w.lineNum}: ${w.message}`,
        );
      }
    }

    return this.device.createRenderPipeline({
      label: `pipeline: ${desc.name}`,
      layout: "auto",
      vertex: {
        module: shaderModule,
        entryPoint: desc.vertEntryPoint,
        buffers: desc.vertexBuffers,
      },
      fragment: {
        module: shaderModule,
        entryPoint: desc.fragEntryPoint,
        targets: desc.colorTargets,
      },
      ...(desc.depthStencil ? { depthStencil: desc.depthStencil } : {}),
      primitive: {
        topology: desc.topology,
        cullMode: desc.cullMode,
        frontFace: "ccw",
      },
    });
  }

  destroy(): void {
    this.materials.clear();
    this.pendingReloads.clear();
    this.destroyQueue.length = 0;
  }
}

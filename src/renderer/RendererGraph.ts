import { assert } from "node:console";
import { RenderPass } from "./passes/RenderPass";
import { Logger } from "@/debug/Logger";

export type ResourceHandle = string;

export interface ResourceDecl {
  handle: ResourceHandle;
  format?: GPUTextureFormat;
  width?: number; // default: swapchain width
  height?: number; // default: swapchain height
  layers?: number; // default: 1
}

export interface RenderGraphNode {
  name: string;
  pass: RenderPass;
  reads: ResourceHandle[];
  writes: ResourceHandle[];
}

interface CompiledNode extends RenderGraphNode {
  sortIndex: number;
}

interface PooledTexture {
  texture: GPUTexture;
  view: GPUTextureView;
  format: GPUTextureFormat;
  width: number;
  height: number;
  layers: number;
  inUse: boolean;
}

class TransientPool {
  private pool: PooledTexture[] = [];

  acquire(
    device: GPUDevice,
    format: GPUTextureFormat,
    width: number,
    height: number,
    layers: number,
    label: string,
  ): { texture: GPUTexture; view: GPUTextureView } {
    // Look for a compatible free texture
    for (const t of this.pool) {
      if (
        !t.inUse &&
        t.format === format &&
        t.width === width &&
        t.height === height &&
        t.layers === layers
      ) {
        t.inUse = true;
        return { texture: t.texture, view: t.view };
      }
    }

    // Create new
    const isDepth = format.startsWith("depth") || format.startsWith("stencil");

    // Use numeric flag values directly — GPUTextureUsage global is not available
    // in test environments (jsdom). Values are stable per the WebGPU spec:
    //   COPY_SRC            = 0x01
    //   COPY_DST            = 0x02
    //   TEXTURE_BINDING     = 0x04
    //   STORAGE_BINDING     = 0x08
    //   RENDER_ATTACHMENT   = 0x10
    const TEXTURE_BINDING = 0x04;
    const RENDER_ATTACHMENT = 0x10;
    const COPY_SRC = 0x01;

    const texture = device.createTexture({
      size: { width, height, depthOrArrayLayers: layers },
      format,
      usage: isDepth
        ? RENDER_ATTACHMENT | TEXTURE_BINDING
        : RENDER_ATTACHMENT | TEXTURE_BINDING | COPY_SRC,
      label: `transient:${label}`,
    });
    const view = texture.createView();
    this.pool.push({
      texture,
      view,
      format,
      width,
      height,
      layers,
      inUse: true,
    });
    return { texture, view };
  }

  releaseAll(): void {
    for (const t of this.pool) t.inUse = false;
  }

  destroy(): void {
    for (const t of this.pool) t.texture.destroy();
    this.pool.length = 0;
  }
}

export class RenderGraph {
  private nodes: RenderGraphNode[] = [];
  private decls: Map<ResourceHandle, ResourceDecl> = new Map();
  private compiled: CompiledNode[] | null = null;
  private pool: TransientPool = new TransientPool();
  private _dump = "";

  constructor(
    private device: GPUDevice,
    private swapWidth: number,
    private swapHeight: number,
  ) {}

  // ─── Builder API (called during frame setup) ──────────────────────────────

  reset(): void {
    this.nodes.length = 0;
    this.decls.clear();
    this.compiled = null;
    this.pool.releaseAll();
  }

  declareResource(decl: ResourceDecl): void {
    this.decls.set(decl.handle, decl);
  }

  addPass(node: RenderGraphNode): void {
    this.nodes.push(node);
  }

  // ─── Compile ─────────────────────────────────────────────────────────────

  compile(): void {
    const sorted = this.topologicalSort();
    this.compiled = sorted;
    this._dump = JSON.stringify(
      sorted.map((n) => ({
        name: n.name,
        reads: n.reads,
        writes: n.writes,
      })),
      null,
      2,
    );
    Logger.verbose("RenderGraph", `Compiled ${sorted.length} passes`);
  }

  private topologicalSort(): CompiledNode[] {
    // Build adjacency: for each resource, find writer and readers
    const writerOf = new Map<ResourceHandle, string>();
    for (const node of this.nodes) {
      for (const w of node.writes) {
        if (writerOf.has(w)) {
          Logger.warn(
            `RenderGraph: resource '${w}' has multiple writers — last writer wins`,
          );
        }
        writerOf.set(w, node.name);
      }
    }

    // Build edges: reader → [producers it depends on]
    const inDegree = new Map<string, number>(
      this.nodes.map((n) => [n.name, 0]),
    );
    const edges = new Map<string, string[]>(
      this.nodes.map((n) => [n.name, []]),
    );

    for (const node of this.nodes) {
      for (const r of node.reads) {
        const writer = writerOf.get(r);
        if (writer && writer !== node.name) {
          edges.get(writer)!.push(node.name);
          inDegree.set(node.name, (inDegree.get(node.name) ?? 0) + 1);
        }
      }
    }

    // Kahn's BFS
    const queue: string[] = [];
    for (const [name, deg] of inDegree) {
      if (deg === 0) queue.push(name);
    }

    const byName = new Map<string, RenderGraphNode>(
      this.nodes.map((n) => [n.name, n]),
    );
    const sorted: CompiledNode[] = [];

    while (queue.length > 0) {
      const name = queue.shift()!;
      const node = byName.get(name)!;
      sorted.push({ ...node, sortIndex: sorted.length });

      for (const next of edges.get(name) ?? []) {
        const deg = (inDegree.get(next) ?? 0) - 1;
        inDegree.set(next, deg);
        if (deg === 0) queue.push(next);
      }
    }

    if (sorted.length !== this.nodes.length) {
      const cycle = this.nodes
        .filter((n) => !sorted.find((s) => s.name === n.name))
        .map((n) => n.name);
      Logger.fatal("RenderGraph: cycle detected", { cyclicPasses: cycle });
    }

    return sorted;
  }

  // ─── Execute ──────────────────────────────────────────────────────────────

  execute(encoder: GPUCommandEncoder, swapTarget: GPUTextureView): void {
    assert(
      this.compiled !== null,
      "RenderGraph.execute() called before compile()",
    );

    // Build resource view map: handle → GPUTextureView
    const resourceViews = new Map<ResourceHandle, GPUTextureView>();
    resourceViews.set("swapchain", swapTarget);

    for (const [handle, decl] of this.decls) {
      if (handle === "swapchain") continue;
      const { view } = this.pool.acquire(
        this.device,
        decl.format ?? "rgba16float",
        decl.width ?? this.swapWidth,
        decl.height ?? this.swapHeight,
        decl.layers ?? 1,
        handle,
      );
      resourceViews.set(handle, view);
    }

    // Execute passes in sorted order
    for (const node of this.compiled!) {
      if (__DEV__) {
        this.device.pushErrorScope("validation");
      }

      node.pass.execute(encoder, resourceViews);

      if (__DEV__) {
        this.device.popErrorScope().then((err) => {
          if (err)
            Logger.error(
              `RenderGraph: pass '${node.name}' GPU error: ${err.message}`,
            );
        });
      }
    }
  }

  updateSwapchainSize(width: number, height: number): void {
    if (width !== this.swapWidth || height !== this.swapHeight) {
      this.swapWidth = width;
      this.swapHeight = height;
      this.pool.destroy(); // Recreate transients at new resolution
      this.pool = new TransientPool();
    }
  }

  dump(): string {
    return this._dump;
  }

  destroy(): void {
    this.pool.destroy();
  }
}

import { beforeEach, describe, expect, it, vi } from "vitest";
import { RenderGraph } from "../../src/renderer/graph/RenderGraph";
import type { RenderPass } from "../../src/renderer/passes/RenderPass";

// === GPU Stub ===
function makeGPUStub(): GPUDevice {
  return {
    createTexture: vi.fn().mockReturnValue({
      createView: vi.fn().mockReturnValue({}),
      destroy: vi.fn(),
    }),
    createBuffer: vi.fn().mockReturnValue({ destroy: vi.fn() }),
    pushErrorScope: vi.fn(),
    popErrorScope: vi.fn().mockResolvedValue(null),
    queue: { writeBuffer: vi.fn(), submit: vi.fn() },
    createCommandEncoder: vi.fn().mockReturnValue({
      finish: vi.fn().mockReturnValue({}),
      beginRenderPass: vi.fn().mockReturnValue({
        setPipeline: vi.fn(),
        setBindGroup: vi.fn(),
        setVertexBuffer: vi.fn(),
        setIndexBuffer: vi.fn(),
        drawIndexed: vi.fn(),
        end: vi.fn(),
      }),
    }),
  } as unknown as GPUDevice;
}

// === Pass Stub ===
function makePass(name: string): RenderPass {
  return {
    name,
    lastDrawCallCount: 0,
    onInit: vi.fn(),
    onResize: vi.fn(),
    execute: vi.fn(),
    onDestroy: vi.fn(),
  };
}

// === TESTS ===
describe("Render Graph", () => {
  let device: GPUDevice;
  let graph: RenderGraph;

  beforeEach(() => {
    device = makeGPUStub();
    graph = new RenderGraph(device, 1300, 760);
  });

  it("compiles with no passes without throwing", () => {
    graph.reset();
    expect(() => graph.compile()).not.toThrow();
  });

  it("single pass compiles and executes", () => {
    const pass = makePass("GeometryPass");
    graph.reset();
    graph.addPass({
      name: "GeometryPass",
      pass,
      reads: [],
      writes: ["gbuffer"],
    });
    graph.compile();

    const encoder = device.createCommandEncoder({});
    const swapView = {} as GPUTextureView;

    expect(() => graph.execute(encoder, swapView)).not.toThrow();
  });

  it("execute throws if compile() was not called", () => {
    const pass = makePass("A");
    graph.reset();
    graph.addPass({
      name: "A",
      pass,
      reads: [],
      writes: [],
    });

    // * No compile() call

    const encoder = device.createCommandEncoder({});
    expect(() => graph.execute(encoder, {} as GPUTextureView)).toThrow(
      /compile/i,
    );
  });

  it("two passes with dependency: write executes before reader", () => {
    const order: string[] = [];
    const passA = makePass("A");
    const passB = makePass("B");

    (passA.execute as ReturnType<typeof vi.fn>).mockImplementation(() =>
      order.push("A"),
    );
    (passB.execute as ReturnType<typeof vi.fn>).mockImplementation(() =>
      order.push("B"),
    );

    graph.reset();
    graph.declareResource({
      handle: "res1",
      format: "rgba8unorm",
    });

    graph.addPass({
      name: "A",
      pass: passA,
      reads: [],
      writes: ["res1"],
    });
    graph.addPass({
      name: "B",
      pass: passB,
      reads: ["res1"],
      writes: ["swapchain"],
    });

    graph.compile();

    const encoder = device.createCommandEncoder({});
    graph.execute(encoder, {} as GPUTextureView);

    expect(order.indexOf("A")).toBeLessThan(order.indexOf("B"));
  });

  it("Three Passes in chain: correct order regardless of registration order", () => {
    const order: string[] = [];
    ["A", "B", "C"].forEach((name) => {
      const p = makePass(name);
      (p.execute as ReturnType<typeof vi.fn>).mockImplementation(() =>
        order.push(name),
      );
    });

    const passB = makePass("B");
    const passA = makePass("A");
    const passC = makePass("C");

    (passB.execute as ReturnType<typeof vi.fn>).mockImplementation(() =>
      order.push("B"),
    );
    (passA.execute as ReturnType<typeof vi.fn>).mockImplementation(() =>
      order.push("A"),
    );
    (passC.execute as ReturnType<typeof vi.fn>).mockImplementation(() =>
      order.push("C"),
    );

    graph.reset();

    graph.declareResource({
      handle: "res1",
      format: "depth24plus",
    });
    graph.declareResource({
      handle: "res2",
      format: "rgba8unorm",
    });

    graph.addPass({
      name: "B",
      pass: passB,
      reads: ["res1"],
      writes: ["res2"],
    });
    graph.addPass({
      name: "A",
      pass: passA,
      reads: [],
      writes: ["res1"],
    });
    graph.addPass({
      name: "C",
      pass: passC,
      reads: ["res2"],
      writes: ["swapchain"],
    });

    graph.compile();
    graph.execute(device.createCommandEncoder({}), {} as GPUTextureView);

    expect(order.indexOf("A")).toBeLessThan(order.indexOf("B"));
    expect(order.indexOf("B")).toBeLessThan(order.indexOf("C"));
  });

  it("Passes with no shared resources can run in any order (both present)", () => {
    const passA = makePass("UI");
    const passB = makePass("Particles");
    graph.reset();
    graph.addPass({
      name: "UI",
      pass: passA,
      reads: [],
      writes: ["ui_target"],
    });
    graph.addPass({
      name: "Particles",
      pass: passB,
      reads: [],
      writes: ["particle_target"],
    });
    graph.compile();

    const encoder = device.createCommandEncoder({});
    graph.execute(encoder, {} as GPUTextureView);

    // Both passes should have been called
    expect(passA.execute).toHaveBeenCalledOnce();
    expect(passB.execute).toHaveBeenCalledOnce();
  });

  it("reset: allows rebuilding graph each frame", () => {
    const pass = makePass("A");
    for (let frame = 0; frame < 3; frame++) {
      graph.reset();
      graph.addPass({
        name: "A",
        pass: pass,
        reads: [],
        writes: [],
      });

      expect(() => graph.compile()).not.toThrow();
    }
    expect(pass.execute).not.toHaveBeenCalled();
  });

  it("dump(): returns non-empty JSON after compile", () => {
    const pass = makePass("A");
    graph.reset();
    graph.addPass({ name: "A", pass: pass, reads: [], writes: ["out"] });
    graph.compile();

    const dump = graph.dump();
    expect(dump.length).toBeGreaterThan(0);
    expect(() => JSON.parse(dump)).not.toThrow();
  });

  it("dump(): includes pass names", () => {
    const pass = makePass("A");
    graph.reset();
    graph.addPass({ name: "A", pass: pass, reads: [], writes: ["out"] });
    graph.compile();
    expect(graph.dump()).toContain("A");
  });

  it("updateSwapchainSize: does not throw", () => {
    expect(() => graph.updateSwapchainSize(1920, 1080)).not.toThrow();
  });
});

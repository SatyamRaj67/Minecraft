import { describe, it, expect } from "vitest";
import { type System, topologicalSort } from "../../../src/core/ecs/System";
import type { World } from "../../../src/core/ecs/World";

// === Helper function to create a mock System ===
function makeSystem(name: string, deps: string[] = []): System {
  return {
    name,
    dependencies: deps,
    execute: (_world: World, _dt: number) => {},
  };
}

// === Tests for the topologicalSort function ===
describe("topologicalSort", () => {
  it("single system with no dependencies", () => {
    const s = makeSystem("A");
    const sorted = topologicalSort([s]);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].name).toBe("A");
  });

  it("two independent systems - both returned (order not guaranteed)", () => {
    const a = makeSystem("A");
    const b = makeSystem("B");
    const sorted = topologicalSort([a, b]);
    expect(sorted).toHaveLength(2);
    const names = sorted.map((s) => s.name);
    expect(names).toContain("A");
    expect(names).toContain("B");
  });

  it("A depends on B - B should come before A", () => {
    const a = makeSystem("A", ["B"]);
    const b = makeSystem("B");
    const sorted = topologicalSort([a, b]);
    const ai = sorted.findIndex((s) => s.name === "A");
    const bi = sorted.findIndex((s) => s.name === "B");
    expect(ai).toBeGreaterThan(bi);
  });

  it("Chain: A ← B ← C - Order: C, B, A", () => {
    const a = makeSystem("A", ["B"]);
    const b = makeSystem("B", ["C"]);
    const c = makeSystem("C");
    const sorted = topologicalSort([a, b, c]);
    const names = sorted.map((s) => s.name);
    expect(names.indexOf("C")).toBeLessThan(names.indexOf("B"));
    expect(names.indexOf("B")).toBeLessThan(names.indexOf("A"));
  });

  it("Diamond Dependency: D ← {B, C} ← A - Order: A, B/C, D", () => {
    const a = makeSystem("A");
    const b = makeSystem("B", ["A"]);
    const c = makeSystem("C", ["A"]);
    const d = makeSystem("D", ["B", "C"]);
    const sorted = topologicalSort([a, b, c, d]);
    const names = sorted.map((s) => s.name);
    expect(names.indexOf("A")).toBeLessThan(names.indexOf("B"));
    expect(names.indexOf("A")).toBeLessThan(names.indexOf("C"));
    expect(names.indexOf("B")).toBeLessThan(names.indexOf("D"));
    expect(names.indexOf("C")).toBeLessThan(names.indexOf("D"));
  });

  it("Direct Cyclic Dependency: A ← B ← A - Should throw an error", () => {
    const a = makeSystem("A", ["B"]);
    const b = makeSystem("B", ["A"]);
    expect(() => topologicalSort([a, b])).toThrow(/cycle/i);
  });

  it("Self Dependency: A ← A - Should throw an error", () => {
    const a = makeSystem("A", ["A"]);
    expect(() => topologicalSort([a])).toThrow();
  });

  it("Indirect Cyclic Dependency: A ← B ← C ← A - Should throw an error", () => {
    const a = makeSystem("A", ["B"]);
    const b = makeSystem("B", ["C"]);
    const c = makeSystem("C", ["A"]);
    expect(() => topologicalSort([a, b, c])).toThrow(/cycle/i);
  });

  it("Dependency on Non-existent System - Should throw an error", () => {
    const a = makeSystem("A", ["NonExistent"]);
    expect(() => topologicalSort([a])).toThrow(/unregistered/i);
  });

  it("Empty System List - Empty Result", () => {
    expect(topologicalSort([])).toHaveLength(0);
  });

  it("Complex Linear 10 Systems Chain - Should sort correctly", () => {
    const systems: System[] = [];
    for (let i = 9; i >= 0; i--) {
      systems.push(makeSystem(`S${i}`, i > 0 ? [`S${i - 1}`] : []));
    }
    const sorted = topologicalSort(systems);
    for (let i = 0; i < 9; i++) {
      const ai = sorted.findIndex((s) => s.name === `S${i}`);
      const bi = sorted.findIndex((s) => s.name === `S${i + 1}`);
      expect(ai).toBeLessThan(bi);
    }
  });

  it("Complex System No Drop check", () => {
    const systems = ["A", "B", "C", "D", "E"].map((n) => makeSystem(n));
    const sorted = topologicalSort(systems);
    expect(sorted).toHaveLength(5);
  });
});

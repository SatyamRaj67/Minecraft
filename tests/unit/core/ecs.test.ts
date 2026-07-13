import { describe, it, expect, beforeEach } from "vitest";

import {
  makeEntity,
  entityIndex,
  entityGeneration,
  isEntityValid,
  ENTITY_INVALID,
} from "../../../src/core/ecs/Entity";
import { World } from "../../../src/core/ecs/World";
import {
  CTransform,
  CVelocity,
  componentMask,
} from "../../../src/core/ecs/Component";

// === Entity ===
describe("Entity", () => {
  it("makeEntity / entityIndex round-trips correctly", () => {
    const e = makeEntity(42, 7);
    expect(entityIndex(e)).toBe(42);
  });

  it("makeEntity / entityGeneration round-trips correctly", () => {
    const e = makeEntity(42, 7);
    expect(entityGeneration(e)).toBe(7);
  });

  it("ENTITY_INVALID is not valid", () => {
    expect(isEntityValid(ENTITY_INVALID)).toBe(false);
  });

  it("fresh entity is valid", () => {
    const e = makeEntity(1, 1);
    expect(isEntityValid(e)).toBe(true);
  });

  it("max index encodes without collision", () => {
    const maxIdx = (1 << 20) - 1;
    const e = makeEntity(maxIdx, 0);
    expect(entityIndex(e)).toBe(maxIdx);
    expect(entityGeneration(e)).toBe(0);
  });

  it("different generations produce different entities at same index", () => {
    const e1 = makeEntity(69, 1);
    const e2 = makeEntity(69, 2);
    expect(e1).not.toBe(e2);
  });
});

// === World ===
describe("World", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  it("spawn returns a valid entity", () => {
    const e = world.spawn();
    expect(isEntityValid(e)).toBe(true);
  });

  it("spawn creates unique entities", () => {
    const e1 = world.spawn();
    const e2 = world.spawn();
    expect(e1).not.toBe(e2);
  });

  it("entityCount increments on spawn", () => {
    expect(world.entityCount).toBe(0);
    world.spawn();
    world.spawn();
    expect(world.entityCount).toBe(2);
  });

  it("despawn: isAlive returns false after despawn", () => {
    const e = world.spawn();
    expect(world.isAlive(e)).toBe(true);
    world.despawn(e);
    expect(world.isAlive(e)).toBe(false);
  });

  it("despawn: entityCount decrements on despawn", () => {
    const e = world.spawn();
    world.despawn(e);
    expect(world.entityCount).toBe(0);
  });

  it("despawn then spawn: new entity gets incremented generation", () => {
    const e1 = world.spawn();
    const idx = entityIndex(e1);
    world.despawn(e1);
    const e2 = world.spawn();
    expect(entityIndex(e2)).toBe(idx);
    expect(entityGeneration(e2)).toBe(entityGeneration(e1) + 1);
  });

  it("despawn: stale entity is not alive after recycled index is spawned", () => {
    const stale = world.spawn();
    world.despawn(stale);
    world.spawn(); // Recycled Slot
    expect(world.isAlive(stale)).toBe(false);
  });

  it("addComponent: entity has component after add", () => {
    const e = world.spawn();
    const data = new Float32Array(CTransform.stride);
    data[0] = 69;
    data[1] = 420;
    data[2] = 67; // position x, y, z
    world.addComponent(e, CTransform, data);

    const out = new Float32Array(CTransform.stride);
    expect(world.getComponent(e, CTransform, out)).toBe(true);
    expect(out[0]).toBe(69);
    expect(out[1]).toBe(420);
    expect(out[2]).toBe(67);
  });

  it("addComponent: component data can be updated", () => {
    const e = world.spawn();
    const d1 = new Float32Array(CVelocity.stride);
    d1[0] = 1;
    world.addComponent(e, CVelocity, d1);

    const d2 = new Float32Array(CVelocity.stride);
    d2[0] = 2;
    world.setComponent(e, CVelocity, d2);

    const out = new Float32Array(CVelocity.stride);
    expect(world.getComponent(e, CVelocity, out)).toBe(true);
    expect(out[0]).toBe(2);
  });

  it("getComponent: returns false for missing component", () => {
    const e = world.spawn();
    const out = new Float32Array(CVelocity.stride);
    expect(world.getComponent(e, CVelocity, out)).toBe(false);
  });

  it("getComponent: returns false for despawned entity", () => {
    const e = world.spawn();
    world.despawn(e);
    const out = new Float32Array(CVelocity.stride);
    expect(world.getComponent(e, CVelocity, out)).toBe(false);
  });

  it("removeComponent: entity no longer has component", () => {
    const e = world.spawn();
    const data = new Float32Array(CTransform.stride);
    world.addComponent(e, CTransform, data);
    world.removeComponent(e, CTransform);
    const out = new Float32Array(CTransform.stride);
    expect(world.getComponent(e, CTransform, out)).toBe(false);
  });

  it("query: finds entities with matching components", () => {
    const e1 = world.spawn();
    const e2 = world.spawn();
    const e3 = world.spawn();

    world.addComponent(e1, CTransform, new Float32Array(CTransform.stride));
    world.addComponent(e2, CTransform, new Float32Array(CTransform.stride));
    world.addComponent(e2, CVelocity, new Float32Array(CVelocity.stride));
    world.addComponent(e3, CVelocity, new Float32Array(CVelocity.stride));

    const q = world.query({ all: [CTransform, CVelocity], none: [] });
    world.flushQueries();

    let count = 0;
    q.forEach(() => count++);
    expect(count).toBe(1); // Only e2 has both CTransform and CVelocity
  });

  it("query none: excludes entities with forbidden components", () => {
    const e1 = world.spawn();
    const e2 = world.spawn();

    world.addComponent(e1, CTransform, new Float32Array(CTransform.stride));
    world.addComponent(e2, CTransform, new Float32Array(CTransform.stride));
    world.addComponent(e2, CVelocity, new Float32Array(CVelocity.stride));

    const q = world.query({ all: [CTransform], none: [CVelocity] });
    world.flushQueries();

    let count = 0;
    q.forEach(() => count++);
    expect(count).toBe(1); // Only e1 (exclude e2 as it has CVelocity)
  });

  it("spawn 1000 entities without OOM", () => {
    const entities = [];
    for (let i = 0; i < 1000; i++) {
      entities.push(world.spawn());
    }

    expect(world.entityCount).toBe(1000);

    // Cleanup
    for (const e of entities) {
      world.despawn(e);
    }

    expect(world.entityCount).toBe(0);
  });
});

// === Component Mask ===

describe("Component Mask", () => {
  it("single component: correct bit set", () => {
    const mask = componentMask(CTransform);
    expect(mask & (1n << BigInt(CTransform.id))).not.toBe(0n);
  });

  it("two components: both bits set", () => {
    const mask = componentMask(CTransform, CVelocity);
    expect(mask & (1n << BigInt(CTransform.id))).not.toBe(0n);
    expect(mask & (1n << BigInt(CVelocity.id))).not.toBe(0n);
  });

  it("no components: mask is zero", () => {
    expect(componentMask()).toBe(0n);
  });
});

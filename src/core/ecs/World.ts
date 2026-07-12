import { Archetype } from "./Archetype";
import { ComponentReg, ComponentSchema } from "./Component";
import {
  Entity,
  ENTITY_MAX_INDEX,
  entityGeneration,
  entityIndex,
  makeEntity,
} from "./Entity";
import { Query, QueryDesc } from "./Query";

interface EntityRecord {
  archetype: Archetype;
}

export class World {
  private generations: Uint16Array = new Uint16Array(ENTITY_MAX_INDEX + 1);
  private freeList: number[] = [];
  private nextFreshIndex = 1; // 0 is reserved for "null" entity

  private archetypes = new Map<bigint, Archetype>();
  private emptyArchetype: Archetype;

  private records = new Map<number, EntityRecord>();

  private queries: Query[] = [];
  private archetypesDirty = false;

  //   === Deferred Mutations ===
  private pendingAdd: Array<{
    entity: Entity;
    schema: ComponentSchema;
    data: Float32Array;
  }> = [];
  private pendingRemove: Array<{ entity: Entity; schema: ComponentSchema }> =
    [];

  constructor() {
    this.emptyArchetype = new Archetype(0n, []);
    this.archetypes.set(0n, this.emptyArchetype);
  }

  //   === Entity Management ===
  spawn(): Entity {
    let idx: number;
    if (this.freeList.length > 0) {
      idx = this.freeList.pop()!;
    } else {
      if (this.nextFreshIndex > ENTITY_MAX_INDEX) {
        throw new Error(
          "World: entity index space exhausted (1,048,576 live entities)",
        );
      }
      idx = this.nextFreshIndex++;
    }

    const gen = this.generations[idx] ?? 0;
    const entity = makeEntity(idx, gen);

    this.emptyArchetype.add(entity, new Map());
    this.records.set(idx, { archetype: this.emptyArchetype });

    return entity;
  }

  despawn(entity: Entity): void {
    const idx = entityIndex(entity);
    if (!this.isAlive(entity)) return;

    const record = this.records.get(idx);
    if (record) {
      record.archetype.remove(entity);
      this.records.delete(idx);
    }

    this.generations[idx] = ((this.generations[idx] ?? 0) + 1) & 0xfff;
    this.freeList.push(idx);
  }

  isAlive(entity: Entity): boolean {
    const idx = entityIndex(entity);
    return (this.generations[idx] ?? 0) === entityGeneration(entity);
  }

  //   === Component Management ===
  addComponent(
    entity: Entity,
    schema: ComponentSchema,
    data: Float32Array,
  ): void {
    if (!this.isAlive(entity)) return;

    const idx = entityIndex(entity);
    const record = this.records.get(idx)!;
    const oldArch = record.archetype;
    const newMask = oldArch.mask | (1n << BigInt(schema.id));

    if ((oldArch.mask & (1n << BigInt(schema.id))) !== 0n) {
      oldArch.writeComponent(entity, schema.id, data);
      return;
    }

    const newArch = this.getOrCreateArchetype(newMask, oldArch, schema);
    this.migrateEntity(entity, oldArch, newArch, schema.id, data);
    record.archetype = newArch;

    this.markQueriesDirty();
  }

  removeComponent(entity: Entity, schema: ComponentSchema): void {
    if (!this.isAlive(entity)) return;

    const idx = entityIndex(entity);
    const record = this.records.get(idx)!;
    const oldArch = record.archetype;
    const bit = 1n << BigInt(schema.id);
    if ((oldArch.mask & bit) === 0n) return; // not present

    const newMask = oldArch.mask & ~bit;
    const newArch = this.getOrCreateArchetype(newMask, oldArch, null);
    this.migrateEntity(entity, oldArch, newArch, -1, null);
    record.archetype = newArch;

    this.markQueriesDirty();
  }

  /** Returns false if entity lacks the component */
  getComponent(
    entity: Entity,
    schema: ComponentSchema,
    out: Float32Array,
  ): boolean {
    if (!this.isAlive(entity)) return false;
    const record = this.records.get(entityIndex(entity));
    if (!record) return false;
    const arch = record.archetype;
    if (!arch.hasComponent(schema.id)) return false;
    arch.readComponent(entity, schema.id, out);
    return true;
  }

  setComponent(
    entity: Entity,
    schema: ComponentSchema,
    data: Float32Array,
  ): void {
    if (!this.isAlive(entity)) return;
    const record = this.records.get(entityIndex(entity))!;
    record.archetype.writeComponent(entity, schema.id, data);
  }

  //   === Query API Management ===
  query(desc: QueryDesc): Query {
    const q = new Query(desc);
    this.queries.push(q);
    q.revalidate([...this.archetypes.values()]);
    return q;
  }

  /**Call before any system executes each frame */
  flushQueries(): void {
    if (!this.archetypesDirty) return;
    const all = [...this.archetypes.values()];
    for (const q of this.queries) q.revalidate(all);
    this.archetypesDirty = false;
  }

  //   === Deferred Mutations ===
  flushDeferred(): void {
    for (const { entity, schema, data } of this.pendingAdd) {
      this.addComponent(entity, schema, data);
    }
    for (const { entity, schema } of this.pendingRemove) {
      this.removeComponent(entity, schema);
    }

    this.pendingAdd.length = 0;
    this.pendingRemove.length = 0;
  }

  //   === Private Helpes ===
  private getOrCreateArchetype(
    mask: bigint,
    sourceArch: Archetype,
    addedSchema: ComponentSchema | null,
  ): Archetype {
    let arch = this.archetypes.get(mask);
    if (!arch) {
      // Derive component ID list from the existing archetype + new component
      const ids: number[] = [];
      for (let bit = 0n; bit < 63n; bit++) {
        if ((mask & (1n << bit)) !== 0n) ids.push(Number(bit));
      }
      arch = new Archetype(mask, ids);
      this.archetypes.set(mask, arch);
      this.markQueriesDirty();
    }
    return arch;
  }

  private migrateEntity(
    entity: Entity,
    oldArch: Archetype,
    newArch: Archetype,
    addedComponentId: number,
    addedData: Float32Array | null,
  ): void {
    const initData = new Map<number, Float32Array>();

    let bit = oldArch.mask;
    let bitPos = 0;
    while (bit > 0n) {
      if ((bit & 1n) !== 0n) {
        if (newArch.hasComponent(bitPos)) {
          const stride = ComponentReg.getStride(bitPos);
          const tmp = new Float32Array(stride);
          oldArch.readComponent(entity, bitPos, tmp);
          initData.set(bitPos, tmp);
        }
      }
      bit >>= 1n;
      bitPos++;
    }

    if (addedData !== null && addedComponentId >= 0) {
      initData.set(addedComponentId, addedData);
    }

    oldArch.remove(entity);
    newArch.add(entity, initData);
  }

  private markQueriesDirty(): void {
    this.archetypesDirty = true;
    for (const q of this.queries) q.markDirty();
  }
}

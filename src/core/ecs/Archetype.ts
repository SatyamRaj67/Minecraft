import { ComponentReg } from "./Component";
import { Entity, entityIndex } from "./Entity";

const INITIAL_CAPACITY = 256;

export class Archetype {
  readonly mask: bigint;

  private denseToEntity: Uint32Array;
  private entityToDense: Uint32Array;

  private _count = 0;
  private capacity: number;

  private columns = new Map<number, Float32Array>();

  constructor(mask: bigint, componentIds: number[]) {
    this.mask = mask;
    this.capacity = INITIAL_CAPACITY;

    this.denseToEntity = new Uint32Array(this.capacity);
    // 1 << 20 = 1,048,576 — must match ENTITY_MAX_INDEX
    this.entityToDense = new Uint32Array(1 << 20);

    for (const cid of componentIds) {
      const stride = ComponentReg.getStride(cid);
      this.columns.set(cid, new Float32Array(this.capacity * stride));
    }
  }

  get count(): number {
    return this._count;
  }

  hasComponent(id: number): boolean {
    return this.columns.has(id);
  }

  getColumn(componentId: number): Float32Array {
    const col = this.columns.get(componentId);
    if (!col)
      throw new Error(
        `Archetype: component ${componentId} not in mask ${this.mask}`,
      );
    return col;
  }

  readComponent(entity: Entity, componentId: number, out: Float32Array): void {
    const dense = this.entityToDense[entityIndex(entity)]!;
    const stride = ComponentReg.getStride(componentId);
    const col = this.getColumn(componentId);
    out.set(col.subarray(dense * stride, dense * stride + stride));
  }

  writeComponent(entity: Entity, componentId: number, src: Float32Array): void {
    const dense = this.entityToDense[entityIndex(entity)]!;
    const stride = ComponentReg.getStride(componentId);
    const col = this.getColumn(componentId);
    col.set(src.subarray(0, stride), dense * stride);
  }

  add(entity: Entity, initData: Map<number, Float32Array>): number {
    if (this._count >= this.capacity) this.grow();

    const denseIdx = this._count++;
    this.denseToEntity[denseIdx] = entity as number;
    this.entityToDense[entityIndex(entity)] = denseIdx;

    for (const [cid, data] of initData) {
      const stride = ComponentReg.getStride(cid);
      const col = this.getColumn(cid);
      col.set(data.subarray(0, stride), denseIdx * stride);
    }

    return denseIdx;
  }

  remove(entity: Entity): Entity | null {
    const denseIdx = this.entityToDense[entityIndex(entity)]!;
    const lastDense = this._count - 1;

    let swapped: Entity | null = null;

    if (denseIdx !== lastDense) {
      const lastEntity = this.denseToEntity[lastDense] as Entity;
      swapped = lastEntity;

      // Move last entity into gap
      this.denseToEntity[denseIdx] = lastEntity as number;
      this.entityToDense[entityIndex(lastEntity)] = denseIdx;

      for (const [cid, col] of this.columns) {
        const stride = ComponentReg.getStride(cid);
        col.copyWithin(
          denseIdx * stride,
          lastDense * stride,
          (lastDense + 1) * stride,
        );
      }
    }

    this._count--;
    return swapped;
  }

  entityAt(denseIdx: number): Entity {
    return this.denseToEntity[denseIdx] as Entity;
  }

  private grow(): void {
    const nextCapacity = this.capacity * 2;

    const nextDense = new Uint32Array(nextCapacity);
    nextDense.set(this.denseToEntity);
    this.denseToEntity = nextDense;

    for (const [cid, column] of this.columns) {
      const stride = ComponentReg.getStride(cid);
      const next = new Float32Array(nextCapacity * stride);
      next.set(column);
      this.columns.set(cid, next);
    }

    this.capacity = nextCapacity;
  }
}

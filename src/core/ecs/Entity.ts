export const ENTITY_INDEX_BITS = 20;
export const ENTITY_INDEX_MASK = (1 << ENTITY_INDEX_BITS) - 1; // 0x000FFFFF
export const ENTITY_GEN_SHIFT = ENTITY_INDEX_BITS;
export const ENTITY_MAX_INDEX = ENTITY_INDEX_MASK;
export const ENTITY_MAX_GEN = (1 << (32 - ENTITY_INDEX_BITS)) - 1;

// Branded Type, just to be safe
export type Entity = number & { readonly __entityBrand: unique symbol };

export const ENTITY_INVALID: Entity = 0xffffffff as Entity;

export function makeEntity(index: number, generation: number): Entity {
  return (((generation & ENTITY_MAX_GEN) << ENTITY_GEN_SHIFT) |
    (index & ENTITY_INDEX_MASK)) as Entity;
}

export function entityIndex(e: Entity): number {
  return (e as number) & ENTITY_INDEX_MASK;
}

export function entityGeneration(e: Entity): number {
  return ((e as number) >>> ENTITY_GEN_SHIFT) & ENTITY_MAX_GEN;
}

export function isEntityValid(e: Entity): boolean {
  return (e as number) !== (ENTITY_INVALID as number);
}

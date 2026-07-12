import { Archetype } from "./Archetype";
import { componentMask, ComponentSchema } from "./Component";
import { Entity } from "./Entity";

export interface QueryDesc {
  /**Must have ALL of these */
  all: ComponentSchema[];
  /**Must have NONE of these*/
  none: ComponentSchema[];
}

export class Query {
  readonly includeMask: bigint;
  readonly excludeMask: bigint;

  matchingArchetypes: Archetype[] = [];

  private dirty = true;

  constructor(desc: QueryDesc) {
    this.includeMask = componentMask(...desc.all);
    this.excludeMask = componentMask(...desc.none);
  }

  markDirty(): void {
    this.dirty = true;
  }

  revalidate(allArchetypes: Archetype[]): void {
    if (!this.dirty) return;
    this.matchingArchetypes = allArchetypes.filter((a) => this.matches(a));
    this.dirty = false;
  }

  matches(archetype: Archetype): boolean {
    return (
      (archetype.mask & this.includeMask) === this.includeMask &&
      (archetype.mask & this.excludeMask) === 0n
    );
  }

  forEach(
    callback: (entity: Entity, denseIdx: number, archetype: Archetype) => void,
  ): void {
    for (const arch of this.matchingArchetypes) {
      const count = arch.count;
      for (let i = 0; i < count; i++) {
        callback(arch.entityAt(i), i, arch);
      }
    }
  }
}

export interface ComponentSchema {
  readonly id: number; //Bit index in archetype mask (0-62)
  readonly name: string;
  readonly stride: number; //Elements in the typed array per entity
}

class ComponentRegistry {
  private next = 0;
  private schemas: ComponentSchema[] = [];

  register(name: string, stride: number): ComponentSchema {
    if (this.next >= 63) {
      throw new Error(
        `ComponentRegistry: exceeded 63 component limit at '${name}'`,
      );
    }

    const schema: ComponentSchema = { id: this.next++, name, stride };
    this.schemas.push(schema);
    return schema;
  }

  getById(id: number): ComponentSchema {
    const s = this.schemas[id];
    if (!s) throw new Error(`ComponentRegistry: no component with id ${id}`);
    return s;
  }

  getStride(id: number): number {
    return this.getById(id).stride;
  }
}

export const ComponentReg = new ComponentRegistry();

// === Registered Component Types ===

/** World-space position + rotation quaternion + uniform scale.
 *  Layout: [px, py, pz, _pad, qx, qy, qz, qw, sx, sy, sz, _pad] = 12 floats */
export const CTransform = ComponentReg.register("Transform", 12);

/** Linear and angular velocity.
 *  Layout: [vx, vy, vz, _pad, ax, ay, az, _pad] = 8 floats */
export const CVelocity = ComponentReg.register("Velocity", 8);

/** AABB half-extents for physics broadphase.
 *  Layout: [hx, hy, hz, _pad] = 4 floats */
export const CCollider = ComponentReg.register("Collider", 4);

/** Chunk coordinate of the entity (world → chunk lookup key).
 *  Layout: [cx, cz] = 2 floats (stored as f32 but semantically i32) */
export const CChunkRef = ComponentReg.register("ChunkRef", 2);

/** Render mesh handle (index into Renderer's mesh table).
 *  Layout: [meshId] = 1 float (packed u32) */
export const CMeshRef = ComponentReg.register("MeshRef", 1);

/** Player-specific state: health, food, air.
 *  Layout: [health, food, air, _pad] = 4 floats */
export const CPlayerState = ComponentReg.register("PlayerState", 4);

/** Chunk-loader radius (how many chunks the entity triggers loading for).
 *  Layout: [radius] = 1 float */
export const CChunkLoader = ComponentReg.register("ChunkLoader", 1);

/** Camera yaw/pitch in radians.
 *  Layout: [yaw, pitch] = 2 floats */
export const CCamera = ComponentReg.register("Camera", 2);

export function componentMask(...schemas: ComponentSchema[]): bigint {
  return schemas.reduce((mask, s) => mask | (1n << BigInt(s.id)), 0n);
}

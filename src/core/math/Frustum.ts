const PLANE_COUNT = 6;
const PLANE_STRIDE = 4; // nx, ny, nz, d

export const PLANE_LEFT = 0;
export const PLANE_RIGHT = 1;
export const PLANE_BOTTOM = 2;
export const PLANE_TOP = 3;

export const PLANE_NEAR = 4;
export const PLANE_FAR = 5;

export class Frustum {
  readonly planes: Float32Array = new Float32Array(PLANE_COUNT * PLANE_STRIDE);

  /**
   * Extract frustum planes from a view-projection matrix (column-major).
   * Uses the Gribb-Hartmann method — directly reads rows of the matrix.
   */
  extractFromVP(vp: Float32Array): void {
    const m = vp;
    const p = this.planes;

    // Left:   m.row3 + m.row0
    this.setPlane(
      PLANE_LEFT,
      m[3]! + m[0]!,
      m[7]! + m[4]!,
      m[11]! + m[8]!,
      m[15]! + m[12]!,
    );
    // Right:  m.row3 - m.row0
    this.setPlane(
      PLANE_RIGHT,
      m[3]! - m[0]!,
      m[7]! - m[4]!,
      m[11]! - m[8]!,
      m[15]! - m[12]!,
    );
    // Bottom: m.row3 + m.row1
    this.setPlane(
      PLANE_BOTTOM,
      m[3]! + m[1]!,
      m[7]! + m[5]!,
      m[11]! + m[9]!,
      m[15]! + m[13]!,
    );
    // Top:    m.row3 - m.row1
    this.setPlane(
      PLANE_TOP,
      m[3]! - m[1]!,
      m[7]! - m[5]!,
      m[11]! - m[9]!,
      m[15]! - m[13]!,
    );
    // Near:   m.row2 (WebGPU NDC depth [0,1])
    this.setPlane(PLANE_NEAR, m[2]!, m[6]!, m[10]!, m[14]!);
    // Far:    m.row3 - m.row2
    this.setPlane(
      PLANE_FAR,
      m[3]! - m[2]!,
      m[7]! - m[6]!,
      m[11]! - m[10]!,
      m[15]! - m[14]!,
    );
  }

  testAABB(
    minX: number,
    minY: number,
    minZ: number,
    maxX: number,
    maxY: number,
    maxZ: number,
  ): boolean {
    const p = this.planes;

    for (let i = 0; i < PLANE_COUNT; i++) {
      const base = i * PLANE_STRIDE;
      const nx = p[base + 0]!;
      const ny = p[base + 1]!;
      const nz = p[base + 2]!;
      const d = p[base + 3]!;

      const px = nx >= 0 ? maxX : minX;
      const py = ny >= 0 ? maxY : minY;
      const pz = nz >= 0 ? maxZ : minZ;

      if (nx * px + ny * py + nz * pz + d < 0) {
        return false; // Entirely outside this plane
      }
    }

    return true;
  }

  containsPoint(x: number, y: number, z: number): boolean {
    const p = this.planes;
    for (let i = 0; i < PLANE_COUNT; i++) {
      const base = i * PLANE_STRIDE;
      if (
        p[base + 0]! * x + p[base + 1]! * y + p[base + 2]! * z + p[base + 3]! <
        0
      ) {
        return false;
      }
    }
    return true;
  }

  private setPlane(
    index: number,
    nx: number,
    ny: number,
    nz: number,
    d: number,
  ): void {
    const base = index * PLANE_STRIDE;

    const len = Math.hypot(nx, ny, nz);
    const inv = len > 1e-8 ? 1 / len : 0;

    this.planes[base + 0] = nx * inv;
    this.planes[base + 1] = ny * inv;
    this.planes[base + 2] = nz * inv;
    this.planes[base + 3] = d * inv;
  }
}

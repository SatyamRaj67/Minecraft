/** Layout:
 *   [0..2] linear  (vx, vy, vz)
 *   [3]    _pad
 *   [4..6] angular (wx, wy, wz) — unused currently, reserved
 *   [7]    _pad
 */

export const VELOCITY_STRIDE = 8;

export const V_VX = 0;
export const V_VY = 1;
export const V_VZ = 2;

export function velocityMake(vx = 0, vy = 0, vz = 0): Float32Array {
  const v = new Float32Array(VELOCITY_STRIDE);
  v[V_VX] = vx;
  v[V_VY] = vy;
  v[V_VZ] = vz;
  return v;
}

export function velocityGet(v: Float32Array): [number, number, number] {
  return [v[V_VX]!, v[V_VY]!, v[V_VZ]!];
}

export function velocitySet(
  v: Float32Array,
  vx: number,
  vy: number,
  vz: number,
): void {
  v[V_VX] = vx;
  v[V_VY] = vy;
  v[V_VZ] = vz;
}

export function velocityAdd(
  v: Float32Array,
  dvx: number,
  dvy: number,
  dvz: number,
): void {
  v[V_VX]! += dvx;
  v[V_VY]! += dvy;
  v[V_VZ]! += dvz;
}

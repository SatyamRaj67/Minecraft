/** Layout:
 *   [0..2]   position  (x, y, z)
 *   [3]      _pad
 *   [4]      yaw       (radians, Y-axis rotation)
 *   [5]      pitch     (radians, X-axis rotation)
 *   [6]      roll      (radians, Z-axis rotation)
 *   [7]      _pad
 *   [8..10]  scale     (sx, sy, sz) — usually (1, 1, 1)
 *   [11]     _pad
 */

export const TRANSFORM_STRIDE = 12;

// === Field Offsets ===
export const T_PX = 0;
export const T_PY = 1;
export const T_PZ = 2;
export const T_YAW = 4;
export const T_PITCH = 5;
export const T_ROLL = 6;
export const T_SX = 8;
export const T_SY = 9;
export const T_SZ = 10;

export function transformMake(
  x = 0,
  y = 0,
  z = 0,
  yaw = 0,
  pitch = 0,
  roll = 0,
  sx = 1,
  sy = 1,
  sz = 1,
): Float32Array {
  const t = new Float32Array(TRANSFORM_STRIDE);
  t[T_PX] = x;
  t[T_PY] = y;
  t[T_PZ] = z;
  t[T_YAW] = yaw;
  t[T_PITCH] = pitch;
  t[T_ROLL] = roll;
  t[T_SX] = sx;
  t[T_SY] = sy;
  t[T_SZ] = sz;

  return t;
}

export function transformGetPosition(t: Float32Array, out: Float32Array): void {
  out[0] = t[T_PX]!;
  out[1] = t[T_PY]!;
  out[2] = t[T_PZ]!;
}

export function transformSetPosition(
  t: Float32Array,
  x: number,
  y: number,
  z: number,
): void {
  t[T_PX] = x;
  t[T_PY] = y;
  t[T_PZ] = z;
}

export function transformTranslate(
  t: Float32Array,
  dx: number,
  dy: number,
  dz: number,
): void {
  t[T_PX]! += dx;
  t[T_PY]! += dy;
  t[T_PZ]! += dz;
}

export function transformGetYaw(t: Float32Array): number {
  return t[T_YAW]!;
}
export function transformGetPitch(t: Float32Array): number {
  return t[T_PITCH]!;
}

export function transformSetRotation(
  t: Float32Array,
  yaw: number,
  pitch: number,
  roll = 0,
): void {
  t[T_YAW] = yaw;
  t[T_PITCH] = pitch;
  t[T_ROLL] = roll;
}

export const PITCH_MAX = Math.PI * 0.499;
export const PITCH_MIN = -Math.PI * 0.499;

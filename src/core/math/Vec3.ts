export type Vec3Like = Float32Array | [number, number, number];

export function vec3(x = 0, y = 0, z = 0): Float32Array {
  const v = new Float32Array(3);
  v[0] = x;
  v[1] = y;
  v[2] = z;
  return v;
}

export function v3Set(
  out: Float32Array,
  x: number,
  y: number,
  z: number,
  off = 0,
): void {
  out[off + 0] = x;
  out[off + 1] = y;
  out[off + 2] = z;
}

export function v3Copy(
  out: Float32Array,
  src: Float32Array,
  offO = 0,
  offS = 0,
): void {
  out[offO + 0] = src[offS + 0]!;
  out[offO + 1] = src[offS + 1]!;
  out[offO + 2] = src[offS + 2]!;
}

export function v3Add(
  out: Float32Array,
  a: Float32Array,
  b: Float32Array,
  offO = 0,
  offA = 0,
  offB = 0,
): void {
  out[offO + 0] = a[offA + 0]! + b[offB + 0]!;
  out[offO + 1] = a[offA + 1]! + b[offB + 1]!;
  out[offO + 2] = a[offA + 2]! + b[offB + 2]!;
}

export function v3Sub(
  out: Float32Array,
  a: Float32Array,
  b: Float32Array,
  offO = 0,
  offA = 0,
  offB = 0,
): void {
  out[offO + 0] = a[offA + 0]! - b[offB + 0]!;
  out[offO + 1] = a[offA + 1]! - b[offB + 1]!;
  out[offO + 2] = a[offA + 2]! - b[offB + 2]!;
}

export function v3Scale(
  out: Float32Array,
  a: Float32Array,
  s: number,
  offO = 0,
  offA = 0,
): void {
  out[offO + 0] = a[offA + 0]! * s;
  out[offO + 1] = a[offA + 1]! * s;
  out[offO + 2] = a[offA + 2]! * s;
}

export function v3Dot(
  a: Float32Array,
  b: Float32Array,
  offA = 0,
  offB = 0,
): number {
  return (
    a[offA + 0]! * b[offB + 0]! +
    a[offA + 1]! * b[offB + 1]! +
    a[offA + 2]! * b[offB + 2]!
  );
}

export function v3Cross(
  out: Float32Array,
  a: Float32Array,
  b: Float32Array,
  offO = 0,
  offA = 0,
  offB = 0,
): void {
  const ax = a[offA]!,
    ay = a[offA + 1]!,
    az = a[offA + 2]!;
  const bx = b[offB]!,
    by = b[offB + 1]!,
    bz = b[offB + 2]!;
  out[offO] = ay * bz - az * by;
  out[offO + 1] = az * bx - ax * bz;
  out[offO + 2] = ax * by - ay * bx;
}

export function v3LengthSq(a: Float32Array, off = 0): number {
  return (
    a[off]! * a[off]! + a[off + 1]! * a[off + 1]! + a[off + 2]! * a[off + 2]!
  );
}

export function v3Length(a: Float32Array, off = 0): number {
  return Math.sqrt(v3LengthSq(a, off));
}

export function v3Normalize(
  out: Float32Array,
  a: Float32Array,
  offO = 0,
  offA = 0,
): void {
  const len = v3Length(a, offA);
  if (len < 1e-8) {
    out[offO] = 0;
    out[offO + 1] = 0;
    out[offO + 2] = 0;
    return;
  }
  const inv = 1 / len;
  out[offO + 0] = a[offA + 0]! * inv;
  out[offO + 1] = a[offA + 1]! * inv;
  out[offO + 2] = a[offA + 2]! * inv;
}

export function v3Lerp(
  out: Float32Array,
  a: Float32Array,
  b: Float32Array,
  t: number,
  offO = 0,
  offA = 0,
  offB = 0,
): void {
  const it = 1 - t;
  out[offO + 0] = a[offA + 0]! * it + b[offB + 0]! * t;
  out[offO + 1] = a[offA + 1]! * it + b[offB + 1]! * t;
  out[offO + 2] = a[offA + 2]! * it + b[offB + 2]! * t;
}

export const V3_X = 0;
export const V3_Y = 1;
export const V3_Z = 2;

export function VEC3_ZERO(): Float32Array {
  return vec3(0, 0, 0);
}
export function VEC3_ONE(): Float32Array {
  return vec3(1, 1, 1);
}
export function VEC3_UP(): Float32Array {
  return vec3(0, 1, 0);
}
export function VEC3_RIGHT(): Float32Array {
  return vec3(1, 0, 0);
}
export function VEC3_FORWARD(): Float32Array {
  return vec3(0, 0, -1);
}

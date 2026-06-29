export function mat4(): Float32Array {
  const m = new Float32Array(16);
  m[0] = 1;
  m[5] = 1;
  m[10] = 1;
  m[15] = 1;
  return m;
}

export function m4Identity(out: Float32Array): void {
  out.fill(0);
  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
}

export function m4Copy(out: Float32Array, src: Float32Array): void {
  out.set(src);
}

export function m4Multiply(
  out: Float32Array,
  a: Float32Array,
  b: Float32Array,
): void {
  const a00 = a[0]!,
    a01 = a[1]!,
    a02 = a[2]!,
    a03 = a[3]!;
  const a10 = a[4]!,
    a11 = a[5]!,
    a12 = a[6]!,
    a13 = a[7]!;
  const a20 = a[8]!,
    a21 = a[9]!,
    a22 = a[10]!,
    a23 = a[11]!;
  const a30 = a[12]!,
    a31 = a[13]!,
    a32 = a[14]!,
    a33 = a[15]!;

  let b0 = b[0]!,
    b1 = b[1]!,
    b2 = b[2]!,
    b3 = b[3]!;
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[4]!;
  b1 = b[5]!;
  b2 = b[6]!;
  b3 = b[7]!;
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[8]!;
  b1 = b[9]!;
  b2 = b[10]!;
  b3 = b[11]!;
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[12]!;
  b1 = b[13]!;
  b2 = b[14]!;
  b3 = b[15]!;
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
}

export function m4Perspective(
  out: Float32Array,
  fovY: number,
  aspect: number,
  near: number,
  far: number,
): void {
  out.fill(0);

  const f = 1.0 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);

  out[0] = f / aspect;
  out[5] = f;
  out[10] = (near + far) * nf;
  out[11] = -1;
  out[14] = 2 * near * far * nf;
}

export function m4Translate(
  out: Float32Array,
  m: Float32Array,
  tx: number,
  ty: number,
  tz: number,
): void {
  m4Copy(out, m);
  out[12] = m[0]! * tx + m[4]! * ty + m[8]! * tz + m[12]!;
  out[13] = m[1]! * tx + m[5]! * ty + m[9]! * tz + m[13]!;
  out[14] = m[2]! * tx + m[6]! * ty + m[10]! * tz + m[14]!;
  out[15] = m[3]! * tx + m[7]! * ty + m[11]! * tz + m[15]!;
}

export function m4Scale(
  out: Float32Array,
  m: Float32Array,
  sx: number,
  sy: number,
  sz: number,
): void {
  out[0] = m[0]! * sx;
  out[1] = m[1]! * sx;
  out[2] = m[2]! * sx;
  out[3] = m[3]! * sx;
  out[4] = m[4]! * sy;
  out[5] = m[5]! * sy;
  out[6] = m[6]! * sy;
  out[7] = m[7]! * sy;
  out[8] = m[8]! * sz;
  out[9] = m[9]! * sz;
  out[10] = m[10]! * sz;
  out[11] = m[11]! * sz;
  out[12] = m[12]!;
  out[13] = m[13]!;
  out[14] = m[14]!;
  out[15] = m[15]!;
}

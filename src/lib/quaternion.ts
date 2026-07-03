export type Quaternion = { x: number; y: number; z: number; w: number };

export function mul(a: Quaternion, b: Quaternion): Quaternion {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  };
}

export function conjugate(q: Quaternion): Quaternion {
  return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
}

// Round tiny float noise so identities render exactly.
const r = (n: number) => {
  const v = Math.round(n * 1e6) / 1e6;
  return Object.is(v, -0) ? 0 : v;
};

// Column-major CSS matrix3d for the rotation the quaternion represents.
export function toMatrix3d(q: Quaternion): string {
  const len = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  const x = q.x / len,
    y = q.y / len,
    z = q.z / len,
    w = q.w / len;
  const m = [
    1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0,
    2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0,
    2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0,
    0, 0, 0, 1,
  ];
  return `matrix3d(${m.map(r).join(",")})`;
}

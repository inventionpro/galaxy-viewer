export function vector3Distance(A, B) {
  return Math.sqrt((B[0]-A[0])**2 + (B[1]-A[1])**2 + (B[2]-A[2])**2);
}
function matrixMul(A, B) {
  const aIsVec = !Array.isArray(A[0]);
  const bIsVec = !Array.isArray(B[0]);
  const Amat = aIsVec ? [A] : A;
  const Bmat = bIsVec ? B.map(v => [v]) : B;

  const m = Amat.length, n = Amat[0].length, p = Bmat[0].length;
  if (n !== Bmat.length) throw new Error(`Size mismatch: ${m}x${n} and ${Bmat.length}x${p}`);

  const R = Array.from({ length: m }, () => new Array(p).fill(0));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < p; j++)
      for (let k = 0; k < n; k++)
        R[i][j] += Amat[i][k] * Bmat[k][j];

  if (aIsVec && bIsVec) return R[0][0];
  if (aIsVec) return R[0];
  if (bIsVec) return R.map(r => r[0]);
  return R;
}

function rotX(a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    [1,0,0],
    [0,c,-s],
    [0,s,c]
  ];
}
function rotY(a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    [c,0,s],
    [0,1,0],
    [-s,0,c]
  ];
}
function rotZ(a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    [c,-s,0],
    [s,c,0],
    [0,0,1]
  ];
}
function transpose3(m) {
  return [
    [m[0][0],m[1][0],m[2][0]],
    [m[0][1],m[1][1],m[2][1]],
    [m[0][2],m[1][2],m[2][2]],
  ];
}

export function createViewMatrix(camPos, r) {
  const R = matrixMul(rotZ(r[2]), matrixMul(rotY(r[1]), rotX(r[0])));
  const Rt = transpose3(R);
  const t  = matrixMul(Rt, camPos).map(v=>-v);
  return [
    [Rt[0][0],Rt[0][1],Rt[0][2],t[0]],
    [Rt[1][0],Rt[1][1],Rt[1][2],t[1]],
    [Rt[2][0],Rt[2][1],Rt[2][2],t[2]],
    [0,0,0,1]
  ];
}
export function createProjectionMatrix(fov, aspect, near, far) {
  const s = 1 / Math.tan(fov * 0.5);
  return [
    [s/aspect,0,0,0],
    [0,s,0,0],
    [0,0,(far+near)/(near-far),(2*far*near)/(near-far)],
    [0,0,-1,0]
  ];
}
export function projectPoint(localPoint, vp, screenWidth, screenHeight) {
  const clip = matrixMul(vp, [...localPoint, 1]);
  let screen = null;
  if (clip[3]>0) {
    const ndcX = clip[0] / clip[3];
    const ndcY = clip[1] / clip[3];
    screen = [
      (ndcX+1) * 0.5 * screenWidth,
      (1-ndcY) * 0.5 * screenHeight
    ];
  }
  return screen;
}
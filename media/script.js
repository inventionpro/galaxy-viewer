import { vector3Distance, matrixMul, createViewMatrix, createProjectionMatrix, projectPoint } from './math.js';

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

window.onresize = ()=>{
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};
window.onresize();

let camera = {
  position: [0, 0, 50],
  rotation: [0, 0, 0],
  fov: Math.PI/3,
  nearPlane: 0.1,
  farPlane: 1000
};
let center = [0, 0, 0];
let yaw = 0;
let pitch = 0;
let distance = 50;

let points = [];

let lastCamera = '';
let frame;
function render() {
  if (frame) cancelAnimationFrame(frame);
  let k = [camera.position.join('-'), camera.rotation.join('-'), canvas.width, canvas.height].join('_');
  if (lastCamera===k) {
    frame = requestAnimationFrame(render);
    return;
  }
  lastCamera = k;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const view = createViewMatrix(camera.position, camera.rotation);
  const projection = createProjectionMatrix(camera.fov, canvas.width/canvas.height, camera.nearPlane, camera.farPlane);
  const vp = matrixMul(projection, view);

  let projected = points
    .map(pt=>{
      let screen = projectPoint(pt.position, vp, canvas.width, canvas.height);
      if (!screen) return null;
      pt.screen = screen;
      pt.distance = vector3Distance(pt.position, camera.position);
      return pt;
    })
    .filter(Boolean)
    .toSorted((a,b)=>b.distance-a.distance);

  projected.forEach(pt=>{
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.screen[0], pt.screen[1], pt.size, 0, Math.PI*2);
    ctx.fill();
  });

  frame = requestAnimationFrame(render);
}

function updateCamera() {
  camera.position[0] = center[0] + distance*Math.cos(pitch)*Math.sin(yaw);
  camera.position[1] = center[1] + distance*Math.sin(pitch);
  camera.position[2] = center[2] + distance*Math.cos(pitch)*Math.cos(yaw);

  let dx = center[0] - camera.position[0];
  let dy = center[1] - camera.position[1];
  let dz = center[2] - camera.position[2];

  camera.rotation[0] = Math.atan2(dy,Math.hypot(dx,dz));
  camera.rotation[1] = Math.atan2(dx,dz)+Math.PI;
}
function mouseIn(evt) {
  yaw -= evt.movementX*0.01;
  pitch += evt.movementY*0.01;
  let lm = Math.PI/2 + 0.01;
  pitch = Math.max(-lm, Math.min(lm, pitch));
  updateCamera();
}
canvas.onwheel = (evt)=>{
  distance += evt.deltaY/25;
  updateCamera();
};
canvas.onclick = async()=>{
  if (document.pointerLockElement===canvas) {
    document.exitPointerLock()
  } else {
    await canvas.requestPointerLock();
  }
};
document.addEventListener('pointerlockchange', ()=>{
  if (document.pointerLockElement===canvas) {
    document.addEventListener('mousemove', mouseIn);
  } else {
    document.removeEventListener('mousemove', mouseIn);
  }
});
let spin;
canvas.onkeydown = (evt)=>{
  if (evt.key!=='s') return;
  if (spin) {
    clearInterval(spin);
    spin = null;
  } else {
    spin = setInterval(()=>{
      yaw -= 0.005;
      updateCamera();
    }, 10);
  }
};

const starColors = [
  [215,145,80],
  [220,175,120],
  [220,210,190],
  [215,220,230],
  [165,185,225],
  [130,160,225]
];
const lerp = (a,b,t)=>Math.round(a+(b-a)*t);
function getColor(uuid, size) {
  let seed = 0;
  uuid
    .replaceAll('-','')
    .split('')
    .map(c=>c.charCodeAt(0))
    .forEach(c=>{seed=(seed*31+c)>>>0})
  seed = ((seed/0xffffffff)**2)*(starColors.length-1);
  let idx = Math.floor(seed);
  let step = seed - idx;

  let a = starColors[idx];
  let b = starColors[Math.min(idx+1,starColors.length-1)];

  return `rgba(${lerp(a[0],b[0],step)},${lerp(a[1],b[1],step)},${lerp(a[2],b[2],step)},${Math.min(size/0.6+0.2,1)})`;
}


document.addEventListener('DOMContentLoaded',  async()=>{
  const cache = await caches.open('cache');
  let response = await cache.match('galaxy');
  if (!response) {
    response = await fetch('https://nontrinsic.linerly.xyz/api/v1/nonsense/galaxy?format=json');
    await cache.put('galaxy', response.clone());
  }
  response = await response.json();

  let avg = [0, 0, 0];
  let count = 0;
  response.forEach(pt=>{
    let x = pt.umap_dim_0*3;
    let y = pt.umap_dim_1*3;
    let z = pt.umap_dim_2*3;
    avg[0] += x;
    avg[1] += y;
    avg[2] += z;
    count++;
    points.push({
      position: [x, y, z],
      size: pt.point_size*20,
      color: getColor(pt.uuid, pt.point_size)
    });
  });
  center[0] = avg[0]/count;
  center[1] = avg[1]/count;
  center[2] = avg[2]/count;
  updateCamera();
  render();
});

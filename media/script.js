import Papa from 'https://cdn.jsdelivr.net/npm/papaparse/+esm';
import { vector3Distance, matrixMul, createViewMatrix, createProjectionMatrix, projectPoint } from './math.js';

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

let camera = {
  position: [0, 0, 50],
  rotation: [0, 0, 0],
  fov: Math.PI/3,
  nearPlane: 0.1,
  farPlane: 1000
};
let center = [0, 0, 0];
let distance = 50;

let points = [];

let lastCamera = '';
function render() {
  let k = camera.position.join('-')+'_'+camera.rotation.join('-');
  if (lastCamera===k) {
    requestAnimationFrame(render);
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

  requestAnimationFrame(render);
}

document.getElementById('load').onclick = async()=>{
  const cache = await caches.open('cache');
  let response = await cache.match('galaxy');
  if (!response) {
    response = await fetch('https://nontrinsic.linerly.xyz/api/v1/nonsense/galaxy');
    await cache.put('galaxy', response.clone());
  }

  Papa.parse((await response.text()), {
    header: true,
    complete(results) {
      results.data.forEach(pt=>{
        points.push({
          position: [parseFloat(pt.umap_dim_0)*2, parseFloat(pt.umap_dim_1)*2, parseFloat(pt.umap_dim_2)*2],
          size: Math.abs(parseFloat(pt.point_size))*20,
          color: '#'+pt.uuid.slice(-6)+'aa'
        });
      });
      render();
    }
  });
};

function updateCamera() {
  camera.position[0] = center[0] + distance*Math.cos(camera.position[1])*Math.sin(camera.position[0]);
  camera.position[1] = center[1] + distance*Math.sin(camera.position[1]);
  camera.position[2] = center[2] + distance*Math.cos(camera.position[1])*Math.cos(camera.position[0]);
}
function mouseIn(evt) {
  camera.position[0] += evt.movementX*0.01;
  camera.position[1] += evt.movementY*0.01;
  let lm = Math.PI/2 + 0.01;
  camera.position[1] = Math.max(-lm, Math.min(lm, camera.position[1]));
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
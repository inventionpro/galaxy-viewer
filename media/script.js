import Papa from 'https://cdn.jsdelivr.net/npm/papaparse/+esm';
import { vector3Distance, matrixMul, createViewMatrix, createProjectionMatrix, projectPoint } from './math.js';

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

let camera = {
  position: [0, 0, 10],
  rotation: [0, 0, 0],
  fov: Math.PI/3,
  nearPlane: 0.1,
  farPlane: 1000
};
let points = [];

function render() {
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
    ctx.arc(pt.screen[0], pt.screen[1], pt.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

document.getElementById('load').onclick = ()=>{
  Papa.parse('https://nontrinsic.linerly.xyz/api/v1/nonsense/galaxy', {
    download: true,
    header: true,
    complete(results) {
      results.data.forEach(pt=>{
        points.push({
          position: [pt.umap_dim_0, pt.umap_dim_1, pt.umap_dim_2],
          size: pt.point_size,
          color: pt.uuid.slice(-6)
        });
      });
      render();
    }
  });
};
import * as T from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
const $=id=>document.getElementById(id), view=$('view'),status=$('status');
async function load(file,method){const r=await fetch('./assets/'+file);if(!r.ok)throw Error(file+'：'+r.status);return r[method]();}
async function main(){
 const data=await load('model.json','json');
 if(!data.meshes.length)throw Error('沒有可顯示的幾何');
 const buffers=new Map(await Promise.all([...new Set(data.meshes.map(m=>m.file))].map(async f=>[f,await load(f,'arrayBuffer')])));
 const scene=new T.Scene(), camera=new T.PerspectiveCamera(42,1,.05,5000), renderer=new T.WebGLRenderer({antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xe2e9ec);
 view.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','互動 3D 建築模型');
 const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;
 scene.add(new T.HemisphereLight(0xffffff,0xaab3bc,2.1));
 const sun=new T.DirectionalLight(0xfff4e4,2);sun.position.set(8,16,10);scene.add(sun);
 const textures=new T.TextureLoader(), groups=new Map(), mats=new Map(), walls=new Set();
 for(const m of data.meshes){
  const src=data.materials[m.material], stride=src.texture?5:3;
  const raw=new Float32Array(buffers.get(m.file),m.offset,m.count*stride), g=new T.BufferGeometry();
  if(stride===5){
   const inter=new T.InterleavedBuffer(raw,5);
   g.setAttribute('position',new T.InterleavedBufferAttribute(inter,3,0));
   g.setAttribute('uv',new T.InterleavedBufferAttribute(inter,2,3));
  }else g.setAttribute('position',new T.BufferAttribute(raw,3));
  g.computeVertexNormals();g.computeBoundingBox();
  const key=m.material+':'+m.wall;
  if(!mats.has(key)){
   let map=null;
   if(src.texture){map=textures.load('./assets/'+src.texture);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;}
   const color=map?new T.Color(0xffffff):new T.Color().setRGB(...src.color.map(x=>x/255),T.SRGBColorSpace);
   const material=new T.MeshStandardMaterial({color,map,side:T.DoubleSide,opacity:src.alpha,transparent:src.alpha<1,depthWrite:src.alpha>=1});
   material.userData.opacity=src.alpha;
   mats.set(key,material);if(m.wall)walls.add(material);
  }
  if(!groups.has(m.floor)){const group=new T.Group();groups.set(m.floor,group);scene.add(group);}
  groups.get(m.floor).add(new T.Mesh(g,mats.get(key)));
 }
 let selected=null,top=false;
 function fit(){
  const box=new T.Box3();
  for(const [id,g] of groups)if(selected===null||selected===id)box.expandByObject(g);
  const s=box.getBoundingSphere(new T.Sphere()), a=T.MathUtils.degToRad(camera.fov/2);
  const dist=Math.max(1,s.radius)*1.1/Math.sin(Math.min(a,Math.atan(Math.tan(a)*camera.aspect)));
  const dir=(top?new T.Vector3(0,1,.001):new T.Vector3(1,.8,1.25)).normalize();
  orbit.target.copy(s.center);camera.position.copy(s.center).addScaledVector(dir,dist);
  camera.far=Math.max(500,dist*15);camera.updateProjectionMatrix();orbit.update();
 }
 const names=['基地','1 樓','2 樓','3 樓','4 樓','屋頂'], buttons=new Map();
 for(const id of [null,...[...groups.keys()].sort((a,b)=>a-b)]){
  const b=document.createElement('button');b.textContent=id===null?'全部樓層':names[id];b.setAttribute('aria-pressed',String(id===null));
  buttons.set(id,b);$('floors').append(b);
  b.onclick=()=>{selected=id;for(const [k,g] of groups)g.visible=id===null||k===id;for(const [k,x] of buttons)x.setAttribute('aria-pressed',String(k===id));fit();};
 }
 $('walls').disabled=!walls.size;
 $('walls').onchange=()=>{for(const m of walls){m.opacity=$('walls').checked?Math.min(.22,m.userData.opacity):m.userData.opacity;m.transparent=m.opacity<1;m.depthWrite=!m.transparent;m.needsUpdate=true;}};
 $('top').disabled=$('reset').disabled=false;
 function setTop(v){top=v;$('top').setAttribute('aria-pressed',String(v));fit();}
 $('top').onclick=()=>setTop(!top);$('reset').onclick=()=>setTop(false);$('top').setAttribute('aria-pressed','false');
 function resize(){const w=view.clientWidth,h=view.clientHeight;if(w&&h){renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}}
 resize();fit();new ResizeObserver(resize).observe(view);status.hidden=true;
 renderer.setAnimationLoop(()=>{orbit.update();renderer.render(scene,camera);});
}
if(location.protocol==='file:')status.textContent='請用 GitHub Pages 或本機 HTTP 伺服器開啟。';
else main().catch(e=>{status.textContent='無法載入模型：'+e.message;console.error(e);});

import * as T from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
const $=id=>document.getElementById(id), view=$('view'),status=$('status');
async function load(file,method){const r=await fetch('./assets/'+file);if(!r.ok)throw Error(file+'：'+r.status);return r[method]();}
async function main(){
 const data=await load('model-v2.json','json');
 if(!data.meshes.length)throw Error('沒有可顯示的幾何');
 const buffers=new Map(await Promise.all([...new Set(data.meshes.map(m=>m.file))].map(async f=>[f,await load(f,'arrayBuffer')])));
 const scene=new T.Scene(), camera=new T.PerspectiveCamera(42,1,.05,5000), renderer=new T.WebGLRenderer({antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xb8c5cd);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;
 view.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','互動 3D 建築模型');
 const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;
 scene.add(new T.HemisphereLight(0xffffff,0x788597,1.45));
 const sun=new T.DirectionalLight(0xfff4e4,1.65);sun.position.set(8,16,10);scene.add(sun);
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
  const key=m.material;
  if(!mats.has(key)){
   let map=null;
   if(src.texture){map=textures.load('./assets/'+src.texture);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;}
   const color=map?new T.Color(0xd4d7d9):new T.Color().setRGB(...src.color.map(x=>x*.87/255),T.SRGBColorSpace);
   const material=new T.MeshStandardMaterial({color,map,side:T.DoubleSide,forceSinglePass:true,opacity:src.alpha,transparent:src.alpha<1,depthWrite:src.alpha>=1});
   material.userData.opacity=src.alpha;
   mats.set(key,material);walls.add(material);
  }
  const keyGroup=m.floor+':'+m.category;
  if(!groups.has(keyGroup)){const group=new T.Group();group.userData={floor:m.floor,category:m.category};groups.set(keyGroup,group);scene.add(group);}
  groups.get(keyGroup).add(new T.Mesh(g,mats.get(key)));
 }
 const floorIds=[...new Set([...groups.values()].map(g=>g.userData.floor))].sort((a,b)=>a-b);
 const parts={frame:'柱樑',walls:'牆體',slabs:'樓板',other:'其他'};
 const selected=new Set(floorIds), categories=new Set(Object.keys(parts));
 let top=false;
 function fit(){
  const box=new T.Box3();
  for(const g of groups.values())if(g.visible)box.expandByObject(g);if(box.isEmpty())return;
  const s=box.getBoundingSphere(new T.Sphere()), a=T.MathUtils.degToRad(camera.fov/2);
  const dist=Math.max(1,s.radius)*1.1/Math.sin(Math.min(a,Math.atan(Math.tan(a)*camera.aspect)));
  const dir=(top?new T.Vector3(0,1,.001):new T.Vector3(1,.8,1.25)).normalize();
  orbit.target.copy(s.center);camera.position.copy(s.center).addScaledVector(dir,dist);
  camera.far=Math.max(500,dist*15);camera.updateProjectionMatrix();orbit.update();
 }
 const names=['基地','1 樓','2 樓','3 樓','4 樓','屋頂'], states=[];
 function button(nav,label,action,pressed){
  const b=document.createElement('button');b.type='button';b.textContent=label;
  $(nav).append(b);b.onclick=()=>{action();refresh();};states.push([b,pressed]);
 }
 function toggle(set,k){if(set.has(k))set.delete(k);else set.add(k);}
 function replace(set,items){set.clear();for(const item of items)set.add(item);}
 function refresh(){
  for(const g of groups.values())g.visible=selected.has(g.userData.floor)&&categories.has(g.userData.category);
  for(const [b,pressed] of states)if(pressed)b.setAttribute('aria-pressed',String(pressed()));
  status.hidden=[...groups.values()].some(g=>g.visible);
  if(!status.hidden)status.textContent='目前沒有可顯示的構件，請選擇樓層及構件。';
 }
 button('floors','全部樓層',()=>replace(selected,floorIds),()=>selected.size===floorIds.length);
 button('floors','清空樓層',()=>selected.clear(),null);
 for(const id of floorIds)button('floors',names[id],()=>toggle(selected,id),()=>selected.has(id));
 button('parts','完整模型',()=>replace(categories,Object.keys(parts)),()=>categories.size===4);
 button('parts','只看柱樑',()=>replace(categories,['frame']),()=>categories.size===1&&categories.has('frame'));
 for(const [id,label] of Object.entries(parts))button('parts',label,()=>toggle(categories,id),()=>categories.has(id));
 $('walls').disabled=!walls.size;
 $('walls').onchange=()=>{for(const m of walls){m.opacity=$('walls').checked?Math.min(.28,m.userData.opacity):m.userData.opacity;m.transparent=m.opacity<1;m.depthWrite=!m.transparent;m.needsUpdate=true;}};
 $('top').disabled=$('reset').disabled=false;
 function setTop(v){top=v;$('top').setAttribute('aria-pressed',String(v));fit();}
 $('top').onclick=()=>setTop(!top);$('reset').onclick=()=>setTop(false);$('top').setAttribute('aria-pressed','false');
 function resize(){const w=view.clientWidth,h=view.clientHeight;if(w&&h){renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}}
 resize();fit();new ResizeObserver(resize).observe(view);refresh();
 renderer.setAnimationLoop(()=>{orbit.update();renderer.render(scene,camera);});
}
if(location.protocol==='file:')status.textContent='請用 GitHub Pages 或本機 HTTP 伺服器開啟。';
else main().catch(e=>{status.textContent='無法載入模型：'+e.message;console.error(e);});



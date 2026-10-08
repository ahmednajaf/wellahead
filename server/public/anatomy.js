// Reference mesh viewer. Canvas projects and shades the same 3D triangles when
// hardware acceleration is unavailable; this is not a rotating image substitute.
export function createAnatomy(container, status) {
  const canvas = document.createElement('canvas');container.replaceChildren(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });
  const avatarContainer = document.createElement('div'); avatarContainer.className = 'avatar-renderer'; avatarContainer.hidden = true; container.append(avatarContainer);
  let avatar, avatarMode;
  const faceButton=document.createElement('button');faceButton.className='text-button';faceButton.textContent='Face detail';faceButton.hidden=true;
  container.parentElement.querySelector('.anatomy-controls')?.append(faceButton);
  faceButton.onclick=()=>avatar?.face();
  let data, rx=-.08, ry=.22, zoom=1, drag, requested=false, token=0;
  const cache = new Map(); let width=0,height=0,dpr=1;
  const defaults={heart:[-.08,.20],brain:[-.10,.28],lungs:[0,0],gut:[0,0],kidneys:[0,-.45],liver:[.12,.20],metabolism:[0,.12],muscles:[0,.2],reproductive:[0,0],eyes:[0,Math.PI],skin:[0,0]};
  let current='heart';
  function resize(){const r=container.getBoundingClientRect();if(!r.width||!r.height)return;width=r.width;height=r.height;dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);drawSoon();}
  const observer=new ResizeObserver(resize);observer.observe(container);
  function drawSoon(){if(requested)return;requested=true;requestAnimationFrame(()=>{requested=false;draw();});}
  function draw(){
    if(!width||!height)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);if(!data)return;
    const cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),scale=Math.min(width*.36,height*.36)*zoom;
    const project=(x,y,z)=>{const x1=x*cy+z*sy,z1=-x*sy+z*cy;return [x1,y*cx-z1*sx,y*sx+z1*cx];};
    const faces=[];
    for(let i=0;i<data.length;i+=15){
      const n=project(data[i+9],data[i+10],data[i+11]);
      // Draw both sides: some atlas structures are open anatomical surfaces.
      const a=project(data[i],data[i+1],data[i+2]),b=project(data[i+3],data[i+4],data[i+5]),c=project(data[i+6],data[i+7],data[i+8]);
      const diffuse=Math.max(0,n[0]*-.38+n[1]*.58+n[2]*.72),rim=Math.pow(Math.max(0,n[2]),16)*.19;
      const shade=.37+diffuse*.65;
      const col=[12,13,14].map(k=>Math.min(255,Math.round((data[i+k]*shade+rim)*255)));
      faces.push({a,b,c,z:(a[2]+b[2]+c[2])/3,colour:`rgb(${col[0]},${col[1]},${col[2]})`});
    }
    faces.sort((a,b)=>a.z-b.z);
    ctx.lineWidth=.45;ctx.lineJoin='round';
    for(const f of faces){ctx.beginPath();for(const [j,p] of [f.a,f.b,f.c].entries()){const perspective=4.8/(4.8-p[2]);const x=width/2+p[0]*scale*perspective,y=height*.51-p[1]*scale*perspective;j?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fillStyle=f.colour;ctx.strokeStyle=f.colour;ctx.fill();ctx.stroke();}
  }
  async function focus(id){
    current=id;const request=++token;data=null;reset();status.textContent='Loading model…';
    faceButton.hidden=id!=='colleague';
    canvas.hidden=false;avatarContainer.hidden=true;
    if(id==='colleague'){
      try {
        avatarContainer.hidden=false;canvas.hidden=true;
        if(!avatar){
          try {avatar=await (await import('./avatar.js?v=uv-texture-2')).createAvatar(avatarContainer);avatarMode='webgl';}
          catch {avatar=await (await import('./avatar-software.js')).createSoftwareAvatar(avatarContainer);avatarMode='textured-canvas';}
        }
        if(request!==token){avatarContainer.hidden=current!=='colleague';return;}
        avatar.reset();status.textContent='';container.dataset.model=id;container.dataset.renderer=avatarMode;return;
      }catch{status.textContent='The personalised texture could not load. Please reload using http://localhost:4176.';faceButton.hidden=true;return;}
    }
    try{if(!cache.has(id)){const r=await fetch(`/assets/anatomy/${id}.mesh?v=textured-1`);if(!r.ok)throw Error('mesh unavailable');const a=new Float32Array(await r.arrayBuffer());if(a.length%15)throw Error('invalid mesh');cache.set(id,a);}if(request!==token)return;data=cache.get(id);status.textContent='';container.dataset.model=id;container.dataset.renderer='canvas';container.dataset.triangles=String(data.length/15);resize();}catch{if(request===token)status.textContent='This model could not load. Choose another area or try again.';}
  }
  function reset(){[rx,ry]=defaults[current]||[0,0];zoom=1;drawSoon();}
  function changeZoom(delta){zoom=Math.min(1.8,Math.max(.65,zoom+delta));drawSoon();}
  container.addEventListener('pointerdown',e=>{if(current==='colleague'&&avatar&&!avatarContainer.hidden)return;drag={x:e.clientX,y:e.clientY};container.setPointerCapture(e.pointerId);});
  container.addEventListener('pointermove',e=>{if(!drag)return;ry+=(e.clientX-drag.x)*.009;rx=Math.max(-1.4,Math.min(1.4,rx+(e.clientY-drag.y)*.008));drag={x:e.clientX,y:e.clientY};drawSoon();});
  container.addEventListener('pointerup',()=>drag=null);container.addEventListener('pointercancel',()=>drag=null);
  container.addEventListener('wheel',e=>{if(current==='colleague'&&avatar&&!avatarContainer.hidden)return;e.preventDefault();changeZoom(e.deltaY>0?-.06:.06);},{passive:false});
  container.addEventListener('keydown',e=>{if(current==='colleague')return;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','=','0'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')ry-=.15;if(e.key==='ArrowRight')ry+=.15;if(e.key==='ArrowUp')rx-=.1;if(e.key==='ArrowDown')rx+=.1;if(['+','='].includes(e.key))changeZoom(.1);if(e.key==='-')changeZoom(-.1);if(e.key==='0')reset();drawSoon();});
  return {focus,reset(){if(current==='colleague'&&avatar&&!avatarContainer.hidden)avatar.reset();else reset();},zoom(delta){if(current==='colleague'&&avatar&&!avatarContainer.hidden)avatar.zoom(delta);else changeZoom(delta);},dispose(){observer.disconnect();token++;cache.clear();avatar?.dispose();}};
}

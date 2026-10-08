import * as THREE from 'three';

// Adapt Rob's textured canvas rasterizer to the decoded Atelier GLTF scene.
// The fallback uses the same asset, with simplified material/lighting and a
// capped drawing resolution. It redraws only on interaction or resize.
export function createSoftwareOrgan(container, scene) {
  const parts = [], textures = [];
  const point = new THREE.Vector3();
  scene.updateMatrixWorld(true);
  scene.traverse(node => {
    if (!node.isMesh) return;
    const geometry = node.geometry, source = geometry.attributes.position, sourceUV = geometry.attributes.uv;
    const positions = new Float32Array(source.count * 3), uv = sourceUV ? new Float32Array(source.count * 2) : null;
    for (let i=0;i<source.count;i++) {
      point.fromBufferAttribute(source,i).applyMatrix4(node.matrixWorld).toArray(positions,i*3);
      if (uv) { uv[i*2]=sourceUV.getX(i); uv[i*2+1]=sourceUV.getY(i); }
    }
    const material = node.material, texture = material.map;
    let image = null;
    if (texture?.image && uv) {
      const canvas = document.createElement('canvas'), sourceImage = texture.image;
      const scale = Math.min(1,1024 / Math.max(sourceImage.width,sourceImage.height));
      canvas.width = Math.max(1,Math.round(sourceImage.width*scale)); canvas.height = Math.max(1,Math.round(sourceImage.height*scale));
      const context = canvas.getContext('2d',{willReadFrequently:true}); context.drawImage(sourceImage,0,0,canvas.width,canvas.height);
      image = textures.length;
      textures.push({width:canvas.width,height:canvas.height,data:context.getImageData(0,0,canvas.width,canvas.height).data});
    }
    parts.push({positions,uv,indices:geometry.index?.array || Uint32Array.from({length:source.count},(_,i)=>i),image,colour:material.color.clone().convertLinearToSRGB().toArray()});
  });
  const model = {parts};
  const canvas=document.createElement('canvas');container.append(canvas);
  const ctx=canvas.getContext('2d');let yaw=0,pitch=0,zoom=1,targetY=0,drag=null,pending=false,disposed=false;
  function draw(){
    if(disposed)return;
    const rect=container.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const ratio=Math.min(1,640/Math.max(rect.width,rect.height)),w=Math.round(rect.width*ratio),h=Math.round(rect.height*ratio);
    canvas.width=w;canvas.height=h;canvas.style.width=rect.width+'px';canvas.style.height=rect.height+'px';
    const frame=ctx.createImageData(w,h),pixels=frame.data,depth=new Float32Array(w*h).fill(Infinity);
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch),size=Math.min(w*.42,h*.43)*zoom;
    for(const part of model.parts){
      const pos=part.positions,points=new Float32Array(pos.length/3*4),tex=part.image==null?null:textures[part.image];
      for(let i=0,j=0;i<pos.length;i+=3,j+=4){
        const x=pos[i]*cy+pos[i+2]*sy,z=-pos[i]*sy+pos[i+2]*cy,y=pos[i+1]-targetY;
        const py=y*cx-z*sx,pz=y*sx+z*cx,iz=1/(4.8-pz);
        points[j]=w/2+x*size*4.8*iz;points[j+1]=h/2-py*size*4.8*iz;points[j+2]=4.8-pz;points[j+3]=iz;
      }
      for(let t=0;t<part.indices.length;t+=3){
        const ia=part.indices[t],ib=part.indices[t+1],ic=part.indices[t+2],a=ia*4,b=ib*4,c=ic*4;
        const ax=points[a],ay=points[a+1],bx=points[b],by=points[b+1],cxp=points[c],cyp=points[c+1];
        const det=(by-cyp)*(ax-cxp)+(cxp-bx)*(ay-cyp);if(Math.abs(det)<.00001)continue;
        const minX=Math.max(0,Math.floor(Math.min(ax,bx,cxp))),maxX=Math.min(w-1,Math.ceil(Math.max(ax,bx,cxp)));
        const minY=Math.max(0,Math.floor(Math.min(ay,by,cyp))),maxY=Math.min(h-1,Math.ceil(Math.max(ay,by,cyp)));
        for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
          const wa=((by-cyp)*(x+.5-cxp)+(cxp-bx)*(y+.5-cyp))/det;
          const wb=((cyp-ay)*(x+.5-cxp)+(ax-cxp)*(y+.5-cyp))/det,wc=1-wa-wb;
          if(wa<0||wb<0||wc<0)continue;
          const iz=wa*points[a+3]+wb*points[b+3]+wc*points[c+3],z=1/iz,index=y*w+x;
          if(z>=depth[index])continue;
          let sample=0;
          if(tex){
            const u=(wa*part.uv[ia*2]*points[a+3]+wb*part.uv[ib*2]*points[b+3]+wc*part.uv[ic*2]*points[c+3])/iz;
            const v=(wa*part.uv[ia*2+1]*points[a+3]+wb*part.uv[ib*2+1]*points[b+3]+wc*part.uv[ic*2+1]*points[c+3])/iz;
            sample=(Math.min(tex.height-1,Math.max(0,Math.floor(v*tex.height)))*tex.width+Math.min(tex.width-1,Math.max(0,Math.floor(u*tex.width))))*4;
            if(tex.data[sample+3]<100)continue;
          }
          depth[index]=z;
          for(let k=0;k<3;k++)pixels[index*4+k]=(tex?tex.data[sample+k]:255)*part.colour[k];
          pixels[index*4+3]=255;
        }
      }
    }
    ctx.putImageData(frame,0,0);
  }
  function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;draw();});}
  function reset(){yaw=0;pitch=0;zoom=1;targetY=0;schedule();}
  function changeZoom(delta){zoom=Math.max(.65,Math.min(4,zoom+delta));schedule();}
  function key(e){if(container.hidden)return;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(e.key==='0')reset();else if(['+','=','-'].includes(e.key))changeZoom(e.key==='-'?-.15:.15);else{if(e.key==='ArrowLeft')yaw-=.12;if(e.key==='ArrowRight')yaw+=.12;if(e.key==='ArrowUp')pitch-=.1;if(e.key==='ArrowDown')pitch+=.1;schedule();}}
  canvas.onpointerdown=e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);e.stopPropagation();};
  canvas.onpointermove=e=>{if(!drag)return;yaw+=(e.clientX-drag[0])*.008;pitch=Math.max(-1.2,Math.min(1.2,pitch+(e.clientY-drag[1])*.008));drag=[e.clientX,e.clientY];schedule();};
  canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
  canvas.onwheel=e=>{e.preventDefault();e.stopPropagation();changeZoom(e.deltaY>0?-.12:.12);};
  container.addEventListener('keydown',key);
  const observer=new ResizeObserver(schedule);observer.observe(container);schedule();
  return {renderer:'textured-canvas',reset,zoom:changeZoom,dispose(){disposed=true;observer.disconnect();container.removeEventListener('keydown',key);canvas.remove();}};
}

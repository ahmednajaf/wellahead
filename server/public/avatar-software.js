// Texture-mapped, depth-buffered CPU renderer for browsers without WebGL.
// Reads the same exported GLB as the hardware path; no replacement likeness.
export function readAvatarGLB(buffer) {
  const header = new DataView(buffer);
  if (header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2) throw Error('Invalid avatar GLB');
  const length = header.getUint32(12, true);
  const doc = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, length)));
  const start = 28 + length;
  function accessor(index) {
    const a = doc.accessors[index], v = doc.bufferViews[a.bufferView];
    const types = {5126:Float32Array,5125:Uint32Array,5123:Uint16Array,5121:Uint8Array};
    const Type = types[a.componentType], width = {SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type];
    if (!Type || !width || a.sparse || (v.byteStride && v.byteStride !== width * Type.BYTES_PER_ELEMENT)) throw Error('Unsupported avatar accessor');
    const values = new Type(buffer, start + (v.byteOffset || 0) + (a.byteOffset || 0), a.count * width);
    if (a.normalized && a.componentType !== 5126) return Float32Array.from(values, value => value / (a.componentType === 5121 ? 255 : 65535));
    return values;
  }
  const parts = [];
  // This export deliberately has no armature, animation or hierarchy.
  for (const node of doc.nodes) {
    if (node.mesh == null) continue;
    if (node.matrix || node.rotation || node.children) throw Error('Re-export avatar with applied transforms');
    if (/Cornea/.test(node.name)) continue; // transparent shells obscure the actual eyeball
    for (const p of doc.meshes[node.mesh].primitives) {
      if (p.mode != null && p.mode !== 4) throw Error('Avatar must use triangles');
      const source = accessor(p.attributes.POSITION), positions = new Float32Array(source.length);
      for (let i=0;i<source.length;i++) positions[i] = source[i] * (node.scale?.[i%3] ?? 1) + (node.translation?.[i%3] ?? 0);
      const material = doc.materials[p.material]?.pbrMetallicRoughness || {};
      const image = material.baseColorTexture == null ? null : doc.textures[material.baseColorTexture.index].source;
      const uv = p.attributes.TEXCOORD_0 == null ? null : accessor(p.attributes.TEXCOORD_0);
      if (image != null && !uv) throw Error('Avatar texture has no UV coordinates');
      const colourIndex = p.attributes.COLOR_0;
      const vertexColours = colourIndex == null ? null : accessor(colourIndex);
      const colourWidth = colourIndex == null ? 0 : doc.accessors[colourIndex].type === 'VEC4' ? 4 : 3;
      parts.push({positions, uv, indices:accessor(p.indices), image, colour:material.baseColorFactor || [1,1,1,1], vertexColours, colourWidth});
    }
  }
  const low=[Infinity,Infinity,Infinity], high=[-Infinity,-Infinity,-Infinity];
  for(const p of parts) for(let i=0;i<p.positions.length;i++){const k=i%3;low[k]=Math.min(low[k],p.positions[i]);high[k]=Math.max(high[k],p.positions[i]);}
  const scale=2/Math.max(...high.map((v,k)=>v-low[k]));
  for(const p of parts) for(let i=0;i<p.positions.length;i++)p.positions[i]=(p.positions[i]-(low[i%3]+high[i%3])/2)*scale;
  const images=doc.images.map(i=>{const v=doc.bufferViews[i.bufferView];return {bytes:new Uint8Array(buffer,start+(v.byteOffset||0),v.byteLength),type:i.mimeType};});
  return {parts,images};
}

export async function createSoftwareAvatar(container, modelUrl = '/assets/anatomy/colleague.glb?v=uv-texture-2') {
  const response=await fetch(modelUrl);
  if(!response.ok)throw Error('Avatar unavailable');
  const model=readAvatarGLB(await response.arrayBuffer());
  const textures=await Promise.all(model.images.map(async source=>{
    const url=URL.createObjectURL(new Blob([source.bytes],{type:source.type}));
    try {
      const image=new Image();image.src=url;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
      return {width:image.width,height:image.height,data:ctx.getImageData(0,0,image.width,image.height).data};
    } finally {URL.revokeObjectURL(url);}
  }));
  const canvas=document.createElement('canvas');container.append(canvas);
  const ctx=canvas.getContext('2d');let yaw=0,pitch=0,zoom=1,targetY=0,drag=null,pending=false,disposed=false;
  function draw(){
    if(disposed)return;
    const rect=container.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const ratio=Math.min(devicePixelRatio||1,1.5),w=Math.round(rect.width*ratio),h=Math.round(rect.height*ratio);
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
          for(let k=0;k<3;k++) {
            const channel=tex?tex.data[sample+k]:255;
            if (part.vertexColours) {
              // glTF vertex colours are linear; packed PNG texture samples are sRGB.
              const colours=part.vertexColours, width=part.colourWidth;
              const tint=(wa*colours[ia*width+k]*points[a+3]+wb*colours[ib*width+k]*points[b+3]+wc*colours[ic*width+k]*points[c+3])/iz;
              const srgb=channel/255, linear=(srgb<=.04045?srgb/12.92:Math.pow((srgb+.055)/1.055,2.4))*tint*part.colour[k];
              pixels[index*4+k]=255*(linear<=.0031308?12.92*linear:1.055*Math.pow(linear,1/2.4)-.055);
            } else pixels[index*4+k]=channel*part.colour[k];
          }
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
  container.parentElement.addEventListener('keydown',key);
  const observer=new ResizeObserver(schedule);observer.observe(container);schedule();
  return {
    getView(){return {yaw,pitch,zoom,targetY};},
    setView(view){({yaw,pitch,zoom,targetY}=view);schedule();},
    reset,zoom:changeZoom,face(){yaw=0;pitch=0;targetY=.78;zoom=3.5;schedule();},dispose(){disposed=true;observer.disconnect();container.parentElement.removeEventListener('keydown',key);canvas.remove();}};
}

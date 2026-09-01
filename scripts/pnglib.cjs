const fs=require('fs'), zlib=require('zlib');

function readPng(file){
  const b=fs.readFileSync(file);
  let p=8, w,h,depth,ctype, idat=[], plte=null, trns=null;
  while(p<b.length){
    const len=b.readUInt32BE(p); const type=b.toString('ascii',p+4,p+8);
    const data=b.subarray(p+8,p+8+len);
    if(type==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);depth=data[8];ctype=data[9];}
    else if(type==='IDAT') idat.push(data);
    else if(type==='PLTE') plte=data;
    else if(type==='tRNS') trns=data;
    else if(type==='IEND') break;
    p+=12+len;
  }
  const raw=zlib.inflateSync(Buffer.concat(idat));
  const channels={0:1,2:3,3:1,4:2,6:4}[ctype];
  const bpp=Math.max(1,channels*depth/8);
  const stride=Math.ceil(w*channels*depth/8);
  const out=Buffer.alloc(h*stride);
  let pos=0;
  for(let y=0;y<h;y++){
    const f=raw[pos++]; const line=raw.subarray(pos,pos+stride); pos+=stride;
    const prev=y>0?out.subarray((y-1)*stride,y*stride):Buffer.alloc(stride);
    const cur=out.subarray(y*stride,(y+1)*stride);
    for(let i=0;i<stride;i++){
      const a=i>=bpp?cur[i-bpp]:0, bb=prev[i], c=i>=bpp?prev[i-bpp]:0; let v=line[i];
      if(f===1)v+=a; else if(f===2)v+=bb; else if(f===3)v+=(a+bb)>>1;
      else if(f===4){const pp=a+bb-c,pa=Math.abs(pp-a),pb=Math.abs(pp-bb),pc=Math.abs(pp-c);v+=(pa<=pb&&pa<=pc)?a:(pb<=pc?bb:c);}
      cur[i]=v&255;
    }
  }
  // to RGBA
  const rgba=Buffer.alloc(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const o=(y*w+x)*4; let r,g,bl,al=255;
    if(ctype===6){const i=y*stride+x*4; r=out[i];g=out[i+1];bl=out[i+2];al=out[i+3];}
    else if(ctype===2){const i=y*stride+x*3; r=out[i];g=out[i+1];bl=out[i+2];}
    else if(ctype===3){
      let idx;
      if(depth===8) idx=out[y*stride+x];
      else { const ppb=8/depth, byte=out[y*stride+Math.floor(x/ppb)];
             const shift=8-depth*((x%ppb)+1); idx=(byte>>shift)&((1<<depth)-1); }
      r=plte[idx*3];g=plte[idx*3+1];bl=plte[idx*3+2]; if(trns&&idx<trns.length)al=trns[idx];}
    else if(ctype===0){r=g=bl=out[y*stride+x];}
    else if(ctype===4){const i=y*stride+x*2; r=g=bl=out[i]; al=out[i+1];}
    rgba[o]=r;rgba[o+1]=g;rgba[o+2]=bl;rgba[o+3]=al;
  }
  return {w,h,rgba};
}

function writePng(file,w,h,rgba){
  const stride=w*4, raw=Buffer.alloc(h*(stride+1));
  for(let y=0;y<h;y++){raw[y*(stride+1)]=0; rgba.copy(raw,y*(stride+1)+1,y*stride,(y+1)*stride);}
  const chunks=[Buffer.from([137,80,78,71,13,10,26,10])];
  const chunk=(type,data)=>{const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
    const td=Buffer.concat([Buffer.from(type,'ascii'),data]);
    const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(td)>>>0);return Buffer.concat([len,td,crc]);};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
  chunks.push(chunk('IHDR',ihdr));
  chunks.push(chunk('IDAT',zlib.deflateSync(raw)));
  chunks.push(chunk('IEND',Buffer.alloc(0)));
  fs.writeFileSync(file,Buffer.concat(chunks));
}
let T=null;
function crc32(buf){if(!T){T=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;T[n]=c;}}
  let c=0xFFFFFFFF;for(const b of buf)c=T[(c^b)&255]^(c>>>8);return c^0xFFFFFFFF;}

module.exports={readPng,writePng};

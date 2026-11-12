const {chromium}=require('playwright'); const fs=require('fs'); const {execSync}=require('child_process');
const b64=p=>fs.readFileSync('/tmp/vid/node_modules/@fontsource/'+p).toString('base64');
const FONTS=`@font-face{font-family:'Bricolage Grotesque';font-weight:600 800;src:url(data:font/woff2;base64,${b64('bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff2')})}
@font-face{font-family:'DM Sans';font-weight:400 500;src:url(data:font/woff2;base64,${b64('dm-sans/files/dm-sans-latin-500-normal.woff2')})}
@font-face{font-family:'DM Sans';font-weight:600 700;src:url(data:font/woff2;base64,${b64('dm-sans/files/dm-sans-latin-700-normal.woff2')})}
#cap{position:fixed;left:0;right:0;top:92px;display:flex;justify-content:center;z-index:9999;pointer-events:none;padding:0 26px}
#cap span{background:#fff;color:#111;font:700 21px/1.25 'DM Sans',sans-serif;padding:8px 14px;border-radius:9px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.25);max-width:330px}
#cap:empty{display:none}`;
const S=JSON.parse(fs.readFileSync(process.argv[2]));
(async()=>{const b=await chromium.launch();
for(const sc of S){
 const ctx=await b.newContext({viewport:{width:405,height:720},deviceScaleFactor:2.6667,isMobile:true});
 const p=await ctx.newPage(); await p.goto('http://localhost:8799/index.html'); await p.addStyleTag({content:FONTS}); await p.waitForTimeout(600);
 await p.evaluate(([id,mode,order,dn])=>{const P=dn?DATA.daily[dn-1]:DATA.unlimited[mode].find(x=>x.id===id);start(dn?'daily':'unlimited',mode,P);game.order=order;drawList();
   const c=document.createElement('div');c.id='cap';document.body.appendChild(c);},[sc.id,sc.mode,sc.start,sc.daily||0]);
 await p.evaluate(y=>window.scrollTo(0,y),sc.scroll||0); await p.evaluate(()=>document.fonts.ready);
 const dir='/tmp/vid/rec/'+sc.name; fs.rmSync(dir,{recursive:true,force:true}); fs.mkdirSync(dir,{recursive:true});
 const frames=[]; const shot=async d=>{const f=`${dir}/${String(frames.length).padStart(5,'0')}.jpg`;await p.screenshot({path:f,type:'jpeg',quality:90});frames.push([f,d]);};
 const cap=t=>p.evaluate(t=>{const c=document.getElementById('cap');c.innerHTML=t?'<span>'+t+'</span>':''},t);
 const wait=async ms=>{await shot(ms/1000);};
 async function drag(from,to){const li=await p.$(`#rank li[data-i="${from}"]`);const bb=await li.boundingBox();const x=bb.x+bb.width*0.6,y=bb.y+bb.height/2;
   const slot=bb.height+10;await p.mouse.move(x,y);await p.mouse.down();await shot(0.12);
   const ty=y+(to-from)*slot;const steps=16;for(let k=1;k<=steps;k++){const e=k/steps;await p.mouse.move(x+Math.sin(k)*1.5,y+(ty-y)*(1-Math.pow(1-e,2)));await shot(1/30);}
   await shot(0.15);await p.mouse.up();await shot(0.25);}
 for(const st of sc.steps){
   if(st.cap!==undefined) await cap(st.cap);
   if(st.wait&&!st.drag&&!st.lock&&st.scroll===undefined) await wait(st.wait);
   if(st.drag) await drag(st.drag[0],st.drag[1]);
   if(st.lock){await p.evaluate(()=>{const b=document.getElementById('lockBtn');b.style.transform='scale(.96)'});await shot(0.15);await p.evaluate(()=>{lockIn();window.scrollTo(0,0)});let t0=Date.now(),last=t0;while(Date.now()-t0<1100){const n=Date.now();await shot(Math.max(0.03,(n-last)/1000));last=Date.now();}}
   if(st.scroll!==undefined){const y0=await p.evaluate(()=>window.scrollY);if(st.scroll==='list'){st.scroll=await p.evaluate(()=>{const r=document.querySelector('.results .row');return r.getBoundingClientRect().top+window.scrollY-175;});}for(let k=1;k<=20;k++){const e=1-Math.pow(1-k/20,3);await p.evaluate(y=>window.scrollTo(0,y),y0+(st.scroll-y0)*e);await shot(1/30);} if(st.wait) await wait(st.wait);}
 }
 let list='';for(const [f,d] of frames){list+=`file '${f}'\nduration ${d.toFixed(4)}\n`;} list+=`file '${frames[frames.length-1][0]}'\n`; fs.writeFileSync(dir+'/list.txt',list);
 console.log(sc.name,frames.length,frames.reduce((a,x)=>a+x[1],0).toFixed(1)+'s');
 await ctx.close();}
await b.close();})();

const {chromium}=require('playwright'); const fs=require('fs'); const {execSync}=require('child_process');
const r=fs.readFileSync('/tmp/vid/render.js','utf8');
const fontCss=r.match(/@font-face\{font-family:B[^}]*\}\n@font-face\{font-family:D;font-weight:500[^}]*\}\n@font-face\{font-family:D;font-weight:700[^}]*\}/)[0];
const V=JSON.parse(fs.readFileSync(process.argv[2]));
const FPS=30, T=13.5;
const page=(v)=>`<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}
*{box-sizing:border-box}body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#2450D6;font-family:D,'Noto Color Emoji';color:#fff}
#pill{position:absolute;left:80px;top:190px;background:#FFD54A;color:#14161B;font:700 38px D;padding:12px 26px;border-radius:40px}
#h1{position:absolute;left:80px;right:150px;top:285px;font:800 74px/1.05 B;letter-spacing:-1.5px}
#h2{position:absolute;left:80px;right:150px;top:370px;white-space:nowrap;overflow:visible;font:800 150px/1 B;letter-spacing:-4px;color:#FFD54A}
#sub{position:absolute;left:80px;right:150px;top:540px;font:500 42px D;color:#DCE4FF}
.card{position:absolute;left:80px;width:850px;height:122px;background:#fff;color:#14161B;border-radius:26px;display:flex;align-items:center;padding:0 30px;gap:24px;box-shadow:0 10px 30px rgba(0,0,0,.18)}
.rk{width:70px;height:70px;border-radius:18px;background:#EEF1F6;color:#6B7280;font:800 40px B;display:flex;align-items:center;justify-content:center;flex:none}
.nm{flex:1;font:700 44px/1.05 D}.nm small{display:block;font:500 28px D;color:#6B7280}
.vl{font:800 50px B;color:#2450D6;white-space:nowrap}
.card.win{background:#FFD54A}.card.win .rk{background:#14161B;color:#FFD54A}.card.win .vl{color:#14161B}
#bar{position:absolute;left:80px;width:850px;top:1330px;height:22px;border-radius:12px;background:rgba(255,255,255,.25);overflow:hidden}
#fill{height:100%;background:#FFD54A}
#barlab{position:absolute;left:80px;top:1368px;font:700 40px D}
#end{position:absolute;inset:0;background:#14161B;display:flex;flex-direction:column;justify-content:center;padding:0 150px 380px 80px}
#end .q{font:800 96px/1.02 B;letter-spacing:-2px}#end .c{font:800 72px/1.1 B;color:#FFD54A;margin-top:30px}
#end .f{font:500 38px/1.3 D;color:#C9CED8;margin-top:60px}#end .u{display:inline-block;align-self:flex-start;margin-top:50px;background:#2450D6;font:800 60px B;padding:20px 36px;border-radius:24px}
</style></head><body>
<div id="pill">${v.pill}</div><div id="h1">${v.h1}</div><div id="h2">${v.h2}</div><div id="sub">${v.sub}</div>
${v.items.map((it,i)=>`<div class="card" id="c${i}"><div class="rk">?</div><div class="nm">${it[0]}${it[1]?`<small>${it[1]}</small>`:''}</div><div class="vl" style="opacity:0">${it[2]}</div></div>`).join('')}
<div id="bar"><div id="fill"></div></div><div id="barlab">Lock in your order…</div>
<div id="end"><div class="q">How many did you get right?</div><div class="c">Comment your score /5 👇</div><div class="f">${v.fact}</div><div class="u">playballpark.xyz</div></div>
<script>
const SCR=${JSON.stringify(v.scr)}; const top0=640, gap=136;
const ease=x=>x<0?0:x>1?1:1-Math.pow(1-x,3); const back=x=>{x=Math.max(0,Math.min(1,x));const c=1.7;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
window.render=t=>{const H=document.getElementById('h2');let fs=150;H.style.fontSize=fs+'px';while(H.scrollWidth>H.clientWidth+2&&fs>90){fs-=6;H.style.fontSize=fs+'px';}
 // intro
 const hx=ease(t/0.35); document.getElementById('h2').style.transform='scale('+(0.75+0.25*back((t+0.1)/0.35))+')'; document.getElementById('h2').style.transformOrigin='left center';
 ['pill','h1','sub'].forEach((id,k)=>{const e=document.getElementById(id);const p=ease((t+0.15-k*0.03)/0.25);e.style.opacity=p;e.style.transform='translateY('+(30*(1-p))+'px)'});
 const sortP=ease((t-5.0)/0.6);
 for(let i=0;i<5;i++){const e=document.getElementById('c'+i); const slot0=SCR.indexOf(i); const enter=back((t+0.3-slot0*0.07)/0.3);
  const y=top0+gap*(slot0+(i-slot0)*sortP); e.style.top=y+'px'; e.style.transform='translateX('+(-1100*(1-enter))+'px)';
  const rt=5.8+(4-i)*0.9; const on=t>=rt; e.querySelector('.rk').textContent=on?(i+1):'?'; e.querySelector('.vl').style.opacity=on?1:0;
  e.classList.toggle('win',on&&i===0); const pop=on?1+0.08*Math.max(0,1-(t-rt)/0.25):1; e.style.transform+=' scale('+pop+')';}
 const tp=Math.max(0,Math.min(1,(t-0.8)/4.2)); document.getElementById('fill').style.width=(100*(1-tp))+'%';
 const bl=document.getElementById('barlab'); bl.textContent=t<5?'Lock in your order… '+Math.max(1,Math.ceil(5-t)):'${v.reveal}';
 document.getElementById('bar').style.opacity=t<5?1:0;
 if(t>=5){document.getElementById('sub').textContent=${JSON.stringify(v.sub2)};}
 const ep=ease((t-10.6)/0.35); const end=document.getElementById('end'); end.style.opacity=ep; end.style.transform='translateY('+(200*(1-ep))+'px)';
};
</script></body></html>`;
(async()=>{const b=await chromium.launch();
for(const v of V){const p=await b.newPage({viewport:{width:1080,height:1920}});const dir='/tmp/vid/f2/'+v.id; fs.rmSync(dir,{recursive:true,force:true}); fs.mkdirSync(dir,{recursive:true});
 await p.setContent(page(v)); await p.evaluate(()=>document.fonts.ready);
 for(let f=0;f<Math.round(T*FPS);f++){await p.evaluate(t=>window.render(t),f/FPS); await p.screenshot({path:`${dir}/${String(f).padStart(4,'0')}.jpg`,type:'jpeg',quality:90});}
 console.log('done',v.id); await p.close();}
await b.close();})();

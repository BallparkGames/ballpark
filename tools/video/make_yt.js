const {chromium}=require('playwright'); const fs=require('fs');
const r=fs.readFileSync('/tmp/vid/render.js','utf8');
const fontCss=r.match(/@font-face\{font-family:B[^}]*\}\n@font-face\{font-family:D;font-weight:500[^}]*\}\n@font-face\{font-family:D;font-weight:700[^}]*\}/)[0];
const plate=(c,b)=>`<path d="M12 10H52V36L32 55L12 36Z" fill="${c}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/><circle cx="32" cy="30" r="12.5" fill="${b}"/><path d="M25.2 23.2Q29 30 25.2 36.8" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M38.8 23.2Q35 30 38.8 36.8" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
const base=`<style>${fontCss}*{box-sizing:border-box}body{margin:0}</style>`;
const pfp=`${base}<div style="width:800px;height:800px;background:#2450D6;display:flex;align-items:center;justify-content:center"><svg width="470" height="470" viewBox="0 0 64 64" style="margin-top:30px">${plate('#fff','#2450D6')}</svg></div>`;
const rows=(x,y,s,op)=>[1,2,3,4,5].map((n,i)=>`<div style="position:absolute;left:${x}px;top:${y+i*96*s}px;width:${360*s}px;height:${78*s}px;background:#fff;border-radius:${18*s}px;box-shadow:0 4px 14px rgba(20,22,27,.06);opacity:${op};display:flex;align-items:center;gap:${16*s}px;padding:0 ${18*s}px"><div style="width:${46*s}px;height:${46*s}px;border-radius:${12*s}px;background:${n==1?'#2450D6':'#EEF1F6'};color:${n==1?'#fff':'#6B7280'};font:800 ${26*s}px B;display:flex;align-items:center;justify-content:center">${n}</div><div style="height:${14*s}px;width:${(200-n*22)*s}px;background:#E3E7EE;border-radius:8px"></div></div>`).join('');
const banner=`${base}<div style="position:relative;width:2560px;height:1440px;background:#F6F7F9;overflow:hidden;font-family:D;color:#14161B">
${rows(140,330,1.0,.9)}${rows(2060,640,1.0,.9)}
<div style="position:absolute;left:507px;top:508px;width:1546px;height:423px;display:flex;align-items:center;justify-content:center;gap:56px">
<svg width="250" height="250" viewBox="0 0 64 64">${plate('#2450D6','#fff')}</svg>
<div><div style="font:800 150px/0.95 B;letter-spacing:-4px">Ballpark</div>
<div style="font:500 48px D;color:#3A3F4B;margin-top:16px">Rank 5 things by a hidden stat. New puzzle every day.</div>
<div style="display:inline-block;margin-top:26px;background:#2450D6;color:#fff;font:800 46px B;padding:14px 30px;border-radius:20px">playballpark.xyz</div></div></div></div>`;
const cover=`${base}<div style="position:relative;width:1640px;height:624px;background:#F6F7F9;overflow:hidden;font-family:D;color:#14161B"><div style="position:absolute;left:0;right:0;top:0;bottom:0;display:flex;align-items:center;justify-content:center;gap:40px"><svg width="190" height="190" viewBox="0 0 64 64">${plate('#2450D6','#fff')}</svg><div><div style="font:800 112px/0.95 B;letter-spacing:-3px">Ballpark</div><div style="font:500 36px D;color:#3A3F4B;margin-top:12px">Rank 5 things by a hidden stat. New puzzle daily.</div><div style="display:inline-block;margin-top:18px;background:#2450D6;color:#fff;font:800 36px B;padding:10px 22px;border-radius:16px">playballpark.xyz</div></div></div></div>`;
const wm=`${base}<div style="width:150px;height:150px;display:flex;align-items:center;justify-content:center"><svg width="130" height="130" viewBox="0 0 64 64">${plate('#2450D6','#fff')}</svg></div>`;
(async()=>{const b=await chromium.launch();
 for(const [n,h,w,ht,t] of [['pfp',pfp,800,800,false],['banner',banner,2560,1440,false],['watermark',wm,150,150,true],['fbcover',cover,1640,624,false]]){
  const p=await b.newPage({viewport:{width:w,height:ht}});await p.setContent(h);await p.evaluate(()=>document.fonts.ready);
  await p.screenshot({path:`/tmp/yt/ballpark-${n}.png`,omitBackground:t});await p.close();}
 await b.close();})();

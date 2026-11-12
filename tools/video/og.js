const {chromium}=require('playwright');const fs=require('fs');
const r=fs.readFileSync('/tmp/vid/render.js','utf8');
const fontCss=r.match(/@font-face\{font-family:B[^}]*\}\n@font-face\{font-family:D;font-weight:500[^}]*\}\n@font-face\{font-family:D;font-weight:700[^}]*\}/)[0];
const plate=(c,b)=>`<path d="M12 10H52V36L32 55L12 36Z" fill="${c}" stroke="${c}" stroke-width="6" stroke-linejoin="round"/><circle cx="32" cy="30" r="12.5" fill="${b}"/><path d="M25.2 23.2Q29 30 25.2 36.8" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M38.8 23.2Q35 30 38.8 36.8" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
const items=['Red Bull','Starbucks coffee','Celsius','Monster','Coca-Cola'];
const rows=items.map((n,i)=>`<div style="display:flex;align-items:center;gap:18px;background:#fff;border-radius:18px;padding:0 22px;height:76px;box-shadow:0 6px 18px rgba(20,22,27,.08);border:${i==1?'3px solid #2450D6':'3px solid transparent'};transform:${i==1?'translateX(-14px) rotate(-1.5deg)':'none'}"><div style="width:44px;height:44px;border-radius:12px;background:#EEF1F6;color:#6B7280;font:800 26px B;display:flex;align-items:center;justify-content:center">${i+1}</div><div style="flex:1;font:700 30px D;color:#14161B">${n}</div><div style="font:800 30px B;color:#2450D6">?</div></div>`).join('');
const html=`<style>${fontCss}*{box-sizing:border-box}body{margin:0}</style>
<div style="width:1200px;height:630px;background:#F6F7F9;display:flex;align-items:center;padding:0 70px;gap:60px;font-family:D;color:#14161B">
 <div style="flex:1.05">
  <div style="display:flex;align-items:center;gap:18px"><svg width="86" height="86" viewBox="0 0 64 64">${plate('#2450D6','#fff')}</svg><div style="font:800 64px B;letter-spacing:-2px">Ballpark</div></div>
  <div style="font:800 62px/1.02 B;letter-spacing:-2px;margin-top:34px">Rank 5 things by a hidden stat.</div>
  <div style="font:500 30px D;color:#3A3F4B;margin-top:18px">One clue. New puzzle every day.</div>
  <div style="display:inline-block;margin-top:30px;background:#2450D6;color:#fff;font:800 32px B;padding:14px 26px;border-radius:18px">playballpark.xyz</div>
 </div>
 <div style="flex:.95;display:flex;flex-direction:column;gap:14px">
  <div style="font:700 22px D;color:#6B7280;letter-spacing:2px">MOST CAFFEINE ↓</div>${rows}
 </div></div>`;
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1200,height:630}});await p.setContent(html);await p.evaluate(()=>document.fonts.ready);
await p.screenshot({path:'/home/claude/ballpark-repo/public/og.png'});await b.close();})();

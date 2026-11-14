// Regression test: each completed content analysis updates session counters even without a mapped Kodam.
const fs=require('fs'), vm=require('vm'), assert=require('assert');
const src=fs.readFileSync('js/07-feed.js','utf8');
const a=src.indexOf('function kAnalysisTypes(text,r){');
const b=src.indexOf('function kBuzz(r)',a);
assert(a>=0&&b>a,'analysis sync functions must exist');
const code=src.slice(a,b);
const ctx={
  KT:[['Narasi SARA'],['Buzzer terkoordinasi'],['Deepfake'],['Provokasi massa'],['Phishing sosial']],
  kc:0, klg:[], kev:[], kagg:{}, kas:{},kts:{},knr:{},kvt:{},
  kct:[0,0,0,0,0],kbk:Array.from({length:5},()=>Array(180).fill(0)),
  kwt:1, mr:[], window:{KS_KODAM_SCOPE:{provinceCodesForKodam:()=>['JK']}},
  kUI(){}, svM(){},renderM(){},save(){},Date,Math,
  kCity:()=>null
};
vm.createContext(ctx); vm.runInContext(code,ctx);
const r={risk:95,sara:true,kategori:{PROVOKATIF:{skor:8}}};
ctx.kReal('VIRAL! Sebarkan sekarang. Ada buzzer dan akun bot, deepfake, OTP phishing.',r);
assert.strictEqual(ctx.kc,1,'session signal count increments without location');
assert.strictEqual(ctx.kct[0],1,'SARA count increments');
assert.strictEqual(ctx.kct[1],1,'coordination indicator count increments');
assert.strictEqual(ctx.kct[2],1,'deepfake count increments');
assert.strictEqual(ctx.kct[3],1,'provocation count increments');
assert.strictEqual(ctx.kct[4],1,'phishing count increments');
assert.strictEqual(ctx.mr.length,0,'no Kodam location is invented');
ctx.kCity=()=>['KJ','Kodam Jaya',-6.2,106.8];
ctx.kReal('Laporan terkait Kodam Jaya', {risk:55,sara:false,kategori:{}});
assert.strictEqual(ctx.kc,2,'second analysis increments session count');
assert.strictEqual(ctx.mr.length,1,'mapped Kodam is sent to early warning');
ctx.kCity=()=>null;
ctx.kReal('Narasi tanpa penyebutan lokasi', {risk:70,sara:false,kategori:{}}, ['K12','Kodam XII/Tanjungpura',-0.0263,109.3425]);
assert.strictEqual(ctx.kc,3,'analysis with selected Kodam still increments session count');
assert.strictEqual(ctx.mr.length,2,'selected Kodam context is sent to early warning');
assert.strictEqual(ctx.mr[1].kodamCode,'K12','selected Kodam identity is retained');
assert.strictEqual(ctx.kts['Kodam XII/Tanjungpura'],1,'Top Kodam aggregation receives selected Kodam');
console.log('PASS: analysis updates all five relevant threat counters and session stats; Kodam routing only when location resolves');

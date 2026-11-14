// Integration checks for Kodam-centric routing and cross-module aggregation.
const fs=require('fs');
global.window=global;
eval(fs.readFileSync('data/kodam.js','utf8'));
eval(fs.readFileSync('js/00d-kodam-scope.js','utf8'));
const assert=require('assert');
assert.strictEqual(KODAM_DATA.length,27,'must contain 27 Kodam');
assert.strictEqual(Object.keys(KODAM_BY_PROVINCE).length,38,'must map 38 provinces');
for(const [province,kodam] of Object.entries(KODAM_BY_PROVINCE)){
  assert(KODAM_DATA.some(k=>k.code===kodam),`unknown Kodam ${kodam} for ${province}`);
  assert(KS_KODAM_SCOPE.fromProvinceCode(province),`unresolved province ${province}`);
}
const cases=[
  ['Narasi menyebut Kodam Jaya/Jayakarta','KJ'],
  ['Informasi terkait Kodam XVII/Cenderawasih','K17'],
  ['Peristiwa di Surabaya','K5'],
  ['Isu di Papua Tengah','K29'],
  ['Laporan di Jayapura','K17'],
  ['Konten menyebut Kodam XXV/Sultan Mahmud Riayat Syah','K25']
];
for(const [text,expected] of cases){
  const got=KS_KODAM_SCOPE.targetFromText(text);
  assert(got&&got[0]===expected,`${text}: expected ${expected}, got ${JSON.stringify(got)}`);
}
const live=fs.readFileSync('js/05-peta-live.js','utf8');
const feed=fs.readFileSync('js/07-feed.js','utf8');
const dashboard=fs.readFileSync('js/02-analisis.js','utf8');
assert(!/\bMS\b/.test(live),'simulation must not reference undefined MS');
assert(live.includes("provinceCodesForKodam(o.p)"),'map sync must translate Kodam code to legacy province key');
assert(feed.includes("sourceType:'event'"),'events must flow into early warning records');
assert(feed.includes("kodamCode:g[0]"),'events must retain Kodam as primary identity');
assert(dashboard.includes('Ringkasan pemantauan 27 Kodam'),'dashboard must show unified Kodam summary');
console.log('PASS: 27 Kodam, 38 province mappings, explicit Kodam/city resolver, simulation, map/feed/dashboard integration');

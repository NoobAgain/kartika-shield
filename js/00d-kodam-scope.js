/* KARTIKA SHIELD — Kodam-centric monitoring scope.
 * Province/city mentions are resolved to a province code, then mapped to a Kodam.
 * Original source text and province codes remain intact for traceability.
 */
(function(g){
  'use strict';
  const byCode = new Map((g.KODAM_DATA||[]).map(k=>[k.code,k]));
  const byProvince = g.KODAM_BY_PROVINCE || {};
  const provinceNames = {
    AC:'Aceh',SU:'Sumatera Utara',SB:'Sumatera Barat',RI:'Riau',KR:'Kepulauan Riau',JA:'Jambi',BE:'Bengkulu',SS:'Sumatera Selatan',BB:'Kepulauan Bangka Belitung',LA:'Lampung',BT:'Banten',JK:'DKI Jakarta',JB:'Jawa Barat',JT:'Jawa Tengah',YO:'DI Yogyakarta',JI:'Jawa Timur',BA:'Bali',NB:'Nusa Tenggara Barat',NT:'Nusa Tenggara Timur',KB:'Kalimantan Barat',KT:'Kalimantan Tengah',KS:'Kalimantan Selatan',KI:'Kalimantan Timur',KU:'Kalimantan Utara',SA:'Sulawesi Utara',GO:'Gorontalo',ST:'Sulawesi Tengah',SR:'Sulawesi Barat',SN:'Sulawesi Selatan',SG:'Sulawesi Tenggara',MU:'Maluku Utara',MA:'Maluku',PD:'Papua Barat Daya',PB:'Papua Barat',PA:'Papua',PH:'Papua Tengah',PP:'Papua Pegunungan',PS:'Papua Selatan'
  };
  const aliases = [
    ['Mataram','NB'],['Papua Barat Daya','PD'],['Sorong','PD'],['Papua Pegunungan','PP'],['Wamena','PP'],['Jayawijaya','PP'],['Papua Tengah','PH'],['Nabire','PH'],['Papua Selatan','PS'],['Merauke','PS'],['Papua Barat','PB'],['Manokwari','PB'],['Papua','PA'],['Jayapura','PA'],
    ['Kepulauan Bangka Belitung','BB'],['Bangka Belitung','BB'],['Pangkal Pinang','BB'],['Kepulauan Riau','KR'],['Tanjung Pinang','KR'],['Tanjungpinang','KR'],['Batam','KR'],
    ['Kalimantan Utara','KU'],['Tanjung Selor','KU'],['Kalimantan Timur','KI'],['Balikpapan','KI'],['Samarinda','KI'],['Kalimantan Barat','KB'],['Pontianak','KB'],['Kalimantan Tengah','KT'],['Palangka Raya','KT'],['Kalimantan Selatan','KS'],['Banjarmasin','KS'],['Banjarbaru','KS'],
    ['Sumatera Utara','SU'],['Medan','SU'],['Sumatera Barat','SB'],['Padang','SB'],['Riau','RI'],['Pekanbaru','RI'],['Jambi','JA'],['Bengkulu','BE'],['Sumatera Selatan','SS'],['Palembang','SS'],['Lampung','LA'],['Bandar Lampung','LA'],['Aceh','AC'],['Banda Aceh','AC'],
    ['DKI Jakarta','JK'],['Jakarta','JK'],['Banten','BT'],['Serang','BT'],['Tangerang','BT'],['Jawa Barat','JB'],['Bandung','JB'],['Bogor','JB'],['Depok','JB'],['Bekasi','JB'],['Jawa Tengah','JT'],['Semarang','JT'],['Surakarta','JT'],['DI Yogyakarta','YO'],['Yogyakarta','YO'],['Jogja','YO'],['Jawa Timur','JI'],['Surabaya','JI'],['Malang','JI'],['Bali','BA'],['Denpasar','BA'],['Nusa Tenggara Barat','NB'],['Mataram','NB'],['Nusa Tenggara Timur','NT'],['Kupang','NT'],
    ['Sulawesi Utara','SA'],['Manado','SA'],['Gorontalo','GO'],['Sulawesi Tengah','ST'],['Palu','ST'],['Sulawesi Barat','SR'],['Mamuju','SR'],['Sulawesi Selatan','SN'],['Makassar','SN'],['Sulawesi Tenggara','SG'],['Kendari','SG'],['Maluku Utara','MU'],['Sofifi','MU'],['Ternate','MU'],['Maluku','MA'],['Ambon','MA']
  ].sort((a,b)=>b[0].length-a[0].length);
  function fromProvinceCode(code){
    code=String(code||'').trim().toUpperCase();
    const kodamCode=byProvince[code], kodam=byCode.get(kodamCode);
    return kodam?{provinceCode:code,provinceName:provinceNames[code]||code,kodamCode:kodam.code,kodamName:kodam.name,kodam,city:kodam.city||'',lat:+kodam.lat,lon:+kodam.lon}:null;
  }
  function resolveText(text){
    const t=String(text||'');
    // Prioritaskan penyebutan eksplisit satuan Kodam agar tidak salah dipetakan
    // hanya karena teks juga memuat kota/provinsi lain sebagai konteks.
    const kodamAliases = [...byCode.values()].flatMap(k => {
      const full = String(k.name || '').replace(/^Kodam\\s*/i,'').trim();
      // First pass accepts exact/numbered official unit names and stable code.
      // Short suffixes are resolved after province/city aliases to avoid
      // collisions such as "Mataram" (HQ Kodam XXX/Rinambora).
      return [k.name, full, k.code].filter(Boolean).map(alias => [String(alias),k.code]);
    }).sort((a,b)=>b[0].length-a[0].length);
    for (const [alias,code] of kodamAliases) {
      const escaped=String(alias).replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&');
      const re=new RegExp('(^|[^\\\\p{L}])'+escaped+'([^\\\\p{L}]|$)','iu');
      if(re.test(t)){
        const kodam=byCode.get(code), provinces=Object.keys(byProvince).filter(c=>byProvince[c]===code);
        const provinceCode=provinces[0]||'';
        return {provinceCode,provinceName:provinceNames[provinceCode]||'',kodamCode:code,kodamName:kodam.name,kodam,city:kodam.city||'',lat:+kodam.lat,lon:+kodam.lon};
      }
    }
    for(const [name,code] of aliases){
      const re=new RegExp('(^|[^\\p{L}])'+name.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')+'([^\\p{L}]|$)','iu');
      if(re.test(t)){const r=fromProvinceCode(code);if(r)return r;}
    }
    // Last pass: distinctive Kodam suffixes such as "Hasanuddin".
    const suffixes=[...byCode.values()].map(k=>{
      const n=String(k.name||'').replace(/^Kodam\\s*/i,'').trim();
      return [n.includes('/')?n.split('/').slice(1).join('/').trim():n,k.code];
    }).filter(([n])=>n);
    for(const [name,code] of suffixes.sort((a,b)=>b[0].length-a[0].length)){
      const re=new RegExp('(^|[^\\p{L}])'+name.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')+'([^\\p{L}]|$)','iu');
      if(re.test(t)){const k=byCode.get(code),p=Object.keys(byProvince).find(c=>byProvince[c]===code)||'';return {provinceCode:p,provinceName:provinceNames[p]||'',kodamCode:code,kodamName:k.name,kodam:k,city:k.city||'',lat:+k.lat,lon:+k.lon};}
    }
    return null;
  }
  function fromStoredLocation(value){
    const v=String(value||'').trim();
    if(/^[A-Z]{2}$/.test(v)){const r=fromProvinceCode(v);if(r)return r;}
    return resolveText(v);
  }
  function targetFromProvince(code){const r=fromProvinceCode(code);return r?[r.kodamCode,r.kodamName,r.lat,r.lon]:null;}
  function targetFromText(text){const r=resolveText(text);return r?[r.kodamCode,r.kodamName,r.lat,r.lon]:null;}
  function nameForProvince(code){const r=fromProvinceCode(code);return r?r.kodamName:'Kodam belum terpetakan';}
  function provinceCodesForKodam(code){return Object.keys(byProvince).filter(c=>byProvince[c]===code);}
  g.KS_KODAM_SCOPE={fromProvinceCode,resolveText,fromStoredLocation,targetFromProvince,targetFromText,nameForProvince,provinceCodesForKodam,provinceNames};
})(window);

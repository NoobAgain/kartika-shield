// Pemetaan indikator ke DISARM Red Framework (taktik/teknik). Rujukan: DISARM Foundation, CC BY-SA 4.0.
const DISARM_TACTICS={TA02:'Plan Objectives',TA05:'Microtarget',TA06:'Develop Content',TA14:'Develop Narratives',TA15:'Establish Assets',TA16:'Establish Legitimacy',TA17:'Maximise Exposure'};
const DISARM_TECHS={
'T0015.002':['Create New Hashtag','TA06','Tagar kampanye'],
'T0016':['Create Clickbait','TA05','Pancingan klik/urgensi'],
'T0022':['Leverage Conspiracy Theory Narratives','TA14','Narasi konspirasi'],
'T0049.001':['Trolls Amplify and Manipulate','TA17','Troll memperkuat narasi'],
'T0049.002':['Flood Existing Hashtag','TA17','Banjiri tagar'],
'T0049.003':['Bots Amplify via Automated Forwarding and Reposting','TA17','Amplifikasi otomatis'],
'T0049.005':['Conduct Swarming','TA17','Serbuan akun serempak'],
'T0049.008':['Generate Information Pollution','TA17','Polusi informasi'],
'T0075.001':['Discredit Credible Sources','TA02','Diskreditkan sumber kredibel'],
'T0079':['Divide','TA02','Pecah belah kelompok'],
'T0083':['Integrate Target Audience Vulnerabilities into Narrative','TA14','Manfaatkan kerentanan audiens'],
'T0084.001':['Use Copypasta','TA06','Teks salin-tempel'],
'T0085.001':['Develop AI-Generated Text','TA06','Teks buatan AI'],
'T0085.003':['Develop Inauthentic News Articles','TA06','Artikel berita tidak autentik'],
'T0086.002':['Develop AI-Generated Images (Deepfakes)','TA06','Gambar deepfake'],
'T0086.003':['Deceptively Edit Images (Cheap Fakes)','TA06','Suntingan gambar menyesatkan'],
'T0087.001':['Develop AI-Generated Videos (Deepfakes)','TA06','Video deepfake'],
'T0088.001':['Develop AI-Generated Audio (Deepfakes)','TA06','Audio deepfake'],
'T0140.003':['Spread Hate','TA02','Ujaran kebencian'],
'T0143.002':['Fabricated Persona','TA16','Persona palsu'],
'T0145':['Establish Account Imagery','TA15','Citra akun'],
'T0150.001':['Newly Created Asset','TA15','Akun baru'],
'T0150.008':['Bulk Created Asset','TA15','Akun dibuat massal']
};
function disarmText(t){
  const s=String(t||''),out=[],seen=new Set();
  const add=(id,why)=>{if(seen.has(id))return;const d=DISARM_TECHS[id];if(d){seen.add(id);out.push({id,name:d[0],tactic:d[1],short:d[2],why})}};
  if(/#[\p{L}\p{N}_]+/u.test(s))add('T0015.002','Teks memuat tagar kampanye');
  if(/\b(?:sebarkan|share|viral|forward|sebelum dihapus|klik|klik link)\b/i.test(s))add('T0016','Seruan menyebarkan atau mengklik');
  if(/(media tidak berani|ditutupi|menutupi|disembunyikan|menyembunyikan|konspirasi|deep state)/i.test(s)){add('T0022','Klaim penyembunyian/konspirasi');add('T0075.001','Menyerang kredibilitas media/sumber')}
  if(/(menguasai|menghancurkan|musnah|serbu|bantai|kuasai|jajah)/i.test(s))add('T0079','Framing ancaman terhadap kelompok');
  if(/(agama|suku|etnis|cina|china|kafir|pribumi|asing|aseng|rumah ibadah|gereja|masjid|umat|pendatang)/i.test(s))add('T0083','Eksploitasi isu identitas/SARA');
  if(/\b(?:benci|hina|kafir|anjing|binatang)\b/i.test(s))add('T0140.003','Ujaran merendahkan kelompok');
  if(/(deepfake|deep fake|video palsu|suara palsu|wajah palsu)/i.test(s))add('T0087.001','Isyarat video/audio sintetis');
  else if(/(foto palsu|gambar palsu|hasil edit|suntingan)/i.test(s))add('T0086.003','Isyarat gambar disunting');
  if(/(ai|kecerdasan buatan|chatgpt|generatif)/i.test(s)&&/(teks|artikel|berita|narasi)/i.test(s))add('T0085.001','Isyarat teks generatif');
  if(/(berita palsu|situs palsu|media abal|portal abal)/i.test(s))add('T0085.003','Isyarat berita/situs tidak autentik');
  return out;
}
function disarmCluster(t,o={}){
  const out=disarmText(t),seen=new Set(out.map(x=>x.id));
  const add=(id,why)=>{if(seen.has(id))return;const d=DISARM_TECHS[id];if(d){seen.add(id);out.push({id,name:d[0],tactic:d[1],short:d[2],why})}};
  if(o.copy)add('T0084.001','Teks nyaris sama antar akun');
  if((o.accounts||0)>=3)add('T0049.003','Pola posting serentak dari banyak akun');
  if(o.burst)add('T0049.005','Posting serempak dalam jendela sempit');
  if((o.tags||0)>=2)add('T0049.002','Tagar yang sama dipakai berulang');
  if((o.newAccounts||0)>=2)add('T0150.001','Beberapa akun baru dalam klaster');
  if(o.sameAge)add('T0150.008','Usia akun seragam, indikasi pembuatan massal');
  if(o.numericNames)add('T0143.002','Pola nama akun generik/berpola angka');
  if(o.media)add('T0145','Akun memakai citra profil untuk membangun legitimasi');
  return out;
}
function disarmTactics(ds){const s=new Set(ds.map(x=>x.tactic));return [...s].map(id=>({id,name:DISARM_TACTICS[id]||id}))}

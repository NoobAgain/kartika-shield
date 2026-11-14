'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let sent = null;
const context = {
  AbortController,
  FormData,
  Blob,
  setTimeout,
  clearTimeout,
  fetch: async (_url, options) => {
    sent = { url: _url, options, form: options.body };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        vonis: 'TIDAK_DAPAT_DIPASTIKAN',
        alasan_vonis: 'Uji integrasi',
        skor_kredibilitas: 50,
        ada_provokasi: false,
        skor_provokasi: 0,
        unsur_provokasi: [],
        ringkasan: 'Respons uji'
      })
    };
  },
  document: { createElement: () => ({ setAttribute(){}, style:{}, remove(){}, textContent:'' }), body:{ appendChild(){} } },
  console
};
vm.runInNewContext(fs.readFileSync('js/n8n-bridge.js', 'utf8'), context);
(async () => {
  const imageFile = new Blob([Buffer.from('test-image')], { type: 'image/png' });
  imageFile.name = 'uji.png';
  const result = await context.analisisGabungan({
    id:'ks-test',
    text:'Uji lampiran',
    ruleScore:10,
    indicators:[],
    source:'Verifikasi Data',
    image:{ name:'uji.png', mime_type:'image/png', size_bytes:10, file:imageFile }
  });
  assert.equal(result.mode, 'online');
  assert.equal(sent.url, 'https://sukirman.app.n8n.cloud/webhook/kartika-shield-analyze');
  assert.equal(sent.options.method, 'POST');
  assert.ok(sent.form instanceof FormData);
  assert.equal(sent.form.get('id_unggahan'), 'ks-test');
  assert.equal(sent.form.get('catatan'), 'Uji lampiran');
  assert.equal(sent.form.get('foto').name, 'uji.png');
  assert.equal(result.vonis, 'TIDAK_DAPAT_DIPASTIKAN');
  console.log('PASS n8n multipart integration: foto, id_unggahan, catatan, and result fields');
})().catch(e => { console.error(e); process.exitCode = 1; });

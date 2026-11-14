'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let sent = null;
const context = {
  AbortController, FormData, Blob, setTimeout, clearTimeout,
  fetch: async (url, options) => {
    sent = { url, options };
    return { ok:true, status:200, json:async()=>({
      vonis:'UNVERIFIED', alasan_vonis:'Uji teks', skor_kredibilitas:50,
      ada_provokasi:false, skor_provokasi:0, unsur_provokasi:[], ringkasan:'Respons uji'
    }) };
  },
  document:{ createElement:()=>({setAttribute(){},style:{},remove(){},textContent:''}), body:{appendChild(){}} },
  console
};
vm.runInNewContext(fs.readFileSync('js/n8n-bridge.js','utf8'), context);
(async()=>{
  const result=await context.analisisGabungan({
    id:'ks-text-test', text:'Klaim untuk diuji', ruleScore:10, indicators:[],
    source:'Verifikasi Data'
  });
  assert.equal(result.mode,'online');
  assert.equal(sent.options.method,'POST');
  assert.ok(sent.options.body instanceof FormData);
  assert.equal(sent.options.body.get('foto'),null);
  assert.equal(sent.options.body.get('catatan'),'Klaim untuk diuji');
  assert.equal(sent.options.body.get('teks'),'Klaim untuk diuji');
  assert.equal(sent.options.body.get('jenis_input'),'text');
  assert.equal(sent.options.body.get('id_unggahan'),'ks-text-test');
  console.log('PASS text-only multipart integration');
})().catch(e=>{console.error(e);process.exitCode=1;});

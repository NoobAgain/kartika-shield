# Atribusi pihak ketiga

- **Batas 38 provinsi (GeoJSON)**: indonesia-geojson-topojson-maps-with-38-provinces
  https://github.com/denyherianto/indonesia-geojson-topojson-maps-with-38-provinces
  Data berlisensi CC BY 4.0. Pada `data/provinces.js` data disederhanakan (pembulatan koordinat dan normalisasi arah poligon).
- **Lambang provinsi**: dari daftar lambang provinsi di Indonesia (sumber P2K Stekom / Wikipedia). Dikecilkan dan disimpan di `data/logos.js`. Periksa lisensi tiap gambar sebelum dipakai di luar keperluan akademik.
- **Peta dunia**: data TopoJSON negara (`data/world.js`).
- **Pustaka**: d3 v7.9.0 dan topojson-client v3.1.0 (lisensi ISC), disertakan di `vendor/` sehingga aplikasi berjalan tanpa internet.

- **Model penilai (data/model.js)**: dilatih dari IDNHoaxCorpus, https://github.com/9uz/IDNHoaxCorpus (lisensi MIT, Universitas Muhammadiyah Ponorogo). Hanya bobot kata yang disertakan, bukan teks tweet.

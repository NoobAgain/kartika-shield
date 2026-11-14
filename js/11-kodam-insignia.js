/* Pemetaan aset lambang Kodam lokal. Kunci mengikuti KODAM_DATA.code; data wilayah tidak diubah. */
window.KODAM_INSIGNIA = {
  "KIM": "assets/kodam-insignia/Lambang_Kodam_Iskandar_Muda.png",
  "K1": "assets/kodam-insignia/Lambang_Kodam_Bukit_Barisan.png",
  "K2": "assets/kodam-insignia/Lambang_Kodam_Sriwijaya.svg.webp",
  "K3": "assets/kodam-insignia/Lambang_Kodam_Siliwangi.png",
  "K4": "assets/kodam-insignia/Lambang_Kodam_Diponegoro.png",
  "K5": "assets/kodam-insignia/Lambang_Kodam_Brawijaya.svg.webp",
  "K6": "assets/kodam-insignia/Lambang_Kodam_Mulawarman.png",
  "K9": "assets/kodam-insignia/Lambang_Kodam_Udayana.svg.webp",
  "K12": "assets/kodam-insignia/Lambang_Kodam_Tanjungpura.svg.webp",
  "K13": "assets/kodam-insignia/Lambang_Kodam_Merdeka.png",
  "K14": "assets/kodam-insignia/Lambang_Kodam_Hasanuddin.svg.webp",
  "K16": "assets/kodam-insignia/Lambang_Kodam_Pattimura.png",
  "K17": "assets/kodam-insignia/Lambang_Kodam_Cenderawasih.svg.webp",
  "K18": "assets/kodam-insignia/Lambang_Kodam_Kasuari.png",
  "K19": "assets/kodam-insignia/Lambang_Kodam_Tuanku_Tambusai.png",
  "K20": "assets/kodam-insignia/Lambang_Kodam_Tuanku_Imam_Bonjol.png",
  "K21": "assets/kodam-insignia/Lambang_Komando_Daerah_Militer_Radin_Inten.png",
  "K22": "assets/kodam-insignia/Lambang_Kodam_XXII_Tambun_Bungai_(2025).png",
  "K23": "assets/kodam-insignia/Lambang_Kodam_Palaka_Wira.png",
  "K24": "assets/kodam-insignia/Lambang_Kodam_XXIII_Mandala_Trikora.png",
  "K25": "assets/kodam-insignia/LOGO_KODAM_XXV_SMR.png",
  "K26": "assets/kodam-insignia/LOGO_KODAM_XXVI_MATARAM.png",
  "K27": "assets/kodam-insignia/LOGO_KODAM_XXVII_SOBE_SONBAI.png",
  "K28": "assets/kodam-insignia/LOGO_KODAM_XXVII_MOLOKU_KIE_RAHA.png",
  "K29": "assets/kodam-insignia/LOGO_KODAM_XXIX_MAMBRUK.png",
  "K30": "assets/kodam-insignia/LOGO_KODAM_XXX_RINAMBORA.png",
  "KJ": "assets/kodam-insignia/Lambang_Kodam_Jaya.svg.webp"
};
window.KODAM_INSIGNIA_IMAGES = window.KODAM_INSIGNIA_IMAGES || {};
Object.entries(window.KODAM_INSIGNIA).forEach(([code,src]) => {
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => { window.KODAM_INSIGNIA_IMAGES[code] = img; };
  img.onerror = () => console.warn('[KARTIKA] Lambang Kodam gagal dimuat:', code, src);
  img.src = src;
});

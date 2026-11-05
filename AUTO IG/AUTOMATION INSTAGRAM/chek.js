// check_models.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Memuat variabel dari file .env
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ Gagal memuat GEMINI_API_KEY dari file .env. Pastikan file tersebut ada dan sudah benar.');
  process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log('🔍 Meminta daftar model dari Google untuk API Key Anda...');

fetch(url)
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      console.error('❌ Terjadi error saat meminta daftar model:');
      console.error(JSON.stringify(data.error, null, 2));
      return;
    }

    if (!data.models || data.models.length === 0) {
      console.log('⚠️ Tidak ada model yang ditemukan untuk API Key ini.');
      return;
    }

    console.log('✅ Daftar model yang tersedia untuk Anda:\n');
    
    data.models.forEach(model => {
      // Kita hanya tertarik pada model yang mendukung 'generateContent'
      if (model.supportedGenerationMethods.includes('generateContent')) {
        console.log(`- ${model.name}`);
      }
    });

    console.log('\n📌 Salin salah satu nama model di atas (misalnya, "models/gemini-1.5-flash-latest") dan gunakan untuk memperbarui GEMINI_ENDPOINT di file .env Anda.');
  })
  .catch(err => {
    console.error('❌ Gagal terhubung ke server Google:', err);
  });
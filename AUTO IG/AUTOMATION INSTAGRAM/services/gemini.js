// services/gemini.js (Versi OpenRouter)
import fetch from "node-fetch";
import config from "../config.js";

function createPrompt(caption) {
  return `
Anda adalah seorang komentator media sosial yang cerdas, ramah, dan gaul.
Tugas Anda adalah membuat satu komentar singkat dalam Bahasa Indonesia untuk sebuah postingan Instagram.

ATURAN:
- Komentar harus relevan dengan caption.
- Maksimal 15 kata.
- Gunakan gaya bahasa santai, positif, dan kekinian (gaul). Boleh pakai sedikit slang modern jika cocok.
- Terdengar natural seperti anak muda yang sedang berkomentar.
- JANGAN gunakan emoji berlebihan (maksimal 1).
- JANGAN gunakan tanda kutip di awal atau akhir komentar.

CAPTION POSTINGAN:
"""
${caption}
"""

KOMENTAR ANDA:
`;
}

// Fungsi helper untuk jeda
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateComment(caption) {
  const maxRetries = 3; 
  let currentDelay = 2000; 

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 [Percobaan ${attempt}/${maxRetries}] Mengirim permintaan ke OpenRouter (Gemini)...`);
      const prompt = createPrompt(caption);

      const response = await fetch(config.openRouter.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.openRouter.apiKey}`,
          "HTTP-Referer": config.openRouter.siteUrl, 
          "X-Title": config.openRouter.appName,
        },
        body: JSON.stringify({
          model: config.openRouter.model,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7, // Sedikit kreatif tapi tetap relevan
        }),
      });

      if (!response.ok) {
        const errorData = await response.json(); // Coba baca error JSON
        // Cek jika error 503 atau 429 (Rate Limit/Server Busy)
        if (response.status === 503 || response.status === 429 || response.status === 502) {
            throw new Error(`Server Busy/Limit (${response.status})`);
        }
        console.error("❌ Error dari OpenRouter API:", JSON.stringify(errorData, null, 2));
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      
      // Struktur respon OpenRouter mengikuti standar OpenAI: choices[0].message.content
      const comment = data?.choices?.[0]?.message?.content?.trim() || null;

      if (!comment) {
        console.warn("⚠️ OpenRouter tidak memberikan output valid.");
        return "Postingan yang keren banget!"; // Fallback
      }

      const cleaned = comment.replace(/^["'`*]+|["'`*]+$/g, "").trim();
      console.log("💬 Komentar AI:", cleaned);
      return cleaned; // Sukses

    } catch (err) {
      console.error(`❌ Percobaan ${attempt} gagal: ${err.message}`);
      
      if ((err.message.includes('Server Busy') || err.message.includes('Limit')) && attempt < maxRetries) {
        console.log(`⏳ Menunggu ${currentDelay / 1000} detik sebelum mencoba lagi...`);
        await delay(currentDelay);
        currentDelay *= 2; 
      } else {
        // Jika bukan error server atau sudah limit retry
        if (attempt === maxRetries) return "Keren banget fotonya!";
      }
    }
  }
  return "Nice post!";
}
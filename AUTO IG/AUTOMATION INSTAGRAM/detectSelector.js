// ai/detectSelector.js (Versi OpenRouter)
import fetch from "node-fetch";
import config from "../config.js";

/**
 * Menganalisis HTML dan meminta AI untuk menemukan selector CSS.
 */
export async function detectSelectorWithGemini(htmlContent) {
  try {
    console.log("🤖 Meminta bantuan AI (via OpenRouter) untuk deteksi selector...");

    const prompt = `
      Analisis cuplikan HTML dari halaman Instagram berikut. Tugasmu adalah memberikan satu string CSS selector yang paling stabil dan andal untuk menemukan teks caption postingan.

      ATURAN PENTING:
      1.  Prioritaskan atribut yang stabil seperti 'data-testid', 'role', atau 'aria-label'.
      2.  Gunakan struktur tag HTML (contoh: 'article h1', 'div > span').
      3.  HINDARI nama kelas acak (contoh: '_aacl', 'x1qjc9v5').
      4.  Output HANYA berupa string CSS selector, tanpa penjelasan lain.

      CUPLIKAN HTML:
      """
      ${htmlContent.substring(0, 12000)} 
      """
      (Catatan: HTML dipotong agar muat dalam context window)

      CSS SELECTOR:
    `;

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
          messages: [{ role: "user", content: prompt }]
        }),
      });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Error dari OpenRouter deteksi selector:", JSON.stringify(errorData, null, 2));
        return null;
    }

    const data = await response.json();
    const selector = data?.choices?.[0]?.message?.content?.trim();

    if (selector) {
      // Membersihkan output dari AI jika ada markdown code block
      const cleanedSelector = selector.replace(/```css|```|`/g, "").trim();
      console.log(`✨ AI menyarankan selector: ${cleanedSelector}`);
      return cleanedSelector;
    }
    
    return null;

  } catch (err) {
    console.error("❌ Gagal menjalankan deteksi selector AI:", err.message);
    return null;
  }
}
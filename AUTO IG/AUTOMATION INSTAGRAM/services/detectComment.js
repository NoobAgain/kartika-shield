// services/detectComment.js (BARU: Khusus Deteksi Input Komentar)
import fetch from "node-fetch";
import config from "../config.js";

/**
 * Meminta AI mencari selector khusus untuk INPUT KOMENTAR atau PLACEHOLDER-nya.
 */
export async function detectCommentInputWithGemini(htmlContent) {
  try {
    console.log("🤖 Meminta AI mencari lokasi INPUT KOMENTAR...");

    const prompt = `
      Analisis HTML Instagram ini (kemungkinan tampilan Reels/Mobile).
      Tugasmu adalah menemukan CSS SELECTOR untuk KOLOM INPUT KOMENTAR.

      Cari elemen dengan prioritas berikut:
      1. Tag <textarea> yang berada di dalam <form>.
      2. Elemen (div/span/p) yang berisi teks "Tambahkan komentar...", "Add a comment...", "Reply to...", atau sejenisnya.
      3. Elemen dengan atribut contenteditable="true" atau role="textbox".

      ATURAN:
      - Output HANYA satu string CSS selector.
      - Jangan berikan penjelasan.
      - Jika ada ID atau Class yang terlihat acak (contoh: "x1y23"), hindari dan gunakan struktur parent (contoh: "form > textarea" atau "div[role='button']").

      HTML:
      """
      ${htmlContent.substring(0, 15000)}
      """

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

    if (!response.ok) return null;

    const data = await response.json();
    const selector = data?.choices?.[0]?.message?.content?.trim();

    if (selector) {
      // Bersihkan markdown jika ada
      return selector.replace(/```css|```|`/g, "").trim();
    }
    
    return null;

  } catch (err) {
    console.error("❌ Gagal deteksi input komentar AI:", err.message);
    return null;
  }
}
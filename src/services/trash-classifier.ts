// src/services/trash-classifier.ts
// Mengenali jenis sampah dari foto menggunakan layanan AI vision (Gemini atau Claude).
//
// Pengaturan lewat file `.env` di root project (lalu restart `npx expo start -c`):
//   EXPO_PUBLIC_AI_PROVIDER=gemini        # atau: claude
//   EXPO_PUBLIC_AI_API_KEY=isi_key_kamu
//   EXPO_PUBLIC_AI_MODEL=                 # opsional, kosongkan untuk model bawaan
//
// PERHATIAN: variabel EXPO_PUBLIC_* ikut terbundel di dalam aplikasi, jadi key bisa
// dibaca orang yang memiliki aplikasinya. Cukup untuk tugas kuliah; untuk produksi
// panggil AI lewat server sendiri. Jangan commit file .env ke GitHub.
import { ApiError, toApiError } from "@/services/trash-api";

export type TrashCategory = "Organik" | "Anorganik" | "Limbah B3" | "Kertas";

export interface DetectionResult {
  title: string;
  category: TrashCategory;
  confidence: number;
  instruction: string;
  icon: string;
}

/** Hasil kosong (null) berarti foto tidak berisi sampah / tidak dapat dikenali. */
export type ClassifyOutcome = DetectionResult | null;

const REQUEST_TIMEOUT_MS = 30000;
const CATEGORIES: TrashCategory[] = [
  "Organik",
  "Anorganik",
  "Limbah B3",
  "Kertas",
];

const DEFAULT_MODELS = {
  gemini: "gemini-3.8-flash",
  claude: "claude-haiku-5-5",
} as const;

const PROMPT = `Kamu adalah pengenal jenis sampah untuk aplikasi pemilah sampah di Indonesia.
Lihat foto ini dan kenali SATU objek utama yang merupakan sampah atau barang yang akan dibuang.

Kategori yang boleh dipakai (pilih tepat satu, tulis persis seperti ini):
- "Organik": sisa makanan, kulit buah, daun, dan bahan yang mudah terurai
- "Anorganik": plastik, botol plastik, kaleng, kaca, logam, kemasan karton berlapis plastik/aluminium (seperti Tetra Pak), styrofoam
- "Limbah B3": baterai, lampu, obat kedaluwarsa, elektronik, kemasan bahan kimia
- "Kertas": kertas, kardus, koran, karton biasa tanpa lapisan plastik

Jawab HANYA dengan JSON valid tanpa teks lain, dengan format:
{"isTrash": true, "title": "nama objek spesifik dalam Bahasa Indonesia", "category": "salah satu kategori di atas", "confidence": angka 0-100, "instruction": "cara memilah dan membuang yang tepat, 1-2 kalimat Bahasa Indonesia", "icon": "satu emoji yang sesuai"}

Jika foto tidak menampilkan sampah atau objek tidak dapat dikenali, jawab:
{"isTrash": false}`;

function getConfig() {
  const provider = (
    process.env.EXPO_PUBLIC_AI_PROVIDER || "gemini"
  ).trim().toLowerCase();
  const apiKey = (process.env.EXPO_PUBLIC_AI_API_KEY || "").trim();
  const model = (
    process.env.EXPO_PUBLIC_AI_MODEL ||
    (provider === "claude" ? DEFAULT_MODELS.claude : DEFAULT_MODELS.gemini)
  ).trim();
  return { provider, apiKey, model };
}

/** Mengubah status HTTP dari layanan AI menjadi ApiError dengan pesan yang jelas. */
function errorFromStatus(status: number): ApiError {
  if (status === 400) {
    return new ApiError(
      "client",
      "Foto atau permintaan tidak dapat diproses oleh layanan AI (HTTP 400).",
      status,
    );
  }
  if (status === 401 || status === 403) {
    return new ApiError(
      "unauthorized",
      "API key tidak valid atau tidak punya akses. Periksa EXPO_PUBLIC_AI_API_KEY di file .env.",
      status,
    );
  }
  if (status === 429) {
    return new ApiError(
      "client",
      "Kuota layanan AI habis atau terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
      status,
    );
  }
  if (status >= 500) {
    return new ApiError(
      "server",
      `Layanan AI sedang bermasalah (HTTP ${status}). Silakan coba lagi nanti.`,
      status,
    );
  }
  return new ApiError(
    "client",
    `Permintaan ditolak layanan AI (HTTP ${status}).`,
    status,
  );
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw errorFromStatus(response.status);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function askGemini(
  model: string,
  apiKey: string,
  base64: string,
  mimeType: string,
): Promise<string> {
  const cleanBase64 = base64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "").trim();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const data = await postJson(
    endpoint,
    { "x-goog-api-key": apiKey },
    {
      contents: [
        {
          parts: [
            { inline_data: { mime_type: mimeType, data: cleanBase64 } },
            { text: PROMPT },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    },
  );
  const text = data?.candidates?.[0]?.content?.parts
    ?.filter((p: any) => !p?.thought)
    ?.map((p: any) => p?.text ?? "")
    .join("")
    .trim();
  if (!text)
    throw new ApiError(
      "unknown",
      "Layanan AI tidak memberikan jawaban. Coba foto ulang.",
    );
  return text;
}

async function askClaude(
  model: string,
  apiKey: string,
  base64: string,
  mimeType: string,
): Promise<string> {
  const data = await postJson(
    "https://api.anthropic.com/v1/messages",
    { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    {
      model,
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: base64 },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    },
  );
  const text = data?.content?.find((c: any) => c?.type === "text")?.text;
  if (!text)
    throw new ApiError(
      "unknown",
      "Layanan AI tidak memberikan jawaban. Coba foto ulang.",
    );
  return text;
}

/** Mengambil objek JSON dari teks jawaban AI (menoleransi pagar ```json dan teks lain). */
function parseAnswer(raw: string): ClassifyOutcome {
  const cleaned = raw.replace(/```json|```/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new ApiError(
      "unknown",
      "Jawaban AI tidak dapat dibaca. Coba foto ulang.",
    );
  }

  let obj: any;
  try {
    obj = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    const match = cleaned.match(/\{[\s\S]*"isTrash"[\s\S]*\}/);
    if (match) {
      try {
        obj = JSON.parse(match[0]);
      } catch {
        throw new ApiError(
          "unknown",
          "Jawaban AI tidak dapat dibaca. Coba foto ulang.",
        );
      }
    } else {
      throw new ApiError(
        "unknown",
        "Jawaban AI tidak dapat dibaca. Coba foto ulang.",
      );
    }
  }

  if (!obj || obj.isTrash === false) return null;

  const category =
    CATEGORIES.find(
      (c) => c.toLowerCase() === String(obj.category || "").toLowerCase(),
    ) || "Anorganik";

  const confidence = Math.max(
    0,
    Math.min(100, Math.round(Number(obj.confidence) || 90)),
  );
  return {
    title: String(obj.title || "Objek Sampah"),
    category,
    confidence,
    instruction: String(
      obj.instruction || "Pilah sampah ke wadah yang sesuai.",
    ),
    icon: String(obj.icon || "♻️"),
  };
}

/**
 * Mengenali sampah pada foto. `base64` harus berisi data gambar JPEG tanpa awalan "data:".
 * Melempar ApiError (offline / timeout / HTTP error / konfigurasi) agar UI bisa menampilkan
 * pesan yang sesuai, sama seperti penanganan error di Week 6.
 */
export async function classifyTrashImage(
  base64: string | null | undefined,
): Promise<ClassifyOutcome> {
  try {
    if (!base64) {
      throw new ApiError(
        "unknown",
        "Data foto tidak tersedia. Ambil atau pilih foto lagi.",
      );
    }

    const { provider, apiKey, model } = getConfig();

    if (!apiKey) {
      throw new ApiError(
        "unknown",
        "API key AI belum diatur. Buat file .env di root project berisi EXPO_PUBLIC_AI_API_KEY=..., lalu jalankan ulang npx expo start -c.",
      );
    }
    if (provider !== "gemini" && provider !== "claude") {
      throw new ApiError(
        "unknown",
        'EXPO_PUBLIC_AI_PROVIDER harus "gemini" atau "claude".',
      );
    }

    console.log(`🤖 [AI] Mengenali foto dengan ${provider} (${model})`);

    const raw =
      provider === "claude"
        ? await askClaude(model, apiKey, base64, "image/jpeg")
        : await askGemini(model, apiKey, base64, "image/jpeg");

    const outcome = parseAnswer(raw);
    console.log(
      "🤖 [AI] Hasil:",
      outcome
        ? `${outcome.title} (${outcome.category}, ${outcome.confidence}%)`
        : "bukan sampah",
    );
    return outcome;
  } catch (error) {
    const apiError = toApiError(error);
    console.warn(`[AI ERROR:${apiError.kind}]`, apiError.message);
    throw apiError;
  }
}

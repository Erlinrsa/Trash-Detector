// src/services/trash-api.ts
import { STORAGE_KEYS } from "@/context/auth-context";
import { SecureStorage } from "@/services/secure-storage";
import { TrashItem } from "@/types/trash";

// Endpoint API (Protected Endpoint - Week 5)
const API_URL = "https://jsonplaceholder.typicode.com/posts";

// =============================================================================
// WEEK 6 - ERROR HANDLING & OFFLINE
// =============================================================================

// Batas waktu tunggu response server (poin materi: 10-30 detik per request)
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Jenis kegagalan request yang dibedakan agar UI bisa menampilkan pesan yang sesuai.
 * - unauthorized : 401 / 403 (token salah, sesi berakhir)
 * - client       : 4xx lain (400, 404, ...)
 * - server       : 5xx (500, 503, ...)
 * - timeout      : server terlalu lama merespons
 * - offline      : tidak ada koneksi internet / network request failed
 * - unknown      : kegagalan lain yang tidak terduga
 */
export type ApiErrorKind =
  | "unauthorized"
  | "client"
  | "server"
  | "timeout"
  | "offline"
  | "unknown";

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/** Mengubah error apa pun (termasuk error bawaan fetch) menjadi ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  const err = error as { name?: string; message?: string } | undefined;

  // AbortController.abort() -> request dihentikan karena melewati batas waktu
  if (err?.name === "AbortError") {
    return new ApiError(
      "timeout",
      "Waktu habis. Server terlalu lama merespons, silakan coba lagi.",
    );
  }

  // fetch gagal total: "Network request failed" (React Native) / "Failed to fetch" (web)
  if (
    error instanceof TypeError ||
    /network|failed to fetch/i.test(err?.message ?? "")
  ) {
    return new ApiError(
      "offline",
      "Tidak ada koneksi internet. Periksa koneksi Anda dan coba lagi.",
    );
  }

  return new ApiError(
    "unknown",
    err?.message || "Terjadi kesalahan yang tidak diketahui.",
  );
}

/** Membuat ApiError dari status code HTTP (4xx / 5xx). */
function errorFromStatus(status: number): ApiError {
  if (status === 401 || status === 403) {
    return new ApiError(
      "unauthorized",
      `Sesi tidak valid atau telah berakhir (HTTP ${status}). Silakan login kembali.`,
      status,
    );
  }
  if (status === 404) {
    return new ApiError(
      "client",
      "Data tidak ditemukan. Program yang Anda cari tidak tersedia (HTTP 404 Not Found).",
      status,
    );
  }
  if (status >= 400 && status < 500) {
    return new ApiError(
      "client",
      `Permintaan tidak dapat diproses (HTTP ${status}). Periksa kembali permintaan Anda.`,
      status,
    );
  }
  if (status >= 500) {
    return new ApiError(
      "server",
      `Terjadi kesalahan pada server (HTTP ${status}). Silakan coba lagi nanti.`,
      status,
    );
  }
  return new ApiError(
    "unknown",
    `Response tidak terduga dari server (HTTP ${status}).`,
    status,
  );
}

/** fetch dengan timeout menggunakan AbortController. */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// -----------------------------------------------------------------------------
// MODE UJI (untuk demo / pengujian Week 6). Ubah nilainya lalu reload aplikasi:
//   'off'     -> request normal (200 OK)
//   '404'     -> server membalas 404 Not Found      (error 4xx)
//   '500'     -> server membalas 500 Server Error   (error 5xx)
//   'timeout' -> server membalas sangat lambat       (timeout)
// Untuk uji OFFLINE: biarkan 'off' lalu matikan Wi-Fi / data seluler.
// Kembalikan ke 'off' sebelum commit akhir.
// -----------------------------------------------------------------------------
export type ApiTestMode = "off" | "404" | "500" | "timeout";
const API_TEST_MODE = "off" as ApiTestMode;

const TEST_URLS: Record<Exclude<ApiTestMode, "off">, string> = {
  "404": "https://jsonplaceholder.typicode.com/posts/99999999",
  "500": "https://httpbin.org/status/500",
  timeout: "https://httpbin.org/delay/60",
};

export async function fetchTrashFromAPI(): Promise<TrashItem[]> {
  try {
    // 1. Ambil Access Token dari Secure Storage (Week 5)
    const token = await SecureStorage.getItem(STORAGE_KEYS.TOKEN);

    if (!token) {
      console.warn(
        "🚫 [PROTECTED API BLOCKED] Token autentikasi tidak ditemukan.",
      );
      throw new ApiError(
        "unauthorized",
        "Akses ditolak. Token autentikasi tidak ditemukan, silakan login terlebih dahulu.",
        401,
      );
    }

    const url = API_TEST_MODE === "off" ? API_URL : TEST_URLS[API_TEST_MODE];

    // 2. Kirim request dengan Authorization Header (Bearer Token) + timeout
    console.log("🔒 [SECURE API REQUEST]", url);

    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    // 3. Periksa response.ok & status code SEBELUM memproses data
    if (!response.ok) {
      throw errorFromStatus(response.status);
    }

    let rawData: unknown;
    try {
      rawData = await response.json();
    } catch {
      throw new ApiError(
        "unknown",
        "Format data dari server tidak valid.",
        response.status,
      );
    }

    if (!Array.isArray(rawData)) {
      throw new ApiError(
        "unknown",
        "Format data dari server tidak sesuai yang diharapkan.",
        response.status,
      );
    }

    console.log("✅ [SECURE API SUCCESS] Data berhasil diterima.");

    // 4. Mapping data dari server menjadi format model aplikasi
    const realTrashTemplates = [
      {
        title: "Botol Plastik Air Mineral (PET)",
        category: "Anorganik" as const,
        instruction:
          "Bilas bersih, remas hingga pipih, lalu buang ke tempat sampah kuning.",
        icon: "🧴",
      },
      {
        title: "Kulit Pisang & Sisa Buah",
        category: "Organik" as const,
        instruction:
          "Buang ke komposter atau tempat sampah hijau untuk bahan pupuk alami.",
        icon: "🍌",
      },
      {
        title: "Baterai Bekas Alkaline AA",
        category: "Limbah B3" as const,
        instruction:
          "Limbah beracun! Jangan dibakar. Buang ke e-waste drop point atau kotak merah.",
        icon: "🔋",
      },
      {
        title: "Kardus Kemasan Paket Belanja",
        category: "Kertas" as const,
        instruction:
          "Lipat rapi agar hemat tempat. Jaga tetap kering agar dapat didaur ulang.",
        icon: "📦",
      },
      {
        title: "Kaleng Minuman Soda Aluminium",
        category: "Anorganik" as const,
        instruction:
          "Keringkan sisa air, pipihkan kaleng, lalu masukkan ke tempat daur ulang logam.",
        icon: "🥫",
      },
    ];

    const mappedData: TrashItem[] = rawData
      .slice(0, 5)
      .map((item: any, index: number) => {
        const template = realTrashTemplates[index % realTrashTemplates.length];
        return {
          id: `api-${item.id}`,
          title: template.title,
          category: template.category,
          confidence: 94 + (item.id % 5),
          timestamp: "13 Okt 2026, 14:00",
          instruction: template.instruction,
          icon: template.icon,
        };
      });

    // Array kosong tetap dikembalikan; UI yang menampilkan empty state
    return mappedData;
  } catch (error) {
    const apiError = toApiError(error);
    console.warn(`[API ERROR:${apiError.kind}]`, apiError.message);
    throw apiError;
  }
}

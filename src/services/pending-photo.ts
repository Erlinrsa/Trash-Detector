// src/services/pending-photo.ts
// Penyimpanan sementara (in-memory) untuk foto dari layar kamera ke layar deteksi.
// Base64 foto terlalu besar untuk dikirim lewat parameter route, jadi disimpan di sini.

export interface PendingPhotoData {
  uri: string;
  base64: string | null;
}

let pending: PendingPhotoData | null = null;

export const PendingPhoto = {
  set(photo: PendingPhotoData) {
    pending = photo;
  },
  get(): PendingPhotoData | null {
    return pending;
  },
  clear() {
    pending = null;
  },
  /** Mengambil foto saat ini tanpa langsung mengosongkannya agar aman dari re-render ganda React. */
  take(): PendingPhotoData | null {
    return pending;
  },
};

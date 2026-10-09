import { SecureStorage } from './secure-storage';

export interface ScanHistoryItem {
  id: string;
  title: string;
  category: 'Organik' | 'Anorganik' | 'Limbah B3' | 'Kertas';
  confidence: number;
  timestamp: string;
  instruction: string;
  icon: string;
}

const HISTORY_STORAGE_KEY = 'trash_scan_history';

const DEFAULT_HISTORY: ScanHistoryItem[] = [
  {
    id: 'scan-1',
    title: 'Botol Plastik Air Mineral (PET)',
    category: 'Anorganik',
    confidence: 98,
    timestamp: '29 Sep 2026, 13:40',
    instruction: 'Kosongkan isi, bilas air, pipihkan, dan buang ke tempat sampah kuning (Daur Ulang).',
    icon: '🧴',
  },
  {
    id: 'scan-2',
    title: 'Kulit Pisang & Sisa Buah',
    category: 'Organik',
    confidence: 95,
    timestamp: '29 Sep 2026, 11:15',
    instruction: 'Cocok untuk pupuk kompos. Buang ke tempat sampah hijau atau komposter kampus.',
    icon: '🍌',
  },
  {
    id: 'scan-3',
    title: 'Baterai Bekas Alkaline AA',
    category: 'Limbah B3',
    confidence: 99,
    timestamp: '28 Sep 2026, 16:30',
    instruction: 'Limbah B3 beracun! Jangan dibakar. Buang ke e-waste drop point atau kotak merah.',
    icon: '🔋',
  },
  {
    id: 'scan-4',
    title: 'Kardus Kemasan Paket',
    category: 'Kertas',
    confidence: 94,
    timestamp: '28 Sep 2026, 09:20',
    instruction: 'Lipat rapi agar hemat tempat. Jaga agar tetap kering untuk didaur ulang.',
    icon: '📦',
  },
];

export const HistoryStorage = {
  async getHistory(): Promise<ScanHistoryItem[]> {
    const raw = await SecureStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      // Inisialisasi data sampel pertama kali
      await this.saveHistory(DEFAULT_HISTORY);
      return DEFAULT_HISTORY;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_HISTORY;
    }
  },

  async saveHistory(items: ScanHistoryItem[]): Promise<void> {
    await SecureStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
  },

  async addHistoryItem(item: Omit<ScanHistoryItem, 'id' | 'timestamp'>): Promise<ScanHistoryItem[]> {
    const current = await this.getHistory();
    const now = new Date();
    const timeStr = `${now.getDate()} Sep ${now.getFullYear()}, ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const newItem: ScanHistoryItem = {
      ...item,
      id: `scan-${Date.now()}`,
      timestamp: timeStr,
    };

    const updated = [newItem, ...current];
    await this.saveHistory(updated);
    return updated;
  },

  async clearHistory(): Promise<void> {
    await this.saveHistory([]);
  },

  async resetDefault(): Promise<ScanHistoryItem[]> {
    await this.saveHistory(DEFAULT_HISTORY);
    return DEFAULT_HISTORY;
  },
};

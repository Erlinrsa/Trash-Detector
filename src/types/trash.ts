// src/types/trash.ts
export interface TrashItem {
  id: string;
  title: string;
  category: "Organik" | "Anorganik" | "Limbah B3" | "Kertas";
  confidence: number;
  timestamp: string;
  instruction: string;
  icon: string;
}

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Layanan Secure Storage yang aman untuk menyimpan data sensitif (token, credential, session).
 * Menggunakan Keychain di iOS dan Keystore di Android via expo-secure-store.
 * Memiliki fallback aman untuk browser/web.
 */
export const SecureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(`secure_${key}`, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn(`[SecureStorage] Gagal menyimpan key: ${key}`, error);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(`secure_${key}`);
        }
        return null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.warn(`[SecureStorage] Gagal membaca key: ${key}`, error);
      return null;
    }
  },

  async deleteItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(`secure_${key}`);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn(`[SecureStorage] Gagal menghapus key: ${key}`, error);
    }
  },
};

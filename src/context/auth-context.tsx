import React, { createContext, useContext, useEffect, useState } from 'react';
import { SecureStorage } from '@/services/secure-storage';

export interface UserProfile {
  name: string;
  email: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Kunci penyimpanan Secure Storage (Keychain / Keystore)
const STORAGE_KEYS = {
  SESSION: 'auth_user_session',
  TOKEN: 'auth_secure_token',
  REGISTERED_USERS: 'auth_registered_users',
};

// Akun default dari materi kuliah slide pertemuan 3 untuk kemudahan pengujian
const DEFAULT_USER = {
  name: 'Mahasiswa Warga Indonesia',
  email: 'user@mail.com',
  password: 'password123',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Inisialisasi: Periksa session aktif di Secure Storage
  useEffect(() => {
    async function checkAuthSession() {
      try {
        const sessionData = await SecureStorage.getItem(STORAGE_KEYS.SESSION);
        const token = await SecureStorage.getItem(STORAGE_KEYS.TOKEN);

        if (sessionData && token) {
          const parsed = JSON.parse(sessionData) as UserProfile;
          setUser(parsed);
        }
      } catch (error) {
        console.warn('Gagal membaca sesi autentikasi:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuthSession();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // 1. Validasi input kosong (Sesuai slide: CODE EXAMPLE - AUTHENTICATION)
    if (!email.trim() || !password.trim()) {
      return { success: false, error: 'Email dan password wajib diisi' };
    }

    const cleanEmail = email.trim().toLowerCase();

    // 2. Ambil daftar user terdaftar dari Secure Storage
    let registeredUsers: Array<{ name: string; email: string; password: string }> = [];
    try {
      const stored = await SecureStorage.getItem(STORAGE_KEYS.REGISTERED_USERS);
      if (stored) {
        registeredUsers = JSON.parse(stored);
      }
    } catch {}

    // Cek apakah cocok dengan akun default atau akun yang didaftarkan
    const matchedUser =
      (cleanEmail === DEFAULT_USER.email && password === DEFAULT_USER.password)
        ? DEFAULT_USER
        : registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail && u.password === password);

    if (matchedUser) {
      const profile: UserProfile = {
        name: matchedUser.name,
        email: matchedUser.email,
      };

      // 3. Simpan data sesi dan token terenkripsi ke Secure Storage
      const generatedToken = `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await SecureStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(profile));
      await SecureStorage.setItem(STORAGE_KEYS.TOKEN, generatedToken);

      setUser(profile);
      return { success: true };
    }

    // 4. Feedback credential salah
    return { success: false, error: 'Credential tidak valid. Periksa kembali email atau password.' };
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // 1. Validasi kelengkapan data
    if (!name.trim() || !email.trim() || !password.trim()) {
      return { success: false, error: 'Semua kolom pendaftaran wajib diisi' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password minimal 6 karakter demi keamanan' };
    }

    const cleanEmail = email.trim().toLowerCase();

    // 2. Simpan user baru ke Secure Storage
    let registeredUsers: Array<{ name: string; email: string; password: string }> = [];
    try {
      const stored = await SecureStorage.getItem(STORAGE_KEYS.REGISTERED_USERS);
      if (stored) {
        registeredUsers = JSON.parse(stored);
      }
    } catch {}

    if (cleanEmail === DEFAULT_USER.email || registeredUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
      return { success: false, error: 'Email ini sudah terdaftar. Silakan langsung masuk (Login).' };
    }

    const newUser = {
      name: name.trim(),
      email: cleanEmail,
      password: password,
    };

    registeredUsers.push(newUser);
    await SecureStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(registeredUsers));

    // Otomatis login setelah registrasi berhasil
    const profile: UserProfile = { name: newUser.name, email: newUser.email };
    const generatedToken = `token_reg_${Date.now()}`;
    await SecureStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(profile));
    await SecureStorage.setItem(STORAGE_KEYS.TOKEN, generatedToken);

    setUser(profile);
    return { success: true };
  };

  const logout = async () => {
    // Hapus sesi dan token dari Secure Storage (Sesuai slide: Logout -> Session cleared)
    await SecureStorage.deleteItem(STORAGE_KEYS.SESSION);
    await SecureStorage.deleteItem(STORAGE_KEYS.TOKEN);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

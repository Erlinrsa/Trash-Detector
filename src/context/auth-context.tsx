import React, { createContext, useContext, useEffect, useState } from 'react';
import { SecureStorage } from '@/services/secure-storage';

export interface UserProfile {
  name: string;
  email: string;
}

export interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Kunci penyimpanan Secure Storage (Keychain / Keystore)
export const STORAGE_KEYS = {
  SESSION: 'auth_user_session',
  TOKEN: 'auth_secure_token',
  REGISTERED_USERS: 'auth_registered_users',
};

// Akun default dari materi kuliah slide pertemuan 3 & 5
const DEFAULT_USER = {
  name: 'Mahasiswa Warga Indonesia',
  email: 'user@mail.com',
  password: 'password123',
};

// Fungsi pembantu membuat Access Token format JWT (Header.Payload.Signature) - Slide 6
function generateJwtToken(email: string, name: string): string {
  try {
    const toBase64 = (str: string) => {
      if (typeof btoa === 'function') {
        return btoa(unescape(encodeURIComponent(str))).replace(/=/g, '');
      }
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      let output = '';
      let i = 0;
      while (i < str.length) {
        const chr1 = str.charCodeAt(i++);
        const chr2 = str.charCodeAt(i++);
        const chr3 = str.charCodeAt(i++);

        const enc1 = chr1 >> 2;
        const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        let enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        let enc4 = chr3 & 63;

        if (isNaN(chr2)) {
          enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
          enc4 = 64;
        }

        output += chars.charAt(enc1) + chars.charAt(enc2) + (enc3 < 64 ? chars.charAt(enc3) : '') + (enc4 < 64 ? chars.charAt(enc4) : '');
      }
      return output;
    };

    const header = toBase64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = toBase64(
      JSON.stringify({
        sub: email,
        name: name,
        role: 'authenticated_user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400, // 24 jam
      })
    );
    const signature = 'securesig_' + Math.random().toString(36).substring(2, 12);
    return `${header}.${payload}.${signature}`;
  } catch {
    return `jwt_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Inisialisasi: Periksa session dan token aktif di Secure Storage (Slide 8 & 12)
  useEffect(() => {
    async function checkAuthSession() {
      try {
        const sessionData = await SecureStorage.getItem(STORAGE_KEYS.SESSION);
        const savedToken = await SecureStorage.getItem(STORAGE_KEYS.TOKEN);

        if (sessionData && savedToken) {
          const parsed = JSON.parse(sessionData) as UserProfile;
          setUser(parsed);
          setToken(savedToken);
          console.log('🔑 [SESSION RESTORED] Token aktif dimuat dari Secure Storage:', savedToken.substring(0, 22) + '...');
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
    // 1. Validasi input kosong (Slide 9 & 10)
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

    // Cek kecocokan credential
    const matchedUser =
      cleanEmail === DEFAULT_USER.email && password === DEFAULT_USER.password
        ? DEFAULT_USER
        : registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail && u.password === password);

    if (matchedUser) {
      const profile: UserProfile = {
        name: matchedUser.name,
        email: matchedUser.email,
      };

      // 3. Generate Access Token JWT & simpan ke Secure Storage (Slide 9 & 10)
      const jwtToken = generateJwtToken(matchedUser.email, matchedUser.name);
      await SecureStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(profile));
      await SecureStorage.setItem(STORAGE_KEYS.TOKEN, jwtToken);

      console.log('✅ [LOGIN BERHASIL] Access Token (JWT) diterbitkan:');
      console.log('🎟️ Token:', jwtToken);
      console.log('💾 Token berhasil disimpan ke Secure Storage (Keychain / Keystore)');

      setUser(profile);
      setToken(jwtToken);
      return { success: true };
    }

    return { success: false, error: 'Credential tidak valid. Periksa kembali email atau password.' };
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      return { success: false, error: 'Semua kolom pendaftaran wajib diisi' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password minimal 6 karakter demi keamanan' };
    }

    const cleanEmail = email.trim().toLowerCase();

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

    // Otomatis login dengan JWT token setelah registrasi
    const profile: UserProfile = { name: newUser.name, email: newUser.email };
    const jwtToken = generateJwtToken(newUser.email, newUser.name);
    await SecureStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(profile));
    await SecureStorage.setItem(STORAGE_KEYS.TOKEN, jwtToken);

    setUser(profile);
    setToken(jwtToken);
    return { success: true };
  };

  const logout = async () => {
    // Hapus sesi dan token dari Secure Storage (Slide 12: Logout -> Token & session cleared)
    console.log('🚪 [LOGOUT] Menghapus Access Token dan Sesi dari Secure Storage...');
    await SecureStorage.deleteItem(STORAGE_KEYS.SESSION);
    await SecureStorage.deleteItem(STORAGE_KEYS.TOKEN);
    console.log('🔒 Sesi aman berhasil dibersihkan.');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
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

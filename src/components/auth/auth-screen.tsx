import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/auth-context';

export function AuthScreen() {
  const { login, register, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Mode: 'login' | 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status feedback
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = {
    background: isDark ? '#0b130e' : '#f4fbf6',
    surface: isDark ? '#142219' : '#ffffff',
    surfaceSubtle: isDark ? '#192e22' : '#edf7f0',
    surfaceBorder: isDark ? '#264532' : '#cde7d5',
    primary: '#15803d',
    primaryPressed: '#166534',
    textPrimary: isDark ? '#f0fdf4' : '#0f2918',
    textSecondary: isDark ? '#cbd5e1' : '#334155',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    errorBg: isDark ? '#450a0a' : '#fef2f2',
    errorBorder: isDark ? '#991b1b' : '#fecaca',
    errorText: isDark ? '#fca5a5' : '#b91c1c',
    inputBg: isDark ? '#0f1b13' : '#ffffff',
    inputBorder: isDark ? '#284634' : '#d1d5db',
    inputFocusBorder: '#16a34a',
    cardShadow: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(21, 128, 61, 0.08)',
  };

  const handleQuickFill = () => {
    setEmail('user@mail.com');
    setPassword('password123');
    setErrorMessage('');
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (!res.success && res.error) {
          setErrorMessage(res.error);
        }
      } else {
        if (!name.trim()) {
          setErrorMessage('Nama lengkap wajib diisi');
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage('Konfirmasi password tidak cocok dengan password');
          setIsSubmitting(false);
          return;
        }
        const res = await register(name, email, password);
        if (!res.success && res.error) {
          setErrorMessage(res.error);
        }
      }
    } catch {
      setErrorMessage('Terjadi kendala teknis saat memproses autentikasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Memeriksa sesi keamanan...
        </Text>
      </View>
    );
  }

  const isWide = width >= 600;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 24) + 16,
            paddingBottom: Math.max(insets.bottom, 24) + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.authCardWrapper, isWide && styles.authCardWrapperWide]}>
          {/* Header Brand */}
          <View style={styles.header}>
            <View style={[styles.badgePill, { backgroundColor: isDark ? '#143823' : '#dcfce7' }]}>
              <Text style={styles.badgePillIcon}>🔐</Text>
              <Text style={[styles.badgePillText, { color: isDark ? '#86efac' : '#14532d' }]}>
                SECURE AUTHENTICATION
              </Text>
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Trash Detector
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {mode === 'login'
                ? 'Masuk untuk mengakses pemindai sampah cerdas dan riwayat'
                : 'Buat akun baru untuk mulai memilah sampah secara bijak'}
            </Text>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfaceBorder,
                shadowColor: colors.cardShadow,
              },
            ]}>
            {/* Tab Mode Switcher */}
            <View style={[styles.tabBar, { backgroundColor: colors.surfaceSubtle }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Pilih mode Masuk akun"
                onPress={() => {
                  setMode('login');
                  setErrorMessage('');
                }}
                style={[
                  styles.tabButton,
                  mode === 'login' && [styles.tabButtonActive, { backgroundColor: colors.surface }],
                ]}>
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: mode === 'login' ? colors.primary : colors.textMuted },
                    mode === 'login' && styles.tabButtonTextActive,
                  ]}>
                  Masuk (Login)
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Pilih mode Daftar akun baru"
                onPress={() => {
                  setMode('register');
                  setErrorMessage('');
                }}
                style={[
                  styles.tabButton,
                  mode === 'register' && [styles.tabButtonActive, { backgroundColor: colors.surface }],
                ]}>
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: mode === 'register' ? colors.primary : colors.textMuted },
                    mode === 'register' && styles.tabButtonTextActive,
                  ]}>
                  Daftar (Register)
                </Text>
              </Pressable>
            </View>

            {/* Error Message Box */}
            {errorMessage ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: colors.errorBg, borderColor: colors.errorBorder },
                ]}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={[styles.errorText, { color: colors.errorText }]}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Input Form */}
            <View style={styles.formGroup}>
              {/* Field Nama (Hanya mode register) */}
              {mode === 'register' && (
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>
                    Nama Lengkap <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    accessibilityLabel="Input Nama Lengkap"
                    placeholder="Contoh: Budi Pratama"
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={setName}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.inputBorder,
                        color: colors.textPrimary,
                      },
                    ]}
                  />
                </View>
              )}

              {/* Field Email */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>
                  Email atau Username <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  accessibilityLabel="Input Email atau Username"
                  placeholder="Contoh: user@mail.com"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: colors.textPrimary,
                    },
                  ]}
                />
              </View>

              {/* Field Password */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>
                  Password <Text style={styles.required}>*</Text>
                </Text>
                <View
                  style={[
                    styles.passwordWrapper,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                    },
                  ]}>
                  <TextInput
                    accessibilityLabel="Input Password"
                    placeholder="Masukkan password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    style={[styles.passwordInput, { color: colors.textPrimary }]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}>
                    <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                  </Pressable>
                </View>
              </View>

              {/* Field Konfirmasi Password (Hanya mode register) */}
              {mode === 'register' && (
                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>
                    Konfirmasi Password <Text style={styles.required}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.passwordWrapper,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.inputBorder,
                      },
                    ]}>
                    <TextInput
                      accessibilityLabel="Input Konfirmasi Password"
                      placeholder="Ketik ulang password"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      style={[styles.passwordInput, { color: colors.textPrimary }]}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={showConfirmPassword ? 'Sembunyikan konfirmasi password' : 'Tampilkan konfirmasi password'}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeButton}>
                      <Text style={styles.eyeIcon}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            {/* Tombol Submit Utama */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={mode === 'login' ? 'Tombol Masuk' : 'Tombol Daftar Akun'}
              disabled={isSubmitting}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.submitButton,
                {
                  backgroundColor: pressed ? colors.primaryPressed : colors.primary,
                  opacity: isSubmitting ? 0.7 : 1,
                },
              ]}>
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === 'login' ? 'Masuk ke Aplikasi' : 'Daftar Sekarang'}
                </Text>
              )}
            </Pressable>

            {/* Quick Demo Fill (Khusus Pengujian Week 3 / Dosen) */}
            {mode === 'login' && (
              <View style={[styles.demoFillBox, { backgroundColor: colors.surfaceSubtle }]}>
                <View style={styles.demoFillHeader}>
                  <Text style={styles.demoIcon}>💡</Text>
                  <Text style={[styles.demoFillTitle, { color: colors.textPrimary }]}>
                    Kredensial Uji Coba Cepat:
                  </Text>
                </View>
                <Text style={[styles.demoFillText, { color: colors.textSecondary }]}>
                  Email: <Text style={styles.codeText}>user@mail.com</Text> | Password: <Text style={styles.codeText}>password123</Text>
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Gunakan akun demo otomatis"
                  onPress={handleQuickFill}
                  style={[styles.quickFillButton, { borderColor: colors.primary }]}>
                  <Text style={[styles.quickFillButtonText, { color: colors.primary }]}>
                    ✓ Isi Kredensial Otomatis
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Catatan Enkripsi Secure Storage */}
            <View style={styles.securityNote}>
              <Text style={styles.lockIcon}>🛡️</Text>
              <Text style={[styles.securityNoteText, { color: colors.textMuted }]}>
                Data kredensial dan token disimpan terenkripsi menggunakan Secure Storage perangkat.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    flexGrow: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  authCardWrapper: {
    width: '100%',
    maxWidth: 440,
    gap: 20,
  },
  authCardWrapperWide: {
    maxWidth: 480,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  badgePillIcon: {
    fontSize: 13,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 360,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    gap: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    minHeight: 44, // Touch target >= 44px
  },
  tabButtonActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  errorIcon: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  formGroup: {
    gap: 14,
  },
  inputContainer: {
    gap: 6,
  },
  label: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 50,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    minHeight: 50,
  },
  eyeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 6,
  },
  eyeIcon: {
    fontSize: 18,
  },
  submitButton: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 4,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  demoFillBox: {
    padding: 12,
    borderRadius: 14,
    gap: 6,
  },
  demoFillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  demoIcon: {
    fontSize: 14,
  },
  demoFillTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  demoFillText: {
    fontSize: 12,
    lineHeight: 16,
  },
  codeText: {
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
  },
  quickFillButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44, // Touch target >= 44px
    marginTop: 2,
  },
  quickFillButtonText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  lockIcon: {
    fontSize: 14,
  },
  securityNoteText: {
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
    flex: 1,
  },
});

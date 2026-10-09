import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthScreen } from '@/components/auth/auth-screen';
import { AuthProvider, useAuth } from '@/context/auth-context';

SplashScreen.preventAutoHideAsync();

function RootContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  // Jika belum login, tampilkan layar autentikasi (Login / Register dengan Secure Storage)
  if (!user) {
    return <AuthScreen />;
  }

  // Jika sudah terautentikasi, tampilkan 2 tab navigasi (Deteksi & Riwayat)
  return <AppTabs />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AnimatedSplashOverlay />
        <RootContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

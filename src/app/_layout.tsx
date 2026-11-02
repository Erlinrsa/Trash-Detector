import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { AuthScreen } from "@/components/auth/auth-screen";
import { AuthProvider, useAuth } from "@/context/auth-context";

SplashScreen.preventAutoHideAsync();

function RootContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  // Jika belum login, tampilkan layar autentikasi (Login / Register dengan Secure Storage - Week 3 & 5)
  if (!user) {
    return <AuthScreen />;
  }

  // Menerapkan _layout dan <Stack.Screen> sesuai ketentuan Modul 2 Praktikum (Hal. 30-31, 40)
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Deteksi Sampah",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: "Riwayat Sampah",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="sensor"
        options={{
          title: "Sensor Perangkat",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="camera"
        options={{
          title: "Kamera",
          headerShown: false,
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="detail"
        options={{
          title: "Detail Sampah",
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AnimatedSplashOverlay />
        <RootContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

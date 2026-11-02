import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { Accelerometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNavBar } from "@/components/bottom-nav-bar";
import { useAuth } from "@/context/auth-context";
import { HistoryStorage } from "@/services/history-storage";
import { PendingPhoto } from "@/services/pending-photo";
import { ApiErrorKind, toApiError } from "@/services/trash-api";
import {
  DetectionResult,
  classifyTrashImage,
} from "@/services/trash-classifier";

// Status proses deteksi sampah dari foto (Week 6: loading / error / empty + retry)
type DetectionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: DetectionResult }
  | { status: "empty" } // foto tidak berisi sampah
  | { status: "error"; kind: ApiErrorKind; message: string };

interface PhotoData {
  uri: string;
  base64: string | null;
}

const ERROR_ICON: Record<ApiErrorKind, string> = {
  offline: "📡",
  timeout: "⏱️",
  server: "🛠️",
  client: "❗",
  unauthorized: "🔐",
  unknown: "⚠️",
};

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Foto yang sedang dianalisis + status hasil deteksi
  const [photo, setPhoto] = useState<PhotoData | null>(null);
  const [detection, setDetection] = useState<DetectionState>({
    status: "idle",
  });
  const [isSavedToHistory, setIsSavedToHistory] = useState<boolean>(false);
  const runIdRef = useRef<number>(0); // untuk mengabaikan hasil lama jika dibersihkan

  // Week 7: foto hasil kamera dikirim dari halaman /camera (parameter route + PendingPhoto)
  const { photoUri } = useLocalSearchParams<{ photoUri?: string }>();

  // Palet warna ramah lingkungan dengan rasio kontras tinggi (WCAG AA/AAA)
  const colors = {
    background: isDark ? "#0b130e" : "#f6fbf7",
    surface: isDark ? "#142219" : "#ffffff",
    surfaceSubtle: isDark ? "#192e22" : "#edf7f0",
    surfaceBorder: isDark ? "#264532" : "#cde7d5",
    primary: "#15803d", // Hijau lingkungan kuat & kontras tinggi
    primaryPressed: "#166534",
    primarySurface: isDark ? "#143823" : "#dcfce7",
    secondaryBorder: isDark ? "#22543d" : "#86efac",
    textPrimary: isDark ? "#f0fdf4" : "#0f2918",
    textSecondary: isDark ? "#cbd5e1" : "#334155",
    textMuted: isDark ? "#94a3b8" : "#64748b",
    accentText: isDark ? "#4ade80" : "#166534",
    badgeGreen: isDark ? "#14532d" : "#dcfce7",
    badgeText: isDark ? "#86efac" : "#14532d",
    cardShadow: isDark ? "rgba(0, 0, 0, 0.4)" : "rgba(21, 128, 61, 0.08)",
  };

  const hasResult = detection.status !== "idle";

  const resetResult = () => {
    runIdRef.current += 1;
    lastProcessedRef.current = null;
    PendingPhoto.clear();
    setPhoto(null);
    setDetection({ status: "idle" });
    setIsSavedToHistory(false);
    router.setParams({ photoUri: undefined });
  };

  // Mengirim foto ke AI untuk dikenali (loading -> success / empty / error)
  const startDetection = async (target: PhotoData) => {
    const runId = ++runIdRef.current;
    setPhoto(target);
    setIsSavedToHistory(false);
    setDetection({ status: "loading" });
    try {
      const outcome = await classifyTrashImage(target.base64);
      if (runId !== runIdRef.current) return;
      setDetection(
        outcome ? { status: "success", result: outcome } : { status: "empty" },
      );
    } catch (err) {
      if (runId !== runIdRef.current) return;
      const apiErr = toApiError(err);
      setDetection({
        status: "error",
        kind: apiErr.kind,
        message: apiErr.message,
      });
    }
  };

  const lastProcessedRef = useRef<string | null>(null);

  // Foto dari kamera
  useEffect(() => {
    if (!photoUri) return;
    const pending = PendingPhoto.get();
    const target =
      pending && pending.uri === photoUri
        ? pending
        : { uri: photoUri, base64: null };
    const key = `${target.uri}_${target.base64 ? "b64" : "nob64"}`;
    if (lastProcessedRef.current === key) return;
    lastProcessedRef.current = key;
    startDetection(target);
  }, [photoUri]);

  // Simulasi hasil contoh untuk pengujian praktikum / offline
  const handleSimulatedResult = () => {
    runIdRef.current += 1;
    setPhoto({
      uri: "https://images.unsplash.com/photo-1572932491814-1e0e84b80a71?w=600&auto=format&fit=crop&q=80",
      base64: null,
    });
    setDetection({
      status: "success",
      result: {
        title: "Botol Plastik Minuman (PET)",
        category: "Anorganik",
        confidence: 96,
        instruction:
          "Bilas bersih sisa cairan, remas botol hingga pipih untuk menghemat ruang, lalu buang ke tempat sampah anorganik (kuning) atau bank sampah terdekat.",
        icon: "🧴",
      },
    });
    setIsSavedToHistory(false);
  };

  // Week 7: goyangkan HP untuk membersihkan hasil deteksi (accelerometer)
  useEffect(() => {
    if (!hasResult) return;
    let cancelled = false;
    let lastShake = 0;
    let subscription: { remove: () => void } | null = null;

    Accelerometer.isAvailableAsync()
      .then((available) => {
        if (!available || cancelled) return;
        Accelerometer.setUpdateInterval(100);
        subscription = Accelerometer.addListener(({ x, y, z }) => {
          const magnitude = Math.sqrt(x * x + y * y + z * z); // satuan g
          const now = Date.now();
          if (magnitude > 2.2 && now - lastShake > 1500) {
            lastShake = now;
            Vibration.vibrate(200);
            resetResult();
          }
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [hasResult]);

  const handleLogout = () => {
    Alert.alert(
      "Konfirmasi Keluar (Logout)",
      "Apakah kamu yakin ingin keluar dari aplikasi? Sesi token aman akan dihapus dari Secure Storage.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Keluar",
          style: "destructive",
          onPress: async () => {
            await logout();
          },
        },
      ],
    );
  };

  // Week 7: buka layar kamera (permission ditangani di /camera)
  const handleCameraPress = () => {
    router.push("/camera");
  };

  // Pilih foto dari galeri lalu langsung dideteksi
  const handleGalleryPress = async () => {
    try {
      const perm = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (!perm.granted && perm.canAskAgain) {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.5,
        base64: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const asset = res.assets[0];
      startDetection({ uri: asset.uri, base64: asset.base64 ?? null });
    } catch (err) {
      console.warn("Gagal membuka galeri:", err);
      Alert.alert(
        "Galeri Tidak Dapat Dibuka",
        "Pastikan aplikasi diizinkan mengakses foto di pengaturan perangkat, lalu coba lagi.",
      );
    }
  };

  const handleSaveToHistory = async () => {
    if (detection.status !== "success") return;
    const r = detection.result;
    await HistoryStorage.addHistoryItem({
      title: r.title,
      category: r.category,
      confidence: r.confidence,
      instruction: r.instruction,
      icon: r.icon,
    });
    setIsSavedToHistory(true);
    Alert.alert(
      "Berhasil Tersimpan! 🎉",
      "Hasil deteksi telah dicatat ke halaman Riwayat. Kamu bisa melihat seluruh arsip pemilahan di sana.",
    );
  };

  // Navigasi ke halaman detail menggunakan router.push() dengan parameter dinamis (Modul 2 Hal. 32)
  const handleViewDetail = () => {
    if (detection.status !== "success") return;
    const r = detection.result;
    router.push({
      pathname: "/detail",
      params: {
        id: `scan-${Date.now()}`,
        title: r.title,
        category: r.category,
        confidence: String(r.confidence),
        instruction: r.instruction,
        icon: r.icon,
        timestamp: "Baru saja",
      },
    });
  };

  // ---------------------------------------------------------------
  // Tampilan area hasil deteksi (idle / loading / success / empty / error)
  // ---------------------------------------------------------------
  const cardBase = {
    backgroundColor: colors.surface,
    borderColor: colors.surfaceBorder,
    shadowColor: colors.cardShadow,
  };

  const photoPreview = photo ? (
    <Image
      source={{ uri: photo.uri }}
      style={styles.capturedPhoto}
      resizeMode="cover"
      accessibilityLabel="Foto sampah yang dianalisis"
    />
  ) : null;

  const renderResult = () => {
    if (detection.status === "idle") {
      return (
        <View style={[styles.placeholderCard, cardBase]}>
          <View
            style={[
              styles.placeholderIconContainer,
              { backgroundColor: colors.surfaceSubtle },
            ]}
          >
            <Text style={styles.placeholderIcon}>🔍</Text>
          </View>
          <Text
            style={[styles.placeholderTitle, { color: colors.textPrimary }]}
          >
            Belum Ada Sampah yang Dipindai
          </Text>
          <Text
            style={[
              styles.placeholderDescription,
              { color: colors.textSecondary },
            ]}
          >
            Foto yang kamu ambil atau unggah akan langsung dikenali di sini.
            Kamu akan mendapatkan informasi jenis sampah, kategori, dan
            instruksi pembuangannya.
          </Text>
          <View style={styles.categoryTagsWrapper}>
            <View
              style={[
                styles.categoryPill,
                { backgroundColor: isDark ? "#143823" : "#eaf8ee" },
              ]}
            >
              <Text style={styles.categoryPillText}>🌱 Organik</Text>
            </View>
            <View
              style={[
                styles.categoryPill,
                { backgroundColor: isDark ? "#1a3048" : "#e8f4fd" },
              ]}
            >
              <Text style={styles.categoryPillText}>♻️ Anorganik</Text>
            </View>
            <View
              style={[
                styles.categoryPill,
                { backgroundColor: isDark ? "#3d2b15" : "#fef3e6" },
              ]}
            >
              <Text style={styles.categoryPillText}>⚠️ Limbah B3</Text>
            </View>
            <View
              style={[
                styles.categoryPill,
                { backgroundColor: isDark ? "#2e263d" : "#f5eefb" },
              ]}
            >
              <Text style={styles.categoryPillText}>📦 Kertas</Text>
            </View>
          </View>

          {/* Tombol Demo Pembantu untuk Pengujian Format Hasil Deteksi */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lihat simulasi contoh hasil deteksi"
            onPress={handleSimulatedResult}
            style={[
              styles.demoTriggerButton,
              { backgroundColor: colors.surfaceSubtle },
            ]}
          >
            <Text style={[styles.demoTriggerText, { color: colors.primary }]}>
              👁️ Lihat Format Hasil Deteksi (Simulasi Pengujian)
            </Text>
          </Pressable>
        </View>
      );
    }

    if (detection.status === "loading") {
      return (
        <View style={[styles.resultCard, cardBase]}>
          {photoPreview}
          <View style={styles.detectStateBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={[styles.detectStateTitle, { color: colors.textPrimary }]}
            >
              Menganalisis foto...
            </Text>
            <Text
              style={[styles.detectStateDesc, { color: colors.textSecondary }]}
            >
              Mohon tunggu sebentar, jenis sampah sedang dikenali.
            </Text>
          </View>
        </View>
      );
    }

    if (detection.status === "empty") {
      return (
        <View style={[styles.resultCard, cardBase]}>
          {photoPreview}
          <View style={styles.detectStateBox}>
            <Text style={styles.detectStateIcon}>🤔</Text>
            <Text
              style={[styles.detectStateTitle, { color: colors.textPrimary }]}
            >
              Sampah Tidak Terdeteksi
            </Text>
            <Text
              style={[styles.detectStateDesc, { color: colors.textSecondary }]}
            >
              Foto tidak menampilkan sampah yang dapat dikenali. Coba foto lebih
              dekat dengan pencahayaan cukup.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Coba pindai foto lain"
              onPress={resetResult}
              style={[
                styles.detectRetryBtn,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text style={styles.detectRetryText}>📸 Pindai Lagi</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (detection.status === "error") {
      const errBg = isDark ? "#450a0a" : "#fef2f2";
      const errBorder = isDark ? "#991b1b" : "#fecaca";
      const errText = isDark ? "#fca5a5" : "#b91c1c";
      return (
        <View
          style={[
            styles.resultCard,
            { backgroundColor: errBg, borderColor: errBorder },
          ]}
        >
          {photoPreview}
          <View style={styles.detectStateBox}>
            <Text style={styles.detectStateIcon}>
              {ERROR_ICON[detection.kind]}
            </Text>
            <Text style={[styles.detectStateTitle, { color: errText }]}>
              Gagal Mengenali Sampah
            </Text>
            <Text style={[styles.detectStateDesc, { color: errText }]}>
              {detection.message}
            </Text>
            {photo?.base64 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Coba kenali foto ini lagi"
                onPress={() => photo && startDetection(photo)}
                style={[
                  styles.detectRetryBtn,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.detectRetryText}>↻ Coba Lagi</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      );
    }

    // status === "success"
    const r = detection.result;
    return (
      <View style={[styles.resultCard, cardBase]}>
        {photoPreview}
        <View style={styles.resultCardTop}>
          <View style={[styles.resultBadge, { backgroundColor: "#dcfce7" }]}>
            <Text style={[styles.resultBadgeText, { color: "#15803d" }]}>
              ✓ TERDETEKSI (AKURASI {r.confidence}%)
            </Text>
          </View>
          <Text style={[styles.resultItemName, { color: colors.textPrimary }]}>
            {r.icon} {r.title}
          </Text>
          <Text style={[styles.resultCategory, { color: colors.accentText }]}>
            Kategori: Sampah {r.category}
          </Text>
        </View>

        <View
          style={[
            styles.resultGuideBox,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.surfaceBorder,
            },
          ]}
        >
          <Text
            style={[styles.resultGuideTitle, { color: colors.textPrimary }]}
          >
            📌 Panduan Pembuangan yang Tepat:
          </Text>
          <Text
            style={[styles.resultGuideStep, { color: colors.textSecondary }]}
          >
            {r.instruction}
          </Text>
        </View>

        {/* Baris Tombol Aksi Hasil Deteksi (Menerapkan router.push() Modul 2 Hal. 32) */}
        <View style={styles.resultActionsCol}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lihat informasi dan panduan detail sampah"
            onPress={handleViewDetail}
            style={[
              styles.viewDetailBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.primary,
              },
            ]}
          >
            <Text style={[styles.viewDetailBtnText, { color: colors.primary }]}>
              🔍 Buka Panduan Detail (push)
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Simpan hasil deteksi ini ke riwayat"
            disabled={isSavedToHistory}
            onPress={handleSaveToHistory}
            style={[
              styles.saveHistoryBtn,
              {
                backgroundColor: isSavedToHistory
                  ? colors.surfaceSubtle
                  : colors.primary,
                borderColor: colors.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.saveHistoryBtnText,
                { color: isSavedToHistory ? colors.accentText : "#ffffff" },
              ]}
            >
              {isSavedToHistory
                ? "✓ Sudah Tercatat di Riwayat"
                : "💾 Simpan Hasil ke Riwayat"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const isWide = width >= 600;

  return (
    <View
      style={[styles.screenWrapper, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: insets.bottom + 90,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.responsiveWrapper}>
          {/* ========================================================= */}
          {/* BAR PENGGUNA TERAUTENTIKASI (PROFIL & LOGOUT)            */}
          {/* ========================================================= */}
          <View
            style={[
              styles.userStatusBar,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfaceBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <View style={styles.userAvatarBubble}>
              <Text style={styles.userAvatarIcon}>👤</Text>
            </View>
            <View style={styles.userInfoCol}>
              <Text
                style={[styles.userGreeting, { color: colors.textSecondary }]}
              >
                Masuk sebagai:
              </Text>
              <Text style={[styles.userName, { color: colors.textPrimary }]}>
                {user?.name || "Pengguna Trash Detector"}
              </Text>
            </View>
            <View style={styles.statusBarActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Buka riwayat pindaian sampah"
                onPress={() => router.dismissTo("/history")}
                style={[
                  styles.historyShortcutBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.surfaceBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.historyShortcutText,
                    { color: colors.primary },
                  ]}
                >
                  📋 Riwayat
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Keluar dari akun aplikasi (Logout)"
                onPress={handleLogout}
                style={[
                  styles.logoutBtn,
                  { backgroundColor: isDark ? "#3b1212" : "#fee2e2" },
                ]}
              >
                <Text style={styles.logoutBtnText}>Keluar 🚪</Text>
              </Pressable>
            </View>
          </View>

          {/* ========================================================= */}
          {/* 1. HEADER: BRANDING, JUDUL, & TAGLINE                     */}
          {/* ========================================================= */}
          <View style={styles.headerContainer}>
            <View
              style={[styles.brandPill, { backgroundColor: colors.badgeGreen }]}
            >
              <Text style={styles.brandPillIcon}>🌱</Text>
              <Text style={[styles.brandPillText, { color: colors.badgeText }]}>
                SMART WASTE DETECTION
              </Text>
            </View>

            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.textPrimary }]}
            >
              Trash Detector
            </Text>

            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              Kenali jenis sampahmu secara cerdas melalui foto. Pilah dengan
              tepat, jaga kelestarian bumi bersama.
            </Text>
          </View>

          {/* ========================================================= */}
          {/* HERO BANNER ILUSTRASI LINGKUNGAN                          */}
          {/* ========================================================= */}
          <View
            style={[
              styles.heroImageCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfaceBorder,
                shadowColor: colors.cardShadow,
              },
            ]}
          >
            <Image
              source={require("@/assets/images/trash-hero.jpg")}
              style={styles.heroImage}
              resizeMode="cover"
              accessibilityLabel="Ilustrasi pemilahan sampah organik, anorganik plastik, dan kertas dengan pemindai ponsel pintar"
            />
            <View
              style={[
                styles.heroBadgeOverlay,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Text
                style={[styles.heroBadgeText, { color: colors.accentText }]}
              >
                ♻️ Solusi Cerdas untuk Mahasiswa & Masyarakat Peduli Lingkungan
              </Text>
            </View>
          </View>

          {/* ========================================================= */}
          {/* 2. TOMBOL AKSI UTAMA (KAMERA & GALERI)                    */}
          {/* ========================================================= */}
          <View style={styles.actionSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Mulai Deteksi
            </Text>
            <Text
              style={[styles.sectionSubtitle, { color: colors.textSecondary }]}
            >
              Pilih metode input foto sampah yang ingin dianalisis
            </Text>

            <View
              style={[styles.buttonsContainer, isWide && styles.buttonsRow]}
            >
              {/* Tombol Kamera (Primary Button) */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ambil foto sampah menggunakan kamera"
                accessibilityHint="Membuka kamera untuk mengambil gambar sampah secara langsung dan mendeteksi kategorinya"
                onPress={handleCameraPress}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.primaryButton,
                  {
                    backgroundColor: pressed
                      ? colors.primaryPressed
                      : colors.primary,
                  },
                  isWide && styles.flexButton,
                ]}
              >
                <View style={styles.buttonIconBubble}>
                  <Text style={styles.buttonIcon}>📸</Text>
                </View>
                <View style={styles.buttonTextGroup}>
                  <Text style={styles.primaryButtonTitle}>Ambil Foto</Text>
                  <Text style={styles.primaryButtonDesc}>
                    Gunakan kamera langsung
                  </Text>
                </View>
              </Pressable>

              {/* Tombol Galeri (Secondary Button) */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Unggah foto sampah dari galeri perangkat"
                accessibilityHint="Membuka galeri untuk memilih foto sampah yang sudah tersimpan"
                onPress={handleGalleryPress}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.secondaryButton,
                  {
                    backgroundColor: pressed
                      ? colors.surfaceSubtle
                      : colors.surface,
                    borderColor: colors.primary,
                  },
                  isWide && styles.flexButton,
                ]}
              >
                <View
                  style={[
                    styles.buttonIconBubble,
                    { backgroundColor: colors.primarySurface },
                  ]}
                >
                  <Text style={styles.buttonIcon}>🖼️</Text>
                </View>
                <View style={styles.buttonTextGroup}>
                  <Text
                    style={[
                      styles.secondaryButtonTitle,
                      { color: colors.primary },
                    ]}
                  >
                    Upload dari Galeri
                  </Text>
                  <Text
                    style={[
                      styles.secondaryButtonDesc,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Pilih gambar dari album
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* ========================================================= */}
          {/* 3. AREA PLACEHOLDER HASIL DETEKSI                         */}
          {/* ========================================================= */}
          <View style={styles.resultSection}>
            <View style={styles.resultHeaderRow}>
              <Text
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                Hasil Deteksi Sampah
              </Text>
              {hasResult && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reset hasil deteksi kembali ke tampilan awal"
                  onPress={resetResult}
                  style={[
                    styles.resetButton,
                    { backgroundColor: colors.surfaceSubtle },
                  ]}
                >
                  <Text
                    style={[
                      styles.resetButtonText,
                      { color: colors.accentText },
                    ]}
                  >
                    ↺ Bersihkan
                  </Text>
                </Pressable>
              )}
            </View>

            {hasResult && (
              <Text
                style={[styles.sectionSubtitle, { color: colors.textMuted }]}
              >
                📳 Goyangkan HP untuk membersihkan hasil deteksi
              </Text>
            )}

            {renderResult()}
          </View>

          {/* ========================================================= */}
          {/* 4. CARA PAKAI APLIKASI (PANDUAN SINGKAT)                  */}
          {/* ========================================================= */}
          <View style={styles.guideSection}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Cara Pakai Aplikasi
            </Text>
            <Text
              style={[styles.sectionSubtitle, { color: colors.textSecondary }]}
            >
              Panduan 3 langkah praktis memilah sampah dengan Trash Detector
            </Text>

            <View style={styles.stepsContainer}>
              {/* Step 1 */}
              <View
                style={[
                  styles.stepCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                    shadowColor: colors.cardShadow,
                  },
                ]}
              >
                <View
                  style={[
                    styles.stepNumberBadge,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text
                    style={[styles.stepTitle, { color: colors.textPrimary }]}
                  >
                    Potret atau Unggah Foto
                  </Text>
                  <Text
                    style={[
                      styles.stepDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Arahkan kamera ke sampah yang ingin diidentifikasi dengan
                    pencahayaan cukup, atau pilih foto dari galeri.
                  </Text>
                </View>
              </View>

              {/* Step 2 */}
              <View
                style={[
                  styles.stepCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                    shadowColor: colors.cardShadow,
                  },
                ]}
              >
                <View
                  style={[
                    styles.stepNumberBadge,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text
                    style={[styles.stepTitle, { color: colors.textPrimary }]}
                  >
                    Analisis AI Otomatis
                  </Text>
                  <Text
                    style={[
                      styles.stepDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Sistem cerdas akan memindai jenis material sampah (Organik,
                    Plastik, Logam, Kertas, atau B3) dalam hitungan detik.
                  </Text>
                </View>
              </View>

              {/* Step 3 */}
              <View
                style={[
                  styles.stepCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                    shadowColor: colors.cardShadow,
                  },
                ]}
              >
                <View
                  style={[
                    styles.stepNumberBadge,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text
                    style={[styles.stepTitle, { color: colors.textPrimary }]}
                  >
                    Ikuti Rekomendasi Pembuangan
                  </Text>
                  <Text
                    style={[
                      styles.stepDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Dapatkan instruksi warna tempat sampah yang sesuai dan tips
                    daur ulang untuk mengurangi pencemaran lingkungan.
                  </Text>
                </View>
              </View>
            </View>

            {/* Banner Edukasi Lingkungan */}
            <View
              style={[
                styles.ecoNoticeBox,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.secondaryBorder,
                },
              ]}
            >
              <Text style={styles.ecoNoticeIcon}>🌍</Text>
              <View style={styles.ecoNoticeContent}>
                <Text
                  style={[styles.ecoNoticeTitle, { color: colors.accentText }]}
                >
                  Fakta Bijak Sampah
                </Text>
                <Text
                  style={[
                    styles.ecoNoticeText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Memilah sampah dari sumbernya dapat meningkatkan efektivitas
                  daur ulang hingga 80% dan mencegah penumpukan sampah di TPA.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      {/* Navigasi Bawah Menggunakan Expo Router (Modul 2) */}
      <BottomNavBar currentTab="index" />
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  responsiveWrapper: {
    width: "100%",
    maxWidth: 680,
    gap: 20,
  },

  // User Status Bar
  userStatusBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  userAvatarBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarIcon: {
    fontSize: 20,
  },
  userInfoCol: {
    flex: 1,
    gap: 1,
  },
  userGreeting: {
    fontSize: 11.5,
    fontWeight: "500",
  },
  userName: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  statusBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyShortcutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  historyShortcutText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    minHeight: 44, // Touch target >= 44px
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtnText: {
    color: "#ef4444",
    fontSize: 12.5,
    fontWeight: "700",
  },

  // 1. Header Styles
  headerContainer: {
    alignItems: "center",
    textAlign: "center",
    gap: 10,
    paddingTop: 4,
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  brandPillIcon: {
    fontSize: 14,
  },
  brandPillText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
    marginTop: 2,
  },
  tagline: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 480,
    fontWeight: "400",
  },

  // Hero Image Banner
  heroImageCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  heroImage: {
    width: "100%",
    height: 190,
  },
  heroBadgeOverlay: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  // 2. Action Section Styles
  actionSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: -4,
  },
  buttonsContainer: {
    gap: 14,
    marginTop: 4,
  },
  buttonsRow: {
    flexDirection: "row",
  },
  flexButton: {
    flex: 1,
  },
  actionButton: {
    minHeight: 56, // Memenuhi standar aksesibilitas touch target >= 44px
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryButton: {
    shadowColor: "#15803d",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    borderWidth: 1.5,
  },
  buttonIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIcon: {
    fontSize: 22,
  },
  buttonTextGroup: {
    flex: 1,
    gap: 2,
  },
  primaryButtonTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
  },
  primaryButtonDesc: {
    fontSize: 13,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.9)",
  },
  secondaryButtonTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  secondaryButtonDesc: {
    fontSize: 13,
    fontWeight: "400",
  },

  // 3. Result Section Styles
  resultSection: {
    gap: 12,
  },
  resultHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  placeholderCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
    gap: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  placeholderIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  placeholderIcon: {
    fontSize: 28,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  placeholderDescription: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 420,
  },
  categoryTagsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  demoTriggerButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  demoTriggerText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Result Card (when detected)
  resultCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
  },
  detectStateBox: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  detectStateIcon: { fontSize: 36 },
  detectStateTitle: { fontSize: 17, fontWeight: "800", textAlign: "center" },
  detectStateDesc: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 380,
  },
  detectRetryBtn: {
    marginTop: 6,
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  detectRetryText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  capturedPhoto: {
    width: "100%",
    height: 220,
    borderRadius: 14,
  },
  resultCardTop: {
    gap: 6,
  },
  resultBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resultBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  resultItemName: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  resultCategory: {
    fontSize: 15,
    fontWeight: "600",
  },
  resultGuideBox: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  resultGuideTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  resultGuideStep: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  resultActionsCol: {
    gap: 10,
    marginTop: 4,
  },
  viewDetailBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
  viewDetailBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  saveHistoryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46, // Touch target >= 44px
    marginTop: 4,
  },
  saveHistoryBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },

  // 4. Guide Section Styles
  guideSection: {
    gap: 14,
    marginTop: 6,
  },
  stepsContainer: {
    gap: 12,
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 2,
  },
  stepNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepNumberText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  stepContent: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  stepDescription: {
    fontSize: 13.5,
    lineHeight: 20,
  },
  ecoNoticeBox: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    alignItems: "center",
    marginTop: 4,
  },
  ecoNoticeIcon: {
    fontSize: 28,
  },
  ecoNoticeContent: {
    flex: 1,
    gap: 2,
  },
  ecoNoticeTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  ecoNoticeText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
});

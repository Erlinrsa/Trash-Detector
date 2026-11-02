import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomTabInset } from "@/constants/theme";

export default function DetailScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // 1. Mengambil parameter dinamis menggunakan useLocalSearchParams (Modul 2 Hal. 21-22)
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    category?: string;
    confidence?: string;
    instruction?: string;
    icon?: string;
    timestamp?: string;
  }>();

  // State untuk interaksi simpan catatan / bookmark (Modul 2 Hal. 7-8)
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);

  const colors = {
    background: isDark ? "#0b130e" : "#f6fbf7",
    surface: isDark ? "#142219" : "#ffffff",
    surfaceSubtle: isDark ? "#192e22" : "#edf7f0",
    surfaceBorder: isDark ? "#264532" : "#cde7d5",
    primary: "#15803d",
    primaryPressed: "#166534",
    textPrimary: isDark ? "#f0fdf4" : "#0f2918",
    textSecondary: isDark ? "#cbd5e1" : "#334155",
    textMuted: isDark ? "#94a3b8" : "#64748b",
    accentText: isDark ? "#4ade80" : "#166534",
    badgeGreen: isDark ? "#14532d" : "#dcfce7",
    badgeText: isDark ? "#86efac" : "#14532d",
    cardShadow: isDark ? "rgba(0, 0, 0, 0.4)" : "rgba(21, 128, 61, 0.08)",
  };

  // 2. Fungsi Navigasi Back & Fallback menggunakan canGoBack() & back() (Modul 2 Hal. 32-34)
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/history");
    }
  };

  const title = params.title || "Objek Sampah";
  const category = params.category || "Anorganik";
  const confidence = params.confidence || "96";
  const instruction =
    params.instruction || "Pilah sampah ke wadah yang sesuai.";
  const icon = params.icon || "♻️";
  const timestamp = params.timestamp || "Baru saja";

  const getCategoryColor = () => {
    switch (category) {
      case "Organik":
        return {
          bg: isDark ? "#143823" : "#dcfce7",
          text: isDark ? "#86efac" : "#14532d",
        };
      case "Anorganik":
        return {
          bg: isDark ? "#1a3048" : "#e0f2fe",
          text: isDark ? "#7dd3fc" : "#0369a1",
        };
      case "Limbah B3":
        return {
          bg: isDark ? "#3d2b15" : "#fef3c7",
          text: isDark ? "#fcd34d" : "#b45309",
        };
      case "Kertas":
        return {
          bg: isDark ? "#2e263d" : "#f3e8ff",
          text: isDark ? "#d8b4fe" : "#6b21a8",
        };
      default:
        return { bg: colors.surfaceSubtle, text: colors.primary };
    }
  };

  const catTheme = getCategoryColor();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: insets.bottom + BottomTabInset + 32,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.responsiveWrapper}>
        {/* Tombol Navigasi Kembali (router.back() & canGoBack()) */}
        <View style={styles.topNavRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali ke halaman sebelumnya"
            onPress={handleBack}
            style={[
              styles.backBtn,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfaceBorder,
              },
            ]}
          >
            <Text style={[styles.backBtnText, { color: colors.primary }]}>
              ← Kembali
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Simpan ke favorit atau bookmark"
            onPress={() => setIsBookmarked(!isBookmarked)}
            style={[
              styles.bookmarkBtn,
              {
                backgroundColor: isBookmarked ? "#fef3c7" : colors.surface,
                borderColor: colors.surfaceBorder,
              },
            ]}
          >
            <Text style={{ fontSize: 16 }}>
              {isBookmarked ? "⭐ Tersimpan" : "☆ Simpan"}
            </Text>
          </Pressable>
        </View>

        {/* Hero Card Objek Sampah */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: catTheme.bg }]}>
            <Text style={styles.bigIcon}>{icon}</Text>
          </View>

          <View style={styles.heroTextCol}>
            <View style={[styles.catBadge, { backgroundColor: catTheme.bg }]}>
              <Text style={[styles.catBadgeText, { color: catTheme.text }]}>
                {category} • Akurasi {confidence}%
              </Text>
            </View>
            <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>
              {title}
            </Text>
            <Text style={[styles.timestampText, { color: colors.textMuted }]}>
              🕒 Dipindai: {timestamp}
            </Text>
          </View>
        </View>

        {/* Panduan Pemilahan Lengkap */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
              shadowColor: colors.cardShadow,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            📋 Panduan Penanganan & Pemilahan
          </Text>
          <Text
            style={[styles.instructionDesc, { color: colors.textSecondary }]}
          >
            {instruction}
          </Text>

          <View style={styles.stepsList}>
            <View
              style={[
                styles.stepRow,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Text style={styles.stepNum}>1</Text>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                Bersihkan sisa kotoran atau cairan sebelum dibuang.
              </Text>
            </View>
            <View
              style={[
                styles.stepRow,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Text style={styles.stepNum}>2</Text>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                Pisahkan bagian penutup atau label jika berbahan berbeda.
              </Text>
            </View>
            <View
              style={[
                styles.stepRow,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Text style={styles.stepNum}>3</Text>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                Lipat atau pipihkan wadah untuk menghemat ruang tempat sampah.
              </Text>
            </View>
            <View
              style={[
                styles.stepRow,
                { backgroundColor: colors.surfaceSubtle },
              ]}
            >
              <Text style={styles.stepNum}>4</Text>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                Buang ke wadah tempat sampah kategori {category} atau serahkan
                ke bank sampah terdekat.
              </Text>
            </View>
          </View>
        </View>

        {/* Tombol Aksi Bawah */}
        <View style={styles.actionButtonsCol}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pindah ke halaman deteksi kamera"
            onPress={() => router.replace("/")}
            style={[
              styles.primaryActionBtn,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={styles.primaryActionBtnText}>
              📸 Pindai Sampah Lain
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kembali ke halaman riwayat"
            onPress={() => router.push("/history")}
            style={[
              styles.secondaryActionBtn,
              { borderColor: colors.primary, backgroundColor: colors.surface },
            ]}
          >
            <Text
              style={[styles.secondaryActionBtnText, { color: colors.primary }]}
            >
              📋 Buka Daftar Riwayat
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    gap: 16,
  },
  topNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  bookmarkBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  bigIcon: {
    fontSize: 32,
  },
  heroTextCol: {
    flex: 1,
    gap: 4,
  },
  catBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  timestampText: {
    fontSize: 12,
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  instructionDesc: {
    fontSize: 14,
    lineHeight: 22,
  },
  stepsList: {
    gap: 8,
    marginTop: 4,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#15803d",
    color: "#ffffff",
    textAlign: "center",
    lineHeight: 24,
    fontSize: 12,
    fontWeight: "700",
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  actionButtonsCol: {
    gap: 10,
    marginTop: 8,
  },
  primaryActionBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  primaryActionBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryActionBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    minHeight: 50,
  },
  secondaryActionBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
});

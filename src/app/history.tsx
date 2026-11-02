import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNavBar } from "@/components/bottom-nav-bar";
import { useAuth } from "@/context/auth-context";
import { HistoryStorage } from "@/services/history-storage";
import {
  ApiErrorKind,
  fetchTrashFromAPI,
  toApiError,
} from "@/services/trash-api";
import { TrashItem } from "@/types/trash";

// Tampilan error berbeda untuk tiap jenis kegagalan (Week 6)
const ERROR_META: Record<ApiErrorKind, { icon: string; title: string }> = {
  offline: { icon: "📡", title: "Tidak Ada Koneksi Internet" },
  timeout: { icon: "⏱️", title: "Waktu Habis" },
  server: { icon: "🛠️", title: "Terjadi Kesalahan pada Server" },
  client: { icon: "❗", title: "Data Tidak Dapat Dimuat" },
  unauthorized: { icon: "🔐", title: "Sesi Tidak Valid" },
  unknown: { icon: "⚠️", title: "Gagal Memuat Data" },
};

export default function HistoryScreen() {
  const { user, token, logout } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [history, setHistory] = useState<TrashItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<{
    kind: ApiErrorKind;
    message: string;
    status?: number;
  } | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

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
    errorBg: isDark ? "#450a0a" : "#fef2f2",
    errorBorder: isDark ? "#991b1b" : "#fecaca",
    errorText: isDark ? "#fca5a5" : "#b91c1c",
  };

  // Week 6: loading -> success / error / offline / empty, plus retry
  const loadData = async (isRetry: boolean = false) => {
    try {
      setIsLoading(true);
      setIsRetrying(isRetry);
      setApiError(null);
      // Memanggil Protected REST API dengan Token Authorization (Week 5 Task 02)
      const apiData = await fetchTrashFromAPI();
      setHistory(apiData);
    } catch (err) {
      const apiErr = toApiError(err);
      // Data tidak ditampilkan ketika request gagal
      setHistory([]);
      setApiError({
        kind: apiErr.kind,
        message: apiErr.message,
        status: apiErr.status,
      });
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Navigasi kembali menggunakan router.canGoBack() & router.back() serta fallback router.replace() (Modul 2 Hal. 32-34)
  const handleBackToDetection = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  // Navigasi ke halaman detail dengan parameter dinamis menggunakan router.push() (Modul 2 Hal. 32)
  const handleItemPress = (item: TrashItem) => {
    router.push({
      pathname: "/detail",
      params: {
        id: item.id,
        title: item.title,
        category: item.category,
        confidence: String(item.confidence),
        instruction: item.instruction,
        icon: item.icon,
        timestamp: item.timestamp,
      },
    });
  };

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

  const handleClearHistory = () => {
    Alert.alert(
      "Hapus Riwayat",
      "Apakah kamu yakin ingin menghapus seluruh riwayat pindaian sampah?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus Semua",
          style: "destructive",
          onPress: async () => {
            await HistoryStorage.clearHistory();
            setHistory([]);
          },
        },
      ],
    );
  };

  const filteredHistory = history.filter((item) => {
    if (selectedCategory === "Semua") return true;
    return item.category === selectedCategory;
  });

  const getCategoryTheme = (cat: string) => {
    switch (cat) {
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
        return { bg: colors.surfaceSubtle, text: colors.textPrimary };
    }
  };

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
                accessibilityLabel="Kembali ke halaman deteksi"
                onPress={handleBackToDetection}
                style={[
                  styles.backShortcutBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.surfaceBorder,
                  },
                ]}
              >
                <Text
                  style={[styles.backShortcutText, { color: colors.primary }]}
                >
                  ← Deteksi
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
          {/* BADGE KEAMANAN TOKEN & PROTECTED API (WEEK 5 DEMO)        */}
          {/* ========================================================= */}
          <View
            style={[
              styles.secureApiCard,
              {
                backgroundColor: colors.surfaceSubtle,
                borderColor: colors.surfaceBorder,
              },
            ]}
          >
            <View style={styles.secureApiHeader}>
              <Text style={styles.secureLockIcon}>🔒</Text>
              <Text style={[styles.secureApiTitle, { color: colors.primary }]}>
                SECURE API INTEGRATION (WEEK 5)
              </Text>
            </View>
            <Text
              style={[
                styles.secureApiStatusText,
                { color: colors.textSecondary },
              ]}
            >
              Status:{" "}
              <Text style={{ fontWeight: "700", color: colors.primary }}>
                Protected Endpoint Aktif
              </Text>
            </Text>
            <View
              style={[styles.tokenBubble, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.tokenLabel, { color: colors.textMuted }]}>
                Authorization Header:
              </Text>
              <Text style={[styles.tokenValue, { color: colors.textPrimary }]}>
                Bearer{" "}
                {token
                  ? `${token.substring(0, 24)}...`
                  : "Token tidak tersedia"}
              </Text>
            </View>
          </View>

          {/* ========================================================= */}
          {/* HEADER: JUDUL & TAGLINE RIWAYAT                           */}
          {/* ========================================================= */}
          <View style={styles.headerContainer}>
            <View
              style={[styles.brandPill, { backgroundColor: colors.badgeGreen }]}
            >
              <Text style={styles.brandPillIcon}>📋</Text>
              <Text style={[styles.brandPillText, { color: colors.badgeText }]}>
                ARSIP PEMINDAIAN
              </Text>
            </View>

            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.textPrimary }]}
            >
              Riwayat Sampah
            </Text>

            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              Catatan pindaian sampah yang telah kamu identifikasi beserta
              kategori dan cara pemilahannya.
            </Text>
          </View>

          {/* ========================================================= */}
          {/* STATISTIK RINGKAS (KPI CARDS)                             */}
          {/* ========================================================= */}
          {!apiError && (
            <View style={styles.statsGrid}>
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                    shadowColor: colors.cardShadow,
                  },
                ]}
              >
                <Text style={styles.statIcon}>🔢</Text>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {history.length}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  Total Dipindai
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                    shadowColor: colors.cardShadow,
                  },
                ]}
              >
                <Text style={styles.statIcon}>🌱</Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  +{history.length * 25}
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  Eco Points
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                    shadowColor: colors.cardShadow,
                  },
                ]}
              >
                <Text style={styles.statIcon}>♻️</Text>
                <Text style={[styles.statValue, { color: "#0284c7" }]}>
                  {
                    history.filter(
                      (h) =>
                        h.category === "Anorganik" || h.category === "Kertas",
                    ).length
                  }
                </Text>
                <Text
                  style={[styles.statLabel, { color: colors.textSecondary }]}
                >
                  Dapat Didaur
                </Text>
              </View>
            </View>
          )}

          {/* ========================================================= */}
          {/* ERROR STATE JIKA ADA KENDALA API                          */}
          {/* ========================================================= */}
          {apiError ? (
            <View
              style={[
                styles.errorStateCard,
                {
                  backgroundColor: colors.errorBg,
                  borderColor: colors.errorBorder,
                },
              ]}
            >
              <Text style={styles.errorStateIcon}>
                {ERROR_META[apiError.kind].icon}
              </Text>
              <Text
                style={[styles.errorStateTitle, { color: colors.errorText }]}
              >
                {ERROR_META[apiError.kind].title}
              </Text>
              <Text
                style={[styles.errorStateMessage, { color: colors.errorText }]}
              >
                {apiError.message}
              </Text>
              <View style={styles.errorActionsRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Coba muat ulang data"
                  onPress={() => loadData(true)}
                  style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.retryBtnText}>↻ Coba Lagi</Text>
                </Pressable>
                {apiError.kind === "unauthorized" && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Keluar lalu masuk kembali"
                    onPress={() => logout()}
                    style={[
                      styles.retryBtn,
                      { backgroundColor: isDark ? "#3b1212" : "#fee2e2" },
                    ]}
                  >
                    <Text style={[styles.retryBtnText, { color: "#ef4444" }]}>
                      Masuk Ulang
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          ) : null}

          {/* ========================================================= */}
          {/* FILTER CHIPS KATEGORI & ACTION HAPUS                      */}
          {/* ========================================================= */}
          {!apiError && (
            <>
              <View style={styles.filterSection}>
                <View style={styles.filterHeaderRow}>
                  <Text
                    style={[styles.sectionTitle, { color: colors.textPrimary }]}
                  >
                    Filter Kategori
                  </Text>
                  {history.length > 0 && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Hapus seluruh riwayat pindaian"
                      onPress={handleClearHistory}
                      style={[
                        styles.clearButton,
                        { backgroundColor: isDark ? "#3b1212" : "#fee2e2" },
                      ]}
                    >
                      <Text style={styles.clearButtonText}>🗑️ Hapus Semua</Text>
                    </Pressable>
                  )}
                </View>

                <View style={styles.filterChipsRow}>
                  {["Semua", "Organik", "Anorganik", "Limbah B3", "Kertas"].map(
                    (cat) => {
                      const isActive = selectedCategory === cat;
                      return (
                        <Pressable
                          key={cat}
                          accessibilityRole="button"
                          accessibilityLabel={`Filter kategori ${cat}`}
                          onPress={() => setSelectedCategory(cat)}
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isActive
                                ? colors.primary
                                : colors.surface,
                              borderColor: isActive
                                ? colors.primary
                                : colors.surfaceBorder,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              {
                                color: isActive
                                  ? "#ffffff"
                                  : colors.textSecondary,
                              },
                              isActive && styles.chipTextActive,
                            ]}
                          >
                            {cat}
                          </Text>
                        </Pressable>
                      );
                    },
                  )}
                </View>
              </View>

              {/* ========================================================= */}
              {/* LOADING SPINNER KETIKA MEMANGGIL API                      */}
              {/* ========================================================= */}
              {isLoading ? (
                <View
                  style={[
                    styles.loadingBox,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text
                    style={[
                      styles.loadingText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {isRetrying
                      ? "🔄 Mencoba lagi... Mengambil data terbaru."
                      : "🔒 Mengambil data dari Protected API dengan Bearer Token..."}
                  </Text>
                </View>
              ) : (
                /* DAFTAR KARTU RIWAYAT SAMPAH */
                <View style={styles.historyListSection}>
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((item) => {
                      const catTheme = getCategoryTheme(item.category);
                      return (
                        <View
                          key={item.id}
                          style={[
                            styles.historyCard,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.surfaceBorder,
                              shadowColor: colors.cardShadow,
                            },
                          ]}
                        >
                          {/* Header Kartu */}
                          <View style={styles.cardHeader}>
                            <View
                              style={[
                                styles.cardIconBox,
                                { backgroundColor: catTheme.bg },
                              ]}
                            >
                              <Text style={styles.cardIconText}>
                                {item.icon}
                              </Text>
                            </View>

                            <View style={styles.cardInfo}>
                              <Text
                                style={[
                                  styles.itemTitle,
                                  { color: colors.textPrimary },
                                ]}
                              >
                                {item.title}
                              </Text>
                              <Text
                                style={[
                                  styles.itemTimestamp,
                                  { color: colors.textMuted },
                                ]}
                              >
                                🕒 {item.timestamp}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.confidenceBadge,
                                { backgroundColor: colors.surfaceSubtle },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.confidenceText,
                                  { color: colors.primary },
                                ]}
                              >
                                {item.confidence}%
                              </Text>
                            </View>
                          </View>

                          {/* Badge Kategori */}
                          <View style={styles.categoryBadgeRow}>
                            <View
                              style={[
                                styles.categoryBadge,
                                { backgroundColor: catTheme.bg },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.categoryBadgeText,
                                  { color: catTheme.text },
                                ]}
                              >
                                {item.category}
                              </Text>
                            </View>
                          </View>

                          {/* Petunjuk Pembuangan */}
                          <View
                            style={[
                              styles.instructionBox,
                              {
                                backgroundColor: colors.surfaceSubtle,
                                borderColor: colors.surfaceBorder,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.instructionLabel,
                                { color: colors.textPrimary },
                              ]}
                            >
                              📌 Cara Pemilahan:
                            </Text>
                            <Text
                              style={[
                                styles.instructionText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {item.instruction}
                            </Text>
                          </View>

                          {/* Tombol Navigasi Detail (Menerapkan router.push() Modul 2 Hal. 32) */}
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Buka detail dan panduan lengkap untuk ${item.title}`}
                            onPress={() => handleItemPress(item)}
                            style={[
                              styles.cardDetailBtn,
                              {
                                backgroundColor: colors.surfaceSubtle,
                                borderColor: colors.surfaceBorder,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.cardDetailBtnText,
                                { color: colors.primary },
                              ]}
                            >
                              🔍 Lihat Detail & Panduan (push) →
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })
                  ) : (
                    /* EMPTY STATE */
                    <View
                      style={[
                        styles.emptyCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.surfaceBorder,
                          shadowColor: colors.cardShadow,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.emptyIconCircle,
                          { backgroundColor: colors.surfaceSubtle },
                        ]}
                      >
                        <Text style={styles.emptyIcon}>📦</Text>
                      </View>
                      <Text
                        style={[
                          styles.emptyTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        Tidak Ada Riwayat Pemindaian
                      </Text>
                      <Text
                        style={[
                          styles.emptySubtitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {selectedCategory === "Semua"
                          ? "Belum ada data pindaian. Data akan diambil otomatis dari Protected API."
                          : `Tidak ditemukan riwayat untuk kategori "${selectedCategory}".`}
                      </Text>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Muat ulang pindaian dari API"
                        onPress={() => loadData(true)}
                        style={[
                          styles.resetSampleButton,
                          { backgroundColor: colors.primary },
                        ]}
                      >
                        <Text style={styles.resetSampleButtonText}>
                          ↺ Muat Ulang Protected API
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
      {/* Navigasi Bawah Menggunakan Expo Router (Modul 2) */}
      <BottomNavBar currentTab="history" />
    </View>
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

  screenWrapper: {
    flex: 1,
  },
  statusBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backShortcutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backShortcutText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  cardDetailBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
  cardDetailBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
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
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtnText: {
    color: "#ef4444",
    fontSize: 12.5,
    fontWeight: "700",
  },

  // Secure API Card (Week 5 Banner)
  secureApiCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  secureApiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secureLockIcon: {
    fontSize: 14,
  },
  secureApiTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  secureApiStatusText: {
    fontSize: 12.5,
  },
  tokenBubble: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 2,
    gap: 2,
  },
  tokenLabel: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  tokenValue: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "monospace",
  },

  // Header Styles
  headerContainer: {
    alignItems: "center",
    textAlign: "center",
    gap: 8,
    paddingTop: 4,
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  brandPillIcon: {
    fontSize: 13,
  },
  brandPillText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  tagline: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 480,
    fontWeight: "400",
  },

  // Statistics KPI Cards
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  statIcon: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: "600",
    textAlign: "center",
  },

  // Error Card
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  errorIcon: {
    fontSize: 22,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  errorDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  errorStateCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  errorStateIcon: {
    fontSize: 40,
  },
  errorStateTitle: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  errorStateMessage: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 380,
  },
  errorActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  retryBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },

  // Filter Section
  filterSection: {
    gap: 10,
  },
  filterHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  clearButtonText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#ef4444",
  },
  filterChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    fontWeight: "700",
  },

  // Loading Box
  loadingBox: {
    padding: 28,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },

  // History List
  historyListSection: {
    gap: 14,
  },
  historyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconText: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 16.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  itemTimestamp: {
    fontSize: 12,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: "800",
  },
  categoryBadgeRow: {
    flexDirection: "row",
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  instructionBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  instructionLabel: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  instructionText: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Empty Card
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 32,
    alignItems: "center",
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyIcon: {
    fontSize: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 380,
  },
  resetSampleButton: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  resetSampleButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});

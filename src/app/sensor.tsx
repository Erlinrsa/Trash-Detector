import { Accelerometer } from "expo-sensors";
import { ReactNode, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    Vibration,
    View,
    useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNavBar } from "@/components/bottom-nav-bar";

// Week 7 - Sprint 06: Connect app to Device Sensor (Accelerometer)
const G = 9.81; // 1 g = 9.81 m/s²
const UPDATE_INTERVAL_MS = 100;
const SHAKE_THRESHOLD_G = 1.8; // magnitudo > ambang -> dianggap goyangan
const HISTORY_SIZE = 30;
const CHART_HEIGHT = 140;
const CHART_RANGE = 25; // sumbu Y grafik: -25 .. +25 m/s²

type SensorStatus = "checking" | "unavailable" | "ask" | "denied" | "active";
type Reading = { x: number; y: number; z: number };

export default function SensorScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<SensorStatus>("checking");
  const [canAskAgain, setCanAskAgain] = useState<boolean>(true);
  const [reading, setReading] = useState<Reading>({ x: 0, y: 0, z: 0 });
  const [history, setHistory] = useState<Reading[]>([]);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [shakeCount, setShakeCount] = useState<number>(0);
  const [chartWidth, setChartWidth] = useState<number>(0);

  const lastLogRef = useRef<number>(0);
  const lastShakeRef = useRef<number>(0);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const colors = {
    background: isDark ? "#0b130e" : "#f6fbf7",
    surface: isDark ? "#142219" : "#ffffff",
    surfaceSubtle: isDark ? "#192e22" : "#edf7f0",
    surfaceBorder: isDark ? "#264532" : "#cde7d5",
    primary: "#15803d",
    textPrimary: isDark ? "#f0fdf4" : "#0f2918",
    textSecondary: isDark ? "#cbd5e1" : "#334155",
    textMuted: isDark ? "#94a3b8" : "#64748b",
    cardShadow: isDark ? "rgba(0, 0, 0, 0.4)" : "rgba(21, 128, 61, 0.08)",
    x: "#ef4444",
    y: "#22c55e",
    z: "#3b82f6",
    shakeBg: isDark ? "#450a0a" : "#fef2f2",
    shakeBorder: isDark ? "#991b1b" : "#fecaca",
    shakeText: isDark ? "#fca5a5" : "#b91c1c",
  };

  // -------------------------------------------------------------
  // 1. Cek ketersediaan sensor & permission
  // -------------------------------------------------------------
  const checkSensor = async () => {
    try {
      const available = await Accelerometer.isAvailableAsync();
      if (!available) {
        setStatus("unavailable");
        return;
      }
      const perm = await Accelerometer.getPermissionsAsync();
      setCanAskAgain(perm.canAskAgain);
      if (perm.granted) {
        setStatus("active");
      } else {
        setStatus(perm.canAskAgain ? "ask" : "denied");
      }
    } catch (err) {
      console.warn("Gagal memeriksa sensor:", err);
      setStatus("unavailable");
    }
  };

  useEffect(() => {
    checkSensor();
  }, []);

  const handleAllow = async () => {
    try {
      const res = await Accelerometer.requestPermissionsAsync();
      setCanAskAgain(res.canAskAgain);
      setStatus(res.granted ? "active" : "denied");
    } catch (err) {
      console.warn("Gagal meminta izin sensor:", err);
      setStatus("denied");
    }
  };

  // -------------------------------------------------------------
  // 2. Baca data sensor real-time lewat listener (Task 01 & 02)
  // -------------------------------------------------------------
  useEffect(() => {
    if (status !== "active") return;

    Accelerometer.setUpdateInterval(UPDATE_INTERVAL_MS);
    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      // Konversi g -> m/s² agar sesuai tampilan di materi (Y ≈ 9.81 saat diam)
      const r: Reading = { x: x * G, y: y * G, z: z * G };
      setReading(r);
      setHistory((prev) => [...prev.slice(-(HISTORY_SIZE - 1)), r]);

      const now = Date.now();

      // Tampilkan nilai X, Y, Z di console (dibatasi 2x per detik agar tidak spam)
      if (now - lastLogRef.current > 500) {
        lastLogRef.current = now;
        console.log(
          `Accelerometer: x=${r.x.toFixed(2)}, y=${r.y.toFixed(2)}, z=${r.z.toFixed(2)}`,
        );
      }

      // ---------------------------------------------------------
      // 3. Task 03: deteksi goyangan dengan threshold magnitudo
      // ---------------------------------------------------------
      const magnitude = Math.sqrt(x * x + y * y + z * z); // dalam g
      if (magnitude > SHAKE_THRESHOLD_G && now - lastShakeRef.current > 1000) {
        lastShakeRef.current = now;
        console.log(
          `Accelerometer: magnitude=${magnitude.toFixed(2)}g  <- Gerakan terdeteksi`,
        );
        Vibration.vibrate(400);
        setIsShaking(true);
        setShakeCount((c) => c + 1);
        if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
        shakeTimerRef.current = setTimeout(() => setIsShaking(false), 1500);
      }
    });

    // Cleanup saat halaman ditutup (hindari memory leak)
    return () => {
      subscription.remove();
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    };
  }, [status]);

  // -------------------------------------------------------------
  // Grafik garis sederhana (tanpa library tambahan)
  // -------------------------------------------------------------
  const yOf = (v: number) => {
    const clamped = Math.max(-CHART_RANGE, Math.min(CHART_RANGE, v));
    return ((CHART_RANGE - clamped) / (2 * CHART_RANGE)) * CHART_HEIGHT;
  };

  const renderLine = (axis: keyof Reading, color: string) => {
    if (chartWidth === 0 || history.length < 2) return null;
    const step = chartWidth / (HISTORY_SIZE - 1);
    const offset = (HISTORY_SIZE - history.length) * step;
    const segments = [];
    for (let i = 0; i < history.length - 1; i++) {
      const x1 = offset + i * step;
      const x2 = offset + (i + 1) * step;
      const y1 = yOf(history[i][axis]);
      const y2 = yOf(history[i + 1][axis]);
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);
      segments.push(
        <View
          key={`${axis}-${i}`}
          style={{
            position: "absolute",
            left: (x1 + x2) / 2 - len / 2,
            top: (y1 + y2) / 2 - 1,
            width: len,
            height: 2,
            borderRadius: 1,
            backgroundColor: color,
            transform: [{ rotate: `${angle}rad` }],
          }}
        />,
      );
    }
    return segments;
  };

  // -------------------------------------------------------------
  // Tampilan kartu pesan (loading / tidak tersedia / izin)
  // -------------------------------------------------------------
  const renderMessageCard = (
    icon: string,
    title: string,
    desc: string,
    actions: ReactNode,
  ) => (
    <View
      style={[
        styles.messageCard,
        { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
      ]}
    >
      <Text style={styles.messageIcon}>{icon}</Text>
      <Text style={[styles.messageTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.messageDesc, { color: colors.textSecondary }]}>
        {desc}
      </Text>
      {actions}
    </View>
  );

  const renderBody = () => {
    if (status === "checking") {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.messageDesc, { color: colors.textSecondary }]}>
            Memeriksa sensor perangkat...
          </Text>
        </View>
      );
    }

    if (status === "unavailable") {
      return renderMessageCard(
        "📵",
        "Sensor Tidak Tersedia",
        "Perangkat ini tidak memiliki accelerometer, atau sensor tidak dapat diakses (misalnya di simulator). Coba di HP asli lewat Expo Go.",
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Periksa sensor lagi"
          onPress={() => {
            setStatus("checking");
            checkSensor();
          }}
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.primaryBtnText}>↻ Periksa Lagi</Text>
        </Pressable>,
      );
    }

    if (status === "ask") {
      return renderMessageCard(
        "📡",
        "Izinkan Akses Sensor?",
        "Trash Detector ingin mengakses sensor gerak (accelerometer) untuk membaca pergerakan perangkat dan mendeteksi goyangan.",
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Izinkan akses sensor"
            onPress={handleAllow}
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.primaryBtnText}>Izinkan</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tolak akses sensor"
            onPress={() => setStatus("denied")}
            style={[styles.secondaryBtn, { borderColor: colors.primary }]}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.primary }]}>
              Tolak
            </Text>
          </Pressable>
        </>,
      );
    }

    if (status === "denied") {
      return renderMessageCard(
        "🚫",
        "Akses Sensor Ditolak",
        "Aplikasi tidak dapat membaca sensor tanpa izin. Kamu bisa mengubah izin melalui pengaturan perangkat.",
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buka pengaturan perangkat"
            onPress={() => Linking.openSettings()}
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.primaryBtnText}>Buka Pengaturan</Text>
          </Pressable>
          {canAskAgain && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Minta izin sensor lagi"
              onPress={() => setStatus("ask")}
              style={[styles.secondaryBtn, { borderColor: colors.primary }]}
            >
              <Text
                style={[styles.secondaryBtnText, { color: colors.primary }]}
              >
                Coba Lagi
              </Text>
            </Pressable>
          )}
        </>,
      );
    }

    // status === "active"
    const axes: {
      key: keyof Reading;
      label: string;
      hint: string;
      color: string;
    }[] = [
      { key: "x", label: "X", hint: "kiri - kanan", color: colors.x },
      { key: "y", label: "Y", hint: "atas - bawah", color: colors.y },
      { key: "z", label: "Z", hint: "depan - belakang", color: colors.z },
    ];

    return (
      <>
        {/* Status sensor */}
        <View style={styles.activeRow}>
          <View
            style={[
              styles.activeBadge,
              { backgroundColor: colors.surfaceSubtle },
            ]}
          >
            <View style={styles.activeDot} />
            <Text style={[styles.activeBadgeText, { color: colors.primary }]}>
              Sensor Active
            </Text>
          </View>
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            Interval {UPDATE_INTERVAL_MS} ms
          </Text>
        </View>

        {/* Status interaksi (Task 03) */}
        <View
          style={[
            styles.statusBox,
            isShaking
              ? {
                  backgroundColor: colors.shakeBg,
                  borderColor: colors.shakeBorder,
                }
              : {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.surfaceBorder,
                },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: isShaking ? colors.shakeText : colors.textSecondary },
            ]}
          >
            {isShaking
              ? "📳 Goyang Terdeteksi! Getaran aktif"
              : "✅ Siap mendeteksi... goyangkan perangkat"}
          </Text>
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            Total goyangan: {shakeCount}
          </Text>
        </View>

        {/* Nilai X, Y, Z */}
        <View style={styles.valuesRow}>
          {axes.map((a) => (
            <View
              key={a.key}
              style={[
                styles.valueCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: a.color,
                  shadowColor: colors.cardShadow,
                },
              ]}
            >
              <Text style={[styles.axisLabel, { color: a.color }]}>
                {a.label}
              </Text>
              <Text style={[styles.axisValue, { color: colors.textPrimary }]}>
                {reading[a.key].toFixed(2)}
              </Text>
              <Text style={[styles.axisUnit, { color: colors.textMuted }]}>
                m/s²
              </Text>
              <Text style={[styles.axisHint, { color: colors.textMuted }]}>
                {a.hint}
              </Text>
            </View>
          ))}
        </View>

        {/* Grafik perubahan nilai */}
        <View
          style={[
            styles.chartCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Grafik Perubahan Nilai
          </Text>
          <View
            style={[styles.chartArea, { borderColor: colors.surfaceBorder }]}
            onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
          >
            <View
              style={[
                styles.zeroLine,
                {
                  top: CHART_HEIGHT / 2,
                  backgroundColor: colors.surfaceBorder,
                },
              ]}
            />
            {renderLine("x", colors.x)}
            {renderLine("y", colors.y)}
            {renderLine("z", colors.z)}
          </View>
          <View style={styles.legendRow}>
            {axes.map((a) => (
              <View key={a.key} style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: a.color }]}
                />
                <Text
                  style={[styles.metaText, { color: colors.textSecondary }]}
                >
                  {a.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: insets.bottom + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.wrapper}>
          <View style={styles.header}>
            <View
              style={[
                styles.pill,
                { backgroundColor: isDark ? "#14532d" : "#dcfce7" },
              ]}
            >
              <Text style={styles.pillIcon}>📡</Text>
              <Text
                style={[
                  styles.pillText,
                  { color: isDark ? "#86efac" : "#14532d" },
                ]}
              >
                DEVICE SENSOR
              </Text>
            </View>
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: colors.textPrimary }]}
            >
              Sensor Perangkat
            </Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              Data accelerometer real-time. Goyangkan HP-mu untuk melihat nilai
              X, Y, Z berubah.
            </Text>
          </View>

          {renderBody()}
        </View>
      </ScrollView>
      <BottomNavBar currentTab="sensor" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, alignItems: "center" },
  wrapper: { width: "100%", maxWidth: 680, gap: 16 },
  header: { alignItems: "center", gap: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  pillIcon: { fontSize: 13 },
  pillText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  tagline: { fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 480 },

  loadingBox: { padding: 28, alignItems: "center", gap: 12 },
  messageCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  messageIcon: { fontSize: 44 },
  messageTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  messageDesc: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 6,
  },
  primaryBtn: {
    alignSelf: "stretch",
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  secondaryBtn: {
    alignSelf: "stretch",
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { fontSize: 15, fontWeight: "700" },

  activeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  activeBadgeText: { fontSize: 13, fontWeight: "700" },
  metaText: { fontSize: 12 },
  statusBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  statusText: { fontSize: 14, fontWeight: "700" },

  valuesRow: { flexDirection: "row", gap: 10 },
  valueCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  axisLabel: { fontSize: 18, fontWeight: "800" },
  axisValue: { fontSize: 22, fontWeight: "800", fontVariant: ["tabular-nums"] },
  axisUnit: { fontSize: 11 },
  axisHint: { fontSize: 10.5, marginTop: 2 },

  chartCard: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  chartArea: {
    height: CHART_HEIGHT,
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  zeroLine: { position: "absolute", left: 0, right: 0, height: 1 },
  legendRow: { flexDirection: "row", justifyContent: "center", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
});

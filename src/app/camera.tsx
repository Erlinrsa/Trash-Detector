import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PendingPhoto } from "@/services/pending-photo";

// Week 7: Device Sensor (Camera) + Runtime Permission
export default function CameraScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [declined, setDeclined] = useState<boolean>(false);

  const colors = {
    background: isDark ? "#0b130e" : "#f6fbf7",
    surface: isDark ? "#142219" : "#ffffff",
    surfaceBorder: isDark ? "#264532" : "#cde7d5",
    primary: "#15803d",
    textPrimary: isDark ? "#f0fdf4" : "#0f2918",
    textSecondary: isDark ? "#cbd5e1" : "#334155",
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current || isCapturing) return;
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
      });
      console.log(
        "📸 Foto diambil:",
        photo.uri,
        `${photo.width}x${photo.height}`,
      );
      PendingPhoto.set({ uri: photo.uri, base64: photo.base64 ?? null });
      setPhotoUri(photo.uri);
    } catch (err) {
      console.warn("Gagal mengambil foto:", err);
      Alert.alert(
        "Gagal Mengambil Foto",
        "Terjadi kesalahan pada kamera. Silakan coba lagi.",
      );
    } finally {
      setIsCapturing(false);
    }
  };

  // Kirim foto kembali ke halaman deteksi (index) lewat parameter route
  const handleUsePhoto = () => {
    if (!photoUri) return;
    router.navigate({
      pathname: "/",
      params: { photoUri, t: Date.now().toString() },
    });
  };

  // ---------------------------------------------------------------
  // 1. Status permission masih dimuat
  // ---------------------------------------------------------------
  if (!permission) {
    return (
      <View
        style={[styles.centerScreen, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.centerText, { color: colors.textSecondary }]}>
          Memeriksa izin kamera...
        </Text>
      </View>
    );
  }

  // ---------------------------------------------------------------
  // 2. Permission belum diberikan / ditolak
  // ---------------------------------------------------------------
  if (!permission.granted) {
    // Diminta dulu (Izinkan / Tolak). Setelah ditolak -> layar "Akses Ditolak"
    const askFirst = permission.canAskAgain && !declined;
    return (
      <View
        style={[
          styles.centerScreen,
          {
            backgroundColor: colors.background,
            paddingTop: Math.max(insets.top, 20),
          },
        ]}
      >
        <View
          style={[
            styles.permissionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
            },
          ]}
        >
          <Text style={styles.permissionIcon}>{askFirst ? "📸" : "🚫"}</Text>
          <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>
            {askFirst ? "Izinkan Akses Kamera?" : "Akses Kamera Ditolak"}
          </Text>
          <Text
            style={[styles.permissionDesc, { color: colors.textSecondary }]}
          >
            {askFirst
              ? "Trash Detector ingin mengakses kamera untuk memotret sampah yang ingin diidentifikasi. Izin hanya dipakai saat kamu mengambil foto."
              : "Aplikasi tidak dapat menggunakan kamera tanpa izin. Kamu bisa mengubah izin melalui pengaturan perangkat."}
          </Text>

          {askFirst ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Izinkan akses kamera"
                onPress={async () => {
                  const res = await requestPermission();
                  if (!res.granted) setDeclined(true);
                }}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.primaryBtnText}>Izinkan</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tolak akses kamera"
                onPress={() => setDeclined(true)}
                style={[styles.secondaryBtn, { borderColor: colors.primary }]}
              >
                <Text
                  style={[styles.secondaryBtnText, { color: colors.primary }]}
                >
                  Tolak
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Buka pengaturan perangkat"
                onPress={() => Linking.openSettings()}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.primaryBtnText}>Buka Pengaturan</Text>
              </Pressable>
              {permission.canAskAgain && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Minta izin kamera lagi"
                  onPress={() => setDeclined(false)}
                  style={[styles.secondaryBtn, { borderColor: colors.primary }]}
                >
                  <Text
                    style={[styles.secondaryBtnText, { color: colors.primary }]}
                  >
                    Coba Lagi
                  </Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Kembali"
                onPress={handleBack}
                style={[styles.secondaryBtn, { borderColor: colors.primary }]}
              >
                <Text
                  style={[styles.secondaryBtnText, { color: colors.primary }]}
                >
                  Kembali
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------
  // 3. Pratinjau foto setelah mengambil gambar
  // ---------------------------------------------------------------
  if (photoUri) {
    return (
      <View style={[styles.cameraScreen, { backgroundColor: "#000" }]}>
        <Image
          source={{ uri: photoUri }}
          style={styles.fill}
          resizeMode="contain"
        />
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ambil ulang foto"
            onPress={() => setPhotoUri(null)}
            style={[styles.barBtn, styles.barBtnGhost]}
          >
            <Text style={styles.barBtnText}>↺ Ambil Ulang</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Gunakan foto ini"
            onPress={handleUsePhoto}
            style={[styles.barBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.barBtnText}>✓ Gunakan Foto</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------
  // 4. Kamera aktif
  // ---------------------------------------------------------------
  return (
    <View style={[styles.cameraScreen, { backgroundColor: "#000" }]}>
      <CameraView
        ref={cameraRef}
        style={styles.fill}
        facing={facing}
        onCameraReady={() => setIsReady(true)}
      />

      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tutup kamera"
          onPress={handleBack}
          style={styles.topBtn}
        >
          <Text style={styles.topBtnText}>← Kembali</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Balik kamera depan dan belakang"
          onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
          style={styles.topBtn}
        >
          <Text style={styles.topBtnText}>🔄 Balik</Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) + 8 },
        ]}
      >
        <Text style={styles.hintText}>
          Arahkan kamera ke sampah dengan pencahayaan cukup
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ambil foto"
          disabled={isCapturing}
          onPress={handleTakePicture}
          style={[
            styles.shutterOuter,
            isCapturing && { opacity: 0.5 },
          ]}
        >
          {isCapturing ? (
            <ActivityIndicator color="#15803d" />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  cameraScreen: { flex: 1 },
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  centerText: { fontSize: 14 },
  permissionCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  permissionIcon: { fontSize: 44 },
  permissionTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  permissionDesc: {
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
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  topBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  topBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(0,0,0,0.35)",
    flexDirection: "column",
  },
  hintText: { color: "#fff", fontSize: 13, textAlign: "center" },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fff",
  },
  barBtn: {
    alignSelf: "stretch",
    minHeight: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  barBtnGhost: { backgroundColor: "rgba(255,255,255,0.18)" },
  barBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

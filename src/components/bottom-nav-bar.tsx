import { router } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface BottomNavBarProps {
  currentTab: "index" | "sensor" | "history";
}

export function BottomNavBar({ currentTab }: BottomNavBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const colors = {
    background: isDark ? "rgba(17, 28, 22, 0.95)" : "rgba(255, 255, 255, 0.95)",
    border: isDark ? "#264532" : "#cde7d5",
    activeText: isDark ? "#4ade80" : "#15803d",
    inactiveText: isDark ? "#94a3b8" : "#64748b",
    activeBg: isDark ? "#143823" : "#dcfce7",
    shadow: isDark ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.08)",
  };

  const navigateTo = (tab: "index" | "sensor" | "history") => {
    if (tab === currentTab) return;
    if (tab === "index") {
      // Menggunakan router.push atau router.replace sesuai Modul 2 Expo Router
      router.replace("/");
    } else if (tab === "sensor") {
      router.push("/sensor");
    } else {
      router.push("/history");
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 12),
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.navInner}>
        {/* Tab 1: Deteksi */}
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Halaman Deteksi Sampah"
          accessibilityState={{ selected: currentTab === "index" }}
          onPress={() => navigateTo("index")}
          style={[
            styles.tabItem,
            currentTab === "index" && [
              styles.activeTabItem,
              { backgroundColor: colors.activeBg },
            ],
          ]}
        >
          <Text style={styles.tabIcon}>📸</Text>
          <Text
            style={[
              styles.tabLabel,
              {
                color:
                  currentTab === "index"
                    ? colors.activeText
                    : colors.inactiveText,
              },
              currentTab === "index" && styles.activeTabLabel,
            ]}
          >
            Deteksi
          </Text>
        </Pressable>

        {/* Tab 2: Sensor (Week 7) */}
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Halaman Sensor Perangkat"
          accessibilityState={{ selected: currentTab === "sensor" }}
          onPress={() => navigateTo("sensor")}
          style={[
            styles.tabItem,
            currentTab === "sensor" && [
              styles.activeTabItem,
              { backgroundColor: colors.activeBg },
            ],
          ]}
        >
          <Text style={styles.tabIcon}>📡</Text>
          <Text
            style={[
              styles.tabLabel,
              {
                color:
                  currentTab === "sensor"
                    ? colors.activeText
                    : colors.inactiveText,
              },
              currentTab === "sensor" && styles.activeTabLabel,
            ]}
          >
            Sensor
          </Text>
        </Pressable>

        {/* Tab 3: Riwayat */}
        <Pressable
          accessibilityRole="tab"
          accessibilityLabel="Halaman Riwayat Sampah"
          accessibilityState={{ selected: currentTab === "history" }}
          onPress={() => navigateTo("history")}
          style={[
            styles.tabItem,
            currentTab === "history" && [
              styles.activeTabItem,
              { backgroundColor: colors.activeBg },
            ],
          ]}
        >
          <Text style={styles.tabIcon}>📋</Text>
          <Text
            style={[
              styles.tabLabel,
              {
                color:
                  currentTab === "history"
                    ? colors.activeText
                    : colors.inactiveText,
              },
              currentTab === "history" && styles.activeTabLabel,
            ]}
          >
            Riwayat
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 16,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
    alignItems: "center",
  },
  navInner: {
    flexDirection: "row",
    width: "100%",
    maxWidth: 500,
    justifyContent: "space-around",
    gap: 6,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 24,
    gap: 4,
    minHeight: 44,
  },
  activeTabItem: {
    borderRadius: 24,
  },
  tabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  activeTabLabel: {
    fontWeight: "800",
  },
});

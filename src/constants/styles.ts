import { StyleSheet } from "react-native";

// EXTERNAL STYLE: style ditulis di file terpisah, lalu di-import ke history.tsx
export const chipStyles = StyleSheet.create({
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
});

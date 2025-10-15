// styles/FriendScreenStyles.js
import { StyleSheet } from "react-native";

export const colors = {
  bg: "#EEFCDC",
  primary: "#3A5A1B",
  border: "#e3ead9",
  borderSoft: "#cfd8c3",
  text: "#1a1a1a",
  subtext: "#555",
  white: "#fff",
};

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
  },

  addRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  emailInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  addButton: {
    backgroundColor: colors.primary,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonDisabled: { opacity: 0.7 },
  addButtonText: { color: colors.white, fontSize: 18, fontWeight: "600" },

  loader: { marginTop: 16 },

  list: { paddingHorizontal: 16, marginTop: 8 },
  itemSeparator: { height: 8 },

  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  itemMain: { flex: 1 },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  itemMeta: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: 2,
  },

  infoText: {
    fontSize: 18,
    color: colors.primary,
  },
  emptyText: {
    color: colors.primary,
    marginTop: 12,
    paddingHorizontal: 16,
  },
});

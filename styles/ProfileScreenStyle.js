import { StyleSheet } from "react-native";

const HEADER_H = 52;

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EEFCDC",
  },


  header: {
    height: HEADER_H,
    backgroundColor: "#3A5A1B",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },

  scrollContent: {
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: "center",
    minHeight: 400,
  },

  card: {
    width: "92%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },

  displayBox: {
    borderRadius: 16,
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },

  btnGray: {
    backgroundColor: "#666",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  btnGrayText: {
    color: "#fff",
    fontWeight: "600",
  },

  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
   btnGreen: {
    marginTop: 10,
    backgroundColor: "#3A5A1B",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    width: "100%",
  },
  btnGreenText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

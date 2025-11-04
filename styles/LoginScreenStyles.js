import { StyleSheet } from "react-native";

const BACKGROUND = "#04162A";
const INPUT_BG = "#1B2A40";
const ACCENT = "#F64F4F";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  safeArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  content: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
    gap: 16,
  },
  logo: {
    width: 96,
    height: 96,
    resizeMode: "contain",
  },
  brandText: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 4,
    color: "#ffffff",
  },
  form: {
    width: "100%",
  },
  inputContainer: {
    width: "100%",
    backgroundColor: INPUT_BG,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  input: {
    height: 50,
    fontSize: 16,
    color: "#F2F5FF",
  },
  btn: {
    width: "100%",
    backgroundColor: ACCENT,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  forgotButton: {
    marginTop: 28,
  },
  forgotText: {
    color: "#E0E8F5",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});

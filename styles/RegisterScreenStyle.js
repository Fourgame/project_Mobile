import { StyleSheet } from "react-native";

const BACKGROUND = "#04162A";
const INPUT_BG = "#1B2A40";
const ACCENT = "#F64F4F";
const ACCENT_SECONDARY = "#F87373";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  safeArea: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 16,
  },
  backButton: {
    alignSelf: "flex-start",
    padding: 8,
    borderRadius: 18,
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    paddingTop: 24,
  },
  header: {
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
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
  title: {
    alignSelf: "flex-start",
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 24,
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
  btnSecondary: {
    backgroundColor: ACCENT_SECONDARY,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  btnTextSecondary: {
    color: "#fff",
  },
});

import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EEFCDC",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#3A5A1B",
    marginBottom: 24,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  btn: {
    width: "100%",
    backgroundColor: "#3A5A1B",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  btnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  backBtn: {
    alignItems: "center",
    marginTop: 8,
  },
  backText: {
    color: "#3A5A1B",
    fontSize: 16,
    fontWeight: "600",
  },
});

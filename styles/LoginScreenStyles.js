import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({

  bg: {
    flex: 1,
    backgroundColor: "#EEFCDC",
    justifyContent: "center",
    alignItems: "center",
    
  },

  box: {
    width: "100%",
    backgroundColor: "white",
    borderTopLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 25,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },

  logo: {
    width: 200,
    aspectRatio: 1,
    marginBottom: 10,
    resizeMode: "contain",
  },

  inputContainer: {
    width: "100%",
    borderColor: "#999",
    borderWidth: 1,
    borderRadius: 20,
    marginVertical: 8,
    backgroundColor: "#fff",
  },

  input: {
    padding: 12,
    fontSize: 20,
    color: "#000",
  },

  btn: {
    width: "100%",
    backgroundColor: "#666",
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },

  btnText: {
    color: "black",
    fontSize: 20,
    fontWeight: "600",
  },

  forgotText: {
    color: "blue",
    marginTop: 10,
    textDecorationLine: "underline",
    alignSelf:"flex-end"
  },
});

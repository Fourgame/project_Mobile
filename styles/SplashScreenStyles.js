import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",    
    height: "100%",   
    resizeMode: "cover", 
  },
  text: {
    color: "#fff",
    fontSize: 50,
    fontWeight: "bold",
    textAlign: "center",
  },
});

import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EEFCDC",
    alignItems: "center",    
    paddingTop: 16,           
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 14,
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },

  backBtn: { padding: 4 },

  headerText: {
    flex: 1,                 
    textAlign: "center",     
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginRight: 30,          
  },

  box: {
    width: "100%",             
    backgroundColor: "white",
    borderTopLeftRadius: 40,
    borderBottomRightRadius: 40,
    padding: 20,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },

  logo: {
    width: 120,
    aspectRatio: 1,
    resizeMode: "contain",
  },

  logoText: {
    fontSize: 30,
    fontWeight: "700",
    color: "black",
  },

  logoLayout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 14,
    alignSelf:'flex-start'
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
    padding: 10,
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
});

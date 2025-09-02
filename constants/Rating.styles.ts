import { Platform, StatusBar, StyleSheet } from "react-native";

export const styles = StyleSheet.create({
safeArea: {
    flex: 1,
    backgroundColor: "#F7FAFC",
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 40,
  },
  qrCode: {
    flex: 1,
  },
});
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome Home</Text>
    </View>
  );
}

// Full-screen styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center", // center vertically
    alignItems: "center",     // center horizontally
    backgroundColor: "#f5f5f5", // light background
  },
  text: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
  },
});

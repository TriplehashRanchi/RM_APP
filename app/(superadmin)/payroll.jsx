import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, View } from "react-native";

export default function SuperadminPayrollPage() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.card}>
        <Text style={styles.title}>Payroll</Text>
        <Text style={styles.subtitle}>Review payroll cycles, payouts, and deductions.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#07090b", padding: 16 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#101214",
    padding: 16,
  },
  title: { color: "#fff", fontSize: 24, fontWeight: "700" },
  subtitle: { color: "#9ca3af", marginTop: 8, fontSize: 13 },
});

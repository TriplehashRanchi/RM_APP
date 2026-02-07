import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function EmployeeDashboard() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>EMPLOYEE PORTAL</Text>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Open profile to check your account and logout from the same screen.</Text>
        <Pressable style={styles.btn} onPress={() => router.push("/(employee)/profile")}>
          <Text style={styles.btnText}>Open My Profile</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#060709", justifyContent: "center", padding: 16 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#0f1318",
    padding: 16,
  },
  eyebrow: { color: "#6ee7b7", fontSize: 10.5, fontWeight: "800", letterSpacing: 1.2 },
  title: { color: "#fff", fontSize: 26, fontWeight: "900", marginTop: 8 },
  subtitle: { color: "#9ca3af", marginTop: 8, fontSize: 13, lineHeight: 19 },
  btn: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: "#34d399",
    paddingVertical: 11,
    alignItems: "center",
  },
  btnText: { color: "#042f2e", fontSize: 13, fontWeight: "900" },
});

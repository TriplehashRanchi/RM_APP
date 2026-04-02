import { useEffect, useState } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/authContext";
import SupportToast from "../../src/features/support/components/SupportToast.jsx";
import SuperadminSupportBoard from "../../src/features/support/superadmin/SuperadminSupportBoard.jsx";

export default function SuperadminSupportPage() {
  const { user } = useAuth();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#06111F" />
      <View style={styles.glow} />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>Support Queue</Text>
        <Text style={styles.title}>Employee Queries</Text>
      </View>

      <View style={styles.content}>
        <SuperadminSupportBoard user={user} onToast={setToast} />
      </View>

      <SupportToast toast={toast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#05101d",
  },
  glow: {
    position: "absolute",
    top: -80,
    left: -10,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(14,165,233,0.16)",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  eyebrow: {
    color: "#7DD3FC",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 6,
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    maxWidth: 300,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
});

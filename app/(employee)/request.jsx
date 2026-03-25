import { CalendarDays, MessageCircleMore } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/authContext";
import SupportToast from "../../src/features/support/components/SupportToast.jsx";
import EmployeeLeaveSection from "../../src/features/support/employee/EmployeeLeaveSection.jsx";
import EmployeeQuerySection from "../../src/features/support/employee/EmployeeQuerySection.jsx";

const LEAVE_MODE = "LEAVE";
const QUERY_MODE = "QUERIES";

export default function EmployeeRequestPage() {
  const { user } = useAuth();
  const employeeId = user?.employee_id || user?.employeeId;
  const [mode, setMode] = useState(QUERY_MODE);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#07111F" />
      <View style={styles.topGlow} />

      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>Employee Desk</Text>
        <Text style={styles.headerTitle}>Requests & Queries</Text>
        <Text style={styles.headerSubtitle}>
          Modular screen now. Leave flow and query flow are separated into components, so each part is easier to update.
        </Text>
      </View>

      <View style={styles.modeSwitch}>
        <Pressable
          onPress={() => setMode(QUERY_MODE)}
          style={[styles.modeChip, mode === QUERY_MODE && styles.modeChipActive]}
        >
          <MessageCircleMore size={16} color={mode === QUERY_MODE ? "#031525" : "#94A3B8"} />
          <Text style={[styles.modeChipText, mode === QUERY_MODE && styles.modeChipTextActive]}>Queries</Text>
        </Pressable>
        <Pressable
          onPress={() => setMode(LEAVE_MODE)}
          style={[styles.modeChip, mode === LEAVE_MODE && styles.modeChipActive]}
        >
          <CalendarDays size={16} color={mode === LEAVE_MODE ? "#031525" : "#94A3B8"} />
          <Text style={[styles.modeChipText, mode === LEAVE_MODE && styles.modeChipTextActive]}>Leave</Text>
        </Pressable>
      </View>

      {mode === QUERY_MODE ? (
        <View style={styles.queryContent}>
          <EmployeeQuerySection user={user} employeeId={employeeId} onToast={setToast} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <EmployeeLeaveSection employeeId={employeeId} onToast={setToast} />
        </ScrollView>
      )}

      <SupportToast toast={toast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#06101d",
  },
  topGlow: {
    position: "absolute",
    top: -80,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(56, 189, 248, 0.16)",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerEyebrow: {
    color: "#7DD3FC",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerTitle: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
  },
  headerSubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    maxWidth: 300,
  },
  modeSwitch: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
  },
  modeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.16)",
    paddingVertical: 13,
    borderRadius: 18,
  },
  modeChipActive: {
    backgroundColor: "#7DD3FC",
    borderColor: "#7DD3FC",
  },
  modeChipText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "700",
  },
  modeChipTextActive: {
    color: "#031525",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 120,
    gap: 16,
  },
  queryContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
});

import {
  AlertTriangle,
  Briefcase,
  CalendarDays,
  CheckCircle,
  Clock,
  Plus,
  X,
  XCircle
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/authContext";
import api from "../../src/utils/api";

const { width } = Dimensions.get("window");

// --- UTILS ---

function formatDate(d) {
  if (!d) return "--";
  try {
    const date = new Date(d);
    return {
      full: date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" }),
      day: date.getDate(),
      month: date.toLocaleDateString("en-IN", { month: "short" }),
    };
  } catch {
    return { full: "--", day: "--", month: "--" };
  }
}

function getStatusTheme(status) {
  const s = String(status || "PENDING").toUpperCase();
  if (s === "APPROVED") {
    return { color: "#34D399", bg: "rgba(52, 211, 153, 0.1)", icon: CheckCircle };
  }
  if (s === "REJECTED") {
    return { color: "#F43F5E", bg: "rgba(244, 63, 94, 0.1)", icon: XCircle };
  }
  return { color: "#FBBF24", bg: "rgba(251, 191, 36, 0.1)", icon: Clock };
}

// --- COMPONENTS ---

const BalanceCard = ({ item }) => {
  const percent = item.total > 0 ? (item.remaining / item.total) * 100 : 0;

  return (
    <View style={styles.balanceCard}>
      <View style={styles.balanceHeader}>
        <Briefcase size={14} color="#94A3B8" />
        <Text style={styles.balanceTitle} numberOfLines={1}>{item.name}</Text>
      </View>

      <View style={styles.balanceBody}>
        <Text style={styles.balanceBigNum}>{item.remaining}</Text>
        <Text style={styles.balanceTotal}>/ {item.total} days</Text>
      </View>

      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
};

const ApplicationItem = ({ item, typeName }) => {
  const theme = getStatusTheme(item.status);
  const Icon = theme.icon;
  const start = formatDate(item.start_date);
  const end = formatDate(item.end_date);

  return (
    <View style={styles.itemRow}>
      {/* Date Box */}
      <View style={styles.dateBox}>
        <Text style={styles.dateDay}>{start.day}</Text>
        <Text style={styles.dateMonth}>{start.month}</Text>
      </View>

      {/* Info */}
      <View style={styles.itemContent}>
        <View style={styles.itemTop}>
          <Text style={styles.itemType}>{typeName}</Text>
          {item.total_days > 1 && (
            <Text style={styles.durationBadge}>{item.total_days} days</Text>
          )}
        </View>
        <Text style={styles.itemDates}>
          {start.full} <Text style={{ color: '#64748B' }}>to</Text> {end.full}
        </Text>
        {item.reason ? (
          <Text style={styles.itemReason} numberOfLines={1}>{item.reason}</Text>
        ) : null}
      </View>

      {/* Status */}
      <View style={[styles.statusBadge, { backgroundColor: theme.bg }]}>
        <Icon size={14} color={theme.color} />
      </View>
    </View>
  );
};

export default function EmployeeRequestPage() {
  const { user } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Form State
  const [form, setForm] = useState({
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const employeeId = user?.employee_id || user?.employeeId;

  // Derived Data
  const leaveTypeById = useMemo(
    () => Object.fromEntries(leaveTypes.map((t) => [String(t.id), t.name])),
    [leaveTypes]
  );

  const balanceData = useMemo(() => balances.map((b) => ({
    id: b.id,
    name: leaveTypeById[String(b.leave_type_id)] || `Type ${b.leave_type_id}`,
    remaining: Number(b.remaining || 0),
    total: Number(b.total_credited || 0),
  })), [balances, leaveTypeById]);

  // Data Fetching
  const loadData = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const [typesRes, appRes, balRes] = await Promise.allSettled([
        api.get("/leave-types"),
        api.get("/leave-applications", { params: { employee_id: employeeId } }),
        api.get("/leave-balances", { params: { employee_id: employeeId, year: new Date().getFullYear() } }),
      ]);

      if (typesRes.status === "fulfilled") setLeaveTypes(typesRes.value.data.data);
      if (appRes.status === "fulfilled") setApplications(appRes.value.data.data);
      if (balRes.status === "fulfilled") setBalances(balRes.value.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // Handlers
  const handleSubmit = async () => {
    if (!form.leave_type_id || !form.start_date || !form.end_date) {
      setToast({ type: "error", msg: "Please fill all required fields" });
      return;
    }
    setSaving(true);
    try {
      await api.post("/leave-applications", {
        employee_id: employeeId,
        leave_type_id: Number(form.leave_type_id),
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason,
      });
      setToast({ type: "success", msg: "Request submitted successfully" });
      setModalOpen(false);
      loadData();
    } catch (e) {
      setToast({ type: "error", msg: e.response?.data?.message || "Failed to submit" });
    } finally {
      setSaving(false);
    }
  };

  // Toast Timer
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1221" />

      {/* Background Decor */}
      <View style={styles.bgBlob} />

      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSubtitle}>Welcome back,</Text>
          <Text style={styles.headerTitle}>{user.name?.split(" ")[0] || "Employee"}</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => {
          setForm({ leave_type_id: "", start_date: "", end_date: "", reason: "" });
          setModalOpen(true);
        }}>
          <Plus size={20} color="#0F172A" />
          <Text style={styles.addBtnText}>New Request</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* --- BALANCES CAROUSEL --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Balance</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.balanceList}>
            {balanceData.length > 0 ? (
              balanceData.map(b => <BalanceCard key={b.id} item={b} />)
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No balance data linked.</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* --- RECENT HISTORY --- */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Request History</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{applications.length}</Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color="#38BDF8" />
          ) : applications.length === 0 ? (
            <View style={styles.emptyState}>
              <CalendarDays size={40} color="#1E293B" />
              <Text style={styles.emptyStateTitle}>No requests yet</Text>
              <Text style={styles.emptyStateSub}>Your leave history will appear here.</Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {[...applications]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map((app, i) => (
                  <ApplicationItem
                    key={i}
                    item={app}
                    typeName={leaveTypeById[app.leave_type_id] || "Leave"}
                  />
                ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* --- MODAL --- */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>New Leave Request</Text>
                <Text style={styles.modalSub}>Fill in the details below</Text>
              </View>
              <Pressable onPress={() => setModalOpen(false)} style={styles.closeBtn}>
                <X size={20} color="#94A3B8" />
              </Pressable>
            </View>

            <ScrollView style={styles.formScroll}>
              {/* Type Selector */}
              <Text style={styles.label}>Leave Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {leaveTypes.map(t => {
                  const active = String(form.leave_type_id) === String(t.id);
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setForm(p => ({ ...p, leave_type_id: String(t.id) }))}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.name}</Text>
                    </Pressable>
                  )
                })}
              </ScrollView>

              {/* Dates */}
              <View style={styles.rowGap}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Start (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2026-02-10"
                    placeholderTextColor="#475569"
                    value={form.start_date}
                    onChangeText={t => setForm(p => ({ ...p, start_date: t }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>End (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2026-02-12"
                    placeholderTextColor="#475569"
                    value={form.end_date}
                    onChangeText={t => setForm(p => ({ ...p, end_date: t }))}
                  />
                </View>
              </View>

              {/* Reason */}
              <Text style={styles.label}>Reason</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Why are you taking leave?"
                placeholderTextColor="#475569"
                multiline
                textAlignVertical="top"
                value={form.reason}
                onChangeText={t => setForm(p => ({ ...p, reason: t }))}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.submitBtn, saving && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#0F172A" /> : <Text style={styles.submitBtnText}>Submit Application</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- TOAST --- */}
      {toast && (
        <View style={[styles.toast, toast.type === 'error' ? styles.toastError : styles.toastSuccess]}>
          {toast.type === 'error' ? <AlertTriangle size={16} color="#FECDD3" /> : <CheckCircle size={16} color="#BBF7D0" />}
          <Text style={styles.toastText}>{toast.msg}</Text>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B1221" },
  bgBlob: {
    position: "absolute",
    top: -100, right: -100,
    width: 300, height: 300,
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    borderRadius: 999,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerSubtitle: { color: "#94A3B8", fontSize: 12, fontWeight: "600" },
  headerTitle: { color: "#F8FAFC", fontSize: 24, fontWeight: "800" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#38BDF8",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 100,
    gap: 6,
    shadowColor: "#38BDF8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: { color: "#0F172A", fontWeight: "700", fontSize: 13 },

  // Content
  scrollContent: { paddingBottom: 100 },
  section: { marginTop: 24, paddingHorizontal: 20 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { color: "#E2E8F0", fontSize: 17, fontWeight: "700" },
  countBadge: { backgroundColor: "#1E293B", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  countText: { color: "#94A3B8", fontSize: 12, fontWeight: "700" },

  // Balance Cards
  balanceList: { paddingRight: 20, gap: 12 },
  balanceCard: {
    width: 150,
    padding: 14,
    backgroundColor: "#162032",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  balanceHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  balanceTitle: { color: "#94A3B8", fontSize: 11, fontWeight: "600", flex: 1 },
  balanceBody: { flexDirection: "row", alignItems: "baseline", gap: 4, marginBottom: 8 },
  balanceBigNum: { color: "#F8FAFC", fontSize: 24, fontWeight: "800" },
  balanceTotal: { color: "#64748B", fontSize: 11 },
  progressBarBg: { height: 4, backgroundColor: "#334155", borderRadius: 4, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#38BDF8", borderRadius: 4 },
  emptyCard: { padding: 20, backgroundColor: "#1E293B", borderRadius: 12 },
  emptyText: { color: "#64748B", fontSize: 12 },

  // List Items
  listContainer: { gap: 10 },
  itemRow: {
    flexDirection: "row",
    backgroundColor: "rgba(30, 41, 59, 0.4)",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
  },
  dateBox: {
    backgroundColor: "#1E293B",
    borderRadius: 10,
    paddingVertical: 8,
    width: 46,
    alignItems: "center",
    marginRight: 12,
  },
  dateDay: { color: "#F8FAFC", fontSize: 16, fontWeight: "700" },
  dateMonth: { color: "#64748B", fontSize: 10, textTransform: "uppercase", fontWeight: "600" },
  itemContent: { flex: 1, gap: 4 },
  itemTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemType: { color: "#E2E8F0", fontSize: 14, fontWeight: "700" },
  durationBadge: { fontSize: 10, color: "#94A3B8", backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  itemDates: { color: "#94A3B8", fontSize: 12 },
  itemReason: { color: "#475569", fontSize: 11, fontStyle: "italic" },
  statusBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginLeft: 8 },

  // Empty State
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40, opacity: 0.6 },
  emptyStateTitle: { color: "#E2E8F0", marginTop: 10, fontWeight: "600" },
  emptyStateSub: { color: "#64748B", fontSize: 12 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#0F172A", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: "70%", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { color: "#F8FAFC", fontSize: 20, fontWeight: "700" },
  modalSub: { color: "#64748B", fontSize: 13 },
  closeBtn: { padding: 6, backgroundColor: "#1E293B", borderRadius: 100 },
  formScroll: { flex: 1 },
  label: { color: "#94A3B8", fontSize: 12, fontWeight: "700", marginBottom: 8, marginTop: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  chipRow: { flexDirection: "row", marginBottom: 8 },
  chip: { marginRight: 10, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1, borderColor: "#334155", backgroundColor: "#1E293B" },
  chipActive: { backgroundColor: "#064E3B", borderColor: "#059669" },
  chipText: { color: "#94A3B8", fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#34D399" },
  rowGap: { flexDirection: "row", gap: 12 },
  input: { backgroundColor: "#1E293B", borderRadius: 12, padding: 12, color: "#F8FAFC", borderWidth: 1, borderColor: "#334155", fontSize: 14 },
  textArea: { minHeight: 80 },
  modalFooter: { flexDirection: "row", gap: 12, marginTop: 20, paddingTop: 12, borderTopWidth: 1, borderColor: "#1E293B" },
  cancelBtn: { flex: 1, padding: 14, alignItems: "center", borderRadius: 14, backgroundColor: "#1E293B" },
  cancelBtnText: { color: "#94A3B8", fontWeight: "700" },
  submitBtn: { flex: 2, padding: 14, alignItems: "center", borderRadius: 14, backgroundColor: "#38BDF8" },
  submitBtnText: { color: "#0F172A", fontWeight: "800" },

  // Toast
  toast: { position: "absolute", bottom: 40, alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 100, borderWidth: 1 },
  toastSuccess: { backgroundColor: "rgba(6, 78, 59, 0.9)", borderColor: "#059669" },
  toastError: { backgroundColor: "rgba(136, 19, 55, 0.9)", borderColor: "#E11D48" },
  toastText: { color: "#FFF", fontSize: 13, fontWeight: "600" },
});
import { Briefcase, CalendarDays, CheckCircle, Clock3, Plus, X, XCircle } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import api from "../../../utils/api.js";
import SupportEmptyCard from "../components/SupportEmptyCard.jsx";
import { formatDate, getLeaveStatusTheme } from "../utils.js";

function LeaveBalanceCard({ item }) {
  const percent = item.total > 0 ? Math.min(100, (item.remaining / item.total) * 100) : 0;

  return (
    <View style={styles.balanceCard}>
      <View style={styles.balanceHeader}>
        <Briefcase size={14} color="#93C5FD" />
        <Text style={styles.balanceTitle} numberOfLines={1}>{item.name}</Text>
      </View>
      <Text style={styles.balanceNumber}>{item.remaining}</Text>
      <Text style={styles.balanceSub}>Available out of {item.total} days</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

function LeaveHistoryCard({ item, typeName }) {
  const theme = getLeaveStatusTheme(item.status);
  const Icon =
    theme.iconName === "approved" ? CheckCircle : theme.iconName === "rejected" ? XCircle : Clock3;

  return (
    <View style={styles.leaveCard}>
      <View style={styles.leaveIconWrap}>
        <CalendarDays size={18} color="#93C5FD" />
      </View>
      <View style={styles.leaveMain}>
        <View style={styles.rowBetween}>
          <Text style={styles.leaveType}>{typeName}</Text>
          <View style={[styles.leaveStatusDot, { backgroundColor: theme.bg }]}>
            <Icon size={14} color={theme.color} />
          </View>
        </View>
        <Text style={styles.leaveDates}>
          {formatDate(item.start_date)} to {formatDate(item.end_date)}
        </Text>
        {!!item.reason && (
          <Text numberOfLines={2} style={styles.leaveReason}>{item.reason}</Text>
        )}
      </View>
    </View>
  );
}

function LeaveModal({ visible, onClose, leaveTypes, form, setForm, saving, onSubmit }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>New Leave Request</Text>
              <Text style={styles.sheetSub}>Fill the details carefully before sending.</Text>
            </View>
            <Pressable onPress={onClose} style={styles.sheetClose}>
              <X size={18} color="#CBD5E1" />
            </Pressable>
          </View>

          <Text style={styles.fieldLabel}>Leave Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {leaveTypes.map((item) => {
              const active = String(form.leave_type_id) === String(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setForm((prev) => ({ ...prev, leave_type_id: String(item.id) }))}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.fieldLabel}>Start Date</Text>
          <TextInput
            value={form.start_date}
            onChangeText={(text) => setForm((prev) => ({ ...prev, start_date: text }))}
            placeholder="2026-03-24"
            placeholderTextColor="#64748B"
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>End Date</Text>
          <TextInput
            value={form.end_date}
            onChangeText={(text) => setForm((prev) => ({ ...prev, end_date: text }))}
            placeholder="2026-03-25"
            placeholderTextColor="#64748B"
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Reason</Text>
          <TextInput
            value={form.reason}
            onChangeText={(text) => setForm((prev) => ({ ...prev, reason: text }))}
            placeholder="Optional note"
            placeholderTextColor="#64748B"
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.textArea]}
          />

          <View style={styles.sheetFooter}>
            <Pressable onPress={onClose} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onSubmit}
              disabled={saving}
              style={[styles.primaryButton, saving && styles.buttonDisabled]}
            >
              {saving ? <ActivityIndicator color="#020617" /> : <Text style={styles.primaryButtonText}>Submit Leave</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function EmployeeLeaveSection({ employeeId, onToast }) {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const leaveTypeById = useMemo(
    () => Object.fromEntries(leaveTypes.map((item) => [String(item.id), item.name])),
    [leaveTypes]
  );

  const balanceData = useMemo(
    () =>
      balances.map((item) => ({
        id: item.id,
        name: leaveTypeById[String(item.leave_type_id)] || `Type ${item.leave_type_id}`,
        remaining: Number(item.remaining || 0),
        total: Number(item.total_credited || 0),
      })),
    [balances, leaveTypeById]
  );

  const loadData = useCallback(async () => {
    if (!employeeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [typesRes, appRes, balRes] = await Promise.allSettled([
        api.get("/leave-types"),
        api.get("/leave-applications", { params: { employee_id: employeeId } }),
        api.get("/leave-balances", {
          params: { employee_id: employeeId, year: new Date().getFullYear() },
        }),
      ]);

      if (typesRes.status === "fulfilled") setLeaveTypes(typesRes.value.data?.data || []);
      if (appRes.status === "fulfilled") setApplications(appRes.value.data?.data || []);
      if (balRes.status === "fulfilled") setBalances(balRes.value.data?.data || []);
    } catch (_error) {
      onToast({ type: "error", msg: "Failed to load leave data." });
    } finally {
      setLoading(false);
    }
  }, [employeeId, onToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openModal = () => {
    setForm({ leave_type_id: "", start_date: "", end_date: "", reason: "" });
    setModalOpen(true);
  };

  const submitLeave = useCallback(async () => {
    if (!employeeId || !form.leave_type_id || !form.start_date || !form.end_date) {
      onToast({ type: "error", msg: "Fill all required leave fields." });
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
      onToast({ type: "success", msg: "Leave request submitted." });
      setModalOpen(false);
      loadData();
    } catch (error) {
      onToast({
        type: "error",
        msg: error?.response?.data?.message || error?.message || "Failed to submit leave request.",
      });
    } finally {
      setSaving(false);
    }
  }, [employeeId, form, loadData, onToast]);

  return (
    <>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topTitle}>Leave Desk</Text>
          <Text style={styles.topSubtitle}>Track balance and raise leave requests from one place.</Text>
        </View>
        <Pressable onPress={openModal} style={styles.topAction}>
          <Plus size={18} color="#020617" />
          <Text style={styles.topActionText}>New Leave</Text>
        </Pressable>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Leave Balance</Text>
        <Text style={styles.sectionSubtitle}>Quick snapshot of your available leaves.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.balanceRow}>
          {balanceData.length ? (
            balanceData.map((item) => <LeaveBalanceCard key={item.id} item={item} />)
          ) : (
            <SupportEmptyCard
              title={loading ? "Loading balance" : "No balance data"}
              subtitle="Balance cards will show here after your profile is linked."
              icon={Briefcase}
            />
          )}
        </ScrollView>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.sectionTitle}>Leave History</Text>
            <Text style={styles.sectionSubtitle}>All your previous leave requests in one list.</Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{applications.length}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} color="#38BDF8" />
        ) : applications.length ? (
          <View style={styles.leaveList}>
            {[...applications]
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .map((item) => (
                <LeaveHistoryCard
                  key={item.id}
                  item={item}
                  typeName={leaveTypeById[String(item.leave_type_id)] || "Leave"}
                />
              ))}
          </View>
        ) : (
          <SupportEmptyCard
            title="No leave requests yet"
            subtitle="Create a leave request from the top button."
            icon={CalendarDays}
          />
        )}
      </View>

      <LeaveModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        leaveTypes={leaveTypes}
        form={form}
        setForm={setForm}
        saving={saving}
        onSubmit={submitLeave}
      />
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  topTitle: {
    color: "#F8FAFC",
    fontSize: 21,
    fontWeight: "900",
  },
  topSubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    maxWidth: 240,
  },
  topAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#67E8F9",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
  },
  topActionText: {
    color: "#020617",
    fontSize: 13,
    fontWeight: "800",
  },
  sectionCard: {
    backgroundColor: "#0b1728",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.14)",
    padding: 16,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  countPill: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#16263d",
    alignItems: "center",
    justifyContent: "center",
  },
  countPillText: {
    color: "#E2E8F0",
    fontWeight: "800",
  },
  balanceRow: {
    paddingTop: 16,
    gap: 12,
  },
  balanceCard: {
    width: 170,
    backgroundColor: "#112037",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(125, 211, 252, 0.14)",
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  balanceTitle: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  balanceNumber: {
    color: "#F8FAFC",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 18,
  },
  balanceSub: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  progressTrack: {
    height: 7,
    backgroundColor: "#20324b",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#38BDF8",
    borderRadius: 999,
  },
  leaveList: {
    gap: 12,
    marginTop: 16,
  },
  leaveCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 22,
    padding: 14,
    backgroundColor: "#101d30",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.1)",
  },
  leaveIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
  },
  leaveMain: {
    flex: 1,
  },
  leaveType: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "800",
    flex: 1,
  },
  leaveStatusDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  leaveDates: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 6,
  },
  leaveReason: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2, 6, 23, 0.72)",
  },
  sheet: {
    backgroundColor: "#0b1728",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
    padding: 20,
    paddingBottom: 28,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  sheetTitle: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
  },
  sheetSub: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
  },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#112037",
  },
  fieldLabel: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  chipRow: {
    gap: 10,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#101d30",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
  },
  filterChipActive: {
    backgroundColor: "rgba(103, 232, 249, 0.16)",
    borderColor: "rgba(103, 232, 249, 0.35)",
  },
  filterChipText: {
    color: "#94A3B8",
    fontWeight: "700",
    fontSize: 12,
  },
  filterChipTextActive: {
    color: "#CFFAFE",
  },
  input: {
    backgroundColor: "#101d30",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
    color: "#F8FAFC",
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 100,
  },
  sheetFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  secondaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101d30",
    borderRadius: 18,
    minHeight: 50,
  },
  secondaryButtonText: {
    color: "#CBD5E1",
    fontWeight: "800",
  },
  primaryButton: {
    flex: 1.4,
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: "#67E8F9",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#020617",
    fontWeight: "900",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Filter,
  Search,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react-native";
import { useAuth } from "../../src/context/authContext";
import api from "../../src/utils/api";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const THEME = {
  bg: "#020617",
  card: "#0f172a",
  cardBorder: "rgba(255,255,255,0.08)",
  primary: "#10b981",
  text: "#f8fafc",
  textMuted: "#94a3b8",
};

function formatDate(value) {
  if (!value) return "--";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "--";
  return dt.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatShortDate(value) {
  if (!value) return "--";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "--";
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function statusStyles(status) {
  const s = String(status || "PENDING").toUpperCase();
  if (s === "APPROVED") {
    return {
      color: "#10b981",
      text: "#a7f3d0",
      bg: "rgba(16,185,129,0.12)",
      border: "rgba(16,185,129,0.35)",
      Icon: Check,
    };
  }
  if (s === "REJECTED") {
    return {
      color: "#ef4444",
      text: "#fecaca",
      bg: "rgba(239,68,68,0.12)",
      border: "rgba(239,68,68,0.35)",
      Icon: X,
    };
  }
  return {
    color: "#f59e0b",
    text: "#fde68a",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.35)",
    Icon: Clock,
  };
}

function StatusBadge({ status }) {
  const tone = statusStyles(status);
  const label = String(status || "PENDING").toUpperCase();

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <tone.Icon size={10} color={tone.color} strokeWidth={3} />
      <Text style={[styles.badgeText, { color: tone.text }]}>{label}</Text>
    </View>
  );
}

function Avatar({ name }) {
  const initial = name ? String(name).charAt(0).toUpperCase() : "U";
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
  );
}

function StatPill({ label, value, dotColor }) {
  return (
    <View style={styles.statPill}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function LeaveCard({ item, onApprove, onReject, working }) {
  const isPending = String(item.status || "").toUpperCase() === "PENDING";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userRow}>
          <Avatar name={item.employeeName} />
          <View style={styles.userMetaWrap}>
            <Text style={styles.userName}>{item.employeeName}</Text>
            <Text style={styles.userRole}>
              {item.employeeCode || "Employee"}
              {item.companyName ? ` • ${item.companyName}` : ""}
            </Text>
          </View>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoBlock}>
          <Text style={styles.label}>LEAVE TYPE</Text>
          <Text style={styles.value}>{item.leaveType}</Text>
        </View>

        <View style={styles.dividerVertical} />

        <View style={styles.infoBlock}>
          <Text style={styles.label}>DURATION</Text>
          <Text style={styles.value}>
            {formatShortDate(item.startDate)} - {formatShortDate(item.endDate)}{" "}
            <Text style={styles.durationDays}>({item.days}d)</Text>
          </Text>
          <Text style={styles.appliedMeta}>Applied: {formatDate(item.appliedAt)}</Text>
        </View>
      </View>

      {isPending ? (
        <View style={styles.actionBar}>
          <Pressable
            style={[styles.actionBtn, styles.rejectBtn, working && styles.btnDisabled]}
            onPress={onReject}
            disabled={working}
          >
            <X size={17} color="#fca5a5" />
            <Text style={styles.rejectText}>Reject</Text>
          </Pressable>

          <Pressable
            style={[styles.actionBtn, styles.approveBtn, working && styles.btnDisabled]}
            onPress={onApprove}
            disabled={working}
          >
            <Check size={17} color="#064e3b" />
            <Text style={styles.approveText}>Approve Request</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export default function LeaveAdminScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [companies, setCompanies] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [employeeLookup, setEmployeeLookup] = useState({});

  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState(null);
  const [toast, setToast] = useState(null);

  const [filters, setFilters] = useState({
    status: "PENDING",
    companyId: "ALL",
    year: String(new Date().getFullYear()),
    query: "",
  });

  const leaveTypeLookup = useMemo(
    () => Object.fromEntries(leaveTypes.map((t) => [t.id, t.name])),
    [leaveTypes]
  );

  const fetchLeaveTypes = useCallback(async () => {
    try {
      const res = await api.get("/leave-types");
      setLeaveTypes(res.data?.data || []);
    } catch {
      setLeaveTypes([]);
    }
  }, []);

  const fetchEmployeesLookup = useCallback(async () => {
    try {
      const companiesRes = await api.get("/companies");
      const companiesData = companiesRes.data?.data || [];
      setCompanies(companiesData);

      if (!companiesData.length) {
        setEmployeeLookup({});
        return;
      }

      const employeesByCompany = await Promise.all(
        companiesData.map((company) =>
          api
            .get("/employees", { params: { company_id: company.id } })
            .then((res) => ({ company, employees: res.data?.data || [] }))
            .catch(() => ({ company, employees: [] }))
        )
      );

      const lookup = {};
      employeesByCompany.forEach(({ company, employees }) => {
        employees.forEach((emp) => {
          lookup[emp.id] = {
            name:
              `${emp.first_name || ""} ${emp.last_name || ""}`.trim() ||
              emp.emp_id ||
              `Employee #${emp.id}`,
            emp_id: emp.emp_id || "",
            company_id: String(company.id),
            company_name: emp.company_name || company.company_name || "",
          };
        });
      });

      setEmployeeLookup(lookup);
    } catch {
      setCompanies([]);
      setEmployeeLookup({});
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setToast(null);
    try {
      const res = await api.get("/leave-applications", {
        params: {
          year: filters.year || undefined,
        },
      });
      setApplications(res.data?.data || []);
    } catch (e) {
      setToast({
        type: "error",
        text:
          e?.response?.data?.message ||
          e?.message ||
          "Failed to fetch leave applications",
      });
    } finally {
      setLoading(false);
    }
  }, [filters.year]);

  useEffect(() => {
    if (!user) return;
    fetchLeaveTypes();
    fetchEmployeesLookup();
  }, [user, fetchLeaveTypes, fetchEmployeesLookup]);

  useEffect(() => {
    if (!user) return;
    fetchApplications();
  }, [user, fetchApplications]);

  const handleDecision = useCallback(async (id, decision) => {
    setWorkingId(id);
    try {
      await api.patch(`/leave-applications/${id}/status`, { status: decision });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: decision } : a))
      );
      setToast({
        type: "success",
        text: `Leave request ${decision.toLowerCase()}.`,
      });
    } catch (e) {
      setToast({
        type: "error",
        text:
          e?.response?.data?.message ||
          e?.message ||
          "Failed to update leave status",
      });
    } finally {
      setWorkingId(null);
    }
  }, []);

  const transformedApps = useMemo(
    () =>
      applications.map((a) => ({
        id: a.id,
        status: String(a.status || "PENDING").toUpperCase(),
        employeeName:
          employeeLookup[a.employee_id]?.name || `Employee #${a.employee_id}`,
        employeeCode: employeeLookup[a.employee_id]?.emp_id || "",
        companyId: employeeLookup[a.employee_id]?.company_id || "UNKNOWN",
        companyName: employeeLookup[a.employee_id]?.company_name || "",
        leaveType: leaveTypeLookup[a.leave_type_id] || `Type #${a.leave_type_id}`,
        startDate: a.start_date,
        endDate: a.end_date,
        appliedAt: a.applied_at,
        days: Number(a.total_days || 0),
      })),
    [applications, employeeLookup, leaveTypeLookup]
  );

  const companyScopedApps = useMemo(() => {
    if (filters.companyId === "ALL") return transformedApps;
    return transformedApps.filter(
      (item) => String(item.companyId) === String(filters.companyId)
    );
  }, [transformedApps, filters.companyId]);

  const filteredData = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return companyScopedApps.filter((item) => {
      const matchesStatus =
        filters.status === "ALL" ||
        String(item.status || "").toUpperCase() === String(filters.status || "");
      const hay = [
        item.employeeName,
        item.employeeCode,
        item.companyName,
        item.leaveType,
        item.status,
        item.startDate,
        item.endDate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !q || hay.includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [companyScopedApps, filters.status, filters.query]);

  const stats = useMemo(() => {
    const pending = companyScopedApps.filter((a) => a.status === "PENDING").length;
    const approved = companyScopedApps.filter((a) => a.status === "APPROVED").length;
    const rejected = companyScopedApps.filter((a) => a.status === "REJECTED").length;
    return { pending, approved, rejected };
  }, [companyScopedApps]);

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bg} />

      <View style={styles.ambientLight} />

      <View style={styles.header}>
        <Pressable
          onPress={() => router.push("/(superadmin)/dashboard")}
          style={styles.iconBtn}
        >
          <ArrowLeft color="#fff" size={20} />
        </Pressable>
        <Text style={styles.headerTitle}>Leave Requests</Text>
        <View style={styles.iconBtnGhost}>
          <Filter color="#cbd5e1" size={16} />
        </View>
      </View>

      <View style={styles.widgetContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.widgetRow}
        >
          <StatPill label="Pending" value={stats.pending} dotColor="#f59e0b" />
          <StatPill label="Approved" value={stats.approved} dotColor="#10b981" />
          <StatPill label="Rejected" value={stats.rejected} dotColor="#ef4444" />
        </ScrollView>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={16} color={THEME.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employee, leave type, company..."
            placeholderTextColor={THEME.textMuted}
            value={filters.query}
            onChangeText={(v) => setFilters((p) => ({ ...p, query: v }))}
          />
        </View>
        <View style={styles.filterBtn}>
          <SlidersHorizontal size={18} color={THEME.textMuted} />
        </View>
      </View>

      <View style={styles.filterRow}>
        <View style={styles.tabsContainer}>
          {["PENDING", "APPROVED", "REJECTED", "ALL"].map((tab) => {
            const isActive = filters.status === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setFilters((p) => ({ ...p, status: tab }));
                }}
                style={[styles.tab, isActive && styles.tabActive]}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.charAt(0) + tab.slice(1).toLowerCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.yearBox}>
          <Calendar size={13} color="#94a3b8" />
          <TextInput
            value={String(filters.year)}
            onChangeText={(v) =>
              setFilters((p) => ({
                ...p,
                year: v.replace(/\D/g, "").slice(0, 4),
              }))
            }
            keyboardType="number-pad"
            style={styles.yearInput}
            placeholder="2026"
            placeholderTextColor="#64748b"
          />
        </View>
      </View>

      <View style={styles.companyStripWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.companyStrip}
        >
          <Pressable
            onPress={() => setFilters((p) => ({ ...p, companyId: "ALL" }))}
            style={[
              styles.companyChip,
              filters.companyId === "ALL" && styles.companyChipActive,
            ]}
          >
            <Text
              style={[
                styles.companyChipText,
                filters.companyId === "ALL" && styles.companyChipTextActive,
              ]}
            >
              All Companies
            </Text>
          </Pressable>

          {companies.map((company) => {
            const active = String(filters.companyId) === String(company.id);
            return (
              <Pressable
                key={String(company.id)}
                onPress={() =>
                  setFilters((p) => ({ ...p, companyId: String(company.id) }))
                }
                style={[styles.companyChip, active && styles.companyChipActive]}
              >
                <Text style={[styles.companyChipText, active && styles.companyChipTextActive]}>
                  {company.company_name || `Company #${company.id}`}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {!!toast ? (
        <View
          style={[
            styles.toast,
            toast.type === "error" ? styles.toastError : styles.toastSuccess,
          ]}
        >
          <Text style={styles.toastText}>{toast.text}</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchApplications}
            tintColor={THEME.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={THEME.primary} />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : filteredData.length === 0 ? (
          <View style={styles.emptyState}>
            <User size={42} color="#334155" />
            <Text style={styles.emptyTitle}>No requests found</Text>
            <Text style={styles.emptyText}>Try changing company, status, or search.</Text>
          </View>
        ) : (
          filteredData.map((item) => (
            <LeaveCard
              key={String(item.id)}
              item={item}
              working={workingId === item.id}
              onApprove={() => handleDecision(item.id, "APPROVED")}
              onReject={() => handleDecision(item.id, "REJECTED")}
            />
          ))
        )}

        <View style={{ height: 44 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  ambientLight: {
    position: "absolute",
    top: -110,
    right: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#1e3a8a",
    opacity: 0.15,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  iconBtnGhost: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },

  widgetContainer: {
    marginTop: 8,
    marginBottom: 10,
  },
  widgetRow: {
    paddingHorizontal: 20,
    gap: 12,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    backgroundColor: "#1e293b",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  statLabel: {
    color: THEME.textMuted,
    fontSize: 12,
    marginRight: 8,
    fontWeight: "600",
  },
  statValue: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  searchSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 14,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    height: 46,
    backgroundColor: THEME.card,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: "#fff",
    fontSize: 14,
  },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    justifyContent: "center",
    alignItems: "center",
  },

  filterRow: {
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 10,
  },
  tabsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  tabActive: {
    backgroundColor: "rgba(255,255,255,0.11)",
  },
  tabText: {
    color: THEME.textMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#fff",
  },
  yearBox: {
    width: 110,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 6,
  },
  yearInput: {
    flex: 1,
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    paddingVertical: 0,
  },

  companyStripWrap: {
    marginBottom: 12,
  },
  companyStrip: {
    paddingHorizontal: 20,
    gap: 8,
  },
  companyChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.28)",
    backgroundColor: "rgba(15,23,42,0.62)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  companyChipActive: {
    borderColor: "rgba(59,130,246,0.42)",
    backgroundColor: "rgba(59,130,246,0.16)",
  },
  companyChipText: {
    color: "#cbd5e1",
    fontSize: 11.5,
    fontWeight: "700",
  },
  companyChipTextActive: {
    color: "#dbeafe",
  },

  toast: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  toastSuccess: {
    borderColor: "rgba(16,185,129,0.35)",
    backgroundColor: "rgba(16,185,129,0.13)",
  },
  toastError: {
    borderColor: "rgba(244,63,94,0.35)",
    backgroundColor: "rgba(244,63,94,0.13)",
  },
  toastText: {
    color: "#f8fafc",
    fontSize: 12.5,
    fontWeight: "700",
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  loadingWrap: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 30,
  },
  loadingText: {
    color: THEME.textMuted,
    fontSize: 12.5,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 80,
    opacity: 0.6,
  },
  emptyTitle: {
    color: "#cbd5e1",
    marginTop: 10,
    fontSize: 14,
    fontWeight: "700",
  },
  emptyText: {
    color: THEME.textMuted,
    marginTop: 6,
    fontSize: 13,
  },

  card: {
    backgroundColor: "rgba(30, 41, 59, 0.4)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 18,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 8,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userMetaWrap: {
    marginLeft: 12,
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(59, 130, 246, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
  },
  avatarText: {
    color: "#60a5fa",
    fontWeight: "800",
    fontSize: 18,
  },
  userName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  userRole: {
    color: THEME.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  cardBody: {
    flexDirection: "row",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
  },
  dividerVertical: {
    width: 1,
    height: "80%",
    backgroundColor: "rgba(255,255,255,0.1)",
    marginHorizontal: 16,
  },
  infoBlock: {
    flex: 1,
  },
  label: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  value: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "600",
  },
  durationDays: {
    color: THEME.textMuted,
    fontSize: 12,
  },
  appliedMeta: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 11,
    fontWeight: "600",
  },

  actionBar: {
    flexDirection: "row",
    marginTop: 16,
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
  },
  rejectBtn: {
    backgroundColor: "transparent",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  rejectText: {
    color: "#fca5a5",
    fontWeight: "700",
    fontSize: 13,
  },
  approveBtn: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  approveText: {
    color: "#064e3b",
    fontWeight: "700",
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});

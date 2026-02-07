import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  CalendarCheck,
  FileText,
  ShieldCheck,
  User,
  Wallet,
  Briefcase,
  Mail,
  Phone,
  ChevronRight,
} from "lucide-react-native";
import { useAuth } from "../../../src/context/authContext";
import api from "../../../src/utils/api";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const THEME = {
  bg: "#020617",
  card: "#0f172a",
  cardBorder: "rgba(255,255,255,0.08)",
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  text: "#f8fafc",
  textMuted: "#64748b",
};

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function formatDate(dateString) {
  if (!dateString) return "--";
  const dt = new Date(dateString);
  if (Number.isNaN(dt.getTime())) return "--";
  return dt.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function weekoffLabel(day) {
  const map = {
    SUN: "Sunday",
    MON: "Monday",
    TUE: "Tuesday",
    WED: "Wednesday",
    THU: "Thursday",
    FRI: "Friday",
    SAT: "Saturday",
  };
  return map[String(day || "").toUpperCase()] || day || "--";
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function buildEmployeePayload(data) {
  return {
    first_name: data.first_name,
    last_name: data.last_name,
    personal_email: data.personal_email,
    work_email: data.work_email,
    phone: data.phone,
    gender: data.gender,
    dob: data.dob,
    blood_group: data.blood_group,
    marital_status: data.marital_status,
    current_address: data.current_address,
    permanent_address: data.permanent_address,
    emergency_contact_name: data.emergency_contact_name,
    emergency_contact_phone: data.emergency_contact_phone,
    designation: data.designation,
    department: data.department,
    joining_date: data.joining_date,
    weekoff_day: data.weekoff_day,
    status: data.status,
    employment_type: data.employment_type,
    probation_end_date: data.probation_end_date,
    reporting_manager_id: data.reporting_manager_id || null,
    pan_number: data.pan_number,
    aadhaar_number: data.aadhaar_number,
    uan_number: data.uan_number,
    esi_number: data.esi_number,
    bank_name: data.bank_name,
    branch_name: data.branch_name,
    account_holder_name: data.account_holder_name,
    account_number: data.account_number,
    ifsc_code: data.ifsc_code,
    monthly_gross: toNumber(data.monthly_gross),
    basic_salary: toNumber(data.basic_salary),
    hra: toNumber(data.hra),
    other_allowances: toNumber(data.other_allowances),
    pf_contribution: toNumber(data.pf_contribution),
    esi_contribution: toNumber(data.esi_contribution),
    professional_tax: toNumber(data.professional_tax),
  };
}

function SectionCard({ title, icon: Icon, color, children }) {
  return (
    <View style={styles.sectionCard}>
      <View style={[styles.sectionHeader, { borderBottomColor: `${color}22` }]}>
        <View style={[styles.iconBox, { backgroundColor: `${color}18` }]}>
          <Icon size={16} color={color} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function DetailRow({ label, value, isLast = false }) {
  return (
    <View style={[styles.detailRow, !isLast && styles.detailBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || "--"}</Text>
    </View>
  );
}

function LeaveBar({ type, used, total }) {
  const safeTotal = Number(total || 0);
  const safeUsed = Number(used || 0);
  const percentage = safeTotal > 0 ? Math.min((safeUsed / safeTotal) * 100, 100) : 0;
  const remaining = Math.max(safeTotal - safeUsed, 0);

  return (
    <View style={styles.leaveItem}>
      <View style={styles.leaveHeader}>
        <Text style={styles.leaveType}>{type}</Text>
        <Text style={styles.leaveStats}>{remaining} left of {safeTotal}</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              backgroundColor: remaining < 2 ? THEME.danger : THEME.success,
            },
          ]}
        />
      </View>
    </View>
  );
}

function DocumentRow({ doc }) {
  return (
    <Pressable
      style={styles.docRow}
      onPress={() => {
        if (doc?.doc_url) Linking.openURL(doc.doc_url);
      }}
    >
      <View style={styles.docIcon}>
        <FileText size={18} color={THEME.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.docName}>{doc?.doc_name || "Document"}</Text>
        <Text style={styles.docDate}>{formatDate(doc?.uploaded_at)}</Text>
      </View>
      <ChevronRight size={16} color={THEME.textMuted} />
    </Pressable>
  );
}

export default function EmployeeDetailPage() {
  const { user } = useAuth();
  const { id, returnTo } = useLocalSearchParams();
  const backTo = Array.isArray(returnTo) ? returnTo[0] : returnTo;

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [docs, setDocs] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  const [docsLoading, setDocsLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);

  const [portalLoading, setPortalLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setToast(null);

    try {
      const year = new Date().getFullYear();
      const [empRes, docRes, leaveTypeRes, leaveBalanceRes] = await Promise.all([
        api.get(`/employees/${id}`),
        api.get(`/employees/${id}/documents`).catch(() => ({ data: { data: [] } })),
        api.get("/leave-types").catch(() => ({ data: { data: [] } })),
        api
          .get("/leave-balances", { params: { employee_id: id, year } })
          .catch(() => ({ data: { data: [] } })),
      ]);

      setEmployee(empRes.data?.data || null);
      setDocs(docRes.data?.data || []);
      setLeaveTypes(leaveTypeRes.data?.data || []);
      setLeaveBalances(leaveBalanceRes.data?.data || []);
    } catch (e) {
      setToast({
        type: "error",
        text: e?.response?.data?.message || e?.message || "Failed to load employee data.",
      });
    } finally {
      setLoading(false);
      setDocsLoading(false);
      setLeaveLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, fetchData]);

  const leaveTypeById = useMemo(
    () => Object.fromEntries(leaveTypes.map((t) => [t.id, t.name])),
    [leaveTypes]
  );

  const toggleStatus = useCallback(async () => {
    if (!employee || !id) return;
    setPortalLoading(true);
    try {
      const newStatus = String(employee.status || "").toUpperCase() === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const payload = buildEmployeePayload({ ...employee, status: newStatus });
      await api.put(`/employees/${id}`, payload);
      setEmployee((prev) => (prev ? { ...prev, status: newStatus } : prev));
      setToast({
        type: "success",
        text: newStatus === "ACTIVE" ? "Portal access enabled." : "Portal access disabled.",
      });
    } catch (e) {
      setToast({
        type: "error",
        text: e?.response?.data?.message || e?.message || "Failed to update status.",
      });
    } finally {
      setPortalLoading(false);
    }
  }, [employee, id]);

  const handleBack = useCallback(() => {
    if (backTo) {
      router.replace(backTo);
      return;
    }
    router.back();
  }, [backTo]);

  if (!user) return null;

  if (loading || !employee) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={THEME.primary} size="large" />
      </View>
    );
  }

  const initials = `${employee.first_name?.[0] || ""}${employee.last_name?.[0] || ""}`.toUpperCase() || "U";
  const isActive = String(employee.status || "").toUpperCase() === "ACTIVE";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bg} />
      <View style={styles.glowTop} />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={handleBack}>
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Employee Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={THEME.primary} />}
      >
        {!!toast ? (
          <View style={[styles.toast, toast.type === "error" ? styles.toastError : styles.toastSuccess]}>
            <Text style={styles.toastText}>{toast.text}</Text>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName}>{employee.first_name} {employee.last_name}</Text>
              <Text style={styles.heroRole}>{employee.designation || "No Designation"}</Text>
              <View style={styles.idBadge}>
                <Text style={styles.idText}>ID: {employee.emp_id || employee.id}</Text>
              </View>
            </View>
            <Pressable
              style={[styles.statusToggle, isActive ? styles.statusActive : styles.statusInactive, portalLoading && styles.disabled]}
              onPress={toggleStatus}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.statusText}>{isActive ? "ACTIVE" : "INACTIVE"}</Text>
              )}
            </Pressable>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.quickInfoRow}>
            <View style={styles.quickInfoItem}>
              <Mail size={12} color="#94a3b8" />
              <Text style={styles.quickInfoText}>{employee.work_email || employee.personal_email || "--"}</Text>
            </View>
            <View style={styles.quickInfoItem}>
              <Phone size={12} color="#94a3b8" />
              <Text style={styles.quickInfoText}>{employee.phone || "--"}</Text>
            </View>
          </View>

          <View style={styles.heroGrid}>
            <View>
              <Text style={styles.heroLabel}>Department</Text>
              <Text style={styles.heroValue}>{employee.department || "--"}</Text>
            </View>
            <View>
              <Text style={styles.heroLabel}>Joined On</Text>
              <Text style={styles.heroValue}>{formatDate(employee.joining_date)}</Text>
            </View>
            <View>
              <Text style={styles.heroLabel}>Employment</Text>
              <Text style={styles.heroValue}>{employee.employment_type || "--"}</Text>
            </View>
            <View>
              <Text style={styles.heroLabel}>Week Off</Text>
              <Text style={styles.heroValue}>{weekoffLabel(employee.weekoff_day)}</Text>
            </View>
          </View>
        </View>

        <SectionCard title="Personal Information" icon={User} color="#60A5FA">
          <DetailRow label="Personal Email" value={employee.personal_email} />
          <DetailRow label="Work Email" value={employee.work_email} />
          <DetailRow label="Phone" value={employee.phone} />
          <DetailRow label="Date of Birth" value={formatDate(employee.dob)} />
          <DetailRow label="Gender" value={employee.gender} />
          <DetailRow label="Blood Group" value={employee.blood_group} />
          <DetailRow label="Marital Status" value={employee.marital_status} />
          <DetailRow label="Current Address" value={employee.current_address} />
          <DetailRow label="Permanent Address" value={employee.permanent_address} isLast />
        </SectionCard>

        <SectionCard title="Work & Compliance" icon={Briefcase} color="#F59E0B">
          <DetailRow label="Designation" value={employee.designation} />
          <DetailRow label="Department" value={employee.department} />
          <DetailRow label="Joining Date" value={formatDate(employee.joining_date)} />
          <DetailRow label="Employment Type" value={employee.employment_type} />
          <DetailRow label="Status" value={employee.status} />
          <DetailRow label="Reporting Manager ID" value={employee.reporting_manager_id} />
          <DetailRow label="Probation End Date" value={formatDate(employee.probation_end_date)} />
          <DetailRow label="PAN Number" value={employee.pan_number} />
          <DetailRow label="Aadhaar Number" value={employee.aadhaar_number} />
          <DetailRow label="UAN Number" value={employee.uan_number} />
          <DetailRow label="ESI Number" value={employee.esi_number} />
          <DetailRow label="Emergency Contact Name" value={employee.emergency_contact_name} />
          <DetailRow label="Emergency Contact Phone" value={employee.emergency_contact_phone} isLast />
        </SectionCard>

        <SectionCard title="Compensation & Bank" icon={Wallet} color="#34D399">
          <DetailRow label="Monthly Gross" value={formatCurrency(employee.monthly_gross)} />
          <DetailRow label="Basic Salary" value={formatCurrency(employee.basic_salary)} />
          <DetailRow label="HRA" value={formatCurrency(employee.hra)} />
          <DetailRow label="Other Allowances" value={formatCurrency(employee.other_allowances)} />
          <DetailRow label="PF Contribution" value={formatCurrency(employee.pf_contribution)} />
          <DetailRow label="ESI Contribution" value={formatCurrency(employee.esi_contribution)} />
          <DetailRow label="Professional Tax" value={formatCurrency(employee.professional_tax)} />
          <DetailRow label="Bank Name" value={employee.bank_name} />
          <DetailRow label="Branch" value={employee.branch_name} />
          <DetailRow label="Account Holder" value={employee.account_holder_name} />
          <DetailRow label="Account Number" value={employee.account_number} />
          <DetailRow label="IFSC" value={employee.ifsc_code} isLast />
        </SectionCard>

        <SectionCard title="Leave Balances" icon={CalendarCheck} color="#F59E0B">
          {leaveLoading ? (
            <ActivityIndicator color={THEME.primary} />
          ) : leaveBalances.length === 0 ? (
            <Text style={styles.emptyText}>No leave balances available yet.</Text>
          ) : (
            leaveBalances.map((balance) => {
              const total = Number(balance.total_credited || 0);
              const used = Number(balance.used || 0);
              const type = leaveTypeById[balance.leave_type_id] || `Type #${balance.leave_type_id}`;
              return (
                <LeaveBar
                  key={String(balance.id)}
                  type={type}
                  total={total}
                  used={used}
                />
              );
            })
          )}
        </SectionCard>

        <SectionCard title="Documents" icon={FileText} color="#A78BFA">
          {docsLoading ? (
            <ActivityIndicator color={THEME.primary} />
          ) : docs.length === 0 ? (
            <Text style={styles.emptyText}>No documents uploaded.</Text>
          ) : (
            docs.map((doc) => <DocumentRow key={String(doc.id)} doc={doc} />)
          )}
        </SectionCard>

        <SectionCard title="Portal Access" icon={ShieldCheck} color="#EF4444">
          <Pressable
            style={[styles.portalBtn, isActive ? styles.portalBtnDanger : styles.portalBtnSuccess, portalLoading && styles.disabled]}
            onPress={toggleStatus}
            disabled={portalLoading}
          >
            <Text style={styles.portalBtnText}>
              {portalLoading ? "Updating..." : isActive ? "Disable Access" : "Enable Access"}
            </Text>
          </Pressable>
        </SectionCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  glowTop: {
    position: "absolute",
    top: -100,
    left: "20%",
    width: 250,
    height: 250,
    backgroundColor: THEME.primary,
    opacity: 0.08,
    borderRadius: 125,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.card,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },

  toast: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  toastSuccess: {
    borderColor: "rgba(16,185,129,0.35)",
    backgroundColor: "rgba(16,185,129,0.14)",
  },
  toastError: {
    borderColor: "rgba(239,68,68,0.35)",
    backgroundColor: "rgba(239,68,68,0.14)",
  },
  toastText: {
    color: "#f8fafc",
    fontSize: 12.5,
    fontWeight: "700",
  },

  heroCard: {
    backgroundColor: "#1e293b",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(59,130,246,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.3)",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#93C5FD",
  },
  heroName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  heroRole: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 4,
  },
  idBadge: {
    backgroundColor: "rgba(255,255,255,0.05)",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  idText: {
    fontSize: 10,
    color: "#cbd5e1",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  statusToggle: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 82,
    alignItems: "center",
  },
  statusActive: {
    backgroundColor: "rgba(16,185,129,0.15)",
    borderColor: "rgba(16,185,129,0.3)",
  },
  statusInactive: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderColor: "rgba(239,68,68,0.3)",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
  },
  heroDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 14,
  },
  quickInfoRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  quickInfoItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    backgroundColor: "rgba(15,23,42,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  quickInfoText: {
    flex: 1,
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "600",
  },
  heroGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  heroLabel: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 4,
  },
  heroValue: {
    fontSize: 13,
    color: "#e2e8f0",
    fontWeight: "600",
  },

  sectionCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginBottom: 16,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  sectionContent: {
    padding: 16,
    gap: 12,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 10,
  },
  detailBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    marginBottom: 10,
  },
  detailLabel: {
    color: THEME.textMuted,
    fontSize: 13,
  },
  detailValue: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "right",
    flex: 1,
    marginLeft: 20,
  },

  leaveItem: {
    marginBottom: 10,
  },
  leaveHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  leaveType: {
    fontSize: 13,
    color: "#e2e8f0",
    fontWeight: "600",
  },
  leaveStats: {
    fontSize: 11,
    color: THEME.textMuted,
  },
  track: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },

  docRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.02)",
    padding: 10,
    borderRadius: 12,
    gap: 12,
    marginBottom: 8,
  },
  docIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(59,130,246,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  docName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  docDate: {
    color: THEME.textMuted,
    fontSize: 11,
  },

  emptyText: {
    color: THEME.textMuted,
    textAlign: "center",
    fontStyle: "italic",
  },

  portalBtn: {
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  portalBtnDanger: {
    borderColor: "rgba(239,68,68,0.35)",
    backgroundColor: "rgba(239,68,68,0.14)",
  },
  portalBtnSuccess: {
    borderColor: "rgba(16,185,129,0.35)",
    backgroundColor: "rgba(16,185,129,0.14)",
  },
  portalBtnText: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "800",
  },

  disabled: {
    opacity: 0.6,
  },
});

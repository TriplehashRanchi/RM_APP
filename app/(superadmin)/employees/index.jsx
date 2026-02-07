import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { Building2, Search, Users, UserCheck, UserX, Shield } from "lucide-react-native";
import { useAuth } from "../../../src/context/authContext";
import api from "../../../src/utils/api";

const ACTIVE_COMPANY_KEY = "active_company_id";

async function getStoredActiveCompanyId() {
  if (Platform.OS === "web") return localStorage.getItem(ACTIVE_COMPANY_KEY);
  return SecureStore.getItemAsync(ACTIVE_COMPANY_KEY);
}

async function setStoredActiveCompanyId(id) {
  if (Platform.OS === "web") {
    localStorage.setItem(ACTIVE_COMPANY_KEY, String(id));
    return;
  }
  await SecureStore.setItemAsync(ACTIVE_COMPANY_KEY, String(id));
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function MetricCard({ icon, label, value, tone }) {
  return (
    <View style={[styles.metricCard, tone === "good" ? styles.metricCardGood : tone === "bad" ? styles.metricCardBad : null]}>
      <View style={styles.metricTop}>
        {icon}
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function EmployeeRow({ employee, busy, onOpen, onTogglePortal }) {
  const active = String(employee.status || "").toUpperCase() === "ACTIVE";
  return (
    <View style={styles.rowCard}>
      <View style={styles.rowHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName}>{[employee.first_name, employee.last_name].filter(Boolean).join(" ") || "Unnamed Employee"}</Text>
          <Text style={styles.rowMeta}>{employee.designation || "No designation"} • {employee.department || "No department"}</Text>
        </View>
        <View style={[styles.statusPill, active ? styles.statusActive : styles.statusInactive]}>
          <Text style={styles.statusText}>{active ? "ACTIVE" : "INACTIVE"}</Text>
        </View>
      </View>

      <View style={styles.rowSubgrid}>
        <Text style={styles.rowSubText}>ID: {employee.emp_id || employee.id}</Text>
        <Text style={styles.rowSubText}>{employee.work_email || employee.personal_email || "No email"}</Text>
      </View>

      <View style={styles.rowActions}>
        <Pressable style={styles.ghostBtn} onPress={onOpen}>
          <Text style={styles.ghostBtnText}>View Profile</Text>
        </Pressable>
        <Pressable style={[styles.portalBtn, active ? styles.portalBtnOff : styles.portalBtnOn, busy && styles.btnDisabled]} onPress={onTogglePortal} disabled={busy}>
          <Shield size={14} color={active ? "#fecaca" : "#bbf7d0"} />
          <Text style={[styles.portalBtnText, active ? { color: "#fecaca" } : { color: "#bbf7d0" }]}>
            {busy ? "Updating..." : active ? "Disable Access" : "Enable Access"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function EmployeesIndexPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [employeesRaw, setEmployeesRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [portalUpdatingId, setPortalUpdatingId] = useState(null);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState(null);

  const fetchCompanies = useCallback(async () => {
    setToast(null);
    try {
      const res = await api.get("/companies");
      const list = res.data?.data || [];
      setCompanies(list);

      const saved = await getStoredActiveCompanyId();
      const validSaved = saved && list.some((c) => String(c.id) === String(saved)) ? saved : null;
      const initialId = validSaved || (list[0]?.id ? String(list[0].id) : null);

      setSelectedCompanyId(initialId);
      if (initialId) await setStoredActiveCompanyId(initialId);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to fetch companies";
      setToast({ type: "error", text: msg });
    }
  }, []);

  const fetchEmployees = useCallback(async (companyId) => {
    if (!companyId) return;
    setLoading(true);
    setToast(null);

    try {
      const res = await api.get("/employees", { params: { company_id: companyId } });
      setEmployeesRaw(res.data?.data || []);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to fetch employees";
      setToast({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchCompanies();
  }, [fetchCompanies, user]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    setStoredActiveCompanyId(selectedCompanyId);
    fetchEmployees(selectedCompanyId);
  }, [fetchEmployees, selectedCompanyId]);

  const employees = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employeesRaw;

    return employeesRaw.filter((e) => {
      const hay = [e.emp_id, e.first_name, e.last_name, e.designation, e.department, e.company_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [employeesRaw, query]);

  const stats = useMemo(() => {
    const total = employeesRaw.length;
    const active = employeesRaw.filter((e) => String(e.status || "").toUpperCase() === "ACTIVE").length;
    const inactive = employeesRaw.filter((e) => String(e.status || "").toUpperCase() === "INACTIVE").length;
    return { total, active, inactive };
  }, [employeesRaw]);

  const togglePortalAccess = useCallback(async (employee) => {
    if (!employee?.id) return;
    setPortalUpdatingId(employee.id);
    setToast(null);

    try {
      const res = await api.get(`/employees/${employee.id}`);
      const data = res.data?.data;
      if (!data) throw new Error("Employee data not found.");

      const currentStatus = String(data.status || "").toUpperCase();
      const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

      const payload = {
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
        status: nextStatus,
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

      await api.put(`/employees/${employee.id}`, payload);
      setEmployeesRaw((prev) => prev.map((item) => (item.id === employee.id ? { ...item, status: nextStatus } : item)));
      setToast({ type: "success", text: nextStatus === "ACTIVE" ? "Portal access enabled." : "Portal access disabled." });
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to update portal access";
      setToast({ type: "error", text: msg });
    } finally {
      setPortalUpdatingId(null);
    }
  }, []);

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchEmployees(selectedCompanyId)} tintColor="#34d399" />}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>WORKFORCE CONTROL</Text>
          <Text style={styles.heroTitle}>Employee Operations</Text>
          <Text style={styles.heroSub}>Switch company context, manage profile access, and monitor active headcount in real time.</Text>
        </View>

        {!!toast && (
          <View style={[styles.toast, toast.type === "error" ? styles.toastError : styles.toastSuccess]}>
            <Text style={styles.toastText}>{toast.text}</Text>
          </View>
        )}

        <View style={styles.metricRow}>
          <MetricCard icon={<Users size={16} color="#a7f3d0" />} label="Total" value={stats.total} />
          <MetricCard icon={<UserCheck size={16} color="#6ee7b7" />} label="Active" value={stats.active} tone="good" />
          <MetricCard icon={<UserX size={16} color="#fda4af" />} label="Inactive" value={stats.inactive} tone="bad" />
        </View>

        <View style={styles.companyPanel}>
          <View style={styles.companyHeader}>
            <Building2 size={14} color="#86efac" />
            <Text style={styles.companyTitle}>Company Scope</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.companyChips}>
            {companies.map((company) => {
              const active = String(company.id) === String(selectedCompanyId);
              return (
                <Pressable
                  key={String(company.id)}
                  style={[styles.companyChip, active && styles.companyChipActive]}
                  onPress={() => setSelectedCompanyId(String(company.id))}
                >
                  <Text style={[styles.companyChipText, active && styles.companyChipTextActive]} numberOfLines={1}>
                    {company.company_name || `Company ${company.id}`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.searchWrap}>
          <Search size={16} color="#6b7280" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by ID, name, department..."
            placeholderTextColor="#6b7280"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.listWrap}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#34d399" />
              <Text style={styles.loadingText}>Loading employees...</Text>
            </View>
          ) : employees.length === 0 ? (
            <Text style={styles.emptyText}>No employees found for this company.</Text>
          ) : (
            employees.map((employee) => (
              <EmployeeRow
                key={String(employee.id)}
                employee={employee}
                busy={portalUpdatingId === employee.id}
                onOpen={() =>
                  router.push({
                    pathname: "/(superadmin)/employees/[id]",
                    params: { id: String(employee.id) },
                  })
                }
                onTogglePortal={() => togglePortalAccess(employee)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#060709" },
  bgGlowTop: {
    position: "absolute",
    top: -100,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.18)",
  },
  bgGlowBottom: {
    position: "absolute",
    bottom: -120,
    left: -120,
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: "rgba(56,189,248,0.12)",
  },
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 36 },

  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    padding: 16,
    backgroundColor: "#0d1117",
  },
  heroEyebrow: { color: "#6ee7b7", fontSize: 10, letterSpacing: 1.6, fontWeight: "800" },
  heroTitle: { color: "#f8fafc", fontSize: 24, fontWeight: "900", marginTop: 6 },
  heroSub: { color: "#9ca3af", fontSize: 12.5, lineHeight: 18, marginTop: 8 },

  toast: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 },
  toastSuccess: { borderColor: "rgba(16,185,129,0.35)", backgroundColor: "rgba(16,185,129,0.16)" },
  toastError: { borderColor: "rgba(251,113,133,0.35)", backgroundColor: "rgba(251,113,133,0.14)" },
  toastText: { color: "#f8fafc", fontSize: 12.5, fontWeight: "700" },

  metricRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#0f1318",
    padding: 12,
  },
  metricCardGood: { borderColor: "rgba(16,185,129,0.3)", backgroundColor: "rgba(16,185,129,0.08)" },
  metricCardBad: { borderColor: "rgba(251,113,133,0.3)", backgroundColor: "rgba(251,113,133,0.08)" },
  metricTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  metricLabel: { color: "#9ca3af", fontSize: 10.5, fontWeight: "700" },
  metricValue: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 8 },

  companyPanel: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#0e1217",
    padding: 12,
  },
  companyHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  companyTitle: { color: "#d1d5db", fontSize: 12.5, fontWeight: "700" },
  companyChips: { gap: 8, paddingVertical: 2, paddingRight: 4 },
  companyChip: {
    maxWidth: 190,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#12161d",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  companyChipActive: {
    borderColor: "rgba(52,211,153,0.45)",
    backgroundColor: "rgba(52,211,153,0.16)",
  },
  companyChipText: { color: "#9ca3af", fontSize: 11.5, fontWeight: "700" },
  companyChipTextActive: { color: "#d1fae5" },

  searchWrap: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#101419",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, color: "#f8fafc", fontSize: 13 },

  listWrap: { marginTop: 12, gap: 10 },
  rowCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#0f1318",
    padding: 12,
  },
  rowHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  rowName: { color: "#f8fafc", fontSize: 15, fontWeight: "800" },
  rowMeta: { color: "#9ca3af", fontSize: 11.5, marginTop: 3 },
  statusPill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  statusActive: { borderColor: "rgba(16,185,129,0.4)", backgroundColor: "rgba(16,185,129,0.15)" },
  statusInactive: { borderColor: "rgba(244,63,94,0.4)", backgroundColor: "rgba(244,63,94,0.14)" },
  statusText: { color: "#e5e7eb", fontSize: 10, fontWeight: "800" },

  rowSubgrid: { marginTop: 9, gap: 4 },
  rowSubText: { color: "#94a3b8", fontSize: 11.5 },

  rowActions: { marginTop: 12, flexDirection: "row", gap: 8 },
  ghostBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: "#131822",
  },
  ghostBtnText: { color: "#d1d5db", fontSize: 12, fontWeight: "700" },
  portalBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 9,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  portalBtnOn: { borderColor: "rgba(16,185,129,0.35)", backgroundColor: "rgba(16,185,129,0.12)" },
  portalBtnOff: { borderColor: "rgba(244,63,94,0.35)", backgroundColor: "rgba(244,63,94,0.12)" },
  portalBtnText: { fontSize: 11.5, fontWeight: "700" },

  loadingWrap: { paddingVertical: 28, alignItems: "center", gap: 8 },
  loadingText: { color: "#9ca3af", fontSize: 12.5 },
  emptyText: {
    color: "#9ca3af",
    fontSize: 13,
    textAlign: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#101419",
    paddingVertical: 20,
  },
  btnDisabled: { opacity: 0.5 },
});

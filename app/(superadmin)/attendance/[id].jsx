import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, CalendarDays, Search, UserRound } from "lucide-react-native";
import { useAuth } from "../../../src/context/authContext";
import api from "../../../src/utils/api";

const STATUS_OPTIONS = [
  "ALL",
  "PRESENT",
  "HALF_DAY",
  "ABSENT",
  "LEAVE",
  "HOLIDAY",
  "WEEKOFF",
  "INCOMPLETE",
  "NOT_JOINED",
];

const THEME = {
  bg: "#020617",
  card: "#0f172a",
  cardBorder: "rgba(255,255,255,0.08)",
  text: "#f8fafc",
  textMuted: "#94a3b8",
};

function getDefaultMonth() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function getDefaultYear() {
  return String(new Date().getFullYear());
}

function getMonthRange(value) {
  if (!value) return null;
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return null;
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function getYearRange(value) {
  const year = Number(value);
  if (!year) return null;
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

function formatRangeLabel(mode, monthValue, yearValue) {
  if (mode === "year") return yearValue;
  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) return "--";
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "--";
  const raw = String(value);
  if (/^\d{2}:\d{2}/.test(raw)) return raw.slice(0, 5);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatWorkDate(value) {
  if (!value) return "--";
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (s === "PRESENT") {
    return { bg: "rgba(16,185,129,0.14)", border: "rgba(16,185,129,0.35)", text: "#bbf7d0" };
  }
  if (s === "HALF_DAY" || s === "INCOMPLETE") {
    return { bg: "rgba(245,158,11,0.14)", border: "rgba(245,158,11,0.35)", text: "#fde68a" };
  }
  if (s === "ABSENT") {
    return { bg: "rgba(244,63,94,0.14)", border: "rgba(244,63,94,0.35)", text: "#fecdd3" };
  }
  return { bg: "rgba(148,163,184,0.14)", border: "rgba(148,163,184,0.28)", text: "#cbd5e1" };
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function AttendanceDayRow({ row }) {
  const tone = statusTone(row.status);
  return (
    <View style={styles.rowCard}>
      <View style={styles.rowHead}>
        <Text style={styles.rowDate}>{formatWorkDate(row.work_date)}</Text>
        <View style={[styles.rowStatusPill, { borderColor: tone.border, backgroundColor: tone.bg }]}> 
          <Text style={[styles.rowStatusText, { color: tone.text }]}>
            {String(row.status || "--").replace("_", " ")}
          </Text>
        </View>
      </View>

      <View style={styles.rowGrid}>
        <View style={styles.rowMetric}>
          <Text style={styles.rowMetricLabel}>In Time</Text>
          <Text style={styles.rowMetricValue}>{formatTime(row.first_in)}</Text>
        </View>
        <View style={styles.rowMetric}>
          <Text style={styles.rowMetricLabel}>Out Time</Text>
          <Text style={styles.rowMetricValue}>{formatTime(row.last_out)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function SuperadminEmployeeAttendancePage() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const employeeId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [employee, setEmployee] = useState(null);
  const [viewMode, setViewMode] = useState("month");
  const [month, setMonth] = useState(getDefaultMonth());
  const [year, setYear] = useState(getDefaultYear());
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [totalWorkedMinutes, setTotalWorkedMinutes] = useState(0);

  const fetchEmployee = useCallback(async () => {
    if (!employeeId) return;
    try {
      const res = await api.get(`/employees/${employeeId}`);
      setEmployee(res.data?.data || null);
    } catch (e) {
      setToast({
        type: "error",
        text:
          e?.response?.data?.message ||
          e?.message ||
          "Failed to load employee profile.",
      });
    }
  }, [employeeId]);

  const fetchAttendance = useCallback(async () => {
    if (!employeeId) return;
    const range = viewMode === "year" ? getYearRange(year) : getMonthRange(month);
    if (!range) return;

    setLoading(true);
    setToast(null);
    try {
      const res = await api.get(`/attendance/daily/employee/${employeeId}`, {
        params: { start: range.start, end: range.end },
      });
      setRecords(res.data?.data || []);
      setTotalWorkedMinutes(res.data?.meta?.total_worked_minutes || 0);
    } catch (e) {
      setToast({
        type: "error",
        text:
          e?.response?.data?.message ||
          e?.message ||
          "Failed to fetch attendance records.",
      });
    } finally {
      setLoading(false);
    }
  }, [employeeId, month, viewMode, year]);

  useEffect(() => {
    if (!user) return;
    fetchEmployee();
  }, [user, fetchEmployee]);

  useEffect(() => {
    if (!user) return;
    fetchAttendance();
  }, [user, employeeId, viewMode, month, year, fetchAttendance]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filteredRows = records.filter((row) => {
      const status = String(row.status || "").toUpperCase();
      if (statusFilter !== "ALL" && status !== statusFilter) return false;
      if (!q) return true;
      const hay = [row.work_date, row.status, row.first_in, row.last_out]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });

    return filteredRows.sort((a, b) =>
      String(b.work_date || "").localeCompare(String(a.work_date || ""))
    );
  }, [query, records, statusFilter]);

  const stats = useMemo(() => {
    const summary = {
      total: records.length,
      totalMinutes: totalWorkedMinutes,
      present: 0,
      halfDay: 0,
      absent: 0,
      leave: 0,
      holiday: 0,
      weekoff: 0,
      incomplete: 0,
      notJoined: 0,
    };

    records.forEach((row) => {
      const status = String(row.status || "").toUpperCase();
      if (status === "PRESENT") summary.present += 1;
      if (status === "HALF_DAY") summary.halfDay += 1;
      if (status === "ABSENT") summary.absent += 1;
      if (status === "LEAVE") summary.leave += 1;
      if (status === "HOLIDAY") summary.holiday += 1;
      if (status === "WEEKOFF") summary.weekoff += 1;
      if (status === "INCOMPLETE") summary.incomplete += 1;
      if (status === "NOT_JOINED") summary.notJoined += 1;
    });

    return summary;
  }, [records, totalWorkedMinutes]);

  const totalHoursLabel = useMemo(() => {
    const minutes = Number(stats.totalMinutes || 0);
    if (!Number.isFinite(minutes) || minutes <= 0) return "0h 0m";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }, [stats.totalMinutes]);

  if (!user) return null;

  const name = employee
    ? `${employee.first_name || ""} ${employee.last_name || ""}`.trim()
    : "Employee";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchAttendance}
            tintColor="#34d399"
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.headerTop}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <ArrowLeft size={16} color="#cbd5e1" />
            </Pressable>
          </View>

          <Text style={styles.eyebrow}>ATTENDANCE PROFILE</Text>
          <Text style={styles.title}>{name || "Employee"} Attendance</Text>
          <Text style={styles.subtitle}>
            Review monthly or yearly attendance trends for this employee.
          </Text>

          {employee ? (
            <View style={styles.metaChips}>
              <View style={styles.metaChip}>
                <UserRound size={12} color="#cbd5e1" />
                <Text style={styles.metaChipText}>{employee.emp_id || "EMP"}</Text>
              </View>
              {!!employee.department ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{employee.department}</Text>
                </View>
              ) : null}
              {!!employee.designation ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{employee.designation}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {!!toast ? (
          <View style={styles.toastError}>
            <Text style={styles.toastText}>{toast.text}</Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <StatCard label="Total Worked" value={totalHoursLabel} />
          <StatCard label="Present" value={stats.present} />
          <StatCard label="Absent" value={stats.absent} />
          <StatCard label="Half Day" value={stats.halfDay} />
          <StatCard label="Leaves / Holidays" value={stats.leave + stats.holiday} />
        </View>

        <View style={styles.filterCard}>
          <Text style={styles.filterTitle}>Filters</Text>

          <View style={styles.toggleRow}>
            <Pressable
              style={[styles.toggleBtn, viewMode === "month" && styles.toggleBtnActive]}
              onPress={() => setViewMode("month")}
            >
              <Text style={[styles.toggleText, viewMode === "month" && styles.toggleTextActive]}>
                Monthly
              </Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, viewMode === "year" && styles.toggleBtnActive]}
              onPress={() => setViewMode("year")}
            >
              <Text style={[styles.toggleText, viewMode === "year" && styles.toggleTextActive]}>
                Yearly
              </Text>
            </Pressable>
          </View>

          <View style={styles.inputGrid}>
            {viewMode === "month" ? (
              <View style={styles.inputWrap}>
                <View style={styles.inputLabelWrap}>
                  <CalendarDays size={12} color="#86efac" />
                  <Text style={styles.inputLabel}>Month (YYYY-MM)</Text>
                </View>
                <TextInput
                  value={month}
                  onChangeText={setMonth}
                  style={styles.input}
                  placeholder="YYYY-MM"
                  placeholderTextColor="#6b7280"
                />
              </View>
            ) : (
              <View style={styles.inputWrap}>
                <View style={styles.inputLabelWrap}>
                  <CalendarDays size={12} color="#86efac" />
                  <Text style={styles.inputLabel}>Year</Text>
                </View>
                <TextInput
                  value={year}
                  onChangeText={setYear}
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholder="YYYY"
                  placeholderTextColor="#6b7280"
                />
              </View>
            )}

            <View style={styles.inputWrap}>
              <View style={styles.inputLabelWrap}>
                <Search size={12} color="#94a3b8" />
                <Text style={styles.inputLabel}>Search</Text>
              </View>
              <TextInput
                value={query}
                onChangeText={setQuery}
                style={styles.input}
                placeholder="Date, status, time..."
                placeholderTextColor="#6b7280"
              />
            </View>
          </View>

          <View style={styles.statusChips}>
            {STATUS_OPTIONS.map((status) => (
              <Pressable
                key={status}
                style={[styles.statusChip, statusFilter === status && styles.statusChipActive]}
                onPress={() => setStatusFilter(status)}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    statusFilter === status && styles.statusChipTextActive,
                  ]}
                >
                  {status.replace("_", " ")}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.rangeLabel}>
            Range: {formatRangeLabel(viewMode, month, year)} • Rows: {filtered.length}
          </Text>
        </View>

        <View style={styles.listWrap}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color="#34d399" />
              <Text style={styles.loadingText}>Loading attendance records...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No attendance records found</Text>
              <Text style={styles.emptyHint}>Try another month/year or adjust filters.</Text>
            </View>
          ) : (
            filtered.map((row, idx) => (
              <AttendanceDayRow
                key={String(row.id || `${row.work_date}-${idx}`)}
                row={row}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: THEME.bg },
  glowTop: {
    position: "absolute",
    top: -130,
    right: -90,
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.15)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -150,
    left: -110,
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.11)",
  },
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 28, gap: 11 },

  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#0d1117",
    padding: 14,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  backBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#151c26",
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: { color: THEME.textMuted, fontSize: 10.5, letterSpacing: 1.5, fontWeight: "800" },
  title: { color: "#fff", fontSize: 23, fontWeight: "900", marginTop: 4 },
  subtitle: { color: THEME.textMuted, fontSize: 12.5, marginTop: 6, lineHeight: 18 },

  metaChips: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  metaChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#151c26",
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaChipText: { color: "#cbd5e1", fontSize: 10.8, fontWeight: "700" },

  toastError: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(244,63,94,0.35)",
    backgroundColor: "rgba(244,63,94,0.13)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toastText: { color: "#fecdd3", fontSize: 12.5, fontWeight: "700" },

  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: {
    flexGrow: 1,
    minWidth: "31%",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#10151d",
    padding: 11,
  },
  statLabel: { color: THEME.textMuted, fontSize: 10.5, fontWeight: "700" },
  statValue: { color: "#fff", fontSize: 20, fontWeight: "900", marginTop: 6 },

  filterCard: {
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#10151d",
    padding: 12,
    gap: 9,
  },
  filterTitle: { color: "#fff", fontSize: 14.5, fontWeight: "800" },
  toggleRow: { flexDirection: "row", gap: 8 },
  toggleBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.28)",
    backgroundColor: "#141b26",
    alignItems: "center",
    paddingVertical: 9,
  },
  toggleBtnActive: {
    borderColor: "rgba(16,185,129,0.35)",
    backgroundColor: "rgba(16,185,129,0.12)",
  },
  toggleText: { color: "#cbd5e1", fontSize: 11.5, fontWeight: "700" },
  toggleTextActive: { color: "#bbf7d0" },

  inputGrid: { flexDirection: "row", gap: 8 },
  inputWrap: { flex: 1, gap: 5 },
  inputLabelWrap: { flexDirection: "row", alignItems: "center", gap: 5 },
  inputLabel: { color: THEME.textMuted, fontSize: 10.5, fontWeight: "700" },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#111923",
    color: "#f8fafc",
    fontSize: 12.5,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },

  statusChips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  statusChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.28)",
    backgroundColor: "#141b26",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusChipActive: {
    borderColor: "rgba(16,185,129,0.35)",
    backgroundColor: "rgba(16,185,129,0.12)",
  },
  statusChipText: { color: "#cbd5e1", fontSize: 10.5, fontWeight: "700" },
  statusChipTextActive: { color: "#bbf7d0" },

  rangeLabel: { color: THEME.textMuted, fontSize: 11.5, marginTop: 2 },

  listWrap: { gap: 8 },
  rowCard: {
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#0f151d",
    padding: 11,
  },
  rowHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowDate: { color: "#fff", fontSize: 13, fontWeight: "800" },
  rowStatusPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rowStatusText: { fontSize: 10, fontWeight: "800" },
  rowGrid: { marginTop: 9, flexDirection: "row", gap: 8 },
  rowMetric: {
    flex: 1,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#151d28",
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  rowMetricLabel: { color: "#64748b", fontSize: 9.8, fontWeight: "700" },
  rowMetricValue: { color: "#e2e8f0", fontSize: 11.5, fontWeight: "700", marginTop: 3 },

  loadingWrap: { alignItems: "center", gap: 8, paddingVertical: 26 },
  loadingText: { color: THEME.textMuted, fontSize: 12 },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#0f151d",
    padding: 14,
    alignItems: "center",
  },
  emptyTitle: { color: "#fff", fontSize: 14, fontWeight: "800" },
  emptyHint: {
    color: THEME.textMuted,
    fontSize: 11.5,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 17,
  },
});

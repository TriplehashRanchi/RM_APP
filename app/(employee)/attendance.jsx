import { router } from "expo-router";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  User
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/authContext";
import api from "../../src/utils/api";

const { width } = Dimensions.get("window");

// --- UTILS ---

function getDefaultMonth() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function getMonthRange(value) {
  if (!value) return null;
  const [year, month] = value.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

function monthLabel(value) {
  const [year, monthValue] = String(value || "").split("-").map(Number);
  if (!year || !monthValue) return "--";
  return new Date(year, monthValue - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function shiftMonth(value, offset) {
  const [year, monthValue] = String(value || "").split("-").map(Number);
  const date = new Date(year, monthValue - 1 + offset, 1);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function formatTime(value) {
  if (!value) return "--:--";
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

function formatDateParts(value) {
  if (!value) return { day: "--", dow: "---" };
  const date = new Date(value);
  const day = date.getDate();
  const dow = date.toLocaleDateString("en-IN", { weekday: "short" });
  return { day, dow };
}

function getStatusColor(status) {
  const s = String(status || "").toUpperCase();
  if (
    s === "PRESENT" ||
    s === "HOLIDAY_WORKED" ||
    s === "WEEKOFF_WORKED" ||
    s === "LEAVE_WORKED"
  ) {
    return { bg: "#064E3B", text: "#34D399", dot: "#10B981" }; // Green
  }
  if (s === "HALF_DAY" || s === "INCOMPLETE") {
    return { bg: "#451a03", text: "#FCD34D", dot: "#F59E0B" }; // Amber
  }
  if (s === "ABSENT") {
    return { bg: "#4c0519", text: "#FDA4AF", dot: "#F43F5E" }; // Rose
  }
  if (s === "HOLIDAY" || s === "WEEKOFF") {
    return { bg: "#1e3a8a", text: "#93C5FD", dot: "#3B82F6" }; // Blue
  }
  // Default / Leave
  return { bg: "#1e293b", text: "#94A3B8", dot: "#64748B" }; // Slate
}

// --- COMPONENTS ---

function SummaryBadge({ label, value, color }) {
  return (
    <View style={styles.summaryBadge}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function AttendanceItem({ row }) {
  const { day, dow } = formatDateParts(row.work_date);
  const colors = getStatusColor(row.status);
  const statusText = String(row.status || "--")
    .replace(/_/g, " ")
    .toLowerCase();

  return (
    <View style={styles.itemCard}>
      {/* Left: Date Block */}
      <View style={styles.dateBlock}>
        <Text style={styles.dateDay}>{day}</Text>
        <Text style={styles.dateDow}>{dow}</Text>
      </View>

      {/* Vertical Separator */}
      <View style={[styles.vLine, { backgroundColor: colors.dot }]} />

      {/* Middle & Right: Details */}
      <View style={styles.itemDetails}>
        <View style={styles.itemHeader}>
          <View style={[styles.statusPill, { backgroundColor: colors.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: colors.dot }]} />
            <Text style={[styles.statusText, { color: colors.text }]}>
              {statusText}
            </Text>
          </View>
          
          {/* Times - Only show if present/half day etc */}
          {(row.first_in || row.last_out) && (
             <View style={styles.timeRow}>
             <Clock size={12} color="#64748B" />
             <Text style={styles.timeText}>
               {formatTime(row.first_in)}
               <Text style={styles.timeArrow}> ➝ </Text>
               {formatTime(row.last_out)}
             </Text>
           </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default function EmployeeAttendancePage() {
  const { user } = useAuth();
  const [month, setMonth] = useState(getDefaultMonth());
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAttendance = useCallback(async () => {
    const range = getMonthRange(month);
    if (!range) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/attendance/daily/me", {
        params: { start: range.start, end: range.end },
      });
      setRecords(res.data?.data || []);
    } catch (e) {
      setError("Unable to sync attendance.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    if (user) fetchAttendance();
  }, [user, fetchAttendance]);

  // Sort & Stats
  const { filtered, stats } = useMemo(() => {
    const sorted = [...records].sort((a, b) =>
      String(b.work_date || "").localeCompare(String(a.work_date || ""))
    );

    const s = { present: 0, absent: 0, half: 0, off: 0 };
    records.forEach((r) => {
      const st = String(r.status || "").toUpperCase();
      if (st.includes("PRESENT") || st.includes("WORKED")) s.present++;
      else if (st === "HALF_DAY" || st === "INCOMPLETE") s.half++;
      else if (st === "ABSENT") s.absent++;
      else s.off++;
    });

    return { filtered: sorted, stats: s };
  }, [records]);

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1221" />
      
      {/* Background Ambience */}
      <View style={styles.bgGlowTop} />

      {/* --- HEADER --- */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={20} color="#E2E8F0" />
        </Pressable>
        <Text style={styles.headerTitle}>My Attendance</Text>
        <View style={styles.placeholderBtn} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* --- OVERVIEW CARD --- */}
        <View style={styles.overviewCard}>
          {/* Month Selector */}
          <View style={styles.monthRow}>
            <Pressable
              style={styles.navBtn}
              onPress={() => setMonth((p) => shiftMonth(p, -1))}
            >
              <ChevronLeft size={20} color="#94A3B8" />
            </Pressable>
            
            <View style={styles.monthDisplay}>
                <Calendar size={14} color="#38BDF8" style={{marginRight: 6}} />
                <Text style={styles.monthText}>{monthLabel(month)}</Text>
            </View>

            <Pressable
              style={styles.navBtn}
              onPress={() => setMonth((p) => shiftMonth(p, 1))}
            >
              <ChevronRight size={20} color="#94A3B8" />
            </Pressable>
          </View>

          <View style={styles.divider} />

          {/* User Info (Compact) */}
          <View style={styles.userRow}>
             <View style={styles.avatar}>
                <User size={18} color="#fff" />
             </View>
             <View>
                <Text style={styles.userName}>{user?.name || "Employee"}</Text>
                <Text style={styles.userRole}>{user?.designation || "Designation"} • {user?.emp_id}</Text>
             </View>
          </View>

          {/* Summary Stats Row */}
          <View style={styles.statsContainer}>
            <SummaryBadge label="Present" value={stats.present} color="#34D399" />
            <SummaryBadge label="Half Day" value={stats.half} color="#FBBF24" />
            <SummaryBadge label="Absent" value={stats.absent} color="#F43F5E" />
            <SummaryBadge label="Off/Leave" value={stats.off} color="#94A3B8" />
          </View>
        </View>

        {/* --- ERROR / LOADING --- */}
        {error ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={16} color="#F43F5E" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* --- LIST HEADER --- */}
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Logs</Text>
            <Text style={styles.sectionSubtitle}>{filtered.length} entries</Text>
        </View>

        {/* --- LIST --- */}
        {loading ? (
           <View style={{ marginTop: 40 }}>
             <ActivityIndicator size="large" color="#38BDF8" />
           </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <TrendingUp size={40} color="#1E293B" />
            <Text style={styles.emptyText}>No records found</Text>
            <Text style={styles.emptySub}>No attendance data for this month.</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filtered.map((row, index) => (
              <AttendanceItem key={index} row={row} />
            ))}
          </View>
        )}
        
        <View style={{height: 40}} /> 
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Base Layout
  safe: { flex: 1, backgroundColor: "#0B1221" },
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 20 },
  bgGlowTop: {
    position: "absolute",
    top: -100, left: -50,
    width: width, height: 400,
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    borderRadius: 999,
    transform: [{ scaleX: 1.5 }],
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "700",
  },
  iconBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.05)",
  },
  placeholderBtn: { width: 40 },

  // Overview Card (The "Hero")
  overviewCard: {
    marginTop: 10,
    backgroundColor: "#162032",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  monthDisplay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.2)",
  },
  monthText: {
    color: "#E0F2FE",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  navBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 4,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 16,
    gap: 12,
  },
  avatar: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: "#2563EB",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#1E293B",
  },
  userName: {
    color: "#F1F5F9",
    fontSize: 15,
    fontWeight: "700",
  },
  userRole: {
    color: "#94A3B8",
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    borderRadius: 16,
    padding: 12,
  },
  summaryBadge: {
    alignItems: "center",
    flex: 1,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },
  summaryLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },

  // Error
  errorBanner: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  errorText: { color: "#FDA4AF", fontSize: 13 },

  // List Section
  sectionHeader: {
      marginTop: 24,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
  },
  sectionTitle: {
      color: "#CBD5E1",
      fontSize: 15,
      fontWeight: "700",
      letterSpacing: 0.5,
      textTransform: "uppercase",
  },
  sectionSubtitle: {
      color: "#64748B",
      fontSize: 12,
  },
  listContainer: {
      gap: 10,
  },

  // Item Card
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131C2D",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  dateBlock: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dateDay: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "800",
  },
  dateDow: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 2,
  },
  vLine: {
    width: 3,
    height: "70%",
    borderRadius: 2,
    marginHorizontal: 12,
    opacity: 0.4,
  },
  itemDetails: {
    flex: 1,
    justifyContent: "center",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  statusDot: {
    width: 6, height: 6, borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timeText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    fontWeight: "500",
  },
  timeArrow: {
    color: "#64748B",
    fontSize: 10,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    opacity: 0.7,
  },
  emptyText: {
    color: "#E2E8F0",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  emptySub: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 4,
  },
});
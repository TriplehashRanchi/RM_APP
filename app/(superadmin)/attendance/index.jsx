import { router } from "expo-router";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  CloudLightning,
  Layers,
  Search,
  Users,
  Zap
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useAuth } from "../../../src/context/authContext";
import api from "../../../src/utils/api";

// Enable LayoutAnimation for Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ACTIVE_COMPANY_KEY = "active_company_id";

const THEME = {
  bg: "#050B14", // Deep Void
  card: "#111827", // Dark Slate
  cardBorder: "rgba(255,255,255,0.06)",
  primary: "#3B82F6", // Blue
  success: "#10B981", // Emerald
  warning: "#F59E0B", // Amber
  danger: "#EF4444", // Red
  text: "#F8FAFC",
  textMuted: "#94A3B8",
};

// --- UTILS ---

function getFormattedDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function adjustDate(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function formatTime(value) {
  if (!value) return "--:--";
  const raw = String(value);
  if (/^\d{2}:\d{2}/.test(raw)) return raw.slice(0, 5);
  return raw; // Fallback
}

// --- COMPONENTS ---

const StatusBadge = ({ status }) => {
  const s = String(status || "").toUpperCase();
  let color = THEME.textMuted;
  let bg = "rgba(148, 163, 184, 0.1)";

  if (s === "PRESENT") {
    color = THEME.success;
    bg = "rgba(16, 185, 129, 0.15)";
  } else if (s === "ABSENT") {
    color = THEME.danger;
    bg = "rgba(239, 68, 68, 0.15)";
  } else if (s === "HALF_DAY" || s === "INCOMPLETE") {
    color = THEME.warning;
    bg = "rgba(245, 158, 11, 0.15)";
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{s.replace("_", " ")}</Text>
    </View>
  );
};

const StatTile = ({ label, value, color, icon: Icon }) => (
  <View style={styles.statTile}>
    <View style={[styles.statIconBox, { backgroundColor: color + "15" }]}>
      <Icon size={14} color={color} />
    </View>
    <View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

const AttendanceCard = ({ item, onPress }) => {
  const statusColor =
    item.status === "PRESENT"
      ? THEME.success
      : item.status === "ABSENT"
      ? THEME.danger
      : item.status === "HALF_DAY"
      ? THEME.warning
      : "#334155";

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={[styles.cardStrip, { backgroundColor: statusColor }]} />
      
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.first_name?.[0]}{item.last_name?.[0]}
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.name}>{item.first_name} {item.last_name}</Text>
            <Text style={styles.role}>{item.department || "General"} • {item.emp_id}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBottom}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>CHECK IN</Text>
            <Text style={styles.timeValue}>{formatTime(item.first_in)}</Text>
          </View>
          
          <View style={styles.timeConnector}>
            <View style={styles.dot} />
            <View style={styles.line} />
            <View style={styles.dot} />
          </View>

          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>CHECK OUT</Text>
            <Text style={styles.timeValue}>{formatTime(item.last_out)}</Text>
          </View>

          <View style={styles.durationBlock}>
            <Clock size={12} color={THEME.textMuted} />
            <Text style={styles.durationText}>{item.work_duration || "--h"}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

// --- MAIN SCREEN ---

export default function AttendanceScreen() {
  const { user } = useAuth();
  
  // State
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Fetch Logic (Simplified for UI Demo)
  const fetchCompanies = useCallback(async () => {
    try {
      const res = await api.get("/companies");
      const list = res.data?.data || [];
      setCompanies(list);
      if (list.length > 0) setSelectedCompanyId(String(list[0].id));
    } catch (e) { console.error(e); }
  }, []);

  const fetchAttendance = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const res = await api.get("/attendance/daily", { params: { company_id: selectedCompanyId, date } });
      setRecords(res.data?.data || []);
    } catch (e) {
      setRecords([]); 
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, date]);

  useEffect(() => { if (user) fetchCompanies(); }, [user]);
  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  // Actions
  const handleDateChange = (days) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDate(prev => adjustDate(prev, days));
  };

  const handleAction = async (type) => {
    setActionLoading(type);
    try {
      if (type === 'sync') await api.get("/attendance/sync", { params: { auto: 1 } });
      if (type === 'process') await api.post("/attendance/process-daily", { date });
      await fetchAttendance();
    } catch (e) { alert("Action Failed"); } 
    finally { setActionLoading(null); }
  };

  // Filter Logic
  const filteredData = useMemo(() => {
    return records.filter(r => {
      const matchSearch = (r.first_name + " " + r.last_name + r.emp_id).toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [records, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: records.length,
    present: records.filter(r => r.status === "PRESENT").length,
    absent: records.filter(r => r.status === "ABSENT").length,
    half: records.filter(r => r.status === "HALF_DAY" || r.status === "INCOMPLETE").length,
  }), [records]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bg} />
      
      {/* Ambient Background */}
      <View style={styles.ambientGlow} />

      {/* 1. Header & Company Selector */}
      <View style={styles.header}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.companyScroll}>
          {companies.map(c => {
            const isActive = String(c.id) === selectedCompanyId;
            return (
              <Pressable 
                key={c.id} 
                style={[styles.companyChip, isActive && styles.companyChipActive]}
                onPress={() => setSelectedCompanyId(String(c.id))}
              >
                <Briefcase size={12} color={isActive ? THEME.primary : THEME.textMuted} />
                <Text style={[styles.companyText, isActive && styles.companyTextActive]}>{c.company_name}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAttendance} tintColor={THEME.primary} />}
        stickyHeaderIndices={[2]} // Stick the filter bar
      >
        
        {/* 2. Date Navigator */}
        <View style={styles.dateNav}>
          <Pressable style={styles.navBtn} onPress={() => handleDateChange(-1)}>
            <ArrowLeft size={20} color={THEME.text} />
          </Pressable>
          <View style={styles.dateDisplay}>
            <Text style={styles.dateText}>{getFormattedDate(date)}</Text>
            <View style={styles.dateIndicator} />
          </View>
          <Pressable style={styles.navBtn} onPress={() => handleDateChange(1)}>
            <ArrowRight size={20} color={THEME.text} />
          </Pressable>
        </View>

        {/* 3. Control Center (Glass) */}
        <View style={styles.controlPanel}>
          <View style={styles.statsRow}>
            <StatTile label="Total" value={stats.total} color="#94A3B8" icon={Users} />
            <StatTile label="Present" value={stats.present} color={THEME.success} icon={CheckCircle2} />
            <StatTile label="Issues" value={stats.absent + stats.half} color={THEME.warning} icon={CloudLightning} />
          </View>
          
          <View style={styles.actionRow}>
            <Pressable 
              style={[styles.actionBtn, styles.btnSync]} 
              onPress={() => handleAction('sync')}
              disabled={!!actionLoading}
            >
              {actionLoading === 'sync' ? <ActivityIndicator color="#fff" size="small" /> : <Zap size={16} color="#7DD3FC" />}
              <Text style={styles.btnTextSync}>Sync Device</Text>
            </Pressable>

            <Pressable 
              style={[styles.actionBtn, styles.btnProcess]} 
              onPress={() => handleAction('process')}
              disabled={!!actionLoading}
            >
              {actionLoading === 'process' ? <ActivityIndicator color="#fff" size="small" /> : <Layers size={16} color="#86EFAC" />}
              <Text style={styles.btnTextProcess}>Process Day</Text>
            </Pressable>
          </View>
        </View>

        {/* 4. Filter Bar (Sticky) */}
        <View style={styles.filterBar}>
          <View style={styles.searchBox}>
            <Search size={16} color={THEME.textMuted} />
            <TextInput 
              style={styles.input} 
              placeholder="Search employee..." 
              placeholderTextColor={THEME.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          {/* <Pressable style={styles.filterIconBtn}>
            <Filter size={18} color={THEME.textMuted} />
          </Pressable> */}
        </View>

        {/* 5. Status Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow} contentContainerStyle={{paddingHorizontal: 16}}>
          {["ALL", "PRESENT", "ABSENT", "HALF_DAY"].map(status => {
            const active = statusFilter === status;
            return (
              <Pressable 
                key={status} 
                style={[styles.tabChip, active && styles.tabChipActive]}
                onPress={() => setStatusFilter(status)}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{status.replace('_', ' ')}</Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {/* 6. Employee List */}
        <View style={styles.listContainer}>
          {filteredData.map((item, index) => (
            <AttendanceCard 
              key={index} 
              item={item} 
              onPress={() => router.push(`/(superadmin)/attendance/${item.employee_id}`)} 
            />
          ))}
          
          {filteredData.length === 0 && !loading && (
            <View style={styles.emptyState}>
              <Calendar size={48} color="#1E293B" />
              <Text style={styles.emptyText}>No records for this date</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  ambientGlow: {
    position: 'absolute',
    top: -150,
    left: -100,
    width: 400,
    height: 400,
    backgroundColor: THEME.primary,
    opacity: 0.08,
    borderRadius: 200,
    zIndex: -1,
  },

  // 1. Header
  header: {
    paddingVertical: 12,
  },
  companyScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  companyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 6,
  },
  companyChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  companyText: {
    fontSize: 12,
    color: THEME.textMuted,
    fontWeight: '600',
  },
  companyTextActive: {
    color: '#93C5FD',
  },

  scrollContent: {
    paddingBottom: 40,
  },

  // 2. Date Nav
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 20,
    marginTop: 4,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDisplay: {
    alignItems: 'center',
  },
  dateText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateIndicator: {
    width: 20,
    height: 3,
    backgroundColor: THEME.primary,
    borderRadius: 2,
    marginTop: 4,
  },

  // 3. Control Panel
  controlPanel: {
    marginHorizontal: 16,
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    color: THEME.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  btnSync: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  btnProcess: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  btnTextSync: { color: '#7DD3FC', fontWeight: '700', fontSize: 13 },
  btnTextProcess: { color: '#86EFAC', fontWeight: '700', fontSize: 13 },

  // 4. Filter Bar
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: THEME.bg, // Opaque for sticky
    gap: 10,
  },
  searchBox: {
    flex: 1,
    height: 44,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: '#fff',
    fontSize: 14,
  },
  filterIconBtn: {
    width: 44,
    height: 44,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },

  // 5. Tabs
  tabsRow: {
    marginBottom: 16,
    marginTop: 4,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tabChipActive: {
    backgroundColor: '#fff',
  },
  tabText: {
    color: THEME.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#000',
  },

  // 6. List
  listContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  cardStrip: {
    width: 4,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  name: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  role: {
    color: THEME.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 12,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeBlock: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 13,
    color: '#E2E8F0',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  timeConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
    justifyContent: 'center',
  },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#334155' },
  line: { flex: 1, height: 1, backgroundColor: '#334155', marginHorizontal: 2 },
  durationBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    color: THEME.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },

  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
    opacity: 0.5,
  },
  emptyText: {
    color: THEME.textMuted,
    marginTop: 10,
    fontSize: 14,
  },
});
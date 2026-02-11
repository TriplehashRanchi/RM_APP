import {
  Building2,
  CheckCircle2,
  Eye,
  File,
  FileCode,
  FileImage,
  FileText,
  Filter,
  FolderLock,
  LayoutGrid,
  Search,
  ShieldCheck,
  Smartphone,
  Zap
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Pressable,
  RefreshControl,
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

// --- Constants & Helpers ---
const STATUS_OPTIONS = ["", "ACTIVE", "ARCHIVED"];
const { width } = Dimensions.get("window");

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 1) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / 1024 ** exp;
  return `${amount.toFixed(1)} ${units[exp]}`;
}

function normalizeStatus(status) {
  const s = String(status || "ACTIVE").toUpperCase();
  return s === "ARCHIVED" ? "ARCHIVED" : "ACTIVE";
}

function getFileIcon(type, name) {
  const t = (type || "").toUpperCase();
  const n = (name || "").toUpperCase();
  
  if (t.includes("IMAGE") || n.endsWith(".PNG") || n.endsWith(".JPG")) return <FileImage size={18} color="#f472b6" />;
  if (t.includes("PDF")) return <FileText size={18} color="#f87171" />;
  if (t.includes("JSON") || t.includes("CODE") || t.includes("JS")) return <FileCode size={18} color="#60a5fa" />;
  return <File size={18} color="#94a3b8" />;
}

// --- Components ---

function StatusBadge({ status }) {
  const normalized = normalizeStatus(status);
  const isArchived = normalized === "ARCHIVED";
  
  return (
    <View style={[styles.badge, isArchived ? styles.badgeArchived : styles.badgeActive]}>
      <View style={[styles.badgeDot, isArchived ? styles.dotArchived : styles.dotActive]} />
      <Text style={[styles.badgeText, isArchived ? styles.textArchived : styles.textActive]}>
        {normalized}
      </Text>
    </View>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBox, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
        <Icon size={16} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

export default function SuperadminCompanyDocsViewPage() {
  const { user } = useAuth();
  
  // Data State
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyId] = useState("ALL");
  
  const [allDocs, setAllDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter State
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  
  // UI Feedback
  const [notice, setNotice] = useState(null);

  const showNotice = useCallback((type, text) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3000);
  }, []);

  // --- API Calls ---

  const fetchCompanies = useCallback(async () => {
    setCompaniesLoading(true);
    try {
      const res = await api.get("/companies");
      setCompanies(res.data?.data || []);
    } catch (error) {
      showNotice("error", "Failed to load companies");
    } finally {
      setCompaniesLoading(false);
    }
  }, [showNotice]);

  const fetchAllDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      if (!companies.length) {
        setAllDocs([]);
        return;
      }
      
      // Parallel fetch for all companies
      const results = await Promise.all(
        companies.map(async (company) => {
          try {
            const res = await api.get(`/companies/${company.id}/documents?sort_by=created_at&sort_dir=DESC`);
            const rows = Array.isArray(res.data?.data) ? res.data.data : [];
            return rows.map(row => ({
              ...row,
              company_id: company.id,
              company_name: company.company_name || company.name,
              company_code: company.company_code,
            }));
          } catch {
            return [];
          }
        })
      );
      
      const flatDocs = results.flat().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setAllDocs(flatDocs);
    } catch (error) {
      showNotice("error", "Failed to refresh documents");
    } finally {
      setLoadingDocs(false);
    }
  }, [companies, showNotice]);

  useEffect(() => {
    if (user) fetchCompanies();
  }, [user, fetchCompanies]);

  useEffect(() => {
    if (companies.length > 0) fetchAllDocuments();
  }, [companies, fetchAllDocuments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCompanies();
    setRefreshing(false);
  };

  // --- Derived State ---

  const filteredDocs = useMemo(() => {
    return allDocs.filter((doc) => {
      // 1. Company Filter
      if (activeCompanyId !== "ALL" && String(doc.company_id) !== String(activeCompanyId)) return false;
      
      // 2. Status Filter
      if (status && normalizeStatus(doc.status) !== status) return false;
      
      // 3. Search Filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const content = `${doc.doc_name} ${doc.doc_type} ${doc.company_name} ${doc.company_code}`.toLowerCase();
        return content.includes(q);
      }
      return true;
    });
  }, [allDocs, activeCompanyId, status, search]);

  const stats = useMemo(() => {
    const total = filteredDocs.length;
    const archived = filteredDocs.filter(d => normalizeStatus(d.status) === "ARCHIVED").length;
    const totalBytes = filteredDocs.reduce((acc, d) => acc + (Number(d.file_size_bytes) || 0), 0);
    return { total, active: total - archived, archived, size: formatBytes(totalBytes) };
  }, [filteredDocs]);

  const openDoc = async (url) => {
    if (!url) return showNotice("error", "No URL available");
    const supported = await Linking.canOpenURL(url);
    if (supported) Linking.openURL(url);
    else showNotice("error", "Cannot open this link");
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      
      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <View style={styles.brandPill}>
            <ShieldCheck size={12} color="#4ade80" />
            <Text style={styles.brandText}>SUPERADMIN VAULT</Text>
          </View>
          <Text style={styles.title}>Global Documents</Text>
        </View>
        <Pressable 
          onPress={fetchAllDocuments} 
          disabled={loadingDocs}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
        >
          {loadingDocs ? <ActivityIndicator size="small" color="#fff" /> : <Zap size={20} color="#facc15" fill="#facc15" />}
        </Pressable>
      </View>

      {/* Notice Toast */}
      {notice && (
        <View style={[styles.toast, notice.type === "error" ? styles.toastError : styles.toastSuccess]}>
          <Text style={styles.toastText}>{notice.text}</Text>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]} // Stick the company filter
      >
        
        {/* Stats Grid */}
        <View style={styles.bentoGrid}>
          <StatCard icon={LayoutGrid} label="Total Docs" value={stats.total} color="#38bdf8" />
          <StatCard icon={CheckCircle2} label="Active" value={stats.active} color="#4ade80" />
          <StatCard icon={Filter} label="Archived" value={stats.archived} color="#fbbf24" />
          <StatCard icon={Smartphone} label="Storage" value={stats.size} color="#a78bfa" />
        </View>

        {/* Sticky Filter Section */}
        <View style={styles.stickySection}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.companyRow}
          >
            <Pressable 
              style={[styles.tabItem, activeCompanyId === "ALL" && styles.tabItemActive]}
              onPress={() => setActiveCompanyId("ALL")}
            >
              <Text style={[styles.tabText, activeCompanyId === "ALL" && styles.tabTextActive]}>All Companies</Text>
            </Pressable>
            {companies.map(c => (
              <Pressable 
                key={c.id}
                style={[styles.tabItem, String(c.id) === activeCompanyId && styles.tabItemActive]}
                onPress={() => setActiveCompanyId(String(c.id))}
              >
                <Text style={[styles.tabText, String(c.id) === activeCompanyId && styles.tabTextActive]}>
                  {c.company_name || c.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Search & Type Filter Bar */}
          <View style={styles.filterBar}>
            <View style={styles.searchBox}>
              <Search size={14} color="#64748b" />
              <TextInput 
                placeholder="Search documents..." 
                placeholderTextColor="#64748b"
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {STATUS_OPTIONS.map(opt => (
                <Pressable 
                  key={opt}
                  onPress={() => setStatus(opt)}
                  style={[styles.pill, status === opt && styles.pillActive]}
                >
                  <Text style={[styles.pillText, status === opt && styles.pillTextActive]}>
                    {opt || "ALL STATUS"}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* Documents List */}
        <View style={styles.listContainer}>
          {loadingDocs && !refreshing ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color="#38bdf8" size="large" />
              <Text style={styles.mutedText}>Syncing Vault...</Text>
            </View>
          ) : filteredDocs.length === 0 ? (
            <View style={styles.centerBox}>
              <FolderLock size={48} color="#1e293b" />
              <Text style={styles.mutedText}>No documents found.</Text>
            </View>
          ) : (
            filteredDocs.map((doc, idx) => (
              <View key={`${doc.id}-${idx}`} style={styles.docCard}>
                
                {/* Card Header: Icon + Info */}
                <View style={styles.cardHeader}>
                  <View style={styles.fileIconBox}>
                    {getFileIcon(doc.doc_type, doc.doc_name)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docTitle} numberOfLines={1}>{doc.doc_name || "Untitled Document"}</Text>
                    <View style={styles.metaRow}>
                      <Building2 size={10} color="#64748b" />
                      <Text style={styles.docSubtitle} numberOfLines={1}>
                        {doc.company_name} • {formatBytes(doc.file_size_bytes)}
                      </Text>
                    </View>
                  </View>
                  <StatusBadge status={doc.status} />
                </View>

                {/* Card Footer: Details + Action */}
                <View style={styles.cardFooter}>
                  <View style={styles.tagList}>
                    <View style={styles.microTag}>
                      <Text style={styles.microTagText}>{doc.doc_type || "FILE"}</Text>
                    </View>
                    <Text style={styles.dateText}>{formatDate(doc.created_at)}</Text>
                  </View>

                  <Pressable 
                    onPress={() => openDoc(doc.doc_url)} 
                    style={({ pressed }) => [styles.viewBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.viewBtnText}>View</Text>
                    <Eye size={12} color="#e0f2fe" />
                  </Pressable>
                </View>

              </View>
            ))
          )}
        </View>
        
        {/* Bottom Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617", // Rich Midnight Blue
  },
  scrollContent: {
    paddingBottom: 80,
  },
  
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#020617",
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(74, 222, 128, 0.1)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.2)",
  },
  brandText: {
    color: "#4ade80",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  title: {
    color: "#f8fafc",
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  iconBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },

  // Toast
  toast: {
    position: 'absolute',
    top: 100,
    zIndex: 99,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  toastError: { backgroundColor: '#450a0a', borderColor: '#ef4444' },
  toastSuccess: { backgroundColor: '#064e3b', borderColor: '#10b981' },
  toastText: { color: 'white', fontWeight: '600', fontSize: 12 },

  // Stats Grid
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 52) / 2, // 2 column calculation
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  statValue: {
    color: "#f1f5f9",
    fontSize: 16,
    fontWeight: "700",
  },
  statLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "600",
  },

  // Sticky Filters
  stickySection: {
    backgroundColor: "rgba(2, 6, 23, 0.95)", // Glass effect
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    gap: 12,
  },
  companyRow: {
    paddingHorizontal: 20,
    gap: 16,
  },
  tabItem: {
    paddingVertical: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: "#38bdf8",
  },
  tabText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#e0f2fe",
    fontWeight: "700",
  },
  
  filterBar: {
    paddingHorizontal: 20,
    gap: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: "#f1f5f9",
    fontSize: 13,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  pillActive: {
    backgroundColor: "#38bdf8",
    borderColor: "#38bdf8",
  },
  pillText: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "600",
  },
  pillTextActive: {
    color: "#0f172a",
    fontWeight: "700",
  },

  // List
  listContainer: {
    padding: 20,
    gap: 12,
  },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    gap: 12,
  },
  mutedText: {
    color: "#475569",
    fontSize: 14,
  },

  // Doc Card
  docCard: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  fileIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  docTitle: {
    color: "#f1f5f9",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  docSubtitle: {
    color: "#94a3b8",
    fontSize: 11,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
  },
  tagList: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  microTag: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  microTagText: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "700",
  },
  dateText: {
    color: "#64748b",
    fontSize: 11,
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0ea5e9", // Sky 500
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  viewBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },

  // Badge Component
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  badgeActive: { backgroundColor: "rgba(74, 222, 128, 0.1)", borderColor: "rgba(74, 222, 128, 0.2)" },
  badgeArchived: { backgroundColor: "rgba(251, 191, 36, 0.1)", borderColor: "rgba(251, 191, 36, 0.2)" },
  dotActive: { backgroundColor: "#4ade80" },
  dotArchived: { backgroundColor: "#fbbf24" },
  textActive: { color: "#4ade80" },
  textArchived: { color: "#fbbf24" },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 9, fontWeight: "700" },
});
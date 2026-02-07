import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  ChevronRight,
  Hash,
  Search,
  Users,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../../src/context/authContext";
import api from "../../../../src/utils/api";

// Enable animations
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const THEME = {
  bg: "#020617",
  card: "#0f172a",
  cardBorder: "rgba(255,255,255,0.08)",
  primary: "#06b6d4", // Cyan
  secondary: "#8b5cf6", // Violet
  text: "#f8fafc",
  textMuted: "#64748b",
  success: "#10b981",
};

// --- COMPONENTS ---

const InitialsAvatar = ({ name }) => {
  const initial = (name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <View style={styles.avatarContainer}>
      <Text style={styles.avatarText}>{initial}</Text>
    </View>
  );
};

const EmployeeRow = ({ employee, returnTo }) => {
  const fullName = [employee.first_name, employee.last_name].filter(Boolean).join(" ");

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() =>
        router.push({
          pathname: "/(superadmin)/employees/[id]",
          params: { id: String(employee.id), returnTo },
        })
      }
    >
      {/* Left: Avatar */}
      <InitialsAvatar name={fullName} />

      {/* Middle: Details */}
      <View style={styles.cardContent}>
        <View style={styles.nameRow}>
          <Text style={styles.nameText} numberOfLines={1}>{fullName}</Text>
          {employee.status === "ACTIVE" && <View style={styles.activeDot} />}
        </View>
        
        <Text style={styles.roleText} numberOfLines={1}>
          {employee.designation || "No Designation"}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.badge}>
            <Hash size={10} color={THEME.textMuted} />
            <Text style={styles.badgeText}>{employee.emp_id || employee.id}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.badge}>
            <Briefcase size={10} color={THEME.textMuted} />
            <Text style={styles.badgeText}>{employee.department || "General"}</Text>
          </View>
        </View>
      </View>

      {/* Right: Action */}
      <View style={styles.actionArrow}>
        <ChevronRight size={18} color={THEME.textMuted} />
      </View>
    </Pressable>
  );
};

// --- MAIN SCREEN ---

export default function CompanyEmployeesPage() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams();
  const companyId = Array.isArray(id) ? id[0] : id;

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [query, setQuery] = useState("");

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [compRes, empRes] = await Promise.all([
        api.get(`/companies/${companyId}`),
        api.get("/employees", { params: { company_id: companyId } }),
      ]);
      setCompany(compRes.data?.data);
      setEmployees(empRes.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const filteredList = useMemo(() => {
    const q = query.toLowerCase();
    return employees.filter(e => 
      e.first_name?.toLowerCase().includes(q) ||
      e.emp_id?.toLowerCase().includes(q) ||
      e.department?.toLowerCase().includes(q)
    );
  }, [employees, query]);

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bg} />
      
      {/* Background Decor */}
      <View style={styles.glowTop} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Workforce Roster</Text>
          <Text style={styles.headerSub}>Manage employee profiles</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={THEME.primary} />}
      >
        
        {/* Company Hero Widget */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconBox}>
            <Building2 size={24} color={THEME.primary} />
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.companyName}>{company?.company_name || "Loading..."}</Text>
            <Text style={styles.companyMeta}>
              ID: {companyId} • Code: {company?.company_code || "---"}
            </Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{employees.length}</Text>
            <Users size={12} color="#fff" />
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={18} color={THEME.textMuted} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search by name, ID, or dept..."
            placeholderTextColor={THEME.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {/* List */}
        <View style={styles.listContainer}>
          {loading ? (
             <View style={styles.loadingState}>
               <ActivityIndicator color={THEME.primary} />
               <Text style={styles.loadingText}>Loading profiles...</Text>
             </View>
          ) : filteredList.length === 0 ? (
             <View style={styles.emptyState}>
               <Users size={40} color="#1e293b" />
               <Text style={styles.emptyText}>No employees found matching "{query}"</Text>
             </View>
          ) : (
            filteredList.map(emp => (
              <EmployeeRow 
                key={emp.id} 
                employee={emp} 
                returnTo={`/(superadmin)/company/employees/${companyId}`} 
              />
            ))
          )}
        </View>
        
        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  glowTop: {
    position: 'absolute',
    top: -100,
    right: -50,
    width: 300,
    height: 300,
    backgroundColor: THEME.primary,
    opacity: 0.08,
    borderRadius: 150,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerSub: {
    fontSize: 12,
    color: THEME.textMuted,
  },

  // Hero Card
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  companyName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  companyMeta: {
    fontSize: 12,
    color: THEME.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  countBadge: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countText: {
    color: '#083344',
    fontWeight: '800',
    fontSize: 14,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.card,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    color: '#fff',
    fontSize: 15,
  },

  // List Item
  listContainer: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.card,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  cardPressed: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    transform: [{ scale: 0.99 }],
  },
  
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.primary,
  },

  cardContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.success,
  },
  roleText: {
    fontSize: 13,
    color: '#a5f3fc', // Light cyan
    marginBottom: 6,
    fontWeight: '500',
  },
  
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    color: THEME.textMuted,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 8,
  },

  actionArrow: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 10,
    marginLeft: 10,
  },

  // States
  loadingState: {
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: THEME.textMuted,
    fontSize: 13,
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
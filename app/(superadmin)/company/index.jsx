import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import {
  ArrowRight,
  Building,
  CheckCircle2,
  LayoutGrid,
  Search,
  Users,
  Zap
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../src/context/authContext";
import api from "../../../src/utils/api";

// Enable LayoutAnimation for smooth state changes on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ACTIVE_COMPANY_KEY = "active_company_id";
const THEME = {
  bg: "#020617",       // Deep Space
  card: "#0f172a",     // Dark Slate
  cardBorder: "rgba(255,255,255,0.08)",
  primary: "#3b82f6",  // Electric Blue
  accent: "#06b6d4",   // Cyan
  text: "#f8fafc",
  textMuted: "#64748b",
  success: "#10b981",
};

// --- STORAGE UTILS ---
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

// --- COMPONENTS ---

const CompanyAvatar = ({ name, color = THEME.accent }) => {
  const initial = name ? name.charAt(0).toUpperCase() : "C";
  return (
    <View style={[styles.avatarBox, { borderColor: color + "40", backgroundColor: color + "10" }]}>
      <Text style={[styles.avatarText, { color: color }]}>{initial}</Text>
    </View>
  );
};

const ActiveHeroCard = ({ company }) => {
  if (!company) return null;
  return (
    <View style={styles.heroContainer}>
      <View style={styles.heroGlow} />
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>CURRENT WORKSPACE</Text>
          </View>
          <Zap size={16} color="#fbbf24" fill="#fbbf24" />
        </View>

        <View style={styles.heroContent}>
          <Text style={styles.heroName} numberOfLines={1}>{company.company_name}</Text>
          <Text style={styles.heroCode}>{company.company_code || "NO CODE"}</Text>
        </View>

        <View style={styles.heroFooter}>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaLabel}>ID</Text>
            <Text style={styles.heroMetaValue}>{company.id}</Text>
          </View>
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaLabel}>STATUS</Text>
            <Text style={styles.heroMetaValue}>{company.status}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const CompanyListItem = ({ item, isActive, onSelect }) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isActive && styles.cardActive,
        pressed && styles.cardPressed,
      ]}
      onPress={() => onSelect(item.id)}
    >
      <View style={styles.cardLeft}>
        <CompanyAvatar name={item.company_name} color={isActive ? THEME.success : THEME.primary} />
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, isActive && { color: THEME.success }]}>
            {item.company_name}
          </Text>
          <Text style={styles.cardSub}>
            {/* {item.company_code || "---"} • {item.city || "Remote"} */}
            {item.company_code || "---"}
          </Text>
        </View>
      </View>

      {isActive && (
        <View style={styles.activeCheck}>
          <CheckCircle2 size={18} color={THEME.success} />
        </View>
      )}

      {/* Quick Actions Strip */}
      <View style={styles.actionStrip}>
        <Pressable 
          style={styles.iconBtn} 
          onPress={() => router.push(`/(superadmin)/company/employees/${item.id}`)}
        >
          <Users size={16} color={THEME.textMuted} />
        </Pressable>
        
        <View style={styles.dividerVertical} />
        
        <Pressable 
          style={styles.iconBtn} 
          onPress={() => router.push(`/(superadmin)/company/${item.id}`)}
        >
          <ArrowRight size={16} color={THEME.text} />
        </Pressable>
      </View>
    </Pressable>
  );
};

// --- MAIN PAGE ---

export default function CompanyIndexPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/companies");
      setCompanies(res.data?.data || []);
      
      const stored = await getStoredActiveCompanyId();
      if (stored) setActiveId(stored);
      else if (res.data?.data?.length > 0) setActiveId(res.data.data[0].id);
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const handleSelect = async (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveId(id);
    await setStoredActiveCompanyId(id);
  };

  const activeCompany = useMemo(() => companies.find(c => String(c.id) === String(activeId)), [companies, activeId]);
  
  const filteredList = useMemo(() => {
    const q = search.toLowerCase();
    return companies.filter(c => 
      c.company_name?.toLowerCase().includes(q) || 
      c.company_code?.toLowerCase().includes(q)
    );
  }, [companies, search]);

  if (!user) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bg} />
      
      {/* Background Ambience */}
      <View style={styles.ambientLight} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={THEME.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <LayoutGrid size={20} color={THEME.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Company Hub</Text>
            <Text style={styles.headerSub}>Manage organizations & access</Text>
          </View>
        </View>

        {/* Active Hero Card */}
        <ActiveHeroCard company={activeCompany} />

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={18} color={THEME.textMuted} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search by name or code..."
              placeholderTextColor={THEME.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* List Header */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>ALL ORGANIZATIONS</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{filteredList.length}</Text>
          </View>
        </View>

        {/* Company List */}
        <View style={styles.listContainer}>
          {filteredList.map(item => (
            <CompanyListItem 
              key={item.id}
              item={item}
              isActive={String(item.id) === String(activeId)}
              onSelect={handleSelect}
            />
          ))}
          
          {filteredList.length === 0 && !loading && (
             <View style={styles.emptyState}>
               <Building size={40} color="#1e293b" />
               <Text style={styles.emptyText}>No companies match your search</Text>
             </View>
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
  ambientLight: {
    position: 'absolute',
    top: -100,
    right: -100,
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
    marginBottom: 24,
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 13,
    color: THEME.textMuted,
  },

  // Hero Card
  heroContainer: {
    marginBottom: 24,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: -10,
    backgroundColor: THEME.primary,
    opacity: 0.15,
    borderRadius: 24,
    filter: 'blur(20px)', // Will work on web, ignored on native without logic
  },
  heroCard: {
    backgroundColor: '#1e293b', // Slightly lighter than bg
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.success,
  },
  liveText: {
    color: THEME.success,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroContent: {
    marginBottom: 16,
  },
  heroName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  heroCode: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  heroFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
    gap: 24,
  },
  heroMetaLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 2,
  },
  heroMetaValue: {
    fontSize: 13,
    color: '#e2e8f0',
    fontWeight: '600',
  },

  // Search
  searchSection: {
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.card,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    color: '#fff',
    fontSize: 15,
  },

  // List Header
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  listTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
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
    justifyContent: 'space-between',
  },
  cardActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 12,
    color: '#64748b',
  },
  
  // Actions
  actionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 4,
    marginLeft: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  dividerVertical: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  activeCheck: {
    marginRight: 8,
  },

  emptyState: {
    alignItems: 'center',
    marginTop: 40,
    opacity: 0.5,
  },
  emptyText: {
    color: THEME.textMuted,
    marginTop: 10,
    fontSize: 13,
  },
});
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Globe,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Users
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  Pressable,
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

// Enable animations
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const THEME = {
  bg: "#020617",
  card: "#0f172a",
  cardBorder: "rgba(255,255,255,0.08)",
  primary: "#3b82f6",
  success: "#10b981",
  text: "#f8fafc",
  textMuted: "#64748b",
  inputBg: "#1e293b",
};

// --- HELPER COMPONENTS ---

const TabSelector = ({ activeTab, onTabChange }) => (
  <View style={styles.tabContainer}>
    <Pressable
      style={[styles.tab, activeTab === "overview" && styles.tabActive]}
      onPress={() => onTabChange("overview")}
    >
      <Building2 size={14} color={activeTab === "overview" ? "#fff" : THEME.textMuted} />
      <Text style={[styles.tabText, activeTab === "overview" && styles.tabTextActive]}>Overview</Text>
    </Pressable>
    <Pressable
      style={[styles.tab, activeTab === "workforce" && styles.tabActive]}
      onPress={() => onTabChange("workforce")}
    >
      <Users size={14} color={activeTab === "workforce" ? "#fff" : THEME.textMuted} />
      <Text style={[styles.tabText, activeTab === "workforce" && styles.tabTextActive]}>Workforce</Text>
    </Pressable>
  </View>
);

const InfoRow = ({ icon: Icon, label, value, isEditing, onChangeText, multiline }) => {
  return (
    <View style={styles.infoRow}>
      <View style={styles.iconBox}>
        <Icon size={16} color={THEME.textMuted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        {isEditing ? (
          <TextInput
            value={value}
            onChangeText={onChangeText}
            style={[styles.input, multiline && styles.inputMultiline]}
            multiline={multiline}
            placeholder={`Enter ${label}`}
            placeholderTextColor={THEME.textMuted}
          />
        ) : (
          <Text style={styles.infoValue}>{value || "Not provided"}</Text>
        )}
      </View>
    </View>
  );
};

const EmployeeRow = ({ employee, onPress }) => {
  const initials = (employee.first_name?.[0] || "") + (employee.last_name?.[0] || "");
  return (
    <Pressable style={styles.empRow} onPress={onPress}>
      <View style={styles.empAvatar}>
        <Text style={styles.empAvatarText}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.empName}>
          {employee.first_name} {employee.last_name}
        </Text>
        <Text style={styles.empRole}>{employee.designation || "No Designation"}</Text>
      </View>
      <View style={styles.empMeta}>
        <Text style={styles.empId}>{employee.emp_id}</Text>
      </View>
      <ChevronRight size={16} color={THEME.textMuted} />
    </Pressable>
  );
};

// --- MAIN SCREEN ---

export default function CompanyDetailPage() {
  const { user } = useAuth();
  const { id } = useLocalSearchParams();
  
  // State
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Employees State
  const [employees, setEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Initial Fetch
  const fetchDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [compRes, empRes] = await Promise.all([
        api.get(`/companies/${id}`),
        api.get("/employees", { params: { company_id: id } })
      ]);
      setCompany(compRes.data?.data);
      setDraft(compRes.data?.data);
      setEmployees(empRes.data?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (user) fetchDetails();
  }, [user, fetchDetails]);

  // Handlers
  const toggleTab = (tab) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/companies/${id}`, draft);
      setCompany(draft);
      setIsEditing(false);
    } catch (e) {
      alert("Failed to update company");
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(e => 
      e.first_name?.toLowerCase().includes(q) || 
      e.emp_id?.toLowerCase().includes(q)
    );
  }, [employees, search]);

  if (!user || loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={THEME.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bg} />
      
      {/* Background Decor */}
      <View style={styles.glowTop} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Company Details</Text>
        
        {/* {activeTab === "overview" && (
          <Pressable 
            style={[styles.actionBtn, isEditing ? styles.saveBtn : styles.editBtn]} 
            onPress={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={saving}
          >
            {isEditing ? (
              saving ? <ActivityIndicator color="#064e3b" size="small"/> : <Save size={16} color="#064e3b" />
            ) : (
              <Text style={styles.editBtnText}>Edit</Text>
            )}
          </Pressable>
        )} */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.logoPlaceholder}>
              <Building2 size={24} color={THEME.primary} />
            </View>
            <View style={[styles.statusBadge, { backgroundColor: (isEditing ? draft.status : company.status) === 'ACTIVE' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' }]}> 
              <Text style={[styles.statusText, { color: (isEditing ? draft.status : company.status) === 'ACTIVE' ? '#34d399' : '#f87171' }]}>
                {(isEditing ? draft.status : company.status)?.toUpperCase()}
              </Text>
            </View>
          </View>
          
          {isEditing ? (
             <TextInput 
                style={styles.heroInput} 
                value={draft.company_name} 
                onChangeText={t => setDraft({...draft, company_name: t})}
             />
          ) : (
             <Text style={styles.companyName}>{company.company_name}</Text>
          )}
          
          <Text style={styles.companyId}>ID: {company.id} • Code: {company.company_code}</Text>
        </View>

        {/* Tab Switcher */}
        <TabSelector activeTab={activeTab} onTabChange={toggleTab} />

        {/* --- OVERVIEW TAB --- */}
        {activeTab === "overview" && (
          <View style={styles.sectionContainer}>
            {/* General Info */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Legal & Identification</Text>
              <InfoRow 
                icon={ShieldCheck} label="Legal Name" 
                value={isEditing ? draft.legal_name : company.legal_name} 
                isEditing={isEditing}
                onChangeText={t => setDraft({...draft, legal_name: t})}
              />
              <InfoRow 
                icon={CreditCard} label="GST Number" 
                value={isEditing ? draft.gst_number : company.gst_number} 
                isEditing={isEditing}
                onChangeText={t => setDraft({...draft, gst_number: t})}
              />
            </View>

            {/* Contact Info */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Contact Details</Text>
              <InfoRow 
                icon={Mail} label="Email Address" 
                value={isEditing ? draft.contact_email : company.contact_email} 
                isEditing={isEditing}
                onChangeText={t => setDraft({...draft, contact_email: t})}
              />
              <InfoRow 
                icon={Phone} label="Phone Number" 
                value={isEditing ? draft.contact_phone : company.contact_phone} 
                isEditing={isEditing}
                onChangeText={t => setDraft({...draft, contact_phone: t})}
              />
               <InfoRow 
                icon={Globe} label="Website" 
                value={isEditing ? draft.website : company.website} 
                isEditing={isEditing}
                onChangeText={t => setDraft({...draft, website: t})}
              />
              <InfoRow 
                icon={MapPin} label="Office Address" 
                value={isEditing ? draft.address : company.address} 
                isEditing={isEditing} multiline
                onChangeText={t => setDraft({...draft, address: t})}
              />
            </View>

             <View style={styles.card}>
              <Text style={styles.cardTitle}>System Meta</Text>
              <InfoRow icon={CalendarDays} label="Created On" value={new Date(company.created_at).toLocaleDateString()} />
            </View>
          </View>
        )}

        {/* --- WORKFORCE TAB --- */}
        {activeTab === "workforce" && (
          <View style={styles.sectionContainer}>
            <View style={styles.searchBar}>
              <Search size={16} color={THEME.textMuted} />
              <TextInput 
                style={styles.searchInput}
                placeholder="Search employees..."
                placeholderTextColor={THEME.textMuted}
                value={search}
                onChangeText={setSearch}
              />
            </View>

            <View style={styles.listContainer}>
              {filteredEmployees.map(emp => (
                <EmployeeRow 
                  key={emp.id} 
                  employee={emp} 
                  onPress={() => router.push({ pathname: "/(superadmin)/employees/[id]", params: { id: emp.id } })}
                />
              ))}
              {filteredEmployees.length === 0 && (
                <Text style={styles.emptyText}>No employees found.</Text>
              )}
            </View>
          </View>
        )}
        
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
  glowTop: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    backgroundColor: THEME.primary,
    opacity: 0.1,
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  editBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: THEME.success,
    width: 40,
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  // Hero Card
  heroCard: {
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  companyName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  heroInput: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.primary,
    paddingBottom: 2,
  },
  companyId: {
    fontSize: 13,
    color: THEME.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.card,
    padding: 4,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: '#334155',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.textMuted,
  },
  tabTextActive: {
    color: '#fff',
  },

  // Overview Cards
  sectionContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    gap: 16,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  infoLabel: {
    fontSize: 11,
    color: THEME.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#1e293b',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // Workforce
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.card,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: '#fff',
  },
  listContainer: {
    gap: 10,
  },
  empRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.card,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    gap: 12,
  },
  empAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  empAvatarText: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '800',
  },
  empName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  empRole: {
    color: THEME.textMuted,
    fontSize: 11,
  },
  empMeta: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  empId: {
    color: '#94a3b8',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptyText: {
    color: THEME.textMuted,
    textAlign: 'center',
    marginTop: 20,
  },
});
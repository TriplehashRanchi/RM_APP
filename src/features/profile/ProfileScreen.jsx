import {
  BadgeCheck,
  Building2,
  CreditCard,
  Fingerprint,
  LogOut,
  Mail,
  ShieldCheck,
  Smartphone
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/authContext";
import api from "../../utils/api";

// --- THEME & UTILS ---
const THEME = {
  bg: "#020617",
  card: "#0f172a",
  cardBorder: "rgba(255,255,255,0.06)",
  primary: "#3b82f6",
  success: "#10b981",
  danger: "#ef4444",
  text: "#f8fafc",
  subtext: "#94a3b8",
};

const getInitials = (name) => {
  return (name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

// --- COMPONENTS ---

const ProfileHeader = ({ name, role, status }) => {
  const isActive = status === "ACTIVE";
  return (
    <View style={styles.headerContainer}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(name)}</Text>
          </View>
        </View>
        <View style={[styles.statusDot, { backgroundColor: isActive ? THEME.success : THEME.danger }]} />
      </View>

      <Text style={styles.userName}>{name || "User"}</Text>
      
      <View style={styles.rolePill}>
        <BadgeCheck size={12} color={THEME.primary} />
        <Text style={styles.roleText}>{role || "Team Member"}</Text>
      </View>
    </View>
  );
};

const InfoTile = ({ label, value, icon: Icon, color }) => (
  <View style={styles.tile}>
    <View style={[styles.tileIcon, { backgroundColor: color + "15" }]}>
      <Icon size={16} color={color} />
    </View>
    <View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  </View>
);

const SettingRow = ({ icon: Icon, label, value, isLast, color = "#fff" }) => (
  <View style={[styles.row, !isLast && styles.rowBorder]}>
    <View style={styles.rowLeft}>
      <View style={[styles.rowIconBox, { backgroundColor: "rgba(255,255,255,0.03)" }]}>
        <Icon size={16} color={THEME.subtext} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
    </View>
    <View style={styles.rowRight}>
      <Text style={[styles.rowValue, { color }]}>{value}</Text>
      {/* <ChevronRight size={14} color={THEME.cardBorder} style={{ marginLeft: 4 }} /> */}
    </View>
  </View>
);

// --- MAIN SCREEN ---

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/auth/me");
      setProfile(res.data?.user || null);
    } catch (e) {
      // Fallback to context user if API fails
      setProfile(user);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
  };

  if (!user) return null;

  const displayName = profile?.full_name || profile?.name || "User";
  const displayRole = (profile?.role || "Employee").replace("_", " ");

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bg} />
      
      {/* Ambient Background Glows */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchProfile} tintColor={THEME.primary} />}
      >
        {/* 1. Identity Section */}
        <ProfileHeader 
          name={displayName} 
          role={displayRole} 
          status={profile?.status || "ACTIVE"} 
        />

        {/* 2. Quick Stats Grid */}
        <View style={styles.gridContainer}>
          <InfoTile 
            label="Employee ID" 
            value={profile?.emp_id || profile?.id || "--"} 
            icon={Fingerprint} 
            color="#A78BFA" 
          />
          <InfoTile 
            label="Department" 
            value={profile?.department || "General"} 
            icon={Building2} 
            color="#34D399" 
          />
        </View>

        {/* 3. Contact Information Group */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>CONTACT DETAILS</Text>
          <View style={styles.card}>
            <SettingRow 
              icon={Mail} 
              label="Email Address" 
              value={profile?.email} 
            />
            <SettingRow 
              icon={Smartphone} 
              label="Phone Number" 
              value={profile?.phone || "Not Set"} 
              isLast 
            />
          </View>
        </View>

        {/* 4. Account Security Group */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>SECURITY & ACCESS</Text>
          <View style={styles.card}>
            <SettingRow 
              icon={ShieldCheck} 
              label="Account Status" 
              value={profile?.status || "Active"} 
              color={THEME.success}
            />
            <SettingRow 
              icon={CreditCard} 
              label="Role Level" 
              value={displayRole} 
              isLast 
            />
          </View>
        </View>

        {/* 5. Logout Button */}
        <View style={styles.footer}>
          <Pressable 
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]} 
            onPress={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut ? (
              <ActivityIndicator color="#FECACA" size="small" />
            ) : (
              <>
                <LogOut size={16} color="#FECACA" />
                <Text style={styles.logoutText}>Sign Out</Text>
              </>
            )}
          </Pressable>
          <Text style={styles.versionText}>v1.0.4 • Secure Connection</Text>
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
  glowTop: {
    position: 'absolute',
    top: -100,
    left: '20%',
    width: 250,
    height: 250,
    backgroundColor: '#3B82F6',
    borderRadius: 125,
    opacity: 0.15,
    transform: [{ scaleX: 1.5 }],
  },
  glowBottom: {
    position: 'absolute',
    bottom: -50,
    right: -50,
    width: 300,
    height: 300,
    backgroundColor: '#10B981',
    borderRadius: 150,
    opacity: 0.08,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Header
  headerContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarRing: {
    padding: 6,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  statusDot: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: THEME.bg,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  roleText: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Grid
  gridContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  tile: {
    flex: 1,
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  tileLabel: {
    color: THEME.subtext,
    fontSize: 11,
  },

  // Sections
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: THEME.subtext,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'transparent',
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  rowLabel: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowValue: {
    color: THEME.subtext,
    fontSize: 14,
    fontWeight: '600',
  },

  // Footer
  footer: {
    marginTop: 10,
    alignItems: 'center',
    gap: 16,
  },
  logoutBtn: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    gap: 8,
  },
  logoutPressed: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutText: {
    color: '#FECACA',
    fontSize: 14,
    fontWeight: '700',
  },
  versionText: {
    color: '#475569',
    fontSize: 11,
  },
});

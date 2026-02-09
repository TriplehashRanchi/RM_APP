import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/context/authContext";
import api from "../../src/utils/api";

function getGreeting() {
  const nowInIndia = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const h = nowInIndia.getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function AnimatedNum({ value, style, prefix = "" }) {
  const animated = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    animated.stopAnimation();
    Animated.timing(animated, {
      toValue: Number.isFinite(value) ? Number(value) : 0,
      duration: 1000,
      useNativeDriver: false,
    }).start();

    const id = animated.addListener(({ value: next }) => {
      setDisplay(Math.max(0, Math.floor(next)));
    });

    return () => animated.removeListener(id);
  }, [animated, value]);

  return <Text style={style}>{prefix}{display.toLocaleString("en-IN")}</Text>;
}

function IconShape({ type, color }) {
  const base = {
    width: 18,
    height: 18,
    borderColor: color,
    borderWidth: 2,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
  };

  if (type === "user") {
    return (
      <View style={[base, { borderRadius: 11 }]}>
        <View
          style={{
            width: 8,
            height: 4,
            backgroundColor: color,
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
            marginTop: 5,
          }}
        />
        <View
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: color,
            position: "absolute",
            top: 3,
          }}
        />
      </View>
    );
  }

  if (type === "clock") {
    return (
      <View style={[base, { borderRadius: 12 }]}>
        <View
          style={{ width: 2, height: 5, backgroundColor: color, position: "absolute", top: 3 }}
        />
        <View
          style={{ width: 4, height: 2, backgroundColor: color, position: "absolute", left: 8 }}
        />
      </View>
    );
  }

  return <View style={base} />;
}

function HeroCard({ companyCount, employeeCount }) {
  return (
    <View style={styles.heroWrap}>
      <View style={styles.heroCard}>
        <View style={styles.heroTopLine}>
          <View style={styles.heroDot} />
          <Text style={styles.heroEyebrow}>SUPERADMIN WORKFORCE BOARD</Text>
        </View>

        <View style={styles.heroBody}>
          <View>
            <Text style={styles.heroLabel}>TOTAL WORKFORCE</Text>
            <AnimatedNum value={employeeCount} style={styles.heroValue} />
            <Text style={styles.heroSub}>Active across {companyCount} companies</Text>
          </View>
          <View style={styles.heroOrb}>
            <View style={styles.heroOrbInner} />
          </View>
        </View>

        <View style={styles.heroBlob1} />
        <View style={styles.heroBlob2} />
      </View>
    </View>
  );
}

function StatTile({ label, value, color, type }) {
  return (
    <View style={styles.tile}>
      <View style={[styles.tileIconWrap, { backgroundColor: `${color}24` }]}>
        <IconShape type={type} color={color} />
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function ActionRow({ label, value, color, isLast = false }) {
  return (
    <View style={[styles.actionRow, !isLast && styles.actionBorder]}>
      <View style={styles.actionLeft}>
        <View style={[styles.actionDot, { backgroundColor: color }]} />
        <Text style={styles.actionLabel}>{label}</Text>
      </View>
      <View style={styles.actionPill}>
        <Text style={[styles.actionPillText, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

function ActivityBars({ values }) {
  const max = Math.max(...values.map((v) => v.value), 1);

  return (
    <View style={styles.chartWrap}>
      <View style={styles.chartRow}>
        {values.map((item) => {
          const height = Math.max(10, Math.round((item.value / max) * 100));
          return (
            <View key={item.key} style={styles.chartCol}>
              <View style={styles.chartTrack}>
                <View style={[styles.chartFill, { height: `${height}%`, backgroundColor: item.color }]} />
              </View>
              <Text style={styles.chartValue}>{item.value}</Text>
              <Text style={styles.chartLabel}>{item.short}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function SuperadminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    companies: 0,
    employees: 0,
    pendingLeaves: 0,
    onLeaveToday: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
    newEmployees: 0,
    upcomingHolidays: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/dashboard/superadmin");
      const data = res.data?.data || {};
      setStats({
        companies: Number(data.companies || 0),
        employees: Number(data.employees || 0),
        pendingLeaves: Number(data.pendingLeaves || 0),
        onLeaveToday: Number(data.onLeaveToday || 0),
        approvedThisMonth: Number(data.approvedThisMonth || 0),
        rejectedThisMonth: Number(data.rejectedThisMonth || 0),
        newEmployees: Number(data.newEmployees || 0),
        upcomingHolidays: Number(data.upcomingHolidays || 0),
      });
    } catch (e) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const approved = Number(stats.approvedThisMonth || 0);
  const rejected = Number(stats.rejectedThisMonth || 0);
  const name = user?.name || user?.email?.split("@")[0] || "Admin";
  const greeting = getGreeting();

  const chartData = useMemo(
    () => [
      { key: "onLeaveToday", short: "Leave", value: Number(stats.onLeaveToday || 0), color: "#60A5FA" },
      { key: "pendingLeaves", short: "Pend", value: Number(stats.pendingLeaves || 0), color: "#FBBF24" },
      { key: "approvedThisMonth", short: "Appr", value: approved, color: "#34D399" },
      { key: "rejectedThisMonth", short: "Rej", value: rejected, color: "#F87171" },
      { key: "newEmployees", short: "Hire", value: Number(stats.newEmployees || 0), color: "#22D3EE" },
      { key: "upcomingHolidays", short: "Holi", value: Number(stats.upcomingHolidays || 0), color: "#A78BFA" },
    ],
    [approved, rejected, stats]
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1220" />
      <View style={styles.ambientTop} />
      <View style={styles.ambientBottom} />

      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.username}>{name}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(superadmin)/profile")}
          style={styles.avatarWrap}
          activeOpacity={0.85}
        >
          <Text style={styles.avatarText}>{String(name).charAt(0).toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchStats}
            tintColor="#93C5FD"
          />
        }
      >
        <HeroCard
          companyCount={Number(stats.companies || 0)}
          employeeCount={Number(stats.employees || 0)}
        />

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Snapshot</Text>
          <Text style={styles.sectionMeta}>Live</Text>
        </View>

        <View style={styles.snapshotGrid}>
          <StatTile label="On Leave" value={stats.onLeaveToday} color="#60A5FA" type="user" />
          <StatTile label="Pending" value={stats.pendingLeaves} color="#FBBF24" type="clock" />
          <StatTile label="New Hires" value={stats.newEmployees} color="#34D399" type="user" />
          <StatTile label="Companies" value={stats.companies} color="#A78BFA" type="clock" />
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <Text style={styles.panelTitle}>Monthly Decisions</Text>
            <TouchableOpacity
              onPress={() => router.push("/(superadmin)/leave-requests")}
              style={styles.leaveNavBtn}
              activeOpacity={0.85}
            >
              <Text style={styles.leaveNavIcon}>{">"}</Text>
            </TouchableOpacity>
          </View>

          <ActionRow label="Approved Requests" value={approved} color="#34D399" />
          <ActionRow label="Rejected Requests" value={rejected} color="#F87171" />
          <ActionRow
            label="Upcoming Holidays"
            value={stats.upcomingHolidays}
            color="#A78BFA"
            isLast
          />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Workforce Activity Pulse</Text>
          <ActivityBars values={chartData} />
          <Text style={styles.chartCaption}>Current trend across key operations</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1220",
  },
  ambientTop: {
    position: "absolute",
    top: -120,
    right: -70,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(59,130,246,0.22)",
  },
  ambientBottom: {
    position: "absolute",
    left: -80,
    bottom: -140,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(14,165,233,0.14)",
  },

  header: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  greeting: {
    color: "#93A4BE",
    fontSize: 14,
    fontWeight: "500",
  },
  username: {
    marginTop: 2,
    color: "#F8FAFC",
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  avatarWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#121D30",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#DBEAFE",
    fontSize: 16,
    fontWeight: "800",
  },

  scrollContent: {
    paddingBottom: 130,
  },

  heroWrap: {
    paddingHorizontal: 22,
    marginBottom: 24,
  },
  heroCard: {
    borderRadius: 26,
    minHeight: 192,
    padding: 22,
    overflow: "hidden",
    backgroundColor: "#2563EB",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    shadowColor: "#1D4ED8",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  heroTopLine: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  heroDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#BFDBFE",
    marginRight: 8,
  },
  heroEyebrow: {
    color: "#DBEAFE",
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  heroBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 2,
  },
  heroLabel: {
    color: "#DBEAFE",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  heroValue: {
    color: "#FFFFFF",
    fontSize: 44,
    fontWeight: "900",
    marginTop: 4,
    lineHeight: 48,
  },
  heroSub: {
    color: "#DBEAFE",
    fontSize: 13,
    marginTop: 4,
  },
  heroOrb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroOrbInner: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  heroBlob1: {
    position: "absolute",
    top: -60,
    left: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "rgba(147,197,253,0.35)",
  },
  heroBlob2: {
    position: "absolute",
    right: -40,
    bottom: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(30,64,175,0.45)",
  },

  errorBox: {
    marginHorizontal: 22,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.45)",
    backgroundColor: "rgba(248,113,113,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: "#FECACA",
    fontSize: 12.5,
    fontWeight: "600",
  },

  sectionHead: {
    paddingHorizontal: 22,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 19,
    fontWeight: "700",
  },
  sectionMeta: {
    color: "#7DD3FC",
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: "700",
  },

  snapshotGrid: {
    paddingHorizontal: 22,
    paddingBottom: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tile: {
    width: "48%",
    minHeight: 92,
    borderRadius: 22,
    backgroundColor: "#121D30",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.22)",
    padding: 12,
    marginBottom: 10,
    justifyContent: "space-between",
  },
  tileIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  tileValue: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  tileLabel: {
    color: "#93A4BE",
    fontSize: 12.5,
    fontWeight: "500",
    textAlign: "center",
  },

  panel: {
    marginHorizontal: 22,
    marginTop: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    backgroundColor: "#121D30",
    padding: 18,
  },
  panelHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  panelTitle: {
    color: "#F8FAFC",
    fontSize: 17,
    fontWeight: "700",
  },
  leaveNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.16)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
  },
  leaveNavIcon: {
    color: "#fca5a5",
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 1,
  },

  actionRow: {
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.16)",
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 10,
  },
  actionLabel: {
    color: "#D1D9E8",
    fontSize: 14,
    fontWeight: "500",
  },
  actionPill: {
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
  },
  actionPillText: {
    fontSize: 13,
    fontWeight: "800",
  },

  chartWrap: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    backgroundColor: "#0E1727",
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  chartRow: {
    minHeight: 164,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  chartCol: {
    width: "15.5%",
    alignItems: "center",
  },
  chartTrack: {
    width: "78%",
    height: 106,
    borderRadius: 10,
    backgroundColor: "rgba(148,163,184,0.15)",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  chartFill: {
    width: "100%",
    borderRadius: 10,
  },
  chartValue: {
    marginTop: 7,
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
  },
  chartLabel: {
    marginTop: 1,
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "600",
  },
  chartCaption: {
    marginTop: 12,
    color: "#93A4BE",
    fontSize: 12,
    textAlign: "center",
  },
});

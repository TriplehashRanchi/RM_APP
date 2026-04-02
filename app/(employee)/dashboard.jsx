import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
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
  return "Hey There";
}

function formatDate(value) {
  if (!value) return "No date";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "No date";
  }
}

function AnimatedNum({ value, style, prefix = "" }) {
  const animated = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    animated.stopAnimation();
    Animated.timing(animated, {
      toValue: Number.isFinite(value) ? Number(value) : 0,
      duration: 900,
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

function HeroCard({ totalRequests, approved, pending, holidayName, holidayDate }) {
  return (
    <View style={styles.heroWrap}>
      <View style={styles.heroCard}>
        <View style={styles.heroTopLine}>
          <View style={styles.heroDot} />
          <Text style={styles.heroEyebrow}>EMPLOYEE REQUEST BOARD</Text>
        </View>

        <View style={styles.heroBody}>
          <View>
            <Text style={styles.heroLabel}>TOTAL REQUESTS</Text>
            <AnimatedNum value={totalRequests} style={styles.heroValue} />
            <Text style={styles.heroSub}>Approved {approved} | Pending {pending}</Text>
            <Text style={styles.heroSubSecondary}>{holidayName} • {holidayDate}</Text>
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

function HolidayHighlight({ name, dateLabel }) {
  return (
    <View style={styles.holidayWrap}>
      <View style={styles.holidayCard}>
        <View style={styles.holidayTopLine}>
          <View style={styles.holidayDot} />
          <Text style={styles.holidayEyebrow}>NEXT HOLIDAY</Text>
        </View>
        <Text style={styles.holidayName}>{name}</Text>
        <Text style={styles.holidayDate}>{dateLabel}</Text>
        <Text style={styles.holidaySub}>
          Plan your leave and handovers early for smoother team coordination.
        </Text>
      </View>
    </View>
  );
}

function MetricBar({ label, value, color }) {
  const width = value === 0 ? "0%" : `${Math.min(100, value * 10)}%`;
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHead}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}</Text>
      </View>
      <View style={styles.metricTrack}>
        <View style={[styles.metricFill, { width, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function MiniCard({ label, value, tone }) {
  return (
    <View style={styles.miniCard}>
      <View style={styles.miniHead}>
        <Text style={styles.miniLabel}>{label}</Text>
        <View
          style={[
            styles.miniDot,
            {
              backgroundColor:
                tone === "green" ? "rgba(52,211,153,0.25)" : "rgba(251,191,36,0.25)",
            },
          ]}
        />
      </View>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  );
}

function LegendRow({ label, value, color }) {
  return (
    <View style={styles.legendRow}>
      <View style={styles.legendLeft}>
        <View style={[styles.legendDot, { backgroundColor: color }]} />
        <Text style={styles.legendLabel}>{label}</Text>
      </View>
      <Text style={styles.legendValue}>{value}</Text>
    </View>
  );
}


export default function EmployeeDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    approved: 0,
    pending: 0,
    onLeaveToday: 0,
    nextHolidayName: "No upcoming holiday",
    nextHolidayDate: "",
  });
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    setError("");
    try {
      const res = await api.get("/dashboard/employee");
      const data = res.data?.data || {};
      const nextHoliday = data.nextHoliday || {};

      setStats({
        approved: Number(data.approved || 0),
        pending: Number(data.pending || 0),
        onLeaveToday: Number(data.onLeaveToday || 0),
        nextHolidayName: nextHoliday?.name || "No upcoming holiday",
        nextHolidayDate: nextHoliday?.holiday_date || "",
      });
    } catch (e) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to load dashboard."
      );
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchStats();
  }, [fetchStats, user]);

  const approved = Number(stats.approved || 0);
  const pending = Number(stats.pending || 0);
  const onLeaveToday = Number(stats.onLeaveToday || 0);
  const totalRequests = approved + pending;
  const holidayDateLabel = formatDate(stats.nextHolidayDate);
  const name = user?.name || user?.email?.split("@")[0] || "Employee";
  const greeting = getGreeting();

  const leaveSplit = useMemo(() => {
    if (!totalRequests) return { approvedPct: 0, pendingPct: 0, total: 0 };
    const approvedPct = Math.round((approved / totalRequests) * 100);
    return {
      approvedPct,
      pendingPct: Math.max(0, 100 - approvedPct),
      total: totalRequests,
    };
  }, [approved, totalRequests]);

  if (!user) return null;

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
          onPress={() => router.push("/(employee)/profile")}
          style={styles.avatarWrap}
          activeOpacity={0.85}
        >
          <Text style={styles.avatarText}>{String(name).charAt(0).toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <HeroCard
          totalRequests={totalRequests}
          approved={approved}
          pending={pending}
          holidayName={stats.nextHolidayName}
          holidayDate={holidayDateLabel}
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
          <StatTile label="On Leave" value={onLeaveToday} color="#60A5FA" type="user" />
          <StatTile label="Pending" value={pending} color="#FBBF24" type="clock" />
          <StatTile label="Approved" value={approved} color="#34D399" type="user" />
          <StatTile label="Total" value={totalRequests} color="#A78BFA" type="clock" />
        </View>

        <HolidayHighlight name={stats.nextHolidayName} dateLabel={holidayDateLabel} />

        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <Text style={styles.panelTitle}>Leave Pipeline</Text>
            <TouchableOpacity
              onPress={() => router.push("/(employee)/attendance")}
              style={styles.panelActionBtn}
              activeOpacity={0.85}
            >
              <Text style={styles.panelActionText}>Attendance</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.metricGrid}>
            <MetricBar label="Approved" value={approved} color="#34D399" />
            <MetricBar label="Pending" value={pending} color="#FBBF24" />
          </View>
          <View style={styles.miniGrid}>
            <MiniCard label="Approved" value={approved} tone="green" />
            <MiniCard label="Pending" value={pending} tone="amber" />
            <MiniCard label="On Leave" value={onLeaveToday} tone="green" />
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <Text style={styles.panelTitle}>Leave Split</Text>
            <Text style={styles.panelMeta}>This year</Text>
          </View>

          <View style={styles.splitRow}>
            <View style={styles.donutWrap}>
              <View style={styles.donutRing}>
                <View
                  style={[
                    styles.donutFill,
                    { transform: [{ rotate: `${Math.round((leaveSplit.approvedPct / 100) * 360)}deg` }] },
                  ]}
                />
                <View style={styles.donutCenter}>
                  <Text style={styles.donutTotal}>{leaveSplit.total || "—"}</Text>
                  <Text style={styles.donutLabel}>TOTAL</Text>
                </View>
              </View>
            </View>

            <View style={styles.legendCol}>
              <LegendRow label="Approved" value={`${leaveSplit.approvedPct}%`} color="#34D399" />
              <LegendRow label="Pending" value={`${leaveSplit.pendingPct}%`} color="#FBBF24" />
              <View style={styles.tipCard}>
                <Text style={styles.tipText}>
                  Keep approvals clean to avoid overlaps with critical sprints.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* <View style={styles.panel}>
          <View style={styles.panelHead}>
            <Text style={styles.panelTitle}>Activity Trend</Text>
            <Text style={styles.panelMeta}>Last 6 weeks</Text>
          </View>
          <Sparkline values={trendValues} />
          <View style={styles.miniGrid}>
            <MiniCard label="Approved" value={approved} tone="green" />
            <MiniCard label="Pending" value={pending} tone="amber" />
            <MiniCard label="On Leave" value={onLeaveToday} tone="green" />
          </View>
        </View> */}
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
  heroSubSecondary: {
    color: "#BFDBFE",
    fontSize: 11.5,
    marginTop: 4,
    maxWidth: 230,
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
  holidayWrap: {
    marginHorizontal: 22,
    marginTop: 8,
  },
  holidayCard: {
    borderRadius: 24,
    minHeight: 150,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.45)",
    backgroundColor: "#4C1D95",
    shadowColor: "#581C87",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  holidayTopLine: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  holidayDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 8,
    backgroundColor: "#E9D5FF",
  },
  holidayEyebrow: {
    color: "#E9D5FF",
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  holidayName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  holidayDate: {
    marginTop: 4,
    color: "#DDD6FE",
    fontSize: 14,
    fontWeight: "700",
  },
  holidaySub: {
    marginTop: 10,
    color: "#E9D5FF",
    fontSize: 12.5,
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
  panelMeta: {
    color: "#93A4BE",
    fontSize: 11,
    fontWeight: "700",
  },
  panelActionBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.34)",
    backgroundColor: "rgba(14,165,233,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  panelActionText: {
    color: "#dbeafe",
    fontSize: 11,
    fontWeight: "800",
  },
  metricGrid: {
    marginTop: 8,
    gap: 10,
  },
  metricCard: {
    borderRadius: 14,
    backgroundColor: "rgba(15,23,42,0.55)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  metricHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricLabel: {
    color: "#D1D9E8",
    fontSize: 12,
    fontWeight: "600",
  },
  metricValue: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "800",
  },
  metricTrack: {
    marginTop: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: "rgba(148,163,184,0.18)",
    overflow: "hidden",
  },
  metricFill: {
    height: "100%",
    borderRadius: 8,
  },
  miniGrid: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  miniCard: {
    width: "32%",
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
    backgroundColor: "rgba(15,23,42,0.55)",
    padding: 10,
    justifyContent: "space-between",
  },
  miniHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  miniLabel: {
    color: "#93A4BE",
    fontSize: 10,
    fontWeight: "700",
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  miniValue: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
  },
  splitRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  donutWrap: {
    width: "46%",
    alignItems: "center",
    justifyContent: "center",
  },
  donutRing: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 10,
    borderColor: "#FBBF24",
    alignItems: "center",
    justifyContent: "center",
  },
  donutFill: {
    position: "absolute",
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 10,
    borderColor: "#34D399",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
  },
  donutCenter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "#121D30",
    alignItems: "center",
    justifyContent: "center",
  },
  donutTotal: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
  },
  donutLabel: {
    color: "#93A4BE",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  legendCol: {
    width: "50%",
    gap: 8,
  },
  legendRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "rgba(15,23,42,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legendLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },
  legendLabel: {
    color: "#D1D9E8",
    fontSize: 12,
    fontWeight: "600",
  },
  legendValue: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "800",
  },
  tipCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "rgba(15,23,42,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  tipText: {
    color: "#D1D9E8",
    fontSize: 11.5,
    lineHeight: 16,
  },
});

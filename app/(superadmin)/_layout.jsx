import { Redirect, Tabs } from "expo-router";
import {
  CalendarCheck2,
  CirclePlus,
  LayoutGrid,
  Wallet,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../src/context/authContext";

function TabIcon({ Icon, color, focused }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
      <Icon size={18} color={color} />
    </View>
  );
}

function CenterCompanyButton({ onPress, accessibilityState }) {
  const focused = accessibilityState?.selected;
  return (
    <Pressable onPress={onPress} style={styles.centerBtnOuter}>
      <View style={styles.centerBtnHalo} />
      <View style={[styles.centerBtn, focused && styles.centerBtnFocused]}>
        <CirclePlus size={22} color="#eff6ff" />
      </View>
      <Text style={[styles.centerLabel, focused && styles.centerLabelFocused]}>Company</Text>
    </Pressable>
  );
}

export default function SuperAdminLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (String(user.role || "").toUpperCase() !== "SUPER_ADMIN")
    return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: "#05070b",
          paddingBottom: 92,
        },
        tabBarActiveTintColor: "#0f172a",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 12,
          backgroundColor: "#f8fafc",
          overflow: "visible",
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: "rgba(15,23,42,0.08)",
          borderRadius: 30,
          height: 82,
          paddingBottom: 11,
          paddingTop: 10,
          elevation: 22,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
        },
        tabBarItemStyle: {
          paddingTop: 1,
        },
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: "700",
          marginTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={LayoutGrid} color={color} focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="company"
        options={{
          title: "Company",
          tabBarButton: (props) => <CenterCompanyButton {...props} />,
        }}
      />

      <Tabs.Screen
        name="employees"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="payroll"
        options={{
          title: "Payroll",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Wallet} color={color} focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="attendance"
        options={{
          title: "Attendance",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={CalendarCheck2} color={color} focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="leave-requests"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 24,
    borderRadius: 9,
  },
  iconWrapFocused: {
    backgroundColor: "#e0f2fe",
  },
  centerBtnOuter: {
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: -33,
  },
  centerBtnHalo: {
    position: "absolute",
    top: 2,
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "rgba(14,165,233,0.18)",
  },
  centerBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#0ea5e9",
    borderWidth: 5,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 12,
    shadowColor: "#0369a1",
    shadowOpacity: 0.36,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  centerBtnFocused: {
    backgroundColor: "#0369a1",
  },
  centerLabel: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  centerLabelFocused: {
    color: "#0f172a",
  },
});

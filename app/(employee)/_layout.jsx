import { Redirect, Tabs } from "expo-router";
import { CalendarCheck2, ClipboardList, LayoutGrid, Wallet } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useAuth } from "../../src/context/authContext";

function TabIcon({ Icon, color, focused }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapFocused]}>
      <Icon size={18} color={color} />
    </View>
  );
}

export default function EmployeeLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (String(user.role || "").toUpperCase() !== "EMPLOYEE") return <Redirect href="/(auth)/login" />;

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
        name="attendance"
        options={{
          title: "Attendance",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={CalendarCheck2} color={color} focused={focused} />,
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
        name="request"
        options={{
          title: "Request",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={ClipboardList} color={color} focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="index"
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
});

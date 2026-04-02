import { Redirect, Tabs } from "expo-router";
import {
  CalendarCheck2,
  CirclePlus,
  FolderOpen,
  LayoutGrid,
  MessageSquareText,
} from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();

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
          paddingBottom: 102 + Math.max(insets.bottom, 8),
        },
        tabBarActiveTintColor: "#0f172a",
        tabBarInactiveTintColor: "#6b7280",
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: "absolute",
          left: 12,
          right: 12,
          bottom: Math.max(insets.bottom, 8),
          backgroundColor: "#f8fafc",
          overflow: "visible",
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: "rgba(15,23,42,0.1)",
          borderRadius: 26,
          height: 74 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 8,
          elevation: 18,
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          marginTop: 2,
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
        name="docs"
        options={{
          title: "Docs",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={FolderOpen} color={color} focused={focused} />,
        }}
      />

      <Tabs.Screen
        name="support"
        options={{
          title: "Support",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={MessageSquareText} color={color} focused={focused} />,
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
    width: 34,
    height: 26,
    borderRadius: 10,
  },
  iconWrapFocused: {
    backgroundColor: "#dbeafe",
  },
  centerBtnOuter: {
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: -30,
  },
  centerBtnHalo: {
    position: "absolute",
    top: 3,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(14,165,233,0.16)",
  },
  centerBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#0ea5e9",
    borderWidth: 4,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    elevation: 10,
    shadowColor: "#0369a1",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  centerBtnFocused: {
    backgroundColor: "#0369a1",
  },
  centerLabel: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },
  centerLabelFocused: {
    color: "#0f172a",
  },
});

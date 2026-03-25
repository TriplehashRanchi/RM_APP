import { Activity } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

export default function SupportEmptyCard({ title, subtitle, icon: Icon = Activity, style }) {
  return (
    <View style={[styles.card, style]}>
      <Icon size={22} color="#475569" />
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 20,
    backgroundColor: "#101d30",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  title: {
    color: "#E2E8F0",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 10,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: "center",
  },
});

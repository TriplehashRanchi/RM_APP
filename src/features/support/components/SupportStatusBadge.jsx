import { StyleSheet, Text, View } from "react-native";
import { getQueryStatusTone } from "../utils.js";

export default function SupportStatusBadge({ status }) {
  const tone = getQueryStatusTone(status);
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg, borderColor: tone.border }]}>
      <Text style={[styles.text, { color: tone.text }]}>{tone.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  text: {
    fontSize: 11,
    fontWeight: "800",
  },
});

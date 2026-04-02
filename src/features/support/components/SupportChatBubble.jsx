import { StyleSheet, Text, View } from "react-native";

export default function SupportChatBubble({ mine, sender, time, message }) {
  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        <View style={styles.metaRow}>
          <Text style={styles.sender}>{sender}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  rowMine: {
    justifyContent: "flex-end",
  },
  rowOther: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "84%",
    borderRadius: 22,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderWidth: 1,
  },
  bubbleMine: {
    backgroundColor: "rgba(103, 232, 249, 0.16)",
    borderColor: "rgba(103, 232, 249, 0.24)",
  },
  bubbleOther: {
    backgroundColor: "#0f1d31",
    borderColor: "rgba(148, 163, 184, 0.12)",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 5,
  },
  sender: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "800",
  },
  time: {
    color: "#64748B",
    fontSize: 11,
  },
  message: {
    color: "#E2E8F0",
    fontSize: 13,
    lineHeight: 19,
  },
});

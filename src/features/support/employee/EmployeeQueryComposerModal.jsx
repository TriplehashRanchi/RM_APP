import { Plus, X } from "lucide-react-native";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function EmployeeQueryComposerModal({
  visible,
  onClose,
  draft,
  setDraft,
  onSubmit,
  creating,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Raise Query</Text>
              <Text style={styles.subtitle}>Create a fresh chat for each issue.</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={18} color="#CBD5E1" />
            </Pressable>
          </View>

          <Text style={styles.label}>Subject</Text>
          <TextInput
            value={draft.subject}
            onChangeText={(text) => setDraft((prev) => ({ ...prev, subject: text }))}
            placeholder="Salary mismatch, attendance, access issue..."
            placeholderTextColor="#64748B"
            style={styles.input}
          />

          <Text style={styles.label}>Message</Text>
          <TextInput
            value={draft.message}
            onChangeText={(text) => setDraft((prev) => ({ ...prev, message: text }))}
            placeholder="Explain the issue clearly so admin can respond in this thread."
            placeholderTextColor="#64748B"
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.textArea]}
          />

          <View style={styles.footer}>
            <Pressable onPress={onClose} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onSubmit}
              disabled={creating}
              style={[styles.primaryButton, creating && styles.disabled]}
            >
              {creating ? (
                <ActivityIndicator color="#020617" />
              ) : (
                <>
                  <Plus size={16} color="#020617" />
                  <Text style={styles.primaryButtonText}>Start Thread</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2, 6, 23, 0.72)",
  },
  sheet: {
    backgroundColor: "#0b1728",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
    padding: 20,
    paddingBottom: 28,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#112037",
  },
  label: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  input: {
    backgroundColor: "#101d30",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.12)",
    color: "#F8FAFC",
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 100,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  secondaryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101d30",
    borderRadius: 18,
    minHeight: 50,
  },
  secondaryButtonText: {
    color: "#CBD5E1",
    fontWeight: "800",
  },
  primaryButton: {
    flex: 1.4,
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: "#67E8F9",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonText: {
    color: "#020617",
    fontWeight: "900",
  },
  disabled: {
    opacity: 0.55,
  },
});

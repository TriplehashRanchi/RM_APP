import { AlertTriangle, CheckCircle } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

export default function SupportToast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <View style={[styles.toast, isError ? styles.toastError : styles.toastSuccess]}>
      {isError ? <AlertTriangle size={15} color="#fecdd3" /> : <CheckCircle size={15} color="#bbf7d0" />}
      <Text style={styles.text}>{toast.msg || toast.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 34,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  toastSuccess: {
    backgroundColor: "rgba(6, 95, 70, 0.96)",
    borderColor: "rgba(52, 211, 153, 0.3)",
  },
  toastError: {
    backgroundColor: "rgba(127, 29, 29, 0.96)",
    borderColor: "rgba(251, 113, 133, 0.3)",
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
});

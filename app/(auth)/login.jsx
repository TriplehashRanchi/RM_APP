import React, { useState } from "react";
import { ActivityIndicator, View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useAuth } from "../../src/context/authContext";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (submitting) return;

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await login(cleanEmail, password);
      if (!res.success) setError(res.message || "Invalid email or password.");
    } catch (_err) {
      setError("Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>RMClub Payroll</Text>
      <Text style={styles.title}>Sign in</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#7b7b7b"
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          if (error) setError("");
        }}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#7b7b7b"
        secureTextEntry
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (error) setError("");
        }}
      />

      <Pressable
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={submitting}
      >
        {submitting ? (
          <View style={styles.buttonLoadingRow}>
            <ActivityIndicator size="small" color="#02110a" />
            <Text style={styles.buttonText}>Signing in...</Text>
          </View>
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </Pressable>

      <Text style={styles.note}>Need access? Contact admin.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#07090b", padding: 24, justifyContent: "center" },
  brand: { color: "#A7F3D0", fontSize: 12, letterSpacing: 3, marginBottom: 10, textTransform: "uppercase" },
  title: { color: "white", fontSize: 28, fontWeight: "700", marginBottom: 16 },
  input: {
    backgroundColor: "#0b0f14",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "white",
    marginTop: 12,
  },
  button: {
    marginTop: 18,
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: { color: "#02110a", fontWeight: "800", fontSize: 16 },
  error: { marginTop: 8, color: "#FCA5A5" },
  note: { marginTop: 14, color: "#6b7280", fontSize: 12, textAlign: "center" },
});

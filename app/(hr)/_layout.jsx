import { Stack, Redirect } from "expo-router";
import { useAuth } from "../../src/context/authContext";

export default function HrLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role !== "HR_ADMIN") return <Redirect href="/(auth)/login" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
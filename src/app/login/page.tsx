import { AuthCard } from "@/components/forms/auth-card";

export default function LoginPage() {
  return <AuthCard mode="login" googleClientId={process.env.GOOGLE_CLIENT_ID ?? ""} />;
}

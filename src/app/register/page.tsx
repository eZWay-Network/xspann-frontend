import { AuthCard } from "@/components/forms/auth-card";

export default function RegisterPage() {
  return <AuthCard mode="register" googleClientId={process.env.GOOGLE_CLIENT_ID ?? ""} />;
}

import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Connexion — CarHorizontal",
};

export default function LoginPage() {
  return <LoginForm />;
}

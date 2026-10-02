import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/account/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16" style={{ maxWidth: 520 }}>
        <p className="s-micro s-eyebrow">Account</p>
        <h1 className="s-h1 mb-6" style={{ fontSize: 44 }}>Reset your <em>password.</em></h1>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}

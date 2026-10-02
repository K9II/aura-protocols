import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ResetPasswordForm from "@/components/account/ResetPasswordForm";
import { verifySession } from "@/lib/dal";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false, follow: false } };

export default async function ResetPasswordPage() {
  if (!(await verifySession())) redirect("/forgot-password");
  return (
    <div className="pharmacopoeia">
      <div className="p-container py-16" style={{ maxWidth: 520 }}>
        <p className="s-micro s-eyebrow">Account</p>
        <h1 className="s-h1 mb-6" style={{ fontSize: 44 }}>Choose a new <em>password.</em></h1>
        <ResetPasswordForm />
      </div>
    </div>
  );
}

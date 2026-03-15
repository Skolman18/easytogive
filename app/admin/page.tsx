import { redirect } from "next/navigation";

// Legacy admin page — the full admin panel lives in /profile?tab=admin
export default function AdminPage() {
  redirect("/profile?tab=admin");
}

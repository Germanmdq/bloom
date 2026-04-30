import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { DashboardClientLayout } from "@/components/dashboard/DashboardClientLayout";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isStaff = profile?.role === "ADMIN" || profile?.role === "WAITER" || profile?.role === "KITCHEN" || isAdminEmail(user.email);

  if (!isStaff) {
    redirect("/auth");
  }

  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}

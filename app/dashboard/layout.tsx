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

  if (!user || !isAdminEmail(user.email)) {
    redirect("/auth");
  }

  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}

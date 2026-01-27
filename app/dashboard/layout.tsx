import { Sidebar } from "@/components/dashboard/Sidebar";
import "./dashboard.css";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen w-full bg-[#F5F5F7] overflow-hidden" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>

            <div className="dashboard-scope flex h-screen w-full">
                <Sidebar />
                <main className="flex-1 h-full overflow-y-auto p-8 relative">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

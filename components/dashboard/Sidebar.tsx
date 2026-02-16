"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Coffee, ListChecks, Settings, Users, PieChart, Receipt, CookingPot, Package, MessageCircle } from "lucide-react";

const links = [
    { href: "/dashboard/tables", label: "Mesas", icon: LayoutGrid },
    { href: "/dashboard/orders", label: "Historial", icon: ListChecks },
    { href: "/dashboard/products", label: "Menú", icon: Coffee },
    { href: "/dashboard/staff", label: "Personal", icon: Users },
    { href: "/dashboard/reports", label: "Reportes", icon: PieChart },
    { href: "/dashboard/expenses", label: "Gastos", icon: Receipt },
    { href: "/dashboard/kitchen", label: "Cocina", icon: CookingPot },
    { href: "/dashboard/stock", label: "Stock", icon: Package },
    { href: "/dashboard/settings", label: "Ajustes", icon: Settings },
];

import { useUserRole } from "@/lib/hooks/use-pos-data";

export function Sidebar() {
    const pathname = usePathname();
    const { data: role = 'WAITER' } = useUserRole();

    const filteredLinks = links.filter(link => {
        if (link.label === "Reportes" || link.label === "Gastos") {
            return role === 'ADMIN';
        }
        return true;
    });

    return (
        <div className="w-80 h-full flex flex-col p-6 bg-white/50 backdrop-blur-3xl border-r border-white/20">
            <div className="mb-10 px-4">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Bloom OS</h1>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">v2.0 Premium</span>
                    {role === 'ADMIN' && <span className="bg-black text-[#FFD60A] text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Admin</span>}
                </div>
            </div>

            <nav className="flex-1 space-y-2">
                {filteredLinks.map((link) => {
                    const isActive = pathname.startsWith(link.href);
                    const Icon = link.icon;
                    return (
                        <Link key={link.href} href={link.href}>
                            <div
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                    ? "bg-white shadow-sm text-gray-900 font-medium"
                                    : "text-gray-500 hover:bg-white/40 hover:text-gray-900"
                                    }`}
                            >
                                <Icon size={20} className={isActive ? "text-accent" : "opacity-70"} />
                                <span>{link.label}</span>
                            </div>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Coffee, ListChecks, Settings, Users, PieChart, Receipt, CookingPot, Package, MessageCircle, Briefcase, X, LogOut, Home, History as HistoryIcon } from "lucide-react";
import { useUserRole } from "@/lib/hooks/use-pos-data";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const links = [
    { href: "/dashboard/tables",   label: "Mesas",     icon: LayoutGrid },
    { href: "/dashboard/orders",   label: "Ventas",    icon: ListChecks },
    { href: "/dashboard/products", label: "Menú",      icon: Coffee },
    { href: "/dashboard/clientes", label: "Clientes",  icon: Users },
    { href: "/dashboard/personal", label: "Personal",  icon: Briefcase },
    { href: "/dashboard/reports",  label: "Reporte Diario", icon: PieChart },
    { href: "/dashboard/inventory", label: "Operaciones", icon: Package },
    { href: "/dashboard/history-stock", label: "Historial Stock", icon: HistoryIcon },
    { href: "/dashboard/kitchen",  label: "Cocina",    icon: CookingPot },
    { href: "/dashboard/whatsapp", label: "WhatsApp",  icon: MessageCircle },
    { href: "/dashboard/settings", label: "Ajustes",   icon: Settings },
];

const HIDDEN_SECTIONS = ["Cocina", "WhatsApp"];

interface SidebarProps {
    open: boolean;
    onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: role = 'WAITER' } = useUserRole();
    const supabase = createClient();

    async function handleSignOut() {
        await supabase.auth.signOut();
        router.push("/auth");
    }

    const filteredLinks = links.filter(link => {
        if (HIDDEN_SECTIONS.includes(link.label)) return false;
        if (link.label === "Reporte Diario" || link.label === "Operaciones" || link.label === "Historial Stock") return role === 'ADMIN';
        return true;
    });

    return (
        <>
            {/* Overlay en mobile */}
            {open && (
                <div
                    className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed md:relative z-40 top-0 left-0 h-full
                w-72 flex min-h-0 flex-col p-6 bg-white/80 backdrop-blur-3xl border-r border-white/20
                transition-transform duration-300 ease-in-out
                ${open ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 md:w-80
            `}>
                <div className="mb-6 shrink-0 px-4 flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Bloom OS</h1>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">v2.0 Premium</span>
                            {role === 'ADMIN' && <span className="bg-black text-[#FFD60A] text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Admin</span>}
                        </div>
                    </div>
                    {/* Botón cerrar solo en mobile */}
                    <button
                        onClick={onClose}
                        className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    <Link href="/" onClick={onClose}>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-white/40 hover:text-gray-900 transition-all duration-200">
                           <Home size={20} className="stroke-[2.5px] opacity-70" />
                           <span className="font-medium">Ver sitio público</span>
                        </div>
                    </Link>
                    <div className="h-px bg-gray-100 my-2 mx-4" />
                    {filteredLinks.map((link) => {
                        const isActive =
                            pathname.startsWith(link.href);
                        const Icon = link.icon;
                        return (
                            <Link key={link.href} href={link.href} onClick={onClose}>
                                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                    ? "bg-white shadow-sm text-gray-900 font-medium"
                                    : "text-gray-500 hover:bg-white/40 hover:text-gray-900"
                                }`}>
                                    <Icon size={20} className={isActive ? "text-accent" : "opacity-70"} />
                                    <span>{link.label}</span>
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-4 shrink-0 border-t border-gray-200/90 pt-4 px-4 space-y-3">
                    <ul className="space-y-1.5 text-xs text-gray-500">
                        <li className="flex items-center gap-2">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                            <span>Salón</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                            <span>Retiro</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden />
                            <span>Delivery</span>
                        </li>
                    </ul>
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200 text-sm font-medium"
                    >
                        <LogOut size={18} />
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </div>
        </>
    );
}

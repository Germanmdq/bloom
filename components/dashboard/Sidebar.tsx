"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Coffee, ListChecks, Settings, Users, UserCircle, PieChart, Receipt, CookingPot, Package, QrCode, CalendarDays, X, Bike, ShoppingBag } from "lucide-react";
import { useUserRole } from "@/lib/hooks/use-pos-data";

const links = [
    { href: "/dashboard", label: "Inicio", icon: Home },
    { href: "/dashboard/tables", label: "Mesas", icon: LayoutGrid },
    { href: "/dashboard/tables/999", label: "Web — Envío", icon: Bike },
    { href: "/dashboard/tables/998", label: "Web — Retiro", icon: ShoppingBag },
    { href: "/dashboard/reservations", label: "Reservas", icon: CalendarDays },
    { href: "/dashboard/qr", label: "QR Mesas", icon: QrCode },
    { href: "/dashboard/orders", label: "Historial", icon: ListChecks },
    { href: "/dashboard/customers", label: "Clientes", icon: UserCircle },
    { href: "/dashboard/products", label: "Menú", icon: Coffee },
    { href: "/dashboard/staff", label: "Personal", icon: Users },
    { href: "/dashboard/reports", label: "Reportes", icon: PieChart },
    { href: "/dashboard/expenses", label: "Gastos", icon: Receipt },
    { href: "/dashboard/kitchen", label: "Cocina", icon: CookingPot },
    { href: "/dashboard/stock", label: "Stock", icon: Package },
    { href: "/dashboard/settings", label: "Ajustes", icon: Settings },
];

interface SidebarProps {
    open: boolean;
    onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { data: role = 'WAITER' } = useUserRole();

    const filteredLinks = links.filter(link => {
        if (link.label === "Reportes" || link.label === "Gastos") {
            return role === 'ADMIN';
        }
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
                    {filteredLinks.map((link) => {
                        const isActive =
                            link.href === "/dashboard"
                                ? pathname === "/dashboard"
                                : pathname.startsWith(link.href);
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

                <div
                    className="mt-4 shrink-0 border-t border-gray-200/90 pt-4 px-4"
                    aria-label="Referencia de colores de pedidos"
                >
                    <ul className="space-y-1.5 text-xs text-gray-500">
                        <li className="flex items-center gap-2">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden />
                            <span>Mesa</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-green-600" aria-hidden />
                            <span>Delivery</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden />
                            <span>Retiro</span>
                        </li>
                    </ul>
                </div>
            </div>
        </>
    );
}

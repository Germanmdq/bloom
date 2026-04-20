"use client";
import { useState, useEffect } from "react";
import { Loader2, UserPlus } from "lucide-react";
import Link from "next/link";

export default function PersonalPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchStaff(); }, []);

    async function fetchStaff() {
        setLoading(true);
        const res = await fetch("/api/personal");
        const data = await res.json();
        setStaff(Array.isArray(data) ? data : []);
        setLoading(false);
    }

    const roleLabel: Record<string, string> = {
        ADMIN: "Administrador",
        WAITER: "Mesero",
        KITCHEN: "Cocina",
        MANAGER: "Encargado",
    };

    const roleEmoji: Record<string, string> = {
        ADMIN: "🛡️",
        WAITER: "🤵",
        KITCHEN: "👨‍🍳",
        MANAGER: "🔑",
    };

    return (
        <div className="min-h-full">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-gray-900">Personal</h2>
                    <p className="text-gray-500 font-medium">{staff.length} empleados</p>
                </div>
                <Link
                    href="/dashboard/staff"
                    className="bg-black text-white px-6 py-3.5 rounded-[1.5rem] font-bold flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                    <UserPlus size={20} /> Agregar
                </Link>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-40">
                    <Loader2 className="animate-spin text-gray-200" size={48} />
                </div>
            ) : staff.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 text-center gap-3">
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Sin personal registrado</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {staff.map(member => (
                        <div key={member.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm hover:shadow-xl transition-all">
                            <div className="text-4xl mb-4">{roleEmoji[member.role] ?? "👤"}</div>
                            <h3 className="font-black text-xl text-gray-900 truncate">{member.full_name || "Sin nombre"}</h3>
                            <p className="text-xs text-gray-400 truncate mb-2">{member.email}</p>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                {roleLabel[member.role] ?? member.role}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

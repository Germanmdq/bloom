"use client";

import { useState } from "react";
import { WhatsAppNotificationListener } from "@/components/WhatsAppNotificationListener";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Lock, ShieldCheck } from "lucide-react";
import "./dashboard.css";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isLocked, setIsLocked] = useState(true);
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPass, setLoginPass] = useState("");
    const [unlockError, setUnlockError] = useState("");

    function handleUnlock(e: React.FormEvent) {
        e.preventDefault();
        setUnlockError("");
        if (loginEmail.toLowerCase().trim() === 'mateogonzaleztortilla@gmail.com' && loginPass === 'gmail') {
            setIsLocked(false);
        } else {
            setUnlockError("Credenciales incorrectas. Acceso Denegado.");
        }
    }

    if (isLocked) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#F5F5F7]">
                <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md border border-gray-100 text-center">
                    <div className="w-20 h-20 bg-black text-[#FFD60A] rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl">
                        <Lock size={40} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tighter uppercase">Sistema Bloqueado</h2>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-8">Acceso Administrativo Requerido</p>

                    <form onSubmit={handleUnlock} className="space-y-4">
                        <div className="text-left">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1 block">Email</label>
                            <input
                                type="email"
                                value={loginEmail}
                                onChange={e => setLoginEmail(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl p-4 font-bold outline-none transition-all"
                                placeholder="usuario@bloom.com"
                                autoFocus
                            />
                        </div>
                        <div className="text-left">
                            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 mb-1 block">Contraseña</label>
                            <input
                                type="password"
                                value={loginPass}
                                onChange={e => setLoginPass(e.target.value)}
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-2xl p-4 font-bold outline-none transition-all"
                                placeholder="••••••"
                            />
                        </div>

                        {unlockError && <p className="text-red-500 font-black text-xs uppercase tracking-widest">{unlockError}</p>}

                        <button className="w-full bg-black text-white hover:bg-[#FFD60A] hover:text-black py-4 rounded-2xl font-black uppercase tracking-widest transition-all mt-4 flex items-center justify-center gap-2 group">
                            <ShieldCheck size={18} />
                            Ingresar al Sistema
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full bg-[#F5F5F7] overflow-hidden" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>

            <div className="dashboard-scope flex h-screen w-full">
                <WhatsAppNotificationListener />
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

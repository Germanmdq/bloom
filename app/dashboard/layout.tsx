"use client";

import { useState, useEffect } from "react";
import { WhatsAppNotificationListener } from "@/components/WhatsAppNotificationListener";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Lock, ShieldCheck } from "lucide-react";
import { SalesComparisonPanel, ComparisonType } from "@/components/dashboard/SalesComparisonPanel";
import "./dashboard.css";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isLocked, setIsLocked] = useState(true);

    useEffect(() => {
        if (sessionStorage.getItem('bloom_unlocked') === 'true') setIsLocked(false);
    }, []);
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPass, setLoginPass] = useState("");
    const [unlockError, setUnlockError] = useState("");
    const [comparisonPanel, setComparisonPanel] = useState<ComparisonType | null>(null);

    useEffect(() => {
        if (isLocked) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'F1' && e.key !== 'F2') return;
            // Skip when the POS OrderSheet is open
            if (document.querySelector('[data-ordersheet="active"]')) return;
            // Skip when an input/select has focus
            const tag = (e.target as HTMLElement).tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            e.preventDefault();
            const key = e.key.toLowerCase() as 'f1' | 'f2';
            const stored = localStorage.getItem(`bloom_${key}_action`) as ComparisonType | null;
            const action: ComparisonType = stored ?? (key === 'f1' ? 'yesterday' : 'last_week');
            setComparisonPanel(action);
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isLocked]);

    function handleUnlock(e: React.FormEvent) {
        e.preventDefault();
        setUnlockError("");
        if (loginEmail.toLowerCase().trim() === 'germangonzalezmdq@gmail.com' && loginPass.trim() === 'admin') {
            sessionStorage.setItem('bloom_unlocked', 'true');
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
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </main>
            </div>

            {comparisonPanel && (
                <SalesComparisonPanel
                    comparisonType={comparisonPanel}
                    onClose={() => setComparisonPanel(null)}
                />
            )}
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { Lock, Delete, Menu } from "lucide-react";
import { SalesComparisonPanel, ComparisonType } from "@/components/dashboard/SalesComparisonPanel";
import "./dashboard.css";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isLocked, setIsLocked] = useState(true);
    const [pin, setPin] = useState("");

    useEffect(() => {
        try {
            if (sessionStorage.getItem('bloom_unlocked') === 'true') setIsLocked(false);
        } catch {}
    }, []);
    const [unlockError, setUnlockError] = useState("");
    const [comparisonPanel, setComparisonPanel] = useState<ComparisonType | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

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

    function handlePinPress(digit: string) {
        if (pin.length >= 4) return;
        const next = pin + digit;
        setPin(next);
        setUnlockError("");
        if (next.length === 4) {
            if (next === '1234') {
                try { sessionStorage.setItem('bloom_unlocked', 'true'); } catch {}
                setIsLocked(false);
            } else {
                setUnlockError("PIN incorrecto");
                setTimeout(() => { setPin(""); setUnlockError(""); }, 800);
            }
        }
    }

    if (isLocked) {
        const pinKeys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#F5F5F7]">
                <div className="bg-white p-8 rounded-[3rem] shadow-2xl w-full max-w-xs border border-gray-100 text-center">
                    <div className="w-16 h-16 bg-black text-[#FFD60A] rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-xl">
                        <Lock size={32} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-1 tracking-tighter uppercase">Bloom</h2>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-6">Ingresá el PIN</p>

                    {/* Puntos PIN */}
                    <div className="flex justify-center gap-4 mb-6">
                        {[0,1,2,3].map(i => (
                            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${i < pin.length ? 'bg-black border-black' : 'bg-transparent border-gray-300'}`} />
                        ))}
                    </div>

                    {unlockError && <p className="text-red-500 font-black text-xs uppercase tracking-widest mb-3">{unlockError}</p>}

                    {/* Teclado numérico */}
                    <div className="grid grid-cols-3 gap-3">
                        {pinKeys.map((k, idx) => {
                            if (k === '') return <div key={idx} />;
                            if (k === '⌫') return (
                                <button key={idx} type="button"
                                    onClick={() => { setPin(p => p.slice(0,-1)); setUnlockError(""); }}
                                    className="h-16 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all flex items-center justify-center text-gray-500"
                                >
                                    <Delete size={20} />
                                </button>
                            );
                            return (
                                <button key={idx} type="button"
                                    onClick={() => handlePinPress(k)}
                                    className="h-16 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all font-black text-xl text-gray-900"
                                >
                                    {k}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full bg-[#F5F5F7] overflow-hidden" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>

            <div className="dashboard-scope flex h-screen w-full">
                <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                <main className="flex-1 h-full overflow-y-auto relative">
                    <div className="max-w-7xl mx-auto h-full p-4 pb-20 md:p-8 md:pb-8">
                        {children}
                    </div>
                </main>
                {/* Barra inferior mobile */}
                <MobileBottomNav onMoreClick={() => setSidebarOpen(true)} />
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

"use client";

import { useState, useEffect } from "react";
import { X, User, Star, Gift, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface CustomerAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CustomerAuthModal({ isOpen, onClose }: CustomerAuthModalProps) {
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [customer, setCustomer] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [signingIn, setSigningIn] = useState(false);

    useEffect(() => {
        const getUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
            if (session?.user) loadCustomer(session.user);
            else setLoading(false);
        };
        getUser();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) loadCustomer(session.user);
            else { setCustomer(null); setLoading(false); }
        });
        return () => listener.subscription.unsubscribe();
    }, []);

    const loadCustomer = async (u: any) => {
        setLoading(true);
        const email = u.email;
        const name = u.user_metadata?.full_name || u.user_metadata?.name || email?.split('@')[0] || 'Cliente';
        // Upsert customer
        const { data } = await supabase
            .from('customers')
            .upsert({ email, name, phone: email }, { onConflict: 'phone' })
            .select()
            .single();
        setCustomer(data);
        setLoading(false);
    };

    const signInWithGoogle = async () => {
        setSigningIn(true);
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href }
        });
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setCustomer(null);
    };

    if (!isOpen) return null;

    const discountThresholds = [
        { spend: 50000,  discount: 5,  label: "Bronce" },
        { spend: 150000, discount: 10, label: "Plata" },
        { spend: 300000, discount: 15, label: "Oro" },
    ];

    const currentTier = discountThresholds.reduce((acc, tier) =>
        (customer?.total_spent ?? 0) >= tier.spend ? tier : acc,
        { spend: 0, discount: 0, label: "Nuevo" }
    );
    const nextTier = discountThresholds.find(t => (customer?.total_spent ?? 0) < t.spend);
    const progress = nextTier
        ? Math.min(((customer?.total_spent ?? 0) / nextTier.spend) * 100, 100)
        : 100;

    return (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <h2 className="text-xl font-black text-gray-900">Mi Cuenta</h2>
                    <button onClick={onClose} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {loading ? (
                    <div className="p-10 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : !user ? (
                    /* LOGIN */
                    <div className="p-6 space-y-4">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <Gift size={28} className="text-orange-500" />
                            </div>
                            <p className="text-gray-900 font-bold text-lg">Acumulá puntos y beneficios</p>
                            <p className="text-gray-400 text-sm mt-1">Ingresá para acceder a descuentos exclusivos</p>
                        </div>

                        {/* Google */}
                        <button
                            onClick={signInWithGoogle}
                            disabled={signingIn}
                            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 border-2 border-gray-200 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Continuar con Google
                        </button>

                        <p className="text-center text-xs text-gray-400 mt-2">
                            Al ingresar aceptás nuestros términos y condiciones
                        </p>
                    </div>
                ) : (
                    /* PERFIL */
                    <div className="p-6 space-y-5">
                        {/* Avatar + nombre */}
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
                                {user.user_metadata?.avatar_url
                                    ? <img src={user.user_metadata.avatar_url} className="w-12 h-12 rounded-2xl object-cover" />
                                    : <User size={22} className="text-orange-500" />
                                }
                            </div>
                            <div>
                                <p className="font-black text-gray-900">{user.user_metadata?.full_name || user.email}</p>
                                <p className="text-xs text-gray-400">{user.email}</p>
                            </div>
                        </div>

                        {/* Nivel */}
                        <div className={`rounded-2xl p-4 ${
                            currentTier.label === 'Oro' ? 'bg-amber-50 border border-amber-200' :
                            currentTier.label === 'Plata' ? 'bg-gray-50 border border-gray-200' :
                            currentTier.label === 'Bronce' ? 'bg-orange-50 border border-orange-200' :
                            'bg-gray-50 border border-gray-100'
                        }`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Star size={16} className={
                                        currentTier.label === 'Oro' ? 'text-amber-500' :
                                        currentTier.label === 'Plata' ? 'text-gray-500' :
                                        currentTier.label === 'Bronce' ? 'text-orange-500' : 'text-gray-400'
                                    } fill="currentColor" />
                                    <span className="font-black text-gray-900 text-sm">Nivel {currentTier.label}</span>
                                </div>
                                {currentTier.discount > 0 && (
                                    <span className="font-black text-orange-600 text-sm bg-orange-100 px-2 py-0.5 rounded-full">
                                        {currentTier.discount}% OFF
                                    </span>
                                )}
                            </div>

                            {nextTier && (
                                <>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1.5">
                                        <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        ${((nextTier.spend - (customer?.total_spent ?? 0)) / 1000).toFixed(0)}k para nivel {nextTier.label} ({nextTier.discount}% OFF)
                                    </p>
                                </>
                            )}
                            {!nextTier && <p className="text-xs text-amber-600 font-bold">¡Nivel máximo alcanzado! 🏆</p>}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <p className="text-xl font-black text-gray-900">{customer?.visits ?? 0}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">Visitas</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <p className="text-xl font-black text-gray-900">{customer?.points ?? 0}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">Puntos</p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-3 text-center">
                                <p className="text-xl font-black text-gray-900">{currentTier.discount}%</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">Descuento</p>
                            </div>
                        </div>

                        {/* Cerrar sesión */}
                        <button
                            onClick={signOut}
                            className="w-full py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

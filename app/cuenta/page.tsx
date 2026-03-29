"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Phone, Star, Gift, ArrowRight, User, ChevronLeft, Trophy, TrendingUp, ShoppingBag } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

const STORAGE_KEY = 'bloom_customer';

const TIERS = [
    { spend: 0,      discount: 0,  label: "Nuevo",  color: "text-gray-400",   bg: "from-gray-100 to-gray-50",   border: "border-gray-200",   badge: "bg-gray-100 text-gray-500" },
    { spend: 50000,  discount: 5,  label: "Bronce", color: "text-bloom-600", bg: "from-bloom-100 to-bloom-50", border: "border-bloom-200", badge: "bg-bloom-100 text-bloom-600" },
    { spend: 150000, discount: 10, label: "Plata",  color: "text-slate-500",  bg: "from-slate-100 to-slate-50",  border: "border-slate-200",  badge: "bg-slate-100 text-slate-600" },
    { spend: 300000, discount: 15, label: "Oro",    color: "text-amber-500",  bg: "from-amber-100 to-amber-50",  border: "border-amber-200",  badge: "bg-amber-100 text-amber-600" },
];

function getTier(spent: number) {
    return TIERS.reduce((acc, t) => spent >= t.spend ? t : acc, TIERS[0]);
}

export default function CuentaPage() {
    const supabase = createClient();
    const [step, setStep] = useState<'loading' | 'login' | 'name' | 'profile'>('loading');
    const [customer, setCustomer] = useState<any>(null);
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Refresh desde DB
                supabase.from('customers').select('*').eq('id', parsed.id).single().then(({ data }) => {
                    if (data) {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                        setCustomer(data);
                    } else {
                        setCustomer(parsed);
                    }
                    setStep('profile');
                });
                return;
            } catch { }
        }
        setStep('login');
    }, []);

    const handlePhoneSubmit = async () => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length < 8) { setError('Ingresá un número válido'); return; }
        setError(''); setSaving(true);
        const { data } = await supabase.from('customers').select('*').eq('phone', cleaned).single();
        if (data) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            setCustomer(data); setStep('profile');
        } else {
            setPhone(cleaned); setStep('name');
        }
        setSaving(false);
    };

    const handleRegister = async () => {
        if (!name.trim()) { setError('Ingresá tu nombre'); return; }
        setError(''); setSaving(true);
        const { data, error: err } = await supabase.from('customers').insert({ name: name.trim(), phone }).select().single();
        if (err || !data) { setError('Error al registrar. Intentá de nuevo.'); setSaving(false); return; }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setCustomer(data); setStep('profile'); setSaving(false);
    };

    const handleSignOut = () => {
        localStorage.removeItem(STORAGE_KEY);
        setCustomer(null); setPhone(''); setName(''); setStep('login');
    };

    const tier = customer ? getTier(customer.total_spent ?? 0) : TIERS[0];
    const nextTier = customer ? TIERS.find(t => (customer.total_spent ?? 0) < t.spend && t.spend > 0) : null;
    const progress = nextTier ? Math.min(((customer?.total_spent ?? 0) / nextTier.spend) * 100, 100) : 100;

    return (
        <div className="min-h-screen bg-[#FAF7F2] font-sans">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-xl border-b border-amber-100/60">
                <div className="px-5 py-4 flex items-center justify-between">
                    <Link href="/menu" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors">
                        <ChevronLeft size={20} />
                        <span className="font-semibold text-sm">Menú</span>
                    </Link>
                    <span className="font-black text-lg tracking-tighter text-gray-900">BLOOM<span className="text-english-600">.</span></span>
                    <div className="w-16" />
                </div>
            </header>

            <div className="max-w-md mx-auto px-5 py-8 space-y-6">

                {/* LOADING */}
                {step === 'loading' && (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-bloom-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {/* STEP 1 — TELÉFONO */}
                {step === 'login' && (
                    <>
                        <div className="text-center pt-4">
                            <div className="w-20 h-20 bg-bloom-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                <Gift size={36} className="text-bloom-600" />
                            </div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Mi Cuenta</h1>
                            <p className="text-gray-400 mt-2">Acumulá puntos y conseguí descuentos exclusivos en cada visita</p>
                        </div>

                        {/* Beneficios */}
                        <div className="grid grid-cols-3 gap-3">
                            {TIERS.slice(1).map(t => (
                                <div key={t.label} className={`rounded-2xl p-3 text-center border bg-gradient-to-b ${t.bg} ${t.border}`}>
                                    <Star size={16} className={`${t.color} mx-auto mb-1`} fill="currentColor" />
                                    <p className="font-black text-gray-800 text-xs">{t.label}</p>
                                    <p className={`text-lg font-black ${t.color}`}>{t.discount}% OFF</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-3xl p-6 shadow-sm border border-amber-100/60 space-y-4">
                            <p className="font-black text-gray-900">Ingresá con tu teléfono</p>
                            <div className="relative">
                                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="tel"
                                    placeholder="Ej: 1123456789"
                                    value={phone}
                                    onChange={e => { setPhone(e.target.value); setError(''); }}
                                    onKeyDown={e => e.key === 'Enter' && handlePhoneSubmit()}
                                    className={`w-full pl-11 pr-4 py-4 rounded-2xl border-2 text-base font-bold outline-none transition-all ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-bloom-500'}`}
                                    autoFocus
                                />
                            </div>
                            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
                            <button
                                onClick={handlePhoneSubmit}
                                disabled={saving}
                                className="w-full bg-black text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 hover:bg-gray-900 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {saving ? 'Buscando...' : <><ArrowRight size={18} /> Continuar</>}
                            </button>
                        </div>
                    </>
                )}

                {/* STEP 2 — NOMBRE */}
                {step === 'name' && (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-amber-100/60 space-y-4 mt-8">
                        <div className="text-center mb-2">
                            <div className="w-16 h-16 bg-bloom-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <User size={28} className="text-bloom-600" />
                            </div>
                            <h2 className="text-xl font-black text-gray-900">¡Primera vez!</h2>
                            <p className="text-gray-400 text-sm">¿Cómo te llamás?</p>
                        </div>
                        <input
                            type="text"
                            placeholder="Tu nombre"
                            value={name}
                            onChange={e => { setName(e.target.value); setError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleRegister()}
                            className={`w-full px-4 py-4 rounded-2xl border-2 text-base font-bold outline-none transition-all ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-bloom-500'}`}
                            autoFocus
                        />
                        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
                        <button
                            onClick={handleRegister}
                            disabled={saving}
                            className="w-full bg-bloom-600 text-white py-4 rounded-2xl font-black text-base hover:bg-bloom-600 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {saving ? 'Guardando...' : '¡Empezar a acumular!'}
                        </button>
                        <button onClick={() => setStep('login')} className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors">
                            ← Cambiar número
                        </button>
                    </div>
                )}

                {/* PERFIL */}
                {step === 'profile' && customer && (
                    <>
                        {/* Card nivel */}
                        <div className={`rounded-3xl p-6 bg-gradient-to-br ${tier.bg} border ${tier.border} shadow-sm`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-white/60 flex items-center justify-center">
                                        <User size={22} className="text-gray-700" />
                                    </div>
                                    <div>
                                        <p className="font-black text-gray-900 text-lg leading-tight">{customer.name}</p>
                                        <p className="text-gray-500 text-xs flex items-center gap-1"><Phone size={10} /> {customer.phone}</p>
                                    </div>
                                </div>
                                <span className={`text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1 ${tier.badge}`}>
                                    <Star size={11} fill="currentColor" /> {tier.label}
                                </span>
                            </div>

                            {tier.discount > 0 && (
                                <div className="bg-white/70 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between">
                                    <span className="text-sm font-bold text-gray-700">Tu descuento actual</span>
                                    <span className="text-2xl font-black text-bloom-600">{tier.discount}% OFF</span>
                                </div>
                            )}

                            {nextTier ? (
                                <div>
                                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-1.5">
                                        <span>{tier.label}</span>
                                        <span>{nextTier.label} ({nextTier.discount}% OFF)</span>
                                    </div>
                                    <div className="w-full bg-white/50 rounded-full h-3">
                                        <div className="bg-bloom-600 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1.5">
                                        Te faltan <strong>${((nextTier.spend - (customer.total_spent ?? 0)) / 1000).toFixed(0)}k</strong> para el siguiente nivel
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 bg-amber-100/80 rounded-2xl px-4 py-3">
                                    <Trophy size={18} className="text-amber-600" />
                                    <p className="text-sm font-black text-amber-700">¡Nivel máximo alcanzado!</p>
                                </div>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { icon: <ShoppingBag size={18} className="text-blue-500" />,   val: customer.visits ?? 0, label: 'Visitas',   bg: 'bg-blue-50' },
                                { icon: <Star size={18} className="text-bloom-600" />,         val: customer.points ?? 0, label: 'Puntos',    bg: 'bg-bloom-50' },
                                { icon: <TrendingUp size={18} className="text-green-500" />,    val: `$${((customer.total_spent ?? 0)/1000).toFixed(0)}k`, label: 'Consumido', bg: 'bg-green-50' },
                            ].map(({ icon, val, label, bg }) => (
                                <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
                                    <div className="flex justify-center mb-1">{icon}</div>
                                    <p className="text-xl font-black text-gray-900">{val}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Tabla de niveles */}
                        <div className="bg-white rounded-3xl p-5 shadow-sm border border-amber-100/60">
                            <h3 className="font-black text-gray-900 mb-4">Programa de fidelidad</h3>
                            <div className="space-y-2">
                                {TIERS.slice(1).map(t => {
                                    const isActive = tier.label === t.label;
                                    const isPast = (customer.total_spent ?? 0) >= t.spend;
                                    return (
                                        <div key={t.label} className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${isActive ? `border-2 ${t.border} bg-gradient-to-r ${t.bg}` : isPast ? 'bg-gray-50' : 'bg-gray-50 opacity-50'}`}>
                                            <div className="flex items-center gap-3">
                                                <Star size={16} className={isPast ? t.color : 'text-gray-300'} fill={isPast ? 'currentColor' : 'none'} />
                                                <div>
                                                    <p className="font-black text-sm text-gray-900">{t.label}</p>
                                                    <p className="text-xs text-gray-400">Desde ${(t.spend/1000).toFixed(0)}k consumido</p>
                                                </div>
                                            </div>
                                            <span className={`font-black text-sm px-3 py-1 rounded-full ${isPast ? t.badge : 'bg-gray-100 text-gray-400'}`}>{t.discount}% OFF</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <button onClick={handleSignOut} className="w-full py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">
                            Cerrar sesión
                        </button>
                    </>
                )}
            </div>
        <SiteFooter />
        </div>
    );
}

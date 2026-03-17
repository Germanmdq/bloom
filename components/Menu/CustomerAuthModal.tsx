"use client";

import { useState, useEffect } from "react";
import { X, User, Star, Gift, Phone, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface CustomerAuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const STORAGE_KEY = 'bloom_customer';

export function CustomerAuthModal({ isOpen, onClose }: CustomerAuthModalProps) {
    const supabase = createClient();
    const [customer, setCustomer] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<'phone' | 'name' | 'profile'>('phone');
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setCustomer(parsed);
                setStep('profile');
            } catch { }
        }
        setLoading(false);
    }, [isOpen]);

    const handlePhoneSubmit = async () => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length < 8) { setError('Ingresá un número válido'); return; }
        setError('');
        setSaving(true);

        // Buscar si ya existe
        const { data } = await supabase
            .from('customers')
            .select('*')
            .eq('phone', cleaned)
            .single();

        if (data) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            setCustomer(data);
            setStep('profile');
        } else {
            // Nuevo usuario — pedir nombre
            setPhone(cleaned);
            setStep('name');
        }
        setSaving(false);
    };

    const handleRegister = async () => {
        if (!name.trim()) { setError('Ingresá tu nombre'); return; }
        setError('');
        setSaving(true);

        const { data, error: err } = await supabase
            .from('customers')
            .insert({ name: name.trim(), phone })
            .select()
            .single();

        if (err || !data) {
            setError('Error al registrar. Intentá de nuevo.');
            setSaving(false);
            return;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setCustomer(data);
        setStep('profile');
        setSaving(false);
    };

    const handleSignOut = () => {
        localStorage.removeItem(STORAGE_KEY);
        setCustomer(null);
        setPhone('');
        setName('');
        setStep('phone');
    };

    if (!isOpen) return null;

    const discountThresholds = [
        { spend: 50000,  discount: 5,  label: "Bronce",  color: "text-orange-500",  bg: "bg-orange-50 border-orange-200" },
        { spend: 150000, discount: 10, label: "Plata",   color: "text-gray-500",    bg: "bg-gray-50 border-gray-200" },
        { spend: 300000, discount: 15, label: "Oro",     color: "text-amber-500",   bg: "bg-amber-50 border-amber-200" },
    ];

    const totalSpent = customer?.total_spent ?? 0;
    const currentTier = discountThresholds.reduce<any>((acc, tier) =>
        totalSpent >= tier.spend ? tier : acc, { spend: 0, discount: 0, label: "Nuevo", color: "text-gray-400", bg: "bg-gray-50 border-gray-100" }
    );
    const nextTier = discountThresholds.find(t => totalSpent < t.spend);
    const progress = nextTier ? Math.min((totalSpent / nextTier.spend) * 100, 100) : 100;

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

                ) : step === 'phone' ? (
                    /* PASO 1 — TELÉFONO */
                    <div className="p-6 space-y-5">
                        <div className="text-center">
                            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <Gift size={26} className="text-orange-500" />
                            </div>
                            <p className="font-black text-gray-900 text-lg">Acumulá puntos y descuentos</p>
                            <p className="text-gray-400 text-sm mt-1">Ingresá tu número para identificarte</p>
                        </div>

                        <div className="relative">
                            <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="tel"
                                placeholder="Ej: 1123456789"
                                value={phone}
                                onChange={e => { setPhone(e.target.value); setError(''); }}
                                onKeyDown={e => e.key === 'Enter' && handlePhoneSubmit()}
                                className={`w-full pl-11 pr-4 py-4 rounded-2xl border-2 text-base font-bold outline-none transition-all ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-orange-400'}`}
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

                ) : step === 'name' ? (
                    /* PASO 2 — NOMBRE (nuevo usuario) */
                    <div className="p-6 space-y-5">
                        <div className="text-center">
                            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <User size={26} className="text-orange-500" />
                            </div>
                            <p className="font-black text-gray-900 text-lg">¡Primera vez por acá!</p>
                            <p className="text-gray-400 text-sm mt-1">¿Cómo te llamás?</p>
                        </div>

                        <input
                            type="text"
                            placeholder="Tu nombre"
                            value={name}
                            onChange={e => { setName(e.target.value); setError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleRegister()}
                            className={`w-full px-4 py-4 rounded-2xl border-2 text-base font-bold outline-none transition-all ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-orange-400'}`}
                            autoFocus
                        />
                        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                        <button
                            onClick={handleRegister}
                            disabled={saving}
                            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {saving ? 'Registrando...' : '¡Listo, empezar a acumular!'}
                        </button>

                        <button onClick={() => setStep('phone')} className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors">
                            ← Cambiar número
                        </button>
                    </div>

                ) : (
                    /* PERFIL */
                    <div className="p-6 space-y-4">
                        {/* Avatar + nombre */}
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
                                <User size={22} className="text-orange-500" />
                            </div>
                            <div>
                                <p className="font-black text-gray-900">{customer?.name}</p>
                                <p className="text-xs text-gray-400 flex items-center gap-1"><Phone size={11} /> {customer?.phone}</p>
                            </div>
                        </div>

                        {/* Nivel */}
                        <div className={`rounded-2xl p-4 border ${currentTier.bg}`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Star size={15} className={currentTier.color} fill="currentColor" />
                                    <span className="font-black text-gray-900 text-sm">Nivel {currentTier.label}</span>
                                </div>
                                {currentTier.discount > 0 && (
                                    <span className="font-black text-orange-600 text-sm bg-orange-100 px-2 py-0.5 rounded-full">
                                        {currentTier.discount}% OFF
                                    </span>
                                )}
                            </div>
                            {nextTier ? (
                                <>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1.5">
                                        <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${progress}%` }} />
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        ${((nextTier.spend - totalSpent) / 1000).toFixed(0)}k para nivel {nextTier.label} ({nextTier.discount}% OFF)
                                    </p>
                                </>
                            ) : (
                                <p className="text-xs text-amber-600 font-bold">¡Nivel máximo! 🏆</p>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { val: customer?.visits ?? 0, label: 'Visitas' },
                                { val: customer?.points ?? 0, label: 'Puntos' },
                                { val: `${currentTier.discount}%`, label: 'Descuento' },
                            ].map(({ val, label }) => (
                                <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-xl font-black text-gray-900">{val}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{label}</p>
                                </div>
                            ))}
                        </div>

                        <button onClick={handleSignOut} className="w-full py-2.5 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">
                            Salir
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

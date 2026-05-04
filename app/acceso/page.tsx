"use client";

import { useState } from "react";
import { IconLoader2, IconEye, IconEyeOff } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";

const GREEN = "#2d4a3e";
const CREAM = "#F5EDD8";

export default function AccesoPage() {
    const supabase = createClient();

    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!identifier.trim() || !password.trim()) {
            setError("Completá todos los campos.");
            return;
        }
        setLoading(true);

        const raw = identifier.trim();
        const isPhone = !raw.includes("@");
        const email = isPhone
            ? `${raw.replace(/\D/g, "")}@bloom.local`
            : raw.toLowerCase();
        // Phone passwords are stored as pure digits — strip formatting before comparing
        const pwd = isPhone ? password.replace(/\D/g, "") : password.trim();

        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password: pwd });

        if (authError) {
            setError("Usuario o contraseña incorrectos.");
            setLoading(false);
            return;
        }

        const { data: profile } = await supabase
            .from("profiles").select("role").eq("id", data.user.id).single();

        const isStaff = ["ADMIN", "WAITER", "KITCHEN", "MANAGER"].includes(profile?.role);
        // replace() removes the login page from history so back button doesn't return here
        window.location.replace(isStaff ? "/dashboard" : "/menu");
    };

    return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: CREAM }}>
            <div className="w-full max-w-[400px]">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-md" style={{ backgroundColor: GREEN }}>
                        ☕
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-neutral-900">Ingresar</h1>
                    <p className="mt-1 text-sm font-medium text-neutral-500">Bloom</p>
                </div>

                <div className="rounded-3xl border border-black/[0.07] bg-white p-8 shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[14px] font-bold text-neutral-700 mb-1.5">Email o celular</label>
                            <input
                                type="text"
                                autoComplete="username"
                                placeholder="email@ejemplo.com o 2235551234"
                                value={identifier}
                                onChange={e => { setIdentifier(e.target.value); setError(""); }}
                                className="w-full min-h-[52px] rounded-2xl border-2 border-neutral-200 bg-white px-4 text-[16px] font-semibold outline-none placeholder:text-neutral-300 placeholder:font-normal focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/25 transition-all"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-[14px] font-bold text-neutral-700 mb-1.5">Contraseña</label>
                            <div className="relative">
                                <input
                                    type={showPwd ? "text" : "password"}
                                    autoComplete="current-password"
                                    placeholder="Tu contraseña o número de celular"
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); setError(""); }}
                                    className="w-full min-h-[52px] rounded-2xl border-2 border-neutral-200 bg-white px-4 pr-12 text-[16px] font-semibold outline-none placeholder:text-neutral-300 placeholder:font-normal focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/25 transition-all"
                                />
                                <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400">
                                    {showPwd ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-700">{error}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex min-h-[54px] w-full items-center justify-center rounded-2xl text-[16px] font-black text-white shadow-md transition hover:opacity-90 disabled:opacity-60"
                            style={{ backgroundColor: GREEN }}
                        >
                            {loading ? <IconLoader2 className="h-5 w-5 animate-spin" /> : "INGRESAR →"}
                        </button>
                    </form>

                    <div className="mt-6 border-t border-neutral-100 pt-5 text-center">
                        <p className="text-[13px] font-medium text-neutral-500">
                            ¿No tenés cuenta?{" "}
                            <a href="/registro" className="font-bold underline underline-offset-2" style={{ color: GREEN }}>
                                Registrate gratis
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

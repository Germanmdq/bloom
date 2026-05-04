"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconLoader2 } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";

const GREEN = "#2d4a3e";
const CREAM = "#F5EDD8";

export default function AccesoPage() {
    const router = useRouter();
    const supabase = createClient();

    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!phone.trim()) {
            setError("Ingresá tu número de celular.");
            return;
        }

        setLoading(true);
        try {
            const phoneClean = phone.replace(/\D/g, "");
            const fakeEmail = `${phoneClean}@bloom.local`;

            const { error: authError } = await supabase.auth.signInWithPassword({
                email: fakeEmail,
                password: phoneClean,
            });

            if (authError) {
                setError("Número de celular incorrecto o no registrado.");
                return;
            }

            router.push("/cuenta");
        } catch {
            setError("Error de conexión. Intentá de nuevo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: CREAM }}>
            <div className="w-full max-w-[400px]">
                <div className="mb-8 text-center">
                    <div
                        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl shadow-md"
                        style={{ backgroundColor: GREEN }}
                    >
                        ☕
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-neutral-900">Ingresar</h1>
                    <p className="mt-1 text-sm font-medium text-neutral-500">Club Bloom · Socios</p>
                </div>

                <div className="rounded-3xl border border-black/[0.07] bg-white p-8 shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-[14px] font-bold text-neutral-700">
                                Tu WhatsApp
                            </label>
                            <input
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                placeholder="223 000-0000"
                                value={phone}
                                onChange={(e) => { setPhone(e.target.value); setError(""); }}
                                className="w-full min-h-[52px] rounded-2xl border-2 border-neutral-200 bg-white px-4 text-[16px] font-semibold outline-none placeholder:text-neutral-400 focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/25 transition-all"
                            />
                        </div>

                        {error && (
                            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-700">
                                {error}
                            </p>
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

                <p className="mt-6 text-center text-[12px] font-medium text-neutral-400">
                    Ingresá el mismo número de celular con el que te registraste.
                </p>
            </div>
        </div>
    );
}

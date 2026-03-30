"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCustomerAuthMode } from "@/lib/auth/customer";
import { Phone, Mail, ArrowRight, ChevronLeft, Loader2 } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

type Step = "identifier" | "otp";

function toE164ArPhone(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.startsWith("54")) return `+${d}`;
  if (d.startsWith("9") && d.length >= 10) return `+54${d}`;
  return `+54${d}`;
}

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();
  const mode = getCustomerAuthMode();

  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendOtp = async () => {
    setError("");
    if (mode === "phone") {
      const cleaned = identifier.replace(/\D/g, "");
      if (cleaned.length < 8) {
        setError("Ingresá un celular válido (código de área + número).");
        return;
      }
      const phone = toE164ArPhone(cleaned);
      setLoading(true);
      const { error: err } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: true,
          data: { is_customer: true },
        },
      });
      setLoading(false);
      if (err) {
        console.error(err);
        setError(
          err.message.includes("Phone")
            ? "No pudimos enviar SMS. Probá con email: configurá NEXT_PUBLIC_CUSTOMER_AUTH_MODE=email o habilitá Phone en Supabase."
            : err.message
        );
        return;
      }
      setIdentifier(phone);
      setStep("otp");
      return;
    }

    const email = identifier.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Ingresá un email válido.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/cuenta` : undefined,
        data: { is_customer: true },
      },
    });
    setLoading(false);
    if (err) {
      console.error(err);
      setError(err.message);
      return;
    }
    setIdentifier(email);
    setStep("otp");
  };

  const verifyOtp = async () => {
    const code = otp.replace(/\s/g, "");
    if (code.length < 4) {
      setError("Ingresá el código que te llegó.");
      return;
    }
    setError("");
    setLoading(true);
    const params =
      mode === "phone"
        ? { phone: identifier.startsWith("+") ? identifier : toE164ArPhone(identifier), token: code, type: "sms" as const }
        : { email: identifier, token: code, type: "email" as const };

    const { error: err } = await supabase.auth.verifyOtp(params);
    setLoading(false);
    if (err) {
      console.error(err);
      setError("Código incorrecto o vencido. Revisá e intentá de nuevo.");
      return;
    }
    router.push("/cuenta");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans text-neutral-900">
      <header className="sticky top-0 z-40 border-b border-amber-100/60 bg-[#FAF7F2]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-between px-5 py-4">
          <Link href="/menu" className="flex items-center gap-1.5 text-sm font-semibold text-neutral-500 transition-colors hover:text-neutral-900">
            <ChevronLeft size={20} />
            Menú
          </Link>
          <span className="font-black tracking-tighter text-lg text-neutral-900">
            BLOOM<span className="text-[#2d4a3e]">.</span>
          </span>
          <div className="w-14" />
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pb-16 pt-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#e8e4d4] ring-2 ring-[#c4b896]/40">
            {mode === "phone" ? (
              <Phone className="h-9 w-9 text-[#5f5c46]" strokeWidth={2} />
            ) : (
              <Mail className="h-9 w-9 text-[#5f5c46]" strokeWidth={2} />
            )}
          </div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-900">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-neutral-500">
            {step === "identifier"
              ? mode === "phone"
                ? "Te mandamos un código por SMS."
                : "Te mandamos un código a tu correo."
              : "Revisá tu bandeja y pegá el código acá."}
          </p>
        </div>

        <div className="rounded-3xl border border-amber-100/80 bg-white p-6 shadow-sm">
          {step === "identifier" && (
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase tracking-wider text-neutral-400">
                {mode === "phone" ? "Celular" : "Email"}
              </label>
              {mode === "phone" ? (
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Ej: 11 2345 6789"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && void sendOtp()}
                  className={`w-full rounded-2xl border-2 px-4 py-4 text-base font-bold outline-none transition-all placeholder:font-medium placeholder:text-neutral-300 ${
                    error ? "border-red-300 bg-red-50" : "border-neutral-200 focus:border-[#7a765a]"
                  }`}
                  autoFocus
                />
              ) : (
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="vos@email.com"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && void sendOtp()}
                  className={`w-full rounded-2xl border-2 px-4 py-4 text-base font-bold outline-none transition-all placeholder:font-medium placeholder:text-neutral-300 ${
                    error ? "border-red-300 bg-red-50" : "border-neutral-200 focus:border-[#7a765a]"
                  }`}
                  autoFocus
                />
              )}
              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
              <button
                type="button"
                onClick={() => void sendOtp()}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2d4a3e] py-4 text-base font-black text-white shadow-lg shadow-[#2d4a3e]/20 transition hover:bg-[#1f352c] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                Continuar
              </button>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase tracking-wider text-neutral-400">Código</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="• • • • • •"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/[^\d]/g, ""));
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && void verifyOtp()}
                className={`w-full rounded-2xl border-2 px-4 py-4 text-center text-2xl font-black tracking-[0.3em] outline-none transition-all ${
                  error ? "border-red-300 bg-red-50" : "border-neutral-200 focus:border-[#7a765a]"
                }`}
                autoFocus
                maxLength={12}
              />
              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
              <button
                type="button"
                onClick={() => void verifyOtp()}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7a765a] py-4 text-base font-black text-white transition hover:bg-[#5f5c46] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                Verificar e ingresar
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("identifier");
                  setOtp("");
                  setError("");
                }}
                className="w-full py-2 text-sm font-bold text-neutral-400 hover:text-neutral-600"
              >
                ← Cambiar {mode === "phone" ? "número" : "email"}
              </button>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-neutral-400">
          Al continuar aceptás recibir un código de acceso. Sin contraseña.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

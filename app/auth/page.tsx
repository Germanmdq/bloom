"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isAdminEmail } from "@/lib/auth/admin";
import { ChevronLeft, Loader2, Mail } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";

type Panel = "login" | "register";

function translateAuthError(err: AuthError): string {
  const msg = err.message.toLowerCase();
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
    return "Email o contraseña incorrectos.";
  }
  if (msg.includes("email not confirmed")) {
    return "Confirmá tu correo antes de iniciar sesión.";
  }
  if (msg.includes("user already registered") || msg.includes("already registered")) {
    return "Ese email ya está registrado. Iniciá sesión.";
  }
  if (msg.includes("password")) {
    return "La contraseña no cumple los requisitos.";
  }
  if (msg.includes("email")) {
    return "Revisá el formato del email.";
  }
  return err.message || "Algo salió mal. Intentá de nuevo.";
}

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  const [panel, setPanel] = useState<Panel>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const emailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim().toLowerCase());

  const login = async () => {
    setError("");
    setInfo("");
    const email = loginEmail.trim().toLowerCase();
    if (!emailValid(email)) {
      setError("Ingresá un email válido.");
      return;
    }
    if (!loginPassword) {
      setError("Ingresá tu contraseña.");
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password: loginPassword });
    setLoading(false);
    if (err) {
      console.error(err);
      setError(translateAuthError(err));
      return;
    }
    if (isAdminEmail(data?.user?.email)) {
      router.replace("/dashboard");
    } else {
      router.replace("/cuenta");
    }
    router.refresh();
  };

  const register = async () => {
    setError("");
    setInfo("");
    const name = regName.trim();
    const email = regEmail.trim().toLowerCase();
    if (!name) {
      setError("Ingresá tu nombre.");
      return;
    }
    if (!emailValid(email)) {
      setError("Ingresá un email válido.");
      return;
    }
    if (regPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password: regPassword,
      options: {
        data: { full_name: name, is_customer: true },
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/cuenta` : undefined,
      },
    });
    setLoading(false);
    if (err) {
      console.error(err);
      setError(translateAuthError(err));
      return;
    }
    if (data.session) {
      router.push("/cuenta");
      router.refresh();
      return;
    }
    setInfo("Te enviamos un correo para confirmar tu cuenta. Después podés iniciar sesión.");
  };

  const switchToLogin = () => {
    setPanel("login");
    setError("");
    setInfo("");
  };

  const switchToRegister = () => {
    setPanel("register");
    setError("");
    setInfo("");
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
            <Mail className="h-9 w-9 text-[#5f5c46]" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-900">
            {panel === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            {panel === "login" ? "Ingresá con tu email y contraseña." : "Completá tus datos para registrarte."}
          </p>
        </div>

        <div className="rounded-3xl border border-amber-100/80 bg-white p-6 shadow-sm">
          {panel === "login" && (
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase tracking-wider text-neutral-400">Email</label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="vos@email.com"
                value={loginEmail}
                onChange={(e) => {
                  setLoginEmail(e.target.value);
                  setError("");
                  setInfo("");
                }}
                onKeyDown={(e) => e.key === "Enter" && void login()}
                className={`w-full rounded-2xl border-2 px-4 py-4 text-base font-bold outline-none transition-all placeholder:font-medium placeholder:text-neutral-300 ${
                  error ? "border-red-300 bg-red-50" : "border-neutral-200 focus:border-[#7a765a]"
                }`}
                autoFocus
              />
              <label className="block text-xs font-black uppercase tracking-wider text-neutral-400">Contraseña</label>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  setError("");
                  setInfo("");
                }}
                onKeyDown={(e) => e.key === "Enter" && void login()}
                className={`w-full rounded-2xl border-2 px-4 py-4 text-base font-bold outline-none transition-all placeholder:font-medium placeholder:text-neutral-300 ${
                  error ? "border-red-300 bg-red-50" : "border-neutral-200 focus:border-[#7a765a]"
                }`}
              />
              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
              {info ? <p className="text-sm font-medium text-[#2d4a3e]">{info}</p> : null}
              <button
                type="button"
                onClick={() => void login()}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2d4a3e] py-4 text-base font-black text-white shadow-lg shadow-[#2d4a3e]/20 transition hover:bg-[#1f352c] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                Iniciar sesión
              </button>
              <p className="text-center text-sm text-neutral-600">
                ¿No tenés cuenta?{" "}
                <button type="button" onClick={switchToRegister} className="font-bold text-[#2d4a3e] underline-offset-2 hover:underline">
                  Registrate
                </button>
              </p>
            </div>
          )}

          {panel === "register" && (
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase tracking-wider text-neutral-400">Nombre</label>
              <input
                type="text"
                autoComplete="name"
                placeholder="Tu nombre"
                value={regName}
                onChange={(e) => {
                  setRegName(e.target.value);
                  setError("");
                  setInfo("");
                }}
                className={`w-full rounded-2xl border-2 px-4 py-4 text-base font-bold outline-none transition-all placeholder:font-medium placeholder:text-neutral-300 ${
                  error ? "border-red-300 bg-red-50" : "border-neutral-200 focus:border-[#7a765a]"
                }`}
                autoFocus
              />
              <label className="block text-xs font-black uppercase tracking-wider text-neutral-400">Email</label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="vos@email.com"
                value={regEmail}
                onChange={(e) => {
                  setRegEmail(e.target.value);
                  setError("");
                  setInfo("");
                }}
                className={`w-full rounded-2xl border-2 px-4 py-4 text-base font-bold outline-none transition-all placeholder:font-medium placeholder:text-neutral-300 ${
                  error ? "border-red-300 bg-red-50" : "border-neutral-200 focus:border-[#7a765a]"
                }`}
              />
              <label className="block text-xs font-black uppercase tracking-wider text-neutral-400">Contraseña (mín. 6 caracteres)</label>
              <input
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={regPassword}
                onChange={(e) => {
                  setRegPassword(e.target.value);
                  setError("");
                  setInfo("");
                }}
                onKeyDown={(e) => e.key === "Enter" && void register()}
                className={`w-full rounded-2xl border-2 px-4 py-4 text-base font-bold outline-none transition-all placeholder:font-medium placeholder:text-neutral-300 ${
                  error ? "border-red-300 bg-red-50" : "border-neutral-200 focus:border-[#7a765a]"
                }`}
              />
              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
              {info ? <p className="text-sm font-medium text-[#2d4a3e]">{info}</p> : null}
              <button
                type="button"
                onClick={() => void register()}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2d4a3e] py-4 text-base font-black text-white shadow-lg shadow-[#2d4a3e]/20 transition hover:bg-[#1f352c] active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                Crear cuenta
              </button>
              <p className="text-center text-sm text-neutral-600">
                ¿Ya tenés cuenta?{" "}
                <button type="button" onClick={switchToLogin} className="font-bold text-[#2d4a3e] underline-offset-2 hover:underline">
                  Iniciá sesión
                </button>
              </p>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-neutral-400">Tu cuenta es solo para Bloom: pedidos y beneficios.</p>
      </main>
      <SiteFooter />
    </div>
  );
}

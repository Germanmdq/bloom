"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const GREEN = "#2d4a3e";
const CREAM = "#FAF7F2";

type FieldKey = "full_name" | "phone" | "email" | "password" | "address" | "address_extra";

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

function authErrorField(err: AuthError): FieldKey | "general" {
  const msg = err.message.toLowerCase();
  if (
    msg.includes("user already registered") ||
    msg.includes("already been registered") ||
    msg.includes("already registered")
  ) {
    return "email";
  }
  if (msg.includes("password")) {
    return "password";
  }
  if (msg.includes("invalid email") || msg.includes("email format") || msg.includes("valid email")) {
    return "email";
  }
  return "general";
}

function combineRegisterAddress(line: string, extra: string): string {
  const a = line.trim();
  const b = extra.trim();
  if (!a) return b;
  if (!b) return a;
  return `${a} - ${b}`;
}

const inputClass = (hasError: boolean) =>
  `w-full min-h-[52px] rounded-2xl border-2 px-4 text-[16px] font-semibold leading-snug outline-none transition-all placeholder:font-medium placeholder:text-neutral-400 ${
    hasError ? "border-red-400 bg-red-50/80" : "border-neutral-200/90 bg-white focus:border-[#5f7a6b] focus:ring-1 focus:ring-[#2d4a3e]/20"
  }`;

export default function RegistroPage() {
  const router = useRouter();
  const supabase = createClient();

  const [count, setCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [addressExtra, setAddressExtra] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey | "general", string>>>({});
  const [loading, setLoading] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const target = 500;
    const duration = 2000;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      setCount(Math.round(p * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [mounted]);

  useEffect(() => {
    if (!celebrate) return;
    const t = window.setTimeout(() => router.push("/menu"), 2000);
    return () => clearTimeout(t);
  }, [celebrate, router]);

  const emailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim().toLowerCase());

  const clearFieldError = (k: FieldKey) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  const validate = (): FieldKey | null => {
    if (!fullName.trim()) return "full_name";
    if (!phone.trim()) return "phone";
    if (!emailValid(email)) return "email";
    if (password.length < 6) return "password";
    if (!addressLine.trim()) return "address";
    if (!addressExtra.trim()) return "address_extra";
    return null;
  };

  const messages: Record<FieldKey, string> = {
    full_name: "Ingresá tu nombre completo.",
    phone: "Ingresá tu teléfono.",
    email: "Ingresá un email válido.",
    password: "La contraseña debe tener al menos 6 caracteres.",
    address: "Ingresá la dirección de entrega (calle y número).",
    address_extra: "Ingresá piso, dpto o referencia.",
  };

  const submit = async () => {
    setFieldErrors({});
    const first = validate();
    if (first) {
      setFieldErrors({ [first]: messages[first] });
      return;
    }
    setLoading(true);
    const defaultAddress = combineRegisterAddress(addressLine, addressExtra);
    const { error: err } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          default_address: defaultAddress,
          is_customer: true,
        },
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/menu` : undefined,
      },
    });
    setLoading(false);
    if (err) {
      const field = authErrorField(err);
      if (field === "general") {
        setFieldErrors({ general: translateAuthError(err) });
      } else {
        setFieldErrors({ [field]: translateAuthError(err) });
      }
      return;
    }
    setCelebrate(true);
  };

  const cupDelays = Array.from({ length: 10 }, (_, i) => `${0.05 + i * 0.085}s`);

  const benefits = [
    { icon: "☕", title: "Café gratis", body: "A los 10 encargos, el siguiente es nuestro" },
    { icon: "🎁", title: "Regalo de cumpleaños", body: "El día de tu cumple te sorprendemos" },
    { icon: "🏷️", title: "Descuentos de socio", body: "Precios especiales solo para el club" },
  ];

  return (
    <div className="min-h-[100dvh] font-sans text-neutral-900">
      {celebrate ? (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 px-6 text-center"
          style={{ backgroundColor: GREEN }}
          role="alert"
          aria-live="polite"
        >
          <span className="text-[clamp(4rem,18vw,7rem)] leading-none drop-shadow-lg" aria-hidden>
            ☕
          </span>
          <p className="font-serif text-[clamp(1.5rem,5vw,2.75rem)] font-black leading-tight text-white [text-shadow:0_4px_32px_rgba(0,0,0,0.35)]">
            ¡Bienvenido al Club Bloom!
          </p>
          <p className="max-w-sm text-[16px] font-medium text-white/85">Te llevamos al menú…</p>
        </div>
      ) : null}

      <div className="flex min-h-[100dvh] flex-col lg:flex-row">
        {/* Hero */}
        <section
          className="relative flex flex-1 flex-col justify-center overflow-hidden px-6 py-12 sm:px-10 sm:py-16 lg:w-1/2 lg:min-h-[100dvh] lg:py-20"
          style={{
            backgroundColor: GREEN,
            backgroundImage:
              "radial-gradient(ellipse 90% 60% at 100% 0%, rgba(201, 168, 76, 0.14), transparent 55%), radial-gradient(ellipse 70% 50% at 0% 100%, rgba(255,255,255,0.07), transparent 50%)",
          }}
          aria-labelledby="registro-hero-title"
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:repeating-linear-gradient(-45deg,#fff_0,#fff_1px,transparent_1px,transparent_12px)]" />

          <div className="relative mx-auto w-full max-w-xl">
            <p className="mb-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-black tabular-nums leading-none tracking-tight text-white drop-shadow-[0_6px_28px_rgba(0,0,0,0.35)]">
              <span className="text-[#c9a84c] [font-size:clamp(2.5rem,8vw,4rem)]">+{count}</span>
              <span className="max-w-[16rem] text-[clamp(1.05rem,3.5vw,1.45rem)] font-bold leading-snug text-white/95 sm:max-w-none">
                socios ya confían en Bloom
              </span>
            </p>

            <h1
              id="registro-hero-title"
              className="font-serif text-[clamp(1.65rem,5vw,2.65rem)] font-black leading-[1.12] tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
            >
              Cada visita te acerca a tu próximo café gratis
            </h1>

            <div className="my-8">
              <p className="mb-3 text-[15px] font-bold uppercase tracking-[0.12em] text-[#c9a84c]/95">
                Tu progreso
              </p>
              <div
                className="flex flex-wrap items-center gap-x-1 gap-y-2 sm:gap-x-1.5"
                role="img"
                aria-label="Progreso de lealtad: 9 de 10 visitas completadas, siguiente café gratis al completar"
              >
                {cupDelays.slice(0, 9).map((delay, i) => (
                  <span
                    key={i}
                    className="registro-cup inline-block text-[clamp(1.35rem,4.5vw,1.75rem)] leading-none"
                    style={{ animationDelay: delay }}
                  >
                    🟤
                  </span>
                ))}
                <span
                  className="registro-cup registro-cup--final inline-block text-[clamp(1.35rem,4.5vw,1.85rem)] leading-none"
                  style={{ animationDelay: cupDelays[9] }}
                >
                  ☕
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-black/25 ring-1 ring-white/10">
                <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-[#6b8f7e] via-[#c9a84c] to-[#e8d5a3] registro-bar-fill" />
              </div>
            </div>

            <ul className="space-y-5">
              {benefits.map((b) => (
                <li key={b.title} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 sm:p-5">
                  <span className="text-3xl sm:text-4xl leading-none" aria-hidden>
                    {b.icon}
                  </span>
                  <div>
                    <p className="text-[17px] font-black text-white sm:text-lg">{b.title}</p>
                    <p className="mt-1 text-[15px] font-medium leading-relaxed text-white/85">{b.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <figure className="mt-10 border-t border-white/15 pt-8">
              <div className="mb-2 text-[#c9a84c]" aria-label="Calificación cinco estrellas">
                ⭐⭐⭐⭐⭐
              </div>
              <blockquote className="font-serif text-[17px] italic leading-relaxed text-white/92 sm:text-lg">
                &ldquo;Me enteré por Instagram y ahora vengo todos los días&rdquo;
              </blockquote>
              <figcaption className="mt-2 text-[15px] font-semibold text-white/60">Cliente Bloom</figcaption>
            </figure>
          </div>
        </section>

        {/* Form */}
        <section
          className="flex flex-1 flex-col justify-center px-5 py-12 sm:px-8 sm:py-16 lg:w-1/2 lg:py-20"
          style={{ backgroundColor: CREAM }}
          aria-labelledby="registro-form-title"
        >
          <div className="mx-auto w-full max-w-[440px]">
            <header className="registro-field-anim mb-8" style={{ animationDelay: "0.05s" }}>
              <h2 id="registro-form-title" className="text-[clamp(1.65rem,4.5vw,2.125rem)] font-black tracking-tight text-neutral-900">
                Crear mi cuenta gratis
              </h2>
              <p className="mt-2 text-[16px] font-semibold text-neutral-600">30 segundos y ya sos socio</p>
            </header>

            {fieldErrors.general ? (
              <p className="registro-field-anim mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] font-semibold text-red-700" style={{ animationDelay: "0.08s" }}>
                {fieldErrors.general}
              </p>
            ) : null}

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <div className="registro-field-anim space-y-2" style={{ animationDelay: "0.12s" }}>
                <label htmlFor="reg-nombre" className="block text-[15px] font-bold text-neutral-800">
                  Nombre completo
                </label>
                <input
                  id="reg-nombre"
                  name="full_name"
                  type="text"
                  autoComplete="name"
                  placeholder="Tu nombre"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    clearFieldError("full_name");
                  }}
                  className={inputClass(!!fieldErrors.full_name)}
                  aria-invalid={!!fieldErrors.full_name}
                  aria-describedby={fieldErrors.full_name ? "err-nombre" : undefined}
                />
                {fieldErrors.full_name ? (
                  <p id="err-nombre" className="text-[15px] font-semibold text-red-600">
                    {fieldErrors.full_name}
                  </p>
                ) : null}
              </div>

              <div className="registro-field-anim space-y-2" style={{ animationDelay: "0.19s" }}>
                <label htmlFor="reg-tel" className="block text-[15px] font-bold text-neutral-800">
                  Teléfono
                </label>
                <input
                  id="reg-tel"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Tu número de WhatsApp"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    clearFieldError("phone");
                  }}
                  className={inputClass(!!fieldErrors.phone)}
                  aria-invalid={!!fieldErrors.phone}
                  aria-describedby={fieldErrors.phone ? "err-tel" : undefined}
                />
                {fieldErrors.phone ? (
                  <p id="err-tel" className="text-[15px] font-semibold text-red-600">
                    {fieldErrors.phone}
                  </p>
                ) : null}
              </div>

              <div className="registro-field-anim space-y-2" style={{ animationDelay: "0.26s" }}>
                <label htmlFor="reg-email" className="block text-[15px] font-bold text-neutral-800">
                  Email
                </label>
                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Tu email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError("email");
                  }}
                  className={inputClass(!!fieldErrors.email)}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? "err-email" : undefined}
                />
                {fieldErrors.email ? (
                  <p id="err-email" className="text-[15px] font-semibold text-red-600">
                    {fieldErrors.email}
                  </p>
                ) : null}
              </div>

              <div className="registro-field-anim space-y-2" style={{ animationDelay: "0.33s" }}>
                <label htmlFor="reg-pass" className="block text-[15px] font-bold text-neutral-800">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="reg-pass"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearFieldError("password");
                    }}
                    className={`${inputClass(!!fieldErrors.password)} pr-[52px]`}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? "err-pass" : undefined}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 flex h-10 min-w-10 -translate-y-1/2 items-center justify-center rounded-xl text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" strokeWidth={2} /> : <Eye className="h-5 w-5" strokeWidth={2} />}
                  </button>
                </div>
                {fieldErrors.password ? (
                  <p id="err-pass" className="text-[15px] font-semibold text-red-600">
                    {fieldErrors.password}
                  </p>
                ) : null}
              </div>

              <div className="registro-field-anim space-y-2" style={{ animationDelay: "0.4s" }}>
                <label htmlFor="reg-calle" className="block text-[15px] font-bold text-neutral-800">
                  Dirección de entrega
                </label>
                <input
                  id="reg-calle"
                  name="street_address"
                  type="text"
                  autoComplete="street-address"
                  placeholder="Calle y número"
                  value={addressLine}
                  onChange={(e) => {
                    setAddressLine(e.target.value);
                    clearFieldError("address");
                  }}
                  className={inputClass(!!fieldErrors.address)}
                  aria-invalid={!!fieldErrors.address}
                  aria-describedby={fieldErrors.address ? "err-calle" : undefined}
                />
                {fieldErrors.address ? (
                  <p id="err-calle" className="text-[15px] font-semibold text-red-600">
                    {fieldErrors.address}
                  </p>
                ) : null}
              </div>

              <div className="registro-field-anim space-y-2" style={{ animationDelay: "0.47s" }}>
                <label htmlFor="reg-ref" className="block text-[15px] font-bold text-neutral-800">
                  Piso / Dpto / Referencia
                </label>
                <input
                  id="reg-ref"
                  name="address_extra"
                  type="text"
                  autoComplete="off"
                  placeholder="Ej: Piso 3, Of. 12"
                  value={addressExtra}
                  onChange={(e) => {
                    setAddressExtra(e.target.value);
                    clearFieldError("address_extra");
                  }}
                  className={inputClass(!!fieldErrors.address_extra)}
                  aria-invalid={!!fieldErrors.address_extra}
                  aria-describedby={fieldErrors.address_extra ? "err-ref" : undefined}
                />
                {fieldErrors.address_extra ? (
                  <p id="err-ref" className="text-[15px] font-semibold text-red-600">
                    {fieldErrors.address_extra}
                  </p>
                ) : null}
              </div>

              <div className="registro-field-anim pt-2" style={{ animationDelay: "0.54s" }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="registro-cta-pulse flex h-[60px] w-full items-center justify-center rounded-full bg-[#2d4a3e] text-[18px] font-black text-white transition hover:bg-[#243d32] disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden /> : "UNIRME AL CLUB BLOOM →"}
                </button>
              </div>
            </form>

            <p className="registro-field-anim mt-4 text-center text-[15px] font-medium text-neutral-600" style={{ animationDelay: "0.61s" }}>
              🔒 Tus datos están seguros. Sin spam, sin sorpresas.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

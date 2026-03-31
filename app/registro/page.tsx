"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { Eye, EyeOff, Instagram, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const GREEN = "#2d4a3e";
const CREAM = "#FAF7F2";
const GOLD = "#c9a84c";
const APPLE_FONT =
  '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif';
const STEP_TRANSITION_MS = 300;

const INSTAGRAM_URL =
  "https://www.instagram.com/bloomcoffee.mdp?igsh=MWttZmRheHhscm5oYw==";
const INSTAGRAM_BUTTON_GRADIENT =
  "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)";

const MESES: { value: string; label: string }[] = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

type FieldKey =
  | "full_name"
  | "phone"
  | "email"
  | "birthdate"
  | "password"
  | "address"
  | "address_extra";

function translateAuthError(err: AuthError): string {
  const msg = err.message.toLowerCase();
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
    return "Email o contraseña incorrectos.";
  }
  if (msg.includes("email not confirmed")) {
    return "Confirmá tu correo antes de iniciar sesión.";
  }
  if (msg.includes("user already registered") || msg.includes("already registered")) {
    return "Ese email ya está registrado.";
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

function firstNameForGreeting(fullName: string): string {
  const t = fullName.trim();
  if (!t) return "";
  return t.split(/\s+/)[0] ?? t;
}

function isValidCalendarDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) /**/ return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function birthdateISO(day: string, month: string, year: string): string | null {
  if (!day || !month || !year) return null;
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (!isValidCalendarDate(y, m, d)) return null;
  const dd = String(d).padStart(2, "0");
  return `${y}-${month}-${dd}`;
}

const inputClass = (hasError: boolean) =>
  `w-full min-h-[52px] rounded-2xl border-2 px-4 text-[16px] font-semibold leading-snug outline-none transition-all placeholder:font-medium placeholder:text-neutral-400 ${
    hasError ? "border-red-400 bg-red-50/80" : "border-neutral-200/90 bg-white focus:border-[#5f7a6b] focus:ring-1 focus:ring-[#2d4a3e]/20"
  }`;

const selectFieldClass = (hasError: boolean) =>
  `${inputClass(hasError)} appearance-none bg-white pr-10`;

export default function RegistroPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [panelAnim, setPanelAnim] = useState<"in" | "out">("in");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [password, setPassword] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [addressExtra, setAddressExtra] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey | "general", string>>>({});
  const [loading, setLoading] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [instagramModal, setInstagramModal] = useState(false);
  const menuRedirectRef = useRef<number | null>(null);

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    const max = y - 13;
    const min = y - 100;
    const list: number[] = [];
    for (let yy = max; yy >= min; yy--) list.push(yy);
    return list;
  }, []);

  const days = useMemo(() => {
    const md = birthMonth ? parseInt(birthMonth, 10) : 12;
    const yy = birthYear ? parseInt(birthYear, 10) : 2024;
    const dim = new Date(yy, md, 0).getDate();
    return Array.from({ length: dim }, (_, i) => String(i + 1));
  }, [birthMonth, birthYear]);

  useEffect(() => {
    if (!birthDay) return;
    const d = parseInt(birthDay, 10);
    const dim = days.length;
    if (d > dim) setBirthDay("");
  }, [birthDay, days.length]);

  const scheduleMenuRedirect = useCallback(() => {
    if (menuRedirectRef.current) {
      clearTimeout(menuRedirectRef.current);
      menuRedirectRef.current = null;
    }
    menuRedirectRef.current = window.setTimeout(() => {
      menuRedirectRef.current = null;
      void router.push("/menu");
    }, 1500);
  }, [router]);

  useEffect(() => {
    if (!celebrate) {
      setInstagramModal(false);
      return;
    }
    setInstagramModal(false);
    const showModal = window.setTimeout(() => setInstagramModal(true), 1000);
    return () => clearTimeout(showModal);
  }, [celebrate]);

  useEffect(() => {
    return () => {
      if (menuRedirectRef.current) clearTimeout(menuRedirectRef.current);
    };
  }, []);

  const onFollowInstagram = () => {
    window.open(INSTAGRAM_URL, "_blank", "noopener,noreferrer");
    setInstagramModal(false);
    scheduleMenuRedirect();
  };

  const onSkipInstagram = () => {
    setInstagramModal(false);
    scheduleMenuRedirect();
  };

  const emailValid = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim().toLowerCase());

  const clearFieldError = (k: FieldKey) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  const goToStepAfterTransition = (target: number) => {
    setPanelAnim("out");
    window.setTimeout(() => {
      setStep(target);
      setPanelAnim("in");
    }, STEP_TRANSITION_MS);
  };

  const validarPaso1 = (): boolean => {
    if (!fullName.trim()) {
      setFieldErrors({ full_name: "Ingresá tu nombre completo." });
      return false;
    }
    setFieldErrors({});
    return true;
  };

  const validarPaso2 = (): boolean => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!phone.trim()) next.phone = "Ingresá tu teléfono.";
    if (!emailValid(email)) next.email = "Ingresá un email válido.";
    const iso = birthdateISO(birthDay, birthMonth, birthYear);
    if (!iso) {
      next.birthdate = "Elegí una fecha de nacimiento válida.";
    }
    if (Object.keys(next).length) {
      setFieldErrors(next);
      return false;
    }
    setFieldErrors({});
    return true;
  };

  const validarPaso3 = (): boolean => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (password.length < 6) next.password = "Mínimo 6 caracteres.";
    if (!addressLine.trim()) next.address = "Ingresá calle y número.";
    if (!addressExtra.trim()) next.address_extra = "Ingresá piso, oficina o referencia.";
    if (Object.keys(next).length) {
      setFieldErrors(next);
      return false;
    }
    setFieldErrors({});
    return true;
  };

  const onContinuar1 = () => {
    if (!validarPaso1()) return;
    goToStepAfterTransition(2);
  };

  const onContinuar2 = () => {
    if (!validarPaso2()) return;
    goToStepAfterTransition(3);
  };

  const submit = async () => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.general;
      return next;
    });
    if (!validarPaso3()) return;
    const bd = birthdateISO(birthDay, birthMonth, birthYear);
    if (!bd) {
      setFieldErrors({ birthdate: "Fecha de nacimiento inválida." });
      return;
    }
    setLoading(true);
    const defaultAddress = combineRegisterAddress(addressLine, addressExtra);
    const emailNorm = email.trim().toLowerCase();
    const { error: err } = await supabase.auth.signUp({
      email: emailNorm,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: emailNorm,
          birthdate: bd,
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

  const greetingName = firstNameForGreeting(fullName);

  const stepHeading: Record<number, string> = {
    1: "¿Cómo te llamás?",
    2: "¿Dónde te encontramos?",
    3: "Última paso",
  };

  return (
    <div className="min-h-[100dvh] text-neutral-900" style={{ fontFamily: APPLE_FONT }}>
      {celebrate ? (
        <>
          <div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 px-6 text-center"
            style={{ backgroundColor: GREEN }}
            role="alert"
            aria-live="polite"
          >
            <span
              className="registro-celebrate-coffee text-[clamp(4.5rem,20vw,8rem)] leading-none drop-shadow-lg"
              aria-hidden
            >
              ☕
            </span>
            <p className="max-w-xl text-[clamp(1.25rem,4.5vw,2rem)] font-black leading-snug text-white [text-shadow:0_4px_28px_rgba(0,0,0,0.35)]">
              ¡Bienvenido al Club Bloom,{" "}
              <span className="text-[clamp(1.35rem,5vw,2.35rem)]" style={{ color: GOLD }}>
                {greetingName || "socio"}
              </span>
              !
            </p>
            <p className="max-w-md text-[17px] font-semibold leading-relaxed text-white/88">
              Ya sos socio. Cada encargo te acerca a tu próximo café gratis.
            </p>
            <p className="pt-4 text-[16px] font-bold text-white/75">Te llevamos al menú en un momento.</p>
          </div>

          {instagramModal ? (
            <div
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 px-4 py-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="registro-ig-title"
            >
              <div className="w-full max-w-[360px] rounded-3xl bg-white p-8 text-center shadow-2xl">
                <div
                  className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md"
                  style={{ background: INSTAGRAM_BUTTON_GRADIENT }}
                  aria-hidden
                >
                  <Instagram className="h-8 w-8" strokeWidth={2} aria-hidden />
                </div>
                <h2 id="registro-ig-title" className="text-[1.35rem] font-black leading-tight text-neutral-900 sm:text-2xl">
                  ¡Seguinos en Instagram!
                </h2>
                <p className="mt-3 text-[15px] font-medium leading-relaxed text-neutral-600 sm:text-base">
                  Enterate de los platos del día, promociones y novedades de Bloom
                </p>
                <p className="mt-5 text-xl font-black text-neutral-900 sm:text-2xl">@bloomcoffee.mdp</p>
                <button
                  type="button"
                  onClick={onFollowInstagram}
                  className="mt-6 flex min-h-[52px] w-full items-center justify-center rounded-full px-4 text-[16px] font-black text-white shadow-lg transition hover:opacity-95 active:scale-[0.99]"
                  style={{ background: INSTAGRAM_BUTTON_GRADIENT }}
                >
                  Seguir en Instagram →
                </button>
                <button
                  type="button"
                  onClick={onSkipInstagram}
                  className="mt-4 text-[14px] font-semibold text-neutral-500 underline underline-offset-2 transition hover:text-neutral-800"
                >
                  Ahora no
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="flex min-h-[100dvh] flex-col">
        <section
          className="px-6 py-16 text-center"
          style={{ backgroundColor: GREEN }}
          aria-label="Programa de lealtad Club Bloom"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#c9a84c] sm:text-xs">
            Programa de lealtad
          </p>
          <h1 className="mx-auto mt-5 max-w-3xl text-[clamp(1.85rem,5.5vw,3.25rem)] font-black leading-[1.08] tracking-tight text-white">
            Sumate al Club Bloom
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] font-medium leading-relaxed text-white/85 sm:text-[17px]">
            Registrate una vez y empezá a sumar puntos con cada encargo. Sin complicaciones.
          </p>

          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 text-left md:mt-12 md:grid-cols-3 md:gap-6">
            <div className="flex flex-col rounded-2xl border-t-4 border-[#c9a84c] bg-white p-5 shadow-md sm:p-6">
              <span className="mb-3 text-4xl leading-none sm:text-5xl" aria-hidden>
                ☕
              </span>
              <h2 className="text-lg font-black text-neutral-900 sm:text-xl">Café gratis cada 10 encargos</h2>
              <p className="mt-2 text-[15px] font-medium leading-relaxed text-neutral-600 sm:text-base">
                Cada vez que llegás a 10 pedidos, el siguiente corre por nuestra cuenta.
              </p>
            </div>
            <div className="flex flex-col rounded-2xl border-t-4 border-[#c9a84c] bg-white p-5 shadow-md sm:p-6">
              <span className="mb-3 text-4xl leading-none sm:text-5xl" aria-hidden>
                🎁
              </span>
              <h2 className="text-lg font-black text-neutral-900 sm:text-xl">Regalos en fechas especiales</h2>
              <p className="mt-2 text-[15px] font-medium leading-relaxed text-neutral-600 sm:text-base">
                En tu cumpleaños y en fechas especiales tenemos una sorpresa para vos.
              </p>
            </div>
            <div className="flex flex-col rounded-2xl border-t-4 border-[#c9a84c] bg-white p-5 shadow-md sm:p-6">
              <span className="mb-3 text-4xl leading-none sm:text-5xl" aria-hidden>
                🏷️
              </span>
              <h2 className="text-lg font-black text-neutral-900 sm:text-xl">Descuentos exclusivos</h2>
              <p className="mt-2 text-[15px] font-medium leading-relaxed text-neutral-600 sm:text-base">
                Promociones y precios especiales solo para socios del club.
              </p>
            </div>
          </div>
        </section>

        <section
          className="flex flex-1 flex-col items-center px-4 py-12 sm:px-6 sm:py-16"
          style={{ backgroundColor: CREAM }}
        >
          <div
            className="w-full max-w-[480px] rounded-3xl border border-black/[0.06] p-10 shadow-2xl"
            style={{ backgroundColor: CREAM }}
          >
            <h2 className="text-center text-[clamp(1.5rem,4.5vw,1.9rem)] font-black tracking-tight text-neutral-900">
              Crear mi cuenta
            </h2>
            <p className="mt-2 text-center text-[16px] font-semibold text-neutral-600">30 segundos y ya sos socio</p>

            <div className="mb-8 mt-8 flex items-center justify-center gap-3" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3} aria-label={`Paso ${step} de 3`}>
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={`h-3 w-3 rounded-full transition-colors duration-300 ${step >= n ? "bg-[#2d4a3e]" : "bg-neutral-300"}`}
                  aria-hidden
                />
              ))}
            </div>

            {fieldErrors.general ? (
              <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] font-semibold text-red-700">
                {fieldErrors.general}
              </p>
            ) : null}

            <div
              key={step}
              className={panelAnim === "out" ? "registro-step-panel-out" : "registro-step-panel-in"}
            >
              <h3 className="mb-6 text-[1.2rem] font-black text-neutral-900 sm:text-xl">{stepHeading[step]}</h3>

              {step === 1 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="reg-nombre" className="sr-only">
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
                  <button
                    type="button"
                    onClick={onContinuar1}
                    className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-[#2d4a3e] text-[16px] font-black text-white shadow-md transition hover:bg-[#243d32]"
                  >
                    Continuar →
                  </button>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="reg-tel" className="block text-[15px] font-bold text-neutral-800">
                      Tu WhatsApp
                    </label>
                    <input
                      id="reg-tel"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="223 000-0000"
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
                  <div className="space-y-2">
                    <label htmlFor="reg-email" className="block text-[15px] font-bold text-neutral-800">
                      Email
                    </label>
                    <input
                      id="reg-email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="tucorreo@email.com"
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
                  <fieldset className="space-y-3 rounded-2xl border border-neutral-200/80 bg-white/60 p-4">
                    <legend className="px-1 text-[16px] font-bold leading-snug text-neutral-900">
                      🎂 ¿Cuándo es tu cumpleaños? Te sorprendemos ese día
                    </legend>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label htmlFor="reg-bd-d" className="mb-1 block text-[12px] font-bold uppercase tracking-wide text-neutral-500">
                          Día
                        </label>
                        <div className="relative">
                          <select
                            id="reg-bd-d"
                            value={birthDay}
                            onChange={(e) => {
                              setBirthDay(e.target.value);
                              clearFieldError("birthdate");
                            }}
                            className={selectFieldClass(!!fieldErrors.birthdate)}
                            aria-label="Día de nacimiento"
                          >
                            <option value="">—</option>
                            {days.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400" aria-hidden>
                            ▼
                          </span>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="reg-bd-m" className="mb-1 block text-[12px] font-bold uppercase tracking-wide text-neutral-500">
                          Mes
                        </label>
                        <div className="relative">
                          <select
                            id="reg-bd-m"
                            value={birthMonth}
                            onChange={(e) => {
                              setBirthMonth(e.target.value);
                              clearFieldError("birthdate");
                            }}
                            className={selectFieldClass(!!fieldErrors.birthdate)}
                            aria-label="Mes de nacimiento"
                          >
                            <option value="">—</option>
                            {MESES.map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400" aria-hidden>
                            ▼
                          </span>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="reg-bd-y" className="mb-1 block text-[12px] font-bold uppercase tracking-wide text-neutral-500">
                          Año
                        </label>
                        <div className="relative">
                          <select
                            id="reg-bd-y"
                            value={birthYear}
                            onChange={(e) => {
                              setBirthYear(e.target.value);
                              clearFieldError("birthdate");
                            }}
                            className={selectFieldClass(!!fieldErrors.birthdate)}
                            aria-label="Año de nacimiento"
                          >
                            <option value="">—</option>
                            {years.map((y) => (
                              <option key={y} value={String(y)}>
                                {y}
                              </option>
                            ))}
                          </select>
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400" aria-hidden>
                            ▼
                          </span>
                        </div>
                      </div>
                    </div>
                    {fieldErrors.birthdate ? (
                      <p className="text-[15px] font-semibold text-red-600">{fieldErrors.birthdate}</p>
                    ) : null}
                  </fieldset>
                  <button
                    type="button"
                    onClick={onContinuar2}
                    className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-[#2d4a3e] text-[16px] font-black text-white shadow-md transition hover:bg-[#243d32]"
                  >
                    Continuar →
                  </button>
                </div>
              ) : null}

              {step === 3 ? (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submit();
                  }}
                >
                  <div className="space-y-2">
                    <label htmlFor="reg-pass" className="block text-[15px] font-bold text-neutral-800">
                      Elegí una contraseña (mínimo 6 caracteres)
                    </label>
                    <div className="relative">
                      <input
                        id="reg-pass"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="••••••••"
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
                  <div className="space-y-2">
                    <label htmlFor="reg-calle" className="block text-[15px] font-bold text-neutral-800">
                      ¿Dónde te hacemos delivery?
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
                  <div className="space-y-2">
                    <label htmlFor="reg-ref" className="block text-[15px] font-bold text-neutral-800">
                      Piso / Dpto
                    </label>
                    <input
                      id="reg-ref"
                      name="address_extra"
                      type="text"
                      autoComplete="off"
                      placeholder="Piso, oficina o referencia"
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
                  <button
                    type="submit"
                    disabled={loading}
                    className="registro-cta-pulse mt-2 flex h-[60px] w-full items-center justify-center rounded-full bg-[#2d4a3e] text-[18px] font-black text-white transition hover:bg-[#243d32] disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden /> : "UNIRME AL CLUB BLOOM →"}
                  </button>
                  <p className="text-center text-[15px] font-medium text-neutral-600">
                    🔒 Sin spam. Podés darte de baja cuando quieras.
                  </p>
                </form>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

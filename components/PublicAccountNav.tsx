"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

function displayNameFromUser(user: User) {
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
  const n = meta?.full_name?.trim() || meta?.name?.trim();
  if (n) return n;
  if (user.email) return user.email.split("@")[0] ?? "Cuenta";
  return "Cuenta";
}

type Props = {
  className?: string;
  /** Ej.: cerrar drawer móvil al ir a /auth o /cuenta */
  onAfterNavigate?: () => void;
  /** Navbar sobre foto oscura (p. ej. /about) */
  tone?: "default" | "onDark";
};

/** Navegación pública: sesión Supabase → enlace a /cuenta o icono a /auth. No usar en el dashboard. */
export function PublicAccountNav({ className = "", onAfterNavigate, tone = "default" }: Props) {
  const supabase = createClient();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const sessionCheckedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      sessionCheckedRef.current = true;
      setUser(session?.user ?? null);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!sessionCheckedRef.current) return;
      setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const dark = tone === "onDark";

  if (!ready) {
    return (
      <div
        className={`h-9 w-9 shrink-0 rounded-full animate-pulse ${dark ? "bg-white/20" : "bg-neutral-200/80"} ${className}`}
        aria-hidden
      />
    );
  }

  if (user) {
    const label = displayNameFromUser(user);
    const initial = label.slice(0, 1).toUpperCase();
    return (
      <Link
        href="/cuenta"
        onClick={() => onAfterNavigate?.()}
        className={`inline-flex max-w-[11rem] items-center gap-2 rounded-full border px-1.5 py-1 pr-3 text-sm font-black shadow-sm ${
          dark
            ? "border-white/25 bg-white/10 text-white hover:bg-white/15"
            : "border-amber-100/90 bg-white text-neutral-900 hover:bg-[#FAF7F2]"
        } ${className}`}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2d4a3e] text-xs font-black text-white">
          {initial}
        </span>
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href="/auth"
      onClick={() => onAfterNavigate?.()}
      className={`inline-flex items-center justify-center rounded-full p-2 transition-colors ${
        dark
          ? "text-white/90 hover:bg-white/10 hover:text-white"
          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
      } ${className}`}
      aria-label="Iniciar sesión"
    >
      <LogIn size={20} strokeWidth={2.25} />
    </Link>
  );
}

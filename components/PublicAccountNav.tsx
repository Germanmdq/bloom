"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogIn, LogOut, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";

function displayNameFromUser(user: SupabaseUser) {
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
  const n = meta?.full_name?.trim() || meta?.name?.trim();
  if (n) return n;
  if (user.email) return user.email.split("@")[0] ?? "Cuenta";
  return "Cuenta";
}

type Props = {
  className?: string;
  onAfterNavigate?: () => void;
  tone?: "default" | "onDark";
};

export function PublicAccountNav({ className = "", onAfterNavigate, tone = "default" }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [open, setOpen] = useState(false);
  const sessionCheckedRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
    onAfterNavigate?.();
  };

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
      <div ref={dropdownRef} className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`inline-flex max-w-[11rem] items-center gap-2 rounded-full border px-1.5 py-1 pr-3 text-sm font-black shadow-sm transition-colors ${
            dark
              ? "border-white/25 bg-white/10 text-white hover:bg-white/15"
              : "border-amber-100/90 bg-white text-neutral-900 hover:bg-[#FAF7F2]"
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2d4a3e] text-xs font-black text-white">
            {initial}
          </span>
          <span className="truncate">{label}</span>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-neutral-100 bg-white py-1.5 shadow-lg z-50">
            <Link
              href="/cuenta"
              onClick={() => { setOpen(false); onAfterNavigate?.(); }}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <User size={16} className="text-neutral-400" />
              Mi cuenta
            </Link>
            <div className="my-1 border-t border-neutral-100" />
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
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

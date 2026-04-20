"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Props = {
  className?: string;
  onAfterNavigate?: () => void;
  tone?: "default" | "onDark";
};

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!sessionCheckedRef.current) return;
      setUser(session?.user ?? null);
    });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [supabase]);

  const dark = tone === "onDark";

  if (!ready) return <div className={`h-8 w-24 rounded-full animate-pulse ${dark ? "bg-white/20" : "bg-neutral-200/70"} ${className}`} aria-hidden />;

  if (user) {
    return (
      <button
        onClick={async () => { await supabase.auth.signOut(); onAfterNavigate?.(); }}
        className={`text-[13px] font-medium transition-colors ${dark ? "text-white/80 hover:text-white" : "text-neutral-500 hover:text-neutral-900"} ${className}`}
      >
        Cerrar sesión
      </button>
    );
  }

  return (
    <Link
      href="/auth"
      onClick={() => onAfterNavigate?.()}
      className={`text-[13px] font-medium transition-colors ${dark ? "text-white/80 hover:text-white" : "text-neutral-500 hover:text-neutral-900"} ${className}`}
    >
      Iniciar sesión
    </Link>
  );
}


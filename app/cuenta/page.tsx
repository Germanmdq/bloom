"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  User as UserIcon,
  Phone,
  Mail,
  LogOut,
  ShoppingBag,
  Gift,
} from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { FoodKingMobileNavPanel } from "@/components/FoodKingMobileNav";
import { SiteHeader } from "@/components/SiteHeader";

const COFFEE_GOAL = 10;

type OrderRow = {
  id: string;
  created_at: string;
  total: number | string;
  items: unknown;
  status?: string | null;
  paid?: boolean;
  customer_name?: string | null;
};

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function loyaltyProgress(totalOrders: number) {
  const pos = totalOrders % COFFEE_GOAL;
  const filled = pos === 0 && totalOrders > 0 ? COFFEE_GOAL : pos;
  return { filled, totalOrders };
}

export default function CuentaPage() {
  const router = useRouter();
  const supabase = createClient();
  const sessionCheckedRef = useRef(false);
  const [sessionPending, setSessionPending] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  /** Solo pedidos pagados — barra de lealtad y contador “Llevás N pedidos”. */
  const [paidOrderCount, setPaidOrderCount] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const loadOrders = useCallback(
    async (uid: string) => {
      setOrdersLoading(true);
      const [listRes, paidCountRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, created_at, total, items, status, paid, customer_name")
          .eq("customer_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("customer_id", uid)
          .eq("paid", true),
      ]);
      if (listRes.error) console.error(listRes.error);
      if (paidCountRes.error) console.error(paidCountRes.error);
      setOrders((listRes.data as OrderRow[]) ?? []);
      setPaidOrderCount(paidCountRes.count ?? 0);
      setOrdersLoading(false);
    },
    [supabase]
  );

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      sessionCheckedRef.current = true;
      setSessionPending(false);
      if (!session?.user) {
        router.replace("/auth");
        return;
      }
      setUser(session.user);
      await loadOrders(session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!sessionCheckedRef.current) return;
      if (!session?.user) {
        router.replace("/auth");
        setUser(null);
        return;
      }
      setUser(session.user);
      void loadOrders(session.user.id);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router, supabase, loadOrders]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/menu");
    router.refresh();
  };

  const displayName =
    (user?.user_metadata?.full_name as string | undefined)?.trim() ||
    (user?.user_metadata?.name as string | undefined)?.trim() ||
    "Cliente Bloom";
  const phone = user?.phone;
  const email = user?.email;

  const { filled, totalOrders } = loyaltyProgress(paidOrderCount);

  if (sessionPending || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <Loader2 className="h-10 w-10 animate-spin text-[#7a765a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans text-neutral-900">
      <FoodKingMobileNavPanel open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <SiteHeader scrolled={false} onMobileNavOpen={() => setMobileNavOpen(true)} activeNav={null} />

      <main className="mx-auto max-w-lg space-y-6 px-5 py-8">
        {/* Perfil */}
        <div className="rounded-3xl border border-amber-100/80 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8e4d4]">
              <UserIcon className="h-7 w-7 text-[#5f5c46]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-black text-xl text-neutral-900">{displayName}</p>
              {phone && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-neutral-500">
                  <Phone size={14} /> {phone}
                </p>
              )}
              {email && (
                <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-neutral-500">
                  <Mail size={14} /> {email}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Lealtad */}
        <div className="rounded-3xl border border-[#c4b896]/40 bg-gradient-to-br from-[#f0ede4] to-white p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Gift className="h-5 w-5 text-[#7a765a]" />
            <h2 className="font-black text-neutral-900">Programa de lealtad</h2>
          </div>
          <p className="text-sm leading-relaxed text-neutral-600">
            Llevás <strong>{totalOrders}</strong> pedidos
          </p>
          <div className="mt-4 flex gap-1">
            {Array.from({ length: COFFEE_GOAL }).map((_, i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors ${i < filled ? "bg-[#7a765a]" : "bg-neutral-200"}`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/menu"
            className="flex w-full flex-1 items-center justify-center rounded-full bg-[#2d4a3e] px-6 py-3 text-center font-black text-white shadow-md transition hover:bg-[#1f352c]"
          >
            Ir al menú →
          </Link>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex w-full flex-1 items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-6 py-3 text-sm font-bold text-neutral-600 transition hover:bg-neutral-50"
          >
            <LogOut size={16} />
            Salir
          </button>
        </div>

        {/* Historial */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-[#7a765a]" />
            <h2 className="font-black text-neutral-900">Tus pedidos</h2>
          </div>
          {ordersLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#7a765a]" />
            </div>
          ) : orders.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-neutral-200 bg-white/60 py-10 text-center text-sm text-neutral-500">
              Todavía no tenés pedidos vinculados a esta cuenta. Pedí desde el menú o el chat Bloom.
            </p>
          ) : (
            <ul className="space-y-3">
              {orders.map((o) => {
                const items = Array.isArray(o.items) ? o.items : [];
                const total = Number(o.total);
                const isOpen = expanded === o.id;
                const paid = Boolean(o.paid);
                return (
                  <li
                    key={o.id}
                    className="overflow-hidden rounded-2xl border border-amber-100/80 bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : o.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-neutral-900">
                          {new Date(o.created_at).toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          <span className="font-medium text-neutral-400">
                            {new Date(o.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </p>
                        <p className="text-sm font-black text-[#2d4a3e]">{formatMoney(total)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                            paid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {paid ? "Pagado" : "Pendiente"}
                        </span>
                        {isOpen ? <ChevronUp size={18} className="text-neutral-400" /> : <ChevronDown size={18} className="text-neutral-400" />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="border-t border-neutral-100 px-4 py-3 text-sm">
                        <ul className="space-y-2">
                          {items.length === 0 ? (
                            <li className="text-neutral-400">Sin detalle de ítems</li>
                          ) : (
                            items.map((it: any, idx: number) => (
                              <li key={idx} className="flex justify-between gap-2">
                                <span className="text-neutral-700">
                                  {(it.quantity ?? 1) > 1 && <span className="font-bold text-[#7a765a]">{it.quantity}× </span>}
                                  {it.name}
                                </span>
                                <span className="shrink-0 font-bold text-neutral-800">
                                  {formatMoney(Number(it.price ?? 0) * Number(it.quantity ?? 1))}
                                </span>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

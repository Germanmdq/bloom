"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Loader2,
  LogOut,
  ShoppingBag,
  Gift,
} from "lucide-react";
import { toast } from "sonner";

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

function initialsFromName(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function metaStr(u: User | null, key: string): string {
  const v = u?.user_metadata?.[key];
  return typeof v === "string" ? v.trim() : "";
}

export default function CuentaPage() {
  const router = useRouter();
  const supabase = createClient();
  const sessionCheckedRef = useRef(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [sessionPending, setSessionPending] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [paidOrderCount, setPaidOrderCount] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBirthdate, setEditBirthdate] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

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

  const hydrateProfileFields = useCallback((u: User) => {
    setEditFullName(metaStr(u, "full_name") || metaStr(u, "name") || "");
    setEditPhone(metaStr(u, "phone") || (u.phone ?? "").trim());
    setEditEmail(u.email ?? "");
    setEditBirthdate(metaStr(u, "birthdate"));
    setEditAddress(metaStr(u, "default_address"));
    setAvatarUrl(metaStr(u, "avatar_url"));
  }, []);

  useEffect(() => {
    let cancelled = false;

    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      sessionCheckedRef.current = true;
      setSessionPending(false);
      if (!session?.user) {
        router.replace("/auth?redirect=/cuenta");
        return;
      }
      setUser(session.user);
      hydrateProfileFields(session.user);
      await loadOrders(session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!sessionCheckedRef.current) return;
      if (!session?.user) {
        router.replace("/auth?redirect=/cuenta");
        setUser(null);
        return;
      }
      setUser(session.user);
      hydrateProfileFields(session.user);
      void loadOrders(session.user.id);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router, supabase, loadOrders, hydrateProfileFields]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/menu");
    router.refresh();
  };

  const displayName = editFullName.trim() || "Cliente Bloom";
  const { filled, totalOrders } = loyaltyProgress(paidOrderCount);

  const orderStats = useMemo(() => {
    let totalSum = 0;
    let nWithTotal = 0;
    const counts = new Map<string, number>();
    for (const o of orders) {
      const t = Number(o.total);
      if (!Number.isNaN(t) && t > 0) {
        totalSum += t;
        nWithTotal += 1;
      }
      const items = Array.isArray(o.items) ? o.items : [];
      for (const it of items) {
        const row = it as { name?: string; quantity?: number };
        const name = String(row.name ?? "").trim();
        if (!name) continue;
        const q = Number(row.quantity ?? 1);
        counts.set(name, (counts.get(name) ?? 0) + q);
      }
    }
    let topName = "—";
    let topN = 0;
    for (const [k, v] of counts) {
      if (v > topN) {
        topN = v;
        topName = k;
      }
    }
    return {
      totalOrdersCount: orders.length,
      averageOrderValue: nWithTotal > 0 ? Math.round(totalSum / nWithTotal) : 0,
      mostOrderedProduct: topN > 0 ? topName : "—",
    };
  }, [orders]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const nextMeta = {
        ...(user.user_metadata ?? {}),
        full_name: editFullName.trim(),
        phone: editPhone.trim(),
        birthdate: editBirthdate.trim(),
        default_address: editAddress.trim(),
        avatar_url: avatarUrl.trim() || "",
      };
      const emailNext = editEmail.trim();
      const payload: Parameters<typeof supabase.auth.updateUser>[0] = { data: nextMeta };
      if (emailNext && emailNext !== user.email) {
        payload.email = emailNext;
      }
      const { error: authErr } = await supabase.auth.updateUser(payload);
      if (authErr) throw authErr;

      await supabase.from("profiles").update({ full_name: editFullName.trim() }).eq("id", user.id);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        hydrateProfileFields(session.user);
      }
      toast.success("Perfil guardado");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const onAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Elegí un archivo de imagen");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen debe pesar menos de 2 MB");
      return;
    }
    setAvatarBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(publicUrl);
      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          ...(user.user_metadata ?? {}),
          avatar_url: publicUrl,
        },
      });
      if (authErr) throw authErr;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        hydrateProfileFields(session.user);
      }
      toast.success("Foto actualizada");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la foto");
    } finally {
      setAvatarBusy(false);
    }
  };

  const inputCls =
    "mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-900 outline-none focus:border-[#2d4a3e] focus:ring-1 focus:ring-[#2d4a3e]/20";

  if (sessionPending || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF7F2]">
        <Loader2 className="h-10 w-10 animate-spin text-[#7a765a]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans text-neutral-900">
      <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white shadow-sm">
        <div className="relative mx-auto flex h-14 max-w-4xl items-center justify-center px-4">
          <span className="text-lg font-black tracking-[-0.03em] text-[#2d4a3e]">BLOOM.</span>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="absolute right-3 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-black text-neutral-700 shadow-sm transition hover:bg-neutral-50 sm:right-4"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Salir
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-5 py-8 pb-16">
        {/* Foto y datos */}
        <div className="rounded-3xl border border-amber-100/80 bg-white p-6 shadow-sm">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => void onAvatarFile(e)}
          />
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarBusy}
              className="group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-[#c4b896]/50 bg-[#e8e4d4] text-[#2d4a3e] shadow-inner outline-none transition hover:border-[#2d4a3e] focus-visible:ring-2 focus-visible:ring-[#2d4a3e] disabled:opacity-60"
              aria-label="Cambiar foto de perfil"
            >
              {avatarUrl ? (
                <Image src={avatarUrl} alt={displayName} fill className="object-cover" sizes="96px" />
              ) : (
                <span className="text-2xl font-black">{initialsFromName(displayName)}</span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                {avatarBusy ? (
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                ) : (
                  <Camera className="h-7 w-7 text-white" />
                )}
              </span>
            </button>
            <p className="text-center text-xs font-medium text-neutral-500 sm:text-left">Tocá la foto para subir una nueva</p>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="cuenta-nombre" className="text-xs font-black uppercase tracking-wide text-neutral-500">
                Nombre
              </label>
              <input id="cuenta-nombre" className={inputCls} value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="cuenta-tel" className="text-xs font-black uppercase tracking-wide text-neutral-500">
                Teléfono
              </label>
              <input
                id="cuenta-tel"
                className={inputCls}
                inputMode="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="cuenta-mail" className="text-xs font-black uppercase tracking-wide text-neutral-500">
                Email
              </label>
              <input
                id="cuenta-mail"
                type="email"
                className={inputCls}
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="cuenta-nac" className="text-xs font-black uppercase tracking-wide text-neutral-500">
                Fecha de nacimiento
              </label>
              <input
                id="cuenta-nac"
                type="date"
                className={inputCls}
                value={editBirthdate.length >= 10 ? editBirthdate.slice(0, 10) : editBirthdate}
                onChange={(e) => setEditBirthdate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="cuenta-dir" className="text-xs font-black uppercase tracking-wide text-neutral-500">
                Dirección de entrega
              </label>
              <textarea
                id="cuenta-dir"
                rows={3}
                className={`${inputCls} resize-y`}
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void saveProfile()}
            disabled={savingProfile}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#2d4a3e] py-3 text-sm font-black text-white shadow-md transition hover:bg-[#1f352c] disabled:opacity-60"
          >
            {savingProfile ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Guardar cambios
          </button>
        </div>

        {/* Resumen pedidos */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-center shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-wide text-neutral-500">Pedidos</p>
            <p className="mt-1 text-2xl font-black tabular-nums text-[#2d4a3e]">{orderStats.totalOrdersCount}</p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-center shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-wide text-neutral-500">Ticket promedio</p>
            <p className="mt-1 text-lg font-black tabular-nums text-[#2d4a3e]">
              {orderStats.averageOrderValue > 0 ? formatMoney(orderStats.averageOrderValue) : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-center shadow-sm sm:col-span-1">
            <p className="text-[11px] font-black uppercase tracking-wide text-neutral-500">Más pedido</p>
            <p className="mt-1 line-clamp-2 text-sm font-bold text-neutral-900">{orderStats.mostOrderedProduct}</p>
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

        <Link
          href="/menu"
          className="flex w-full items-center justify-center rounded-full bg-[#2d4a3e] px-6 py-3.5 text-center text-sm font-black text-white shadow-md transition hover:bg-[#1f352c]"
        >
          Ir al menú →
        </Link>

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
                            items.map((it: unknown, idx: number) => {
                              const row = it as { name?: string; quantity?: number; price?: number };
                              return (
                                <li key={idx} className="flex justify-between gap-2">
                                  <span className="text-neutral-700">
                                    {(row.quantity ?? 1) > 1 && (
                                      <span className="font-bold text-[#7a765a]">{row.quantity}× </span>
                                    )}
                                    {row.name}
                                  </span>
                                  <span className="shrink-0 font-bold text-neutral-800">
                                    {formatMoney(Number(row.price ?? 0) * Number(row.quantity ?? 1))}
                                  </span>
                                </li>
                              );
                            })
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
    </div>
  );
}

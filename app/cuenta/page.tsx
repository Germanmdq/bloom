"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Camera, Coffee, Loader2, Lock, LogOut, Pencil, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

const COFFEE_GOAL = 10;
const GREEN = "#2d4a3e";
const GOLD = "#c9a84c";
const CREAM = "#FAF7F2";
const TEXT_DARK = "#1a1a1a";
const SIDEBAR_W = 240;

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

function isBirthdayThisMonth(birthdate: string): boolean {
  const raw = birthdate.trim();
  if (raw.length < 7) return false;
  const d = new Date(raw.length >= 10 ? raw.slice(0, 10) : raw);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getMonth() === now.getMonth();
}

function orderItemsSummary(items: unknown, maxNames = 4): string {
  const arr = Array.isArray(items) ? items : [];
  if (arr.length === 0) return "Sin ítems";
  const names = arr
    .map((it) => String((it as { name?: string }).name ?? "").trim())
    .filter(Boolean);
  if (names.length === 0) return "Pedido";
  const shown = names.slice(0, maxNames);
  const more = names.length > maxNames ? ` +${names.length - maxNames}` : "";
  return `${shown.join(", ")}${more}`;
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
  const [profileEditMode, setProfileEditMode] = useState(false);

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
  const { filled: loyaltyFilled, totalOrders: loyaltyPaidTotal } = loyaltyProgress(paidOrderCount);
  const cupsToGo = loyaltyFilled >= COFFEE_GOAL ? 0 : COFFEE_GOAL - loyaltyFilled;
  const freeCoffeeUnlocked = paidOrderCount >= COFFEE_GOAL;
  const birthdayThisMonth = isBirthdayThisMonth(editBirthdate);

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
      setProfileEditMode(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el perfil");
    } finally {
      setSavingProfile(false);
    }
  };

  const cancelProfileEdit = () => {
    if (user) hydrateProfileFields(user);
    setProfileEditMode(false);
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
    "mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium outline-none transition placeholder:text-neutral-400 focus:border-[#2d4a3e] focus:ring-2 focus:ring-[#2d4a3e]/20";

  const statCardCls = "rounded-xl bg-white p-6 shadow-sm";
  const panelCardCls = "rounded-xl bg-white p-6 shadow-sm";

  if (sessionPending || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: CREAM }}>
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: GREEN }} />
      </div>
    );
  }

  const emailDisplay = editEmail.trim() || user.email || "—";

  const SidebarInner = () => (
    <>
      <div className="px-5 pt-8">
        <p className="text-2xl font-black tracking-[-0.06em] text-white">BLOOM.</p>
      </div>
      <div className="mt-8 flex flex-col items-center gap-2 px-4 text-center">
        <div
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-white/25"
          style={{ backgroundColor: "#1f352c" }}
        >
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" fill className="object-cover" sizes="56px" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
              {initialsFromName(displayName)}
            </span>
          )}
        </div>
        <p className="line-clamp-2 w-full px-1 text-sm font-semibold leading-tight text-white">{displayName}</p>
      </div>
      <div className="min-h-0 flex-1" aria-hidden />
    </>
  );

  return (
    <div className="min-h-screen font-sans antialiased" style={{ backgroundColor: CREAM, color: TEXT_DARK }}>
      {/* Mobile: compact header + logout (no nav) */}
      <header
        className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/10 px-4 py-3 lg:hidden"
        style={{ backgroundColor: GREEN }}
      >
        <p className="shrink-0 text-lg font-black tracking-[-0.06em] text-white">BLOOM.</p>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-white/30">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="" fill className="object-cover" sizes="36px" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: "#1f352c" }}>
                {initialsFromName(displayName)}
              </span>
            )}
          </div>
          <p className="truncate text-sm font-semibold text-white">{displayName}</p>
        </div>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="shrink-0 rounded-lg p-2 text-white/90 transition hover:bg-white/10 hover:text-white"
          aria-label="Cerrar sesión"
        >
          <LogOut className="h-5 w-5" strokeWidth={2} />
        </button>
      </header>

      {/* Desktop sidebar */}
      <aside
        className="fixed left-0 top-0 z-30 hidden h-screen w-[240px] flex-col border-r border-white/10 lg:flex"
        style={{ width: SIDEBAR_W, backgroundColor: GREEN }}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <SidebarInner />
        </div>
        <div className="border-t border-white/10 px-2 py-4">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex w-full items-center justify-center rounded-lg py-3 text-white/90 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>
      </aside>

      <div className="min-h-screen lg:ml-[240px]">
        <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 lg:px-10 lg:py-10">
          {/* Stats */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { label: "Pedidos realizados", value: String(orderStats.totalOrdersCount), kind: "num" as const },
              {
                label: "Ticket promedio",
                value: orderStats.averageOrderValue > 0 ? formatMoney(orderStats.averageOrderValue) : "—",
                kind: "num" as const,
              },
              { label: "Producto más pedido", value: orderStats.mostOrderedProduct, kind: "text" as const },
            ].map((s) => (
              <div key={s.label} className={statCardCls}>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">{s.label}</p>
                <p
                  className={`mt-3 font-bold ${s.kind === "text" ? "text-lg leading-snug" : "text-3xl tabular-nums tracking-tight"}`}
                  style={{ color: TEXT_DARK }}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </section>

          {/* Loyalty + Cupones */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section>
              <div className={panelCardCls}>
                <h2 className="flex items-center gap-2 text-base font-bold" style={{ color: TEXT_DARK }}>
                  <span aria-hidden>☕</span> Tu progreso
                </h2>
                <div className="mt-5 grid w-full grid-cols-10 gap-1 sm:gap-2">
                  {Array.from({ length: COFFEE_GOAL }).map((_, i) => {
                    const active = i < loyaltyFilled;
                    return (
                      <div
                        key={i}
                        className="flex aspect-square min-w-0 max-h-12 items-center justify-center rounded-lg sm:max-h-none"
                        style={{
                          backgroundColor: active ? "rgba(45,74,62,0.12)" : "#f0f0f0",
                          color: active ? GREEN : "#9ca3af",
                        }}
                        aria-hidden
                      >
                        <Coffee className="h-4 w-4 max-w-[80%] sm:h-5 sm:w-5" strokeWidth={active ? 2.25 : 1.75} />
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-neutral-600">
                  {cupsToGo > 0 ? (
                    <>
                      Llevás <strong style={{ color: TEXT_DARK }}>{loyaltyPaidTotal}</strong> pedidos — te faltan{" "}
                      <strong style={{ color: TEXT_DARK }}>{cupsToGo}</strong> para tu café gratis.
                    </>
                  ) : loyaltyPaidTotal > 0 ? (
                    <>
                      Llevás <strong style={{ color: TEXT_DARK }}>{loyaltyPaidTotal}</strong> pedidos — ¡podés canjear tu café gratis!
                    </>
                  ) : (
                    <>
                      Llevás <strong style={{ color: TEXT_DARK }}>0</strong> pedidos — te faltan{" "}
                      <strong style={{ color: TEXT_DARK }}>{COFFEE_GOAL}</strong> para tu café gratis.
                    </>
                  )}
                </p>
              </div>
            </section>

            <section>
              <div className={panelCardCls}>
                <h2 className="flex items-center gap-2 text-base font-bold" style={{ color: TEXT_DARK }}>
                  <span aria-hidden>🏷️</span> Cupones
                </h2>
                <div className="mt-4 space-y-3">
                  {birthdayThisMonth && (
                    <div
                      className="rounded-lg border-l-4 p-4 shadow-sm"
                      style={{ borderLeftColor: GOLD, backgroundColor: "#fafafa" }}
                    >
                      <p className="text-base font-bold" style={{ color: TEXT_DARK }}>
                        🎂 ¡Es tu mes!
                      </p>
                      <p className="mt-1 text-sm text-neutral-600">
                        Presentá esta pantalla para tu regalo.{" "}
                        <span className="font-semibold" style={{ color: GOLD }}>
                          Beneficio activo
                        </span>
                      </p>
                    </div>
                  )}
                  {!freeCoffeeUnlocked ? (
                    <div className="flex items-start gap-3 rounded-lg bg-neutral-100 p-4 text-neutral-600">
                      <Lock className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400" aria-hidden />
                      <div>
                        <p className="font-semibold" style={{ color: TEXT_DARK }}>
                          <span aria-hidden>☕</span> Café gratis
                        </p>
                        <p className="mt-1 text-sm">Desbloqueás a los 10 pedidos.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border-l-4 bg-white p-4 shadow-sm" style={{ borderLeftColor: GREEN }}>
                      <p className="font-bold" style={{ color: GREEN }}>
                        ☕ Café gratis — <span style={{ color: GOLD }}>activo</span>
                      </p>
                      <p className="mt-2 text-sm text-neutral-600">Presentá esta pantalla en el local para canjear.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Orders table */}
          <section>
            <div className={panelCardCls + " overflow-hidden p-0"}>
              <div className="flex items-center gap-2 border-b border-neutral-100 px-6 py-4">
                <ShoppingBag className="h-5 w-5" style={{ color: GREEN }} aria-hidden />
                <h2 className="text-base font-bold" style={{ color: TEXT_DARK }}>
                  Mis pedidos
                </h2>
              </div>
              {ordersLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: GREEN }} />
                </div>
              ) : orders.length === 0 ? (
                <p className="px-6 py-12 text-center text-sm text-neutral-600">
                  Todavía no tenés pedidos vinculados a esta cuenta. Pedí desde el menú o el chat Bloom.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                        <th className="px-6 py-3 font-bold">Fecha</th>
                        <th className="px-6 py-3 font-bold">Ítems</th>
                        <th className="px-6 py-3 font-bold">Total</th>
                        <th className="px-6 py-3 font-bold">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o, idx) => {
                        const paid = Boolean(o.paid);
                        const summary = orderItemsSummary(o.items);
                        const total = Number(o.total);
                        return (
                          <tr
                            key={o.id}
                            className={idx % 2 === 0 ? "bg-white" : "bg-neutral-50/80"}
                            style={{ color: TEXT_DARK }}
                          >
                            <td className="whitespace-nowrap px-6 py-4 tabular-nums text-neutral-800">
                              {new Date(o.created_at).toLocaleDateString("es-AR", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                              <span className="ml-2 text-neutral-500">
                                {new Date(o.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </td>
                            <td className="max-w-[280px] px-6 py-4 text-neutral-700">
                              <span className="line-clamp-2" title={summary}>
                                {summary}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 font-semibold tabular-nums">{formatMoney(total)}</td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                                  paid ? "text-white" : "bg-amber-100 text-amber-900"
                                }`}
                                style={paid ? { backgroundColor: GREEN } : undefined}
                              >
                                {paid ? "Pagado" : "Pendiente"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Mi perfil */}
          <section>
            <div className={panelCardCls}>
              <h2 className="text-lg font-bold" style={{ color: TEXT_DARK }}>
                Mi perfil
              </h2>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => void onAvatarFile(e)}
              />
              <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start">
                <div className="flex shrink-0 flex-col items-center md:items-start">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarBusy}
                    className="group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-md outline-none ring-2 ring-[#2d4a3e]/20 transition hover:ring-[#c9a84c] focus-visible:ring-2 focus-visible:ring-[#c9a84c] disabled:opacity-60"
                    style={{ backgroundColor: GREEN }}
                    aria-label="Cambiar foto de perfil"
                  >
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt={displayName} fill className="object-cover" sizes="96px" />
                    ) : (
                      <span className="text-2xl font-black text-white">{initialsFromName(displayName)}</span>
                    )}
                    <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/50 to-transparent pb-2 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100 group-focus-visible:opacity-100">
                      {avatarBusy ? (
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      ) : (
                        <Camera className="h-5 w-5 text-white" />
                      )}
                      <span className="px-1 text-center text-[9px] font-semibold text-white">Cambiar foto</span>
                    </span>
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  {!profileEditMode ? (
                    <>
                      <h1 className="text-xl font-bold md:text-2xl" style={{ color: TEXT_DARK }}>
                        {displayName}
                      </h1>
                      <p className="mt-1 text-sm text-neutral-600">{emailDisplay}</p>
                      <p className="mt-0.5 text-sm text-neutral-600">{editPhone.trim() || "—"}</p>
                      <button
                        type="button"
                        onClick={() => setProfileEditMode(true)}
                        className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-[#2d4a3e] bg-white px-4 py-2 text-sm font-bold transition hover:bg-[#2d4a3e]/5"
                        style={{ color: GREEN }}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                        Editar perfil
                      </button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="cuenta-nombre" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                          Nombre
                        </label>
                        <input id="cuenta-nombre" className={inputCls} value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
                      </div>
                      <div>
                        <label htmlFor="cuenta-tel" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                          Teléfono
                        </label>
                        <input id="cuenta-tel" className={inputCls} inputMode="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                      </div>
                      <div>
                        <label htmlFor="cuenta-mail" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                          Email
                        </label>
                        <input id="cuenta-mail" type="email" className={inputCls} value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                      </div>
                      <div>
                        <label htmlFor="cuenta-nac" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
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
                        <label htmlFor="cuenta-dir" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                          Dirección de entrega
                        </label>
                        <textarea id="cuenta-dir" rows={3} className={`${inputCls} resize-y`} value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => void saveProfile()}
                          disabled={savingProfile}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 sm:flex-none sm:min-w-[140px]"
                          style={{ backgroundColor: GREEN }}
                        >
                          {savingProfile ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={cancelProfileEdit}
                          disabled={savingProfile}
                          className="inline-flex flex-1 items-center justify-center rounded-full border-2 border-neutral-300 bg-white py-3 text-sm font-bold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60 sm:flex-none sm:min-w-[120px]"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

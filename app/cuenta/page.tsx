"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Coffee,
  Loader2,
  Lock,
  LogOut,
  Pencil,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";

const COFFEE_GOAL = 10;
const GREEN = "#2d4a3e";
const GOLD = "#c9a84c";
const CREAM = "#F5EDD8";

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

function orderItemsSummary(items: unknown, maxNames = 3): string {
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
  const [expanded, setExpanded] = useState<string | null>(null);
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
    "mt-1.5 w-full rounded-2xl border border-neutral-200/90 bg-white px-4 py-3 text-sm font-medium text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-[#2d4a3e] focus:ring-2 focus:ring-[#2d4a3e]/20";

  const cardCls =
    "rounded-[1.25rem] border-2 border-[#c9a84c]/45 bg-[#2d4a3e] p-5 text-white shadow-[0_4px_24px_rgba(45,74,62,0.35)]";

  if (sessionPending || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: CREAM }}>
        <Loader2 className="h-10 w-10 animate-spin text-[#2d4a3e]" />
      </div>
    );
  }

  const emailDisplay = editEmail.trim() || user.email || "—";
  const phoneDisplay = editPhone.trim() || "—";

  return (
    <div className="min-h-screen font-sans text-neutral-900 antialiased" style={{ backgroundColor: CREAM }}>
      <header className="sticky top-0 z-50 border-b-2 border-[#c9a84c]/35 bg-[#F5EDD8]/95 shadow-sm backdrop-blur-md">
        <div className="relative mx-auto flex h-14 max-w-2xl items-center justify-center px-4">
          <span className="text-lg font-black tracking-[-0.04em]" style={{ color: GREEN }}>
            BLOOM.
          </span>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="absolute right-3 inline-flex items-center gap-1.5 rounded-full border-2 border-[#c9a84c]/50 bg-white px-3 py-1.5 text-xs font-bold shadow-sm transition hover:bg-[#c9a84c]/15 sm:right-4"
            style={{ color: GREEN }}
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Salir
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6 pb-28 sm:px-5 sm:py-8">
        {/* Header — profile */}
        <section className={cardCls}>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => void onAvatarFile(e)}
          />
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
            <div className="flex shrink-0 flex-col items-center sm:items-start">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarBusy}
                className="group relative flex h-[88px] w-[88px] shrink-0 items-center justify-center overflow-hidden rounded-full shadow-md outline-none ring-2 ring-[#c9a84c]/60 ring-offset-2 ring-offset-[#2d4a3e] transition hover:ring-[#c9a84c] focus-visible:ring-2 focus-visible:ring-[#c9a84c] disabled:opacity-60 sm:h-[100px] sm:w-[100px]"
                style={{ backgroundColor: GREEN }}
                aria-label="Cambiar foto de perfil"
              >
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={displayName} fill className="object-cover" sizes="100px" />
                ) : (
                  <span className="text-2xl font-black tracking-tight text-white sm:text-[1.65rem]">
                    {initialsFromName(displayName)}
                  </span>
                )}
                <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/55 via-black/20 to-transparent pb-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-active:opacity-100 group-focus-visible:opacity-100">
                  {avatarBusy ? (
                    <Loader2 className="mb-1 h-6 w-6 animate-spin text-white" />
                  ) : (
                    <Camera className="mb-0.5 h-5 w-5 text-white drop-shadow" />
                  )}
                  <span className="px-1 text-center text-[10px] font-semibold leading-tight text-white drop-shadow-sm">
                    Tocá la foto para cambiar
                  </span>
                </span>
              </button>
            </div>

            <div className="min-w-0 flex-1">
              {!profileEditMode ? (
                <>
                  <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{displayName}</h1>
                  <p className="mt-1 truncate text-sm text-white/75">{emailDisplay}</p>
                  <p className="mt-0.5 text-sm text-white/75">{phoneDisplay}</p>
                  <button
                    type="button"
                    onClick={() => setProfileEditMode(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-md transition hover:opacity-95"
                    style={{ backgroundColor: GOLD, color: GREEN }}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                    Editar perfil
                  </button>
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="cuenta-nombre" className="text-[11px] font-bold uppercase tracking-wider text-[#c9a84c]">
                      Nombre
                    </label>
                    <input id="cuenta-nombre" className={inputCls} value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="cuenta-tel" className="text-[11px] font-bold uppercase tracking-wider text-[#c9a84c]">
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
                    <label htmlFor="cuenta-mail" className="text-[11px] font-bold uppercase tracking-wider text-[#c9a84c]">
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
                    <label htmlFor="cuenta-nac" className="text-[11px] font-bold uppercase tracking-wider text-[#c9a84c]">
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
                    <label htmlFor="cuenta-dir" className="text-[11px] font-bold uppercase tracking-wider text-[#c9a84c]">
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
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void saveProfile()}
                      disabled={savingProfile}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-60 sm:flex-none sm:min-w-[140px]"
                      style={{ backgroundColor: GREEN }}
                    >
                      {savingProfile ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={cancelProfileEdit}
                      disabled={savingProfile}
                      className="inline-flex flex-1 items-center justify-center rounded-full border-2 border-[#c9a84c] bg-transparent py-3 text-sm font-bold text-[#c9a84c] transition hover:bg-[#c9a84c]/15 disabled:opacity-60 sm:flex-none sm:min-w-[120px]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Pedidos realizados", value: String(orderStats.totalOrdersCount), sub: null },
            {
              label: "Ticket promedio",
              value: orderStats.averageOrderValue > 0 ? formatMoney(orderStats.averageOrderValue) : "—",
              sub: null,
            },
            {
              label: "Producto más pedido",
              value: orderStats.mostOrderedProduct,
              sub: "name",
            },
          ].map((s) => (
            <div key={s.label} className={cardCls + " px-4 py-4 sm:py-5"}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#c9a84c]">{s.label}</p>
              <p
                className={`mt-2 text-white ${s.sub === "name" ? "line-clamp-3 text-base font-semibold leading-snug" : "text-2xl font-bold tabular-nums tracking-tight"}`}
              >
                {s.value}
              </p>
            </div>
          ))}
        </section>

        {/* Loyalty */}
        <section className={cardCls}>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="text-[1.15rem]" aria-hidden>
              ☕
            </span>
            Tu progreso
          </h2>
          <div className="mt-4 flex flex-wrap justify-center gap-1.5 sm:justify-start sm:gap-2">
            {Array.from({ length: COFFEE_GOAL }).map((_, i) => {
              const active = i < loyaltyFilled;
              return (
                <span
                  key={i}
                  className="flex h-10 w-10 items-center justify-center rounded-xl sm:h-11 sm:w-11"
                  style={{
                    backgroundColor: active ? "rgba(201,168,76,0.38)" : "rgba(255,255,255,0.12)",
                    color: active ? GOLD : "rgba(255,255,255,0.38)",
                  }}
                  aria-hidden
                >
                  <Coffee className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]" strokeWidth={active ? 2.25 : 1.75} />
                </span>
              );
            })}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/85">
            {cupsToGo > 0 ? (
              <>
                Llevás <strong className="font-semibold text-white">{loyaltyPaidTotal}</strong> pedidos — te faltan{" "}
                <strong className="font-semibold text-white">{cupsToGo}</strong> para tu café gratis.
              </>
            ) : loyaltyPaidTotal > 0 ? (
              <>
                Llevás <strong className="font-semibold text-white">{loyaltyPaidTotal}</strong> pedidos — te faltan{" "}
                <strong className="font-semibold text-white">0</strong> para tu café gratis. ¡Podés canjear tu café!
              </>
            ) : (
              <>
                Llevás <strong className="font-semibold text-white">0</strong> pedidos — te faltan{" "}
                <strong className="font-semibold text-white">{COFFEE_GOAL}</strong> para tu café gratis.
              </>
            )}
          </p>
        </section>

        {/* Coupons */}
        <section className={cardCls}>
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <span className="text-[1.1rem]" aria-hidden>
              🏷️
            </span>
            Tus cupones
          </h2>
          <div className="mt-4 space-y-3">
            {birthdayThisMonth && (
              <div
                className="relative overflow-hidden rounded-2xl border-2 p-4 shadow-md"
                style={{ backgroundColor: GOLD, borderColor: `${GREEN}40`, color: GREEN }}
              >
                <p className="text-lg font-bold">🎂 ¡Es tu mes!</p>
                <p className="mt-1 text-sm font-semibold opacity-95">Presentá esta pantalla para tu regalo.</p>
                <span className="pointer-events-none absolute -right-4 -top-4 text-6xl opacity-25">🎁</span>
              </div>
            )}

            {!freeCoffeeUnlocked ? (
              <div className="relative flex items-start gap-3 rounded-2xl border border-neutral-400/40 bg-neutral-400/35 p-4 text-neutral-700">
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-neutral-500" aria-hidden />
                <div>
                  <p className="font-semibold text-neutral-800">
                    <span aria-hidden>☕</span> Café gratis
                  </p>
                  <p className="mt-1 text-sm leading-snug text-neutral-600">Desbloqueás a los 10 pedidos.</p>
                </div>
              </div>
            ) : (
              <div
                className="rounded-2xl border-2 p-4 shadow-md"
                style={{ backgroundColor: GOLD, borderColor: `${GREEN}50`, color: GREEN }}
              >
                <p className="flex items-center gap-2 font-bold">
                  <span aria-hidden>☕</span> Café gratis — activo
                </p>
                <p className="mt-2 text-sm font-medium leading-relaxed opacity-95">
                  Presentá esta pantalla en el local para canjear.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Order history */}
        <section>
          <div className="mb-3 flex items-center gap-2 px-0.5">
            <ShoppingBag className="h-5 w-5" style={{ color: GREEN }} aria-hidden />
            <h2 className="text-lg font-bold" style={{ color: GREEN }}>
              Historial de pedidos
            </h2>
          </div>
          {ordersLoading ? (
            <div className="flex justify-center overflow-hidden rounded-[1.25rem] border-l-4 border-[#2d4a3e] bg-white py-14 shadow-md">
              <Loader2 className="h-8 w-8 animate-spin text-[#2d4a3e]" />
            </div>
          ) : orders.length === 0 ? (
            <p className="overflow-hidden rounded-[1.25rem] border-l-4 border-[#2d4a3e] bg-white py-10 text-center text-sm text-neutral-600 shadow-md">
              Todavía no tenés pedidos vinculados a esta cuenta. Pedí desde el menú o el chat Bloom.
            </p>
          ) : (
            <ul className="space-y-3">
              {orders.map((o) => {
                const items = Array.isArray(o.items) ? o.items : [];
                const total = Number(o.total);
                const isOpen = expanded === o.id;
                const paid = Boolean(o.paid);
                const summary = orderItemsSummary(o.items);
                return (
                  <li
                    key={o.id}
                    className="overflow-hidden rounded-[1.25rem] border border-neutral-200/80 border-l-[6px] border-l-[#2d4a3e] bg-white shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : o.id)}
                      className="flex w-full items-start justify-between gap-3 px-4 py-4 text-left transition hover:bg-[#F5EDD8]/40 sm:items-center sm:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-neutral-900">
                          {new Date(o.created_at).toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          <span className="ml-2 font-normal text-neutral-400">
                            {new Date(o.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{summary}</p>
                        <p className="mt-2 text-base font-bold tabular-nums" style={{ color: GREEN }}>
                          {formatMoney(total)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                            paid ? "bg-[#2d4a3e] text-white" : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {paid ? "Pagado" : "Pendiente"}
                        </span>
                        {isOpen ? (
                          <ChevronUp size={20} className="text-neutral-400" aria-hidden />
                        ) : (
                          <ChevronDown size={20} className="text-neutral-400" aria-hidden />
                        )}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="border-t border-neutral-100 px-4 py-4 sm:px-5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Detalle</p>
                        <ul className="mt-2 space-y-2 text-sm">
                          {items.length === 0 ? (
                            <li className="text-neutral-400">Sin detalle de ítems</li>
                          ) : (
                            items.map((it: unknown, idx: number) => {
                              const row = it as { name?: string; quantity?: number; price?: number };
                              return (
                                <li key={idx} className="flex justify-between gap-3">
                                  <span className="text-neutral-700">
                                    {(row.quantity ?? 1) > 1 && (
                                      <span className="font-semibold" style={{ color: GREEN }}>
                                        {row.quantity}×{" "}
                                      </span>
                                    )}
                                    {row.name}
                                  </span>
                                  <span className="shrink-0 font-semibold tabular-nums text-neutral-800">
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
        </section>

        {/* CTA */}
        <div className="fixed bottom-0 left-0 right-0 border-t-2 border-[#c9a84c]/40 bg-[#F5EDD8]/95 p-4 backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-0">
          <button
            type="button"
            onClick={() => router.push("/menu")}
            className="flex w-full items-center justify-center rounded-full py-3.5 text-sm font-bold shadow-lg transition hover:opacity-95 active:scale-[0.99] sm:py-4 sm:text-base sm:shadow-md"
            style={{ backgroundColor: GOLD, color: GREEN }}
          >
            Ir al menú
          </button>
        </div>
      </main>
    </div>
  );
}

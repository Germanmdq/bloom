"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, Camera, ChevronDown, ChevronUp, CircleUser, Coffee, Home, Loader2, Lock, PieChart, ShoppingBag, Tag } from "lucide-react";
import { toast } from "sonner";

const COFFEE_GOAL = 10;
const GREEN = "#2d4a3e";
const GOLD = "#c9a84c";
const CREAM = "#FAF7F2";
const TEXT_DARK = "#1a1a1a";
const SIDEBAR_ACTIVE_BG = "rgba(255,255,255,0.08)";
const SIDEBAR_W = 240;

type SectionId = "inicio" | "pedidos" | "cupones" | "perfil" | "estadisticas";
type OrderFilter = "todos" | "mes" | "ano";

type OrderRow = {
  id: string;
  created_at: string;
  total: number | string;
  items: unknown;
  status?: string | null;
  paid?: boolean;
  customer_name?: string | null;
  order_type?: string | null;
  delivery_type?: string | null;
};

const COUPON_DEFS = [
  { id: "cafe", label: "Café gratis", unlock: 10, icon: "☕" },
] as const;

const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
}

function dateKeyLocal(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loyaltyProgress(paidOrders: number) {
  const pos = paidOrders % COFFEE_GOAL;
  const filled = pos === 0 && paidOrders > 0 ? COFFEE_GOAL : pos;
  return { filled, pct: (filled / COFFEE_GOAL) * 100 };
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

function orderTypeLabel(o: OrderRow): string {
  const d = String(o.delivery_type ?? "").toLowerCase();
  if (d === "delivery" || d === "domicilio") return "Delivery";
  return "Retiro";
}

function combineAddress(line: string, floor: string): string {
  const a = line.trim();
  const b = floor.trim();
  if (!a) return b;
  if (!b) return a;
  return `${a} - ${b}`;
}

function splitDefaultAddress(combined: string): { line: string; floor: string } {
  const t = combined.trim();
  const idx = t.indexOf(" - ");
  if (idx === -1) return { line: t, floor: "" };
  return { line: t.slice(0, idx).trim(), floor: t.slice(idx + 3).trim() };
}

function averageDaysBetweenOrders(datesIso: string[]): number {
  if (datesIso.length < 2) return 0;
  const ts = [...datesIso].map((d) => new Date(d).getTime()).sort((a, b) => a - b);
  let sum = 0;
  for (let i = 1; i < ts.length; i++) {
    sum += (ts[i] - ts[i - 1]) / (1000 * 60 * 60 * 24);
  }
  return Math.round((sum / (ts.length - 1)) * 10) / 10;
}

function orderStreakDays(orders: OrderRow[]): number {
  if (orders.length === 0) return 0;
  const keys = new Set(orders.map((o) => dateKeyLocal(o.created_at)));
  const newest = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  let d = new Date(newest.created_at);
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const k = dateKeyLocal(d.toISOString());
    if (keys.has(k)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

function modalHour(orders: OrderRow[]): number | null {
  const buckets = new Map<number, number>();
  for (const o of orders) {
    const h = new Date(o.created_at).getHours();
    buckets.set(h, (buckets.get(h) ?? 0) + 1);
  }
  let bestH: number | null = null;
  let bestC = 0;
  for (const [h, c] of buckets) {
    if (c > bestC) {
      bestC = c;
      bestH = h;
    }
  }
  return bestH;
}

const cardCls = "rounded-xl bg-white p-5 shadow-sm";
const statMiniCls = `${cardCls} flex flex-col`;

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
  const [section, setSection] = useState<SectionId>("inicio");
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("todos");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBirthdate, setEditBirthdate] = useState("");
  const [editAddressLine, setEditAddressLine] = useState("");
  const [editFloor, setEditFloor] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const loadOrders = useCallback(
    async (uid: string) => {
      setOrdersLoading(true);
      const [listRes, paidCountRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, created_at, total, items, status, paid, customer_name, order_type, delivery_type")
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
    const floorMeta = metaStr(u, "address_floor");
    const lineMeta = metaStr(u, "address_line");
    const combined = metaStr(u, "default_address");
    if (lineMeta || floorMeta) {
      setEditAddressLine(lineMeta || splitDefaultAddress(combined).line);
      setEditFloor(floorMeta || splitDefaultAddress(combined).floor);
    } else {
      const sp = splitDefaultAddress(combined);
      setEditAddressLine(sp.line);
      setEditFloor(sp.floor);
    }
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

  const displayName = editFullName.trim() || "Cliente Bloom";
  const { filled: loyaltyFilled, pct: loyaltyPct } = loyaltyProgress(paidOrderCount);
  const birthdayActive = isBirthdayThisMonth(editBirthdate);

  const analytics = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const totals = orders.map((o) => Number(o.total)).filter((n) => !Number.isNaN(n) && n > 0);
    const totalSpent = totals.reduce((a, b) => a + b, 0);
    const productCounts = new Map<string, number>();
    for (const o of orders) {
      const items = Array.isArray(o.items) ? o.items : [];
      for (const it of items) {
        const name = String((it as { name?: string }).name ?? "").trim();
        if (!name) continue;
        const q = Number((it as { quantity?: number }).quantity ?? 1);
        productCounts.set(name, (productCounts.get(name) ?? 0) + q);
      }
    }
    const top5 = [...productCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const ordersThisMonth = orders.filter((o) => new Date(o.created_at) >= startOfMonth);
    const ordersThisYear = orders.filter((o) => new Date(o.created_at) >= startOfYear);

    const byWeekday = WEEKDAY_LABELS.map((label, day) => ({ label, count: 0 }));
    const byHour = Array.from({ length: 24 }, (_, h) => ({ label: `${String(h).padStart(2, "0")}:00`, count: 0 }));
    for (const o of orders) {
      const d = new Date(o.created_at);
      byWeekday[d.getDay()].count += 1;
      byHour[d.getHours()].count += 1;
    }

    const monthlySpend: { label: string; gasto: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const label = d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
      let gasto = 0;
      for (const o of orders) {
        const od = new Date(o.created_at);
        if (od.getFullYear() === y && od.getMonth() === m) {
          const t = Number(o.total);
          if (!Number.isNaN(t)) gasto += t;
        }
      }
      monthlySpend.push({ label, gasto });
    }

    const sortedDates = orders.map((o) => o.created_at).sort();
    const avgDaysBetween = averageDaysBetweenOrders(sortedDates);
    const streak = orderStreakDays(orders);

    let maxOrder = 0;
    let minOrder = Number.POSITIVE_INFINITY;
    for (const t of totals) {
      if (t > maxOrder) maxOrder = t;
      if (t < minOrder) minOrder = t;
    }
    if (minOrder === Number.POSITIVE_INFINITY) minOrder = 0;

    const mh = modalHour(orders);
    const horaFrecuente =
      mh === null ? "—" : `${String(mh).padStart(2, "0")}:00 – ${String(mh + 1).padStart(2, "0")}:00`;

    return {
      totalSpent,
      productCounts,
      top5,
      ordersThisMonth: ordersThisMonth.length,
      ordersThisYear: ordersThisYear.length,
      avgDaysBetween,
      byWeekday,
      byHour,
      monthlySpend,
      streak,
      maxOrder: maxOrder || 0,
      minOrder: minOrder === Number.POSITIVE_INFINITY ? 0 : minOrder,
      horaFrecuente,
      avgTicket: totals.length > 0 ? Math.round(totalSpent / totals.length) : 0,
    };
  }, [orders]);

  const overviewStats = useMemo(() => {
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

  const filteredOrders = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    if (orderFilter === "todos") return orders;
    if (orderFilter === "mes") return orders.filter((o) => new Date(o.created_at) >= startOfMonth);
    return orders.filter((o) => new Date(o.created_at) >= startOfYear);
  }, [orders, orderFilter]);

  const pedidosListStats = useMemo(() => {
    const list = filteredOrders;
    const totals = list.map((o) => Number(o.total)).filter((t) => !Number.isNaN(t));
    const sum = totals.reduce((a, b) => a + b, 0);
    const n = totals.length;
    let maxT = 0;
    let minT = Number.POSITIVE_INFINITY;
    for (const t of totals) {
      if (t > maxT) maxT = t;
      if (t < minT) minT = t;
    }
    if (minT === Number.POSITIVE_INFINITY) minT = 0;
    const mh = modalHour(list);
    const hora =
      mh === null ? "—" : `${String(mh).padStart(2, "0")}:00 – ${String(mh + 1).padStart(2, "0")}:00`;
    return {
      totalGastado: sum,
      cantidad: list.length,
      promedio: n > 0 ? Math.round(sum / n) : 0,
      maxPedido: maxT,
      minPedido: minT,
      horaFrecuente: hora,
    };
  }, [filteredOrders]);

  const last3Orders = useMemo(() => orders.slice(0, 3), [orders]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const combined = combineAddress(editAddressLine, editFloor);
      const nextMeta = {
        ...(user.user_metadata ?? {}),
        full_name: editFullName.trim(),
        phone: editPhone.trim(),
        birthdate: editBirthdate.trim(),
        default_address: combined,
        address_line: editAddressLine.trim(),
        address_floor: editFloor.trim(),
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
    "mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium outline-none transition placeholder:text-neutral-400 focus:border-[#2d4a3e] focus:ring-2 focus:ring-[#2d4a3e]/20";

  const navBtn = (id: SectionId, label: string, Icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>) => (
    <button
      key={id}
      type="button"
      onClick={() => setSection(id)}
      className={`flex w-full items-center gap-3 rounded-r-lg border-l-4 py-3 pl-4 pr-3 text-left text-[15px] font-semibold transition ${
        section === id ? "border-[#c9a84c] text-white" : "border-transparent text-white/90 hover:bg-white/5"
      }`}
      style={section === id ? { backgroundColor: SIDEBAR_ACTIVE_BG } : undefined}
      aria-current={section === id ? "page" : undefined}
    >
      <Icon className="h-5 w-5 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
      <span>{label}</span>
    </button>
  );

  const mobileNavBtn = (id: SectionId, label: string, Icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>) => (
    <button
      key={id}
      type="button"
      onClick={() => setSection(id)}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center py-2 ${section === id ? "text-[#c9a84c]" : "text-white/80"}`}
      aria-label={label}
    >
      <Icon className="h-6 w-6 shrink-0" strokeWidth={2} aria-hidden />
    </button>
  );

  if (sessionPending || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: CREAM }}>
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: GREEN }} />
      </div>
    );
  }

  const memberSince =
    user.created_at != null
      ? new Date(user.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
      : "—";

  const profileTotalSpent = analytics.totalSpent;

  const SidebarBody = ({ mobile }: { mobile?: boolean }) => {
    if (mobile) {
      return (
        <nav className="flex min-w-0 flex-1 flex-row justify-around px-1">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex min-w-0 flex-1 flex-col items-center justify-center py-2 text-white"
            aria-label="Volver al inicio"
          >
            <ArrowLeft className="h-6 w-6 shrink-0" strokeWidth={2} aria-hidden />
          </button>
          {mobileNavBtn("inicio", "Inicio", Home)}
          {mobileNavBtn("pedidos", "Mis pedidos", ShoppingBag)}
          {mobileNavBtn("cupones", "Beneficios", Tag)}
          {mobileNavBtn("perfil", "Mi perfil", CircleUser)}
          {mobileNavBtn("estadisticas", "Estadísticas", PieChart)}
        </nav>
      );
    }
    return (
      <>
        <div className="px-5 pt-8">
          <button onClick={() => router.push("/")} className="text-2xl font-black tracking-[-0.06em] text-white hover:opacity-80 transition-opacity">
            BLOOM.
          </button>
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
          {metaStr(user, "customer_number") && (
            <p className="text-xs font-medium text-white/50">Nº {metaStr(user, "customer_number")}</p>
          )}
        </div>
        <nav className="mt-8 flex min-h-0 flex-1 flex-col gap-0.5 px-2">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mb-4 flex w-full items-center gap-3 rounded-r-lg border-l-4 border-transparent py-3 pl-4 pr-3 text-left text-[15px] font-semibold text-white/90 transition hover:bg-white/5"
          >
            <ArrowLeft className="h-5 w-5 shrink-0 opacity-90" strokeWidth={2} aria-hidden />
            <span>Volver al sitio</span>
          </button>

          {navBtn("inicio", "Inicio", Home)}
          {navBtn("pedidos", "Mis pedidos", ShoppingBag)}
          {navBtn("cupones", "Beneficios", Tag)}
          {navBtn("perfil", "Mi perfil", CircleUser)}
          {navBtn("estadisticas", "Estadísticas", PieChart)}
        </nav>
        <div className="min-h-0 flex-1" />
      </>
    );
  };

  const SectionInicio = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className={statMiniCls}>
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Pedidos realizados</p>
          <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: TEXT_DARK }}>
            {overviewStats.totalOrdersCount}
          </p>
        </div>
        <div className={statMiniCls}>
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Producto más pedido</p>
          <p className="mt-2 text-lg font-bold leading-snug" style={{ color: TEXT_DARK }}>
            {overviewStats.mostOrderedProduct}
          </p>
        </div>
        <div className={statMiniCls}>
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Pedidos este mes</p>
          <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: TEXT_DARK }}>
            {analytics.ordersThisMonth}
          </p>
        </div>
        <div className={statMiniCls}>
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Pedidos este año</p>
          <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: TEXT_DARK }}>
            {analytics.ordersThisYear}
          </p>
        </div>
        <div className={statMiniCls}>
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Promedio días entre pedidos</p>
          <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: TEXT_DARK }}>
            {orders.length >= 2 ? analytics.avgDaysBetween : "—"}
          </p>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="flex items-center gap-2 text-base font-bold" style={{ color: TEXT_DARK }}>
          <Coffee className="h-5 w-5" style={{ color: GREEN }} aria-hidden />
          Tu progreso — café gratis
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          {paidOrderCount} pedidos pagos · {loyaltyFilled}/{COFFEE_GOAL} en esta ronda
        </p>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full rounded-full transition-all" style={{ width: `${loyaltyPct}%`, backgroundColor: GREEN }} />
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="text-base font-bold" style={{ color: TEXT_DARK }}>
          Últimos pedidos
        </h2>
        {last3Orders.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600">Todavía no tenés pedidos.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100">
            {last3Orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="text-neutral-700">
                  {new Date(o.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}{" "}
                  <span className="text-neutral-500">{orderItemsSummary(o.items, 3)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const SectionPedidos = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["todos", "Todos"],
            ["mes", "Este mes"],
            ["ano", "Este año"],
          ] as const
        ).map(([key, lab]) => (
          <button
            key={key}
            type="button"
            onClick={() => setOrderFilter(key)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              orderFilter === key ? "text-white" : "bg-white text-neutral-700 shadow-sm"
            }`}
            style={orderFilter === key ? { backgroundColor: GREEN } : undefined}
          >
            {lab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
        {[
          ["Cantidad", String(pedidosListStats.cantidad)],
          ["Hora más frecuente", pedidosListStats.horaFrecuente],
        ].map(([k, v]) => (
          <div key={k} className={statMiniCls}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{k}</p>
            <p className="mt-1 break-words text-sm font-bold" style={{ color: TEXT_DARK }}>
              {v}
            </p>
          </div>
        ))}
      </div>

      <div className={cardCls + " overflow-hidden p-0"}>
        {ordersLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: GREEN }} />
          </div>
        ) : filteredOrders.length === 0 ? (
          <p className="p-8 text-center text-sm text-neutral-600">No hay pedidos en este filtro.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Ítems</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="w-10 px-2 py-3" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o, idx) => {
                  const paid = Boolean(o.paid);
                  const openQ = expandedOrderId === o.id;
                  const items = Array.isArray(o.items) ? o.items : [];
                  const summary = orderItemsSummary(o.items);
                  return (
                    <Fragment key={o.id}>
                      <tr className={idx % 2 === 0 ? "bg-white" : "bg-neutral-50/80"}>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-neutral-800">
                          {new Date(o.created_at).toLocaleString("es-AR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="max-w-[200px] px-4 py-3 text-neutral-700">
                          <span className="line-clamp-2">{summary}</span>
                        </td>
                        <td className="px-4 py-3 text-neutral-700">{orderTypeLabel(o)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${paid ? "text-white" : "bg-amber-100 text-amber-900"}`}
                            style={paid ? { backgroundColor: GREEN } : undefined}
                          >
                            {paid ? "Pagado" : "Pendiente"}
                          </span>
                        </td>
                        <td className="px-2 py-3">
                          <button
                            type="button"
                            onClick={() => setExpandedOrderId(openQ ? null : o.id)}
                            className="flex rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"
                            aria-expanded={openQ}
                            aria-label={openQ ? "Cerrar detalle" : "Ver detalle"}
                          >
                            {openQ ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </td>
                      </tr>
                      {openQ ? (
                        <tr className={idx % 2 === 0 ? "bg-white" : "bg-neutral-50/80"}>
                          <td colSpan={6} className="px-4 pb-4 pt-0">
                            <ul className="mt-2 space-y-1 rounded-lg bg-neutral-100/80 p-3 text-sm">
                              {items.length === 0 ? (
                                <li className="text-neutral-500">Sin detalle</li>
                              ) : (
                                items.map((it: unknown, i: number) => {
                                  const row = it as { name?: string; quantity?: number; price?: number };
                                  return (
                                    <li key={i} className="flex justify-between gap-2">
                                      <span>
                                        {(row.quantity ?? 1) > 1 && <strong>{row.quantity}× </strong>}
                                        {row.name}
                                      </span>
                                      <span className="tabular-nums">
                                        {formatMoney(Number(row.price ?? 0) * Number(row.quantity ?? 1))}
                                      </span>
                                    </li>
                                  );
                                })
                              )}
                            </ul>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const SectionCupones = () => (
    <div className="space-y-6">
      {/* Resumen del programa */}
      <div
        className="rounded-2xl p-6 shadow-sm"
        style={{ background: `linear-gradient(135deg, ${GREEN} 0%, #1f352c 100%)` }}
      >
        <p className="text-sm font-semibold text-white/70">Tus beneficios</p>
        <p className="mt-1 text-3xl font-black text-white tabular-nums">{paidOrderCount} pedidos pagos</p>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${Math.min((paidOrderCount / COUPON_DEFS[COUPON_DEFS.length - 1].unlock) * 100, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-white/50">
          {paidOrderCount < COUPON_DEFS[COUPON_DEFS.length - 1].unlock
            ? `Te faltan ${COUPON_DEFS[COUPON_DEFS.length - 1].unlock - paidOrderCount} pedidos para desbloquear todos los beneficios`
            : "¡Desbloqueaste todos los beneficios!"}
        </p>
      </div>

      {/* Cupón de cumpleaños */}
      {birthdayActive && (
        <div
          className="flex items-center gap-4 rounded-2xl p-5 shadow-sm"
          style={{ background: `linear-gradient(135deg, ${GOLD}f0 0%, #e8d48a 100%)` }}
        >
          <span className="text-4xl">🎂</span>
          <div>
            <p className="text-base font-black" style={{ color: TEXT_DARK }}>
              ¡Es tu mes de cumpleaños!
            </p>
            <p className="mt-0.5 text-sm font-medium opacity-80" style={{ color: TEXT_DARK }}>
              Mostrá esta pantalla en el local para canjear tu regalo
            </p>
          </div>
        </div>
      )}

      {/* Grid de beneficios */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {COUPON_DEFS.map((c) => {
          const unlocked = paidOrderCount >= c.unlock;
          const progress = Math.min(paidOrderCount / c.unlock, 1);
          if (unlocked) {
            return (
              <div
                key={c.id}
                className="rounded-2xl p-5 shadow-sm"
                style={{ background: `linear-gradient(135deg, ${GOLD}e8 0%, #d4af37 55%, ${GOLD} 100%)` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-3xl">{c.icon}</span>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-black"
                    style={{ backgroundColor: "rgba(255,255,255,0.4)", color: TEXT_DARK }}
                  >
                    Activo
                  </span>
                </div>
                <p className="mt-3 text-lg font-black" style={{ color: TEXT_DARK }}>
                  {c.label}
                </p>
                <p className="mt-1 text-xs font-semibold" style={{ color: TEXT_DARK, opacity: 0.7 }}>
                  Presentá esta pantalla en el local
                </p>
              </div>
            );
          }
          return (
            <div key={c.id} className={`${cardCls}`}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-2xl">
                  {c.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black" style={{ color: TEXT_DARK }}>
                    {c.label}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Desbloquea a los {c.unlock} pedidos pagos
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${progress * 100}%`, backgroundColor: GREEN }}
                      />
                    </div>
                    <span className="text-xs font-bold tabular-nums text-neutral-500">
                      {paidOrderCount}/{c.unlock}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const SectionPerfil = () => {
    return (
      <div className="space-y-6">
        <div className={cardCls}>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => void onAvatarFile(e)}
          />
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarBusy}
              className="group relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-md outline-none ring-2 ring-neutral-200 transition hover:ring-[#c9a84c] disabled:opacity-60"
              style={{ backgroundColor: GREEN }}
            >
              {avatarUrl ? (
                <Image src={avatarUrl} alt={displayName} fill className="object-cover" sizes="112px" />
              ) : (
                <span className="text-3xl font-black text-white">{initialsFromName(displayName)}</span>
              )}
              <span className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 to-transparent pb-2 opacity-0 transition group-hover:opacity-100">
                {avatarBusy ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : <Camera className="h-5 w-5 text-white" />}
              </span>
            </button>
            <div className="min-w-0 flex-1 space-y-4">
              <p className="text-sm text-neutral-500">Tocá la foto para cambiarla</p>
              <div>
                <label htmlFor="pf-name" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Nombre
                </label>
                <input id="pf-name" className={inputCls} value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="pf-phone" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Teléfono
                </label>
                <input id="pf-phone" className={inputCls} inputMode="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
              <div>
                <label htmlFor="pf-mail" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Email
                </label>
                <input id="pf-mail" type="email" className={inputCls} value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div>
                <label htmlFor="pf-bd" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Fecha de nacimiento
                </label>
                <input
                  id="pf-bd"
                  type="date"
                  className={inputCls}
                  value={editBirthdate.length >= 10 ? editBirthdate.slice(0, 10) : editBirthdate}
                  onChange={(e) => setEditBirthdate(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="pf-addr" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Dirección
                </label>
                <input id="pf-addr" className={inputCls} value={editAddressLine} onChange={(e) => setEditAddressLine(e.target.value)} />
              </div>
              <div>
                <label htmlFor="pf-floor" className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Piso / Dpto
                </label>
                <input id="pf-floor" className={inputCls} value={editFloor} onChange={(e) => setEditFloor(e.target.value)} />
              </div>
              <button
                type="button"
                onClick={() => void saveProfile()}
                disabled={savingProfile}
                className="flex min-h-12 items-center justify-center rounded-full px-8 text-sm font-bold text-white shadow-sm disabled:opacity-60"
                style={{ backgroundColor: GREEN }}
              >
                {savingProfile ? <Loader2 className="h-5 w-5 animate-spin" /> : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {metaStr(user, "customer_number") && (
            <div className={statMiniCls}>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Nº de cliente</p>
              <p className="mt-2 text-2xl font-black tabular-nums" style={{ color: TEXT_DARK }}>
                {metaStr(user, "customer_number")}
              </p>
            </div>
          )}
          <div className={statMiniCls}>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Miembro desde</p>
            <p className="mt-2 font-bold" style={{ color: TEXT_DARK }}>
              {memberSince}
            </p>
          </div>
          <div className={statMiniCls}>
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Total pedidos</p>
            <p className="mt-2 text-2xl font-bold tabular-nums" style={{ color: TEXT_DARK }}>
              {orders.length}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const chartWrap = "h-72 w-full min-w-0";

  const SectionEstadisticas = () => (
    <div className="space-y-6">
      <div className={cardCls}>
        <h3 className="text-sm font-bold" style={{ color: TEXT_DARK }}>
          Pedidos por día de la semana
        </h3>
        <div className={chartWrap}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.byWeekday} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip />
              <Bar dataKey="count" fill={GREEN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={cardCls}>
        <h3 className="text-sm font-bold" style={{ color: TEXT_DARK }}>
          Pedidos por hora del día
        </h3>
        <div className={chartWrap}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.byHour} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={2} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip />
              <Bar dataKey="count" fill={GREEN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={cardCls}>
        <h3 className="text-sm font-bold" style={{ color: TEXT_DARK }}>
          Top 5 productos
        </h3>
        {analytics.top5.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-600">Sin datos todavía.</p>
        ) : (
          <ol className="mt-4 space-y-2">
            {analytics.top5.map((p, i) => (
              <li key={p.name} className="flex justify-between gap-2 text-sm">
                <span className="text-neutral-700">
                  {i + 1}. {p.name}
                </span>
                <span className="font-bold tabular-nums text-neutral-900">{p.count}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className={statMiniCls}>
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Racha actual</p>
        <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: TEXT_DARK }}>
          {analytics.streak} {analytics.streak === 1 ? "día" : "días"} seguidos con pedido
        </p>
        <p className="mt-1 text-xs text-neutral-500">Contando desde tu último pedido hacia atrás, días consecutivos calendario.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen font-sans antialiased" style={{ backgroundColor: CREAM, color: TEXT_DARK }}>
      <aside
        className="fixed left-0 top-0 z-30 hidden h-screen w-[240px] flex-col border-r border-white/10 lg:flex"
        style={{ width: SIDEBAR_W, backgroundColor: GREEN }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <SidebarBody />
        </div>
      </aside>

      <div className="pb-20 lg:ml-[240px] lg:pb-10">
        <main className="mx-auto max-w-5xl px-4 py-6 lg:px-10 lg:py-10">
          <h1 className="mb-6 text-xl font-black lg:text-2xl" style={{ color: TEXT_DARK }}>
            {section === "inicio" && "Inicio"}
            {section === "pedidos" && "Mis pedidos"}
            {section === "cupones" && "Beneficios"}
            {section === "perfil" && "Mi perfil"}
            {section === "estadisticas" && "Estadísticas"}
          </h1>
          {section === "inicio" && <SectionInicio />}
          {section === "pedidos" && <SectionPedidos />}
          {section === "cupones" && <SectionCupones />}
          {section === "perfil" && <SectionPerfil />}
          {section === "estadisticas" && <SectionEstadisticas />}
        </main>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-stretch border-t border-white/10 lg:hidden"
        style={{ backgroundColor: GREEN }}
      >
        <SidebarBody mobile />
      </div>
    </div>
  );
}

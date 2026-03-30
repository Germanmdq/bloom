"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutGrid, UserCircle, ArrowRight, Loader2 } from "lucide-react";

export function DashboardHomeClient() {
  const [stats, setStats] = useState<{ registered: number; active: number } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/dashboard/stats");
        const j = (await res.json()) as {
          error?: string;
          registeredCustomerCount?: number;
          customersWithActiveOrdersCount?: number;
        };
        if (!res.ok) {
          setError(j.error || "No se pudo cargar el resumen");
          return;
        }
        setStats({
          registered: j.registeredCustomerCount ?? 0,
          active: j.customersWithActiveOrdersCount ?? 0,
        });
      } catch {
        setError("Error de red");
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-black text-gray-900 md:text-3xl">Bloom OS</h1>
        <p className="mt-1 text-sm font-medium text-gray-500">Panel principal</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {error ? (
          <p className="text-sm font-semibold text-red-600">{error}</p>
        ) : stats == null ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <span className="text-sm font-medium">Cargando clientes…</span>
          </div>
        ) : (
          <>
            <p className="text-lg font-black leading-snug text-gray-900 md:text-xl">
              {stats.registered} {stats.registered === 1 ? "cliente registrado" : "clientes registrados"} —{" "}
              {stats.active} con pedidos activos
            </p>
            <p className="mt-2 text-xs font-medium text-gray-500">
              Pedidos activos: clientes con al menos un pedido que no está entregado ni cancelado.
            </p>
          </>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/tables"
          className="group flex items-center justify-between rounded-2xl border-2 border-gray-900 bg-[#FFD60A] p-5 text-gray-900 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/10">
              <LayoutGrid size={24} strokeWidth={2.2} />
            </div>
            <div>
              <p className="font-black uppercase tracking-tight">Mesas / POS</p>
              <p className="text-xs font-semibold text-gray-800/80">Abrir operación</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" />
        </Link>

        <Link
          href="/dashboard/customers"
          className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 text-gray-900 shadow-sm transition hover:border-gray-300 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
              <UserCircle size={24} strokeWidth={2} className="text-gray-700" />
            </div>
            <div>
              <p className="font-black uppercase tracking-tight">Clientes</p>
              <p className="text-xs font-semibold text-gray-500">Cuentas y pedidos web</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-gray-400 transition group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ChevronRight } from "lucide-react";
import type { DashboardCustomerRow } from "@/lib/types/dashboard-customers";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export default function DashboardCustomersPage() {
  const [rows, setRows] = useState<DashboardCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/dashboard/customers");
        const j = (await res.json()) as { customers?: DashboardCustomerRow[]; error?: string };
        if (!res.ok) {
          setError(j.error || "Error al cargar");
          setRows([]);
          return;
        }
        setRows(j.customers ?? []);
      } catch {
        setError("Error de red");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Clientes</h1>
          <p className="mt-1 text-sm font-medium text-gray-500">
            Cuentas registradas (web) y resumen de pedidos. Puntos de lealtad: pagos confirmados y pedidos en
            cuenta corriente.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-bold text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline"
        >
          ← Inicio panel
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="font-medium">Cargando…</span>
          </div>
        ) : error ? (
          <p className="p-6 text-sm font-semibold text-red-600">{error}</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No hay clientes registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs font-black uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Dirección habitual</th>
                  <th className="px-4 py-3 text-center">Pedidos</th>
                  <th className="px-4 py-3">Último pedido</th>
                  <th className="px-4 py-3 text-center">Lealtad</th>
                  <th className="px-4 py-3"> </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      <span className="flex flex-wrap items-center gap-2">
                        {r.displayName}
                        {r.isSocio ? (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                            Socio
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-gray-700">{r.email}</td>
                    <td className="px-4 py-3 text-gray-700">{r.phone}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-gray-600">{r.defaultAddress}</td>
                    <td className="px-4 py-3 text-center tabular-nums font-bold text-gray-900">{r.orderCount}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{fmtDate(r.lastOrderAt)}</td>
                    <td className="px-4 py-3 text-center tabular-nums font-bold text-[#2d4a3e]">
                      {r.loyaltyPoints}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/customers/${r.id}`}
                        className="inline-flex items-center gap-1 font-bold text-gray-900 hover:underline"
                      >
                        Detalle
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

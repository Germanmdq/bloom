"use client";

import { useMarcarGastoPagado } from "@/lib/hooks/use-compras-stock";
import { IconAlertTriangle, IconCalendarDue, IconCheck, IconCoin } from "@tabler/icons-react";
import { motion } from "framer-motion";

interface GastoFijo {
    id: string;
    nombre: string;
    monto: number;
    fecha_vencimiento: string;
    estado: string;
    categoria: string;
}

export function AlertasVencimientos({ gastos }: { gastos: GastoFijo[] }) {
    const marcarPagado = useMarcarGastoPagado();

    const hoy = new Date();
    const en7dias = new Date(hoy);
    en7dias.setDate(en7dias.getDate() + 7);

    const proximos = gastos.filter(g => {
        const fecha = new Date(g.fecha_vencimiento);
        return fecha <= en7dias && g.estado === 'pendiente';
    });

    const otros = gastos.filter(g => {
        const fecha = new Date(g.fecha_vencimiento);
        return fecha > en7dias && g.estado === 'pendiente';
    });

    if (proximos.length === 0 && otros.length === 0) {
        return (
            <div className="mb-10 p-8 rounded-[2rem] bg-emerald-50 border border-emerald-100 text-center">
                <IconCheck size={32} className="mx-auto text-emerald-500 mb-2" />
                <p className="font-black text-emerald-700 text-sm uppercase tracking-widest">Sin vencimientos pendientes</p>
            </div>
        );
    }

    const formatFecha = (f: string) => {
        const d = new Date(f + 'T12:00:00');
        return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    };

    const diasRestantes = (f: string) => {
        const fecha = new Date(f + 'T12:00:00');
        const diff = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 0) return 'VENCIDO';
        if (diff === 0) return 'HOY';
        if (diff === 1) return 'MAÑANA';
        return `${diff} días`;
    };

    const handlePagar = async (id: string) => {
        if (!confirm('¿Marcar como pagado?')) return;
        try {
            await marcarPagado.mutateAsync(id);
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    return (
        <section className="mb-10">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
                    <IconAlertTriangle size={20} className="text-red-600" />
                </div>
                <div>
                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Próximos Vencimientos</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gastos fijos del mes</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {proximos.map((g, i) => {
                    const esUrgente = g.categoria === 'urgente';
                    const vencido = diasRestantes(g.fecha_vencimiento) === 'VENCIDO';
                    return (
                        <motion.div
                            key={g.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`p-6 rounded-[1.5rem] border-2 ${
                                vencido ? 'border-red-300 bg-red-50' :
                                esUrgente ? 'border-red-200 bg-red-50/60' :
                                'border-amber-200 bg-amber-50/60'
                            } relative group`}
                        >
                            {vencido && (
                                <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase animate-pulse">
                                    Vencido
                                </div>
                            )}
                            <div className="flex items-start justify-between mb-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                    esUrgente ? 'bg-red-200 text-red-700' : 'bg-amber-200 text-amber-700'
                                }`}>
                                    <IconCalendarDue size={16} />
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${
                                    vencido ? 'text-red-600' : esUrgente ? 'text-red-500' : 'text-amber-600'
                                }`}>
                                    {diasRestantes(g.fecha_vencimiento)}
                                </span>
                            </div>
                            <h3 className="font-black text-gray-900 text-sm mb-1">{g.nombre}</h3>
                            <p className="text-2xl font-black text-gray-900">
                                {g.monto > 0 ? `$${g.monto.toLocaleString('es-AR')}` : 'S/monto'}
                            </p>
                            <p className="text-[10px] font-bold text-gray-400 mt-1">
                                Vence {formatFecha(g.fecha_vencimiento)}
                            </p>
                            <button
                                onClick={() => handlePagar(g.id)}
                                className="mt-4 w-full h-10 rounded-xl bg-white border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all flex items-center justify-center gap-2"
                            >
                                <IconCoin size={14} /> Marcar Pagado
                            </button>
                        </motion.div>
                    );
                })}

                {otros.map((g, i) => (
                    <motion.div
                        key={g.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (proximos.length + i) * 0.05 }}
                        className="p-6 rounded-[1.5rem] border border-gray-100 bg-white/80 group"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center">
                                <IconCalendarDue size={16} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                {diasRestantes(g.fecha_vencimiento)}
                            </span>
                        </div>
                        <h3 className="font-black text-gray-900 text-sm mb-1">{g.nombre}</h3>
                        <p className="text-xl font-black text-gray-600">
                            {g.monto > 0 ? `$${g.monto.toLocaleString('es-AR')}` : 'S/monto'}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 mt-1">
                            Vence {formatFecha(g.fecha_vencimiento)}
                        </p>
                        <button
                            onClick={() => handlePagar(g.id)}
                            className="mt-4 w-full h-10 rounded-xl bg-white border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all flex items-center justify-center gap-2"
                        >
                            <IconCoin size={14} /> Marcar Pagado
                        </button>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}

"use client";

import { useMarcarGastoPagado, useAbonarGastoFijo } from "@/lib/hooks/use-compras-stock";
import { IconAlertTriangle, IconCalendarDue, IconCheck, IconCoin, IconHistory, IconX } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface GastoFijo {
    id: string;
    nombre: string;
    monto: number;
    fecha_vencimiento: string;
    estado: string;
    categoria: string;
    historial_pagos?: any[];
}

export function AlertasVencimientos({ gastos }: { gastos: GastoFijo[] }) {
    const marcarPagado = useMarcarGastoPagado();
    const abonarGasto = useAbonarGastoFijo();
    const [historyModal, setHistoryModal] = useState<GastoFijo | null>(null);

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

    const formatFechaHora = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const diasRestantes = (f: string) => {
        const fecha = new Date(f + 'T12:00:00');
        const diff = Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 0) return 'VENCIDO';
        if (diff === 0) return 'HOY';
        if (diff === 1) return 'MAÑANA';
        return `${diff} días`;
    };

    const handlePagar = async (e: React.MouseEvent, g: GastoFijo) => {
        e.stopPropagation(); // Prevenir abrir el modal de historial
        const input = window.prompt(`¿Cuánto vas a abonar de ${g.nombre}? (Total restante: $${g.monto})`, g.monto.toString());
        if (input === null) return; // Cancelado
        
        const montoAbonar = parseFloat(input);
        if (isNaN(montoAbonar) || montoAbonar <= 0) {
            alert("Monto inválido");
            return;
        }

        let motivo = "Pago";
        if (montoAbonar < g.monto) {
            const inputMotivo = window.prompt("Motivo del adelanto/abono (ej: Adelanto):", "Adelanto");
            if (inputMotivo === null) return;
            motivo = inputMotivo;
        }

        const isTransferencia = window.confirm("¿El pago es por TRANSFERENCIA?\n(Aceptar = Transferencia, Cancelar = Efectivo)");
        const metodoPago = isTransferencia ? "Transferencia" : "Efectivo";
        const motivoFinal = `${motivo} (${metodoPago})`;

        try {
            if (montoAbonar >= g.monto) {
                await marcarPagado.mutateAsync(g.id);
            } else {
                await abonarGasto.mutateAsync({ id: g.id, montoAbonado: montoAbonar, motivo: motivoFinal });
            }
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    return (
        <section className="mb-10 relative">
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
                    const hasHistory = Array.isArray(g.historial_pagos) && g.historial_pagos.length > 0;
                    return (
                        <motion.div
                            key={g.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => setHistoryModal(g)}
                            className={`p-6 rounded-[1.5rem] border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                                vencido ? 'border-red-300 bg-red-50 hover:bg-red-100' :
                                esUrgente ? 'border-red-200 bg-red-50/60 hover:bg-red-100/60' :
                                'border-amber-200 bg-amber-50/60 hover:bg-amber-100/60'
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
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                                        vencido ? 'text-red-600' : esUrgente ? 'text-red-500' : 'text-amber-600'
                                    }`}>
                                        {diasRestantes(g.fecha_vencimiento)}
                                    </span>
                                    {hasHistory && (
                                        <span className="text-[9px] font-bold text-gray-500 flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-full">
                                            <IconHistory size={10} /> Pagos parciales
                                        </span>
                                    )}
                                </div>
                            </div>
                            <h3 className="font-black text-gray-900 text-sm mb-1">{g.nombre}</h3>
                            <p className="text-2xl font-black text-gray-900">
                                {g.monto > 0 ? `$${g.monto.toLocaleString('es-AR')}` : 'S/monto'}
                            </p>
                            <p className="text-[10px] font-bold text-gray-400 mt-1">
                                Restante | Vence {formatFecha(g.fecha_vencimiento)}
                            </p>
                            <button
                                onClick={(e) => handlePagar(e, g)}
                                className="mt-4 w-full h-10 rounded-xl bg-white border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all flex items-center justify-center gap-2"
                            >
                                <IconCoin size={14} /> Abonar / Pagar
                            </button>
                        </motion.div>
                    );
                })}

                {otros.map((g, i) => {
                    const hasHistory = Array.isArray(g.historial_pagos) && g.historial_pagos.length > 0;
                    return (
                        <motion.div
                            key={g.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (proximos.length + i) * 0.05 }}
                            onClick={() => setHistoryModal(g)}
                            className="p-6 rounded-[1.5rem] border-2 border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 cursor-pointer transition-all hover:scale-[1.02] group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                    <IconCalendarDue size={16} />
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">
                                        {diasRestantes(g.fecha_vencimiento)}
                                    </span>
                                    {hasHistory && (
                                        <span className="text-[9px] font-bold text-gray-500 flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-full">
                                            <IconHistory size={10} /> Pagos parciales
                                        </span>
                                    )}
                                </div>
                            </div>
                            <h3 className="font-black text-gray-900 text-sm mb-1">{g.nombre}</h3>
                            <p className="text-xl font-black text-emerald-700">
                                {g.monto > 0 ? `$${g.monto.toLocaleString('es-AR')}` : 'S/monto'}
                            </p>
                            <p className="text-[10px] font-bold text-gray-400 mt-1">
                                Restante | Vence {formatFecha(g.fecha_vencimiento)}
                            </p>
                            <button
                                onClick={(e) => handlePagar(e, g)}
                                className="mt-4 w-full h-10 rounded-xl bg-white border border-emerald-200 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
                            >
                                <IconCoin size={14} /> Abonar / Pagar
                            </button>
                        </motion.div>
                    );
                })}
            </div>

            {/* Modal Historial */}
            <AnimatePresence>
                {historyModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setHistoryModal(null)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 leading-tight">{historyModal.nombre}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Historial de Pagos</p>
                                </div>
                                <button onClick={() => setHistoryModal(null)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">
                                    <IconX size={16} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto min-h-[100px]">
                                {Array.isArray(historyModal.historial_pagos) && historyModal.historial_pagos.length > 0 ? (
                                    <div className="space-y-3">
                                        {historyModal.historial_pagos.map((p, idx) => (
                                            <div key={idx} className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex justify-between items-center">
                                                <div>
                                                    <p className="font-black text-sm text-gray-900">{p.motivo || 'Pago'}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">{formatFechaHora(p.fecha)}</p>
                                                </div>
                                                <p className="font-black text-emerald-600">${p.monto.toLocaleString('es-AR')}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                                        <IconHistory size={32} className="opacity-20 mb-2" />
                                        <p className="text-sm font-bold">No hay pagos parciales</p>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-6 pt-4 border-t border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-1">Saldo Pendiente Actual</p>
                                <p className="text-2xl font-black text-center text-gray-900">${historyModal.monto.toLocaleString('es-AR')}</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </section>
    );
}

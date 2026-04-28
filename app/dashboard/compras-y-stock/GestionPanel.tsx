"use client";

import { useState, useMemo } from "react";
import { usePagarSaldoProveedor, useUpdateGastoFijo, useCreateGastoFijo, useDeleteGastoFijo } from "@/lib/hooks/use-compras-stock";
import { IconPackage, IconUsers, IconSearch, IconAlertTriangle, IconCoin, IconReceipt, IconPlus, IconX, IconEdit, IconTrash } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

interface Proveedor { id: string; nombre: string; cuit: string | null; saldo_cc: number; telefono: string | null; }
interface Insumo { id: string; nombre: string; unidad: string; stock_actual: number; stock_minimo: number; precio_ultima_compra: number; categoria: string; proveedores: { id: string; nombre: string } | null; }
interface Gasto { id: string; nombre: string; monto: number; fecha_vencimiento: string; estado: string; categoria: string; }

export function GestionPanel({ proveedores, insumos, gastos }: { proveedores: Proveedor[]; insumos: Insumo[]; gastos: Gasto[] }) {
    const [tab, setTab] = useState<'insumos' | 'proveedores' | 'gastos'>('insumos');
    const [search, setSearch] = useState("");
    const [catFilter, setCatFilter] = useState("Todos");
    const [pagoModal, setPagoModal] = useState<Proveedor | null>(null);
    const [montoPago, setMontoPago] = useState("");
    const [gastoModal, setGastoModal] = useState<Partial<Gasto> | null>(null);

    const pagarSaldo = usePagarSaldoProveedor();
    const updateGasto = useUpdateGastoFijo();
    const createGasto = useCreateGastoFijo();
    const deleteGasto = useDeleteGastoFijo();

    const categorias = useMemo(() => {
        const cats = new Set(insumos.map((i: any) => i.categoria || 'General'));
        return ['Todos', ...Array.from(cats).sort()];
    }, [insumos]);

    const filtered = useMemo(() => {
        return insumos.filter((i: any) => {
            const matchSearch = i.nombre.toLowerCase().includes(search.toLowerCase());
            const matchCat = catFilter === 'Todos' || i.categoria === catFilter;
            return matchSearch && matchCat;
        });
    }, [insumos, search, catFilter]);

    const filteredProveedores = useMemo(() => {
        return proveedores.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()));
    }, [proveedores, search]);

    const handlePago = async () => {
        if (!pagoModal || !montoPago) return;
        try {
            await pagarSaldo.mutateAsync({ id: pagoModal.id, monto: parseFloat(montoPago) });
            alert('Pago registrado ✅');
            setPagoModal(null);
            setMontoPago("");
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const handleSaveGasto = async () => {
        if (!gastoModal?.nombre || !gastoModal?.monto || !gastoModal?.fecha_vencimiento) return;
        try {
            if (gastoModal.id) {
                await updateGasto.mutateAsync({
                    id: gastoModal.id,
                    nombre: gastoModal.nombre,
                    monto: parseFloat(gastoModal.monto.toString()),
                    fecha_vencimiento: gastoModal.fecha_vencimiento,
                    categoria: gastoModal.categoria
                } as any);
            } else {
                await createGasto.mutateAsync({
                    nombre: gastoModal.nombre,
                    monto: parseFloat(gastoModal.monto.toString()),
                    fecha_vencimiento: gastoModal.fecha_vencimiento,
                    categoria: gastoModal.categoria || 'normal'
                });
            }
            setGastoModal(null);
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const handleDeleteGasto = async (id: string) => {
        if (!confirm('¿Seguro que querés eliminar este gasto?')) return;
        try {
            await deleteGasto.mutateAsync(id);
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const totalDeuda = proveedores.reduce((sum, p) => sum + (p.saldo_cc || 0), 0);

    return (
        <section>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <IconPackage size={20} className="text-gray-500" />
                </div>
                <div>
                    <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Gestión</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Insumos y proveedores</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100 mb-6">
                <button onClick={() => { setTab('insumos'); setSearch(""); }} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === 'insumos' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>
                    Insumos ({insumos.length})
                </button>
                <button onClick={() => { setTab('proveedores'); setSearch(""); }} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === 'proveedores' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>
                    Proveedores ({proveedores.length})
                </button>
                <button onClick={() => { setTab('gastos'); setSearch(""); }} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === 'gastos' ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}>
                    Gastos ({gastos.length})
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={`Buscar ${tab}...`} className="w-full h-12 pl-12 pr-4 rounded-xl bg-white border border-gray-100 font-bold outline-none text-sm" />
            </div>

            {tab === 'insumos' && (
                <>
                    {/* Category filter */}
                    <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
                        {categorias.map(cat => (
                            <button key={cat} onClick={() => setCatFilter(cat)} className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${catFilter === cat ? 'bg-black text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Insumos Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map((insumo: any) => {
                            const isLow = insumo.stock_actual <= insumo.stock_minimo;
                            return (
                                <div key={insumo.id} className={`p-6 rounded-2xl border ${isLow ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-white'} hover:shadow-lg transition-all`}>
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="font-black text-gray-900 text-sm">{insumo.nombre}</h3>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                {insumo.proveedores?.nombre || 'Sin proveedor'} · {insumo.categoria}
                                            </p>
                                        </div>
                                        {isLow && <IconAlertTriangle size={16} className="text-red-500 animate-pulse" />}
                                    </div>
                                    <div className="flex items-baseline gap-1">
                                        <span className={`text-3xl font-black ${isLow ? 'text-red-500' : 'text-gray-900'}`}>
                                            {insumo.stock_actual}
                                        </span>
                                        <span className="text-xs font-bold text-gray-400 uppercase">{insumo.unidad}</span>
                                    </div>
                                    <div className="mt-3 flex justify-between text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                        <span>Min: {insumo.stock_minimo}</span>
                                        {insumo.precio_ultima_compra > 0 && (
                                            <span>${insumo.precio_ultima_compra.toLocaleString('es-AR')}/{insumo.unidad}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {tab === 'proveedores' && (
                <>
                    {/* Deuda Total */}
                    {totalDeuda > 0 && (
                        <div className="mb-6 p-6 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Deuda Total CC</p>
                                <p className="text-3xl font-black text-red-600">${totalDeuda.toLocaleString('es-AR')}</p>
                            </div>
                            <IconCoin size={32} className="text-red-300" />
                        </div>
                    )}

                    {/* Proveedores List */}
                    <div className="space-y-4">
                        {filteredProveedores.map(prov => (
                            <div key={prov.id} className="p-6 rounded-2xl border border-gray-100 bg-white hover:shadow-lg transition-all flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg">
                                        {prov.nombre.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-gray-900">{prov.nombre}</h3>
                                        <div className="flex items-center gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {prov.cuit && <span>CUIT: {prov.cuit}</span>}
                                            {prov.telefono && <span>Tel: {prov.telefono}</span>}
                                            <span>{insumos.filter((i: any) => i.proveedores?.id === prov.id).length} insumos</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {(prov.saldo_cc || 0) > 0 ? (
                                        <>
                                            <p className="text-xl font-black text-red-600">-${(prov.saldo_cc || 0).toLocaleString('es-AR')}</p>
                                            <button onClick={() => setPagoModal(prov)} className="mt-1 text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:underline">
                                                Registrar Pago
                                            </button>
                                        </>
                                    ) : (
                                        <p className="text-sm font-black text-emerald-500 uppercase tracking-widest">Al día</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {tab === 'gastos' && (
                <>
                    <div className="flex justify-end mb-4">
                        <button
                            onClick={() => setGastoModal({ nombre: '', monto: 0, fecha_vencimiento: new Date().toISOString().split('T')[0], categoria: 'normal' })}
                            className="bg-black text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-800 transition-all"
                        >
                            <IconPlus size={16} /> Agregar Gasto
                        </button>
                    </div>
                    <div className="space-y-3">
                        {gastos.filter(g => g.nombre.toLowerCase().includes(search.toLowerCase())).map(g => (
                            <div key={g.id} className="p-4 rounded-xl border border-gray-100 bg-white flex justify-between items-center hover:shadow-sm transition-all">
                                <div>
                                    <h3 className="font-black text-sm">{g.nombre}</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">Vence: {g.fecha_vencimiento} · {g.categoria}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="font-black text-lg">${g.monto.toLocaleString('es-AR')}</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setGastoModal(g)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-black hover:text-white transition-all">
                                            <IconEdit size={16} />
                                        </button>
                                        <button onClick={() => handleDeleteGasto(g.id)} className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all">
                                            <IconTrash size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Modal Pago */}
            {pagoModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPagoModal(null)} />
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-sm">
                        <h3 className="text-xl font-black mb-1">Pago a {pagoModal.nombre}</h3>
                        <p className="text-sm text-gray-400 font-bold mb-6">Deuda: ${(pagoModal.saldo_cc || 0).toLocaleString('es-AR')}</p>
                        <input type="number" value={montoPago} onChange={e => setMontoPago(e.target.value)} placeholder="Monto a pagar" className="w-full h-14 px-6 rounded-xl bg-gray-50 font-bold outline-none text-lg mb-4" />
                        <div className="flex gap-3">
                            <button onClick={() => setPagoModal(null)} className="flex-1 h-12 rounded-xl bg-gray-100 font-black text-gray-400 text-xs uppercase">Cancelar</button>
                            <button onClick={handlePago} className="flex-[2] h-12 rounded-xl bg-emerald-600 text-white font-black text-xs uppercase hover:scale-105 active:scale-95 transition-all">Confirmar</button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Modal Gasto */}
            {gastoModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setGastoModal(null)} />
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-sm">
                        <h3 className="text-xl font-black mb-6">{gastoModal.id ? 'Editar Gasto' : 'Nuevo Gasto'}</h3>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nombre</label>
                                <input type="text" value={gastoModal.nombre} onChange={e => setGastoModal({...gastoModal, nombre: e.target.value})} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monto ($)</label>
                                <input type="number" value={gastoModal.monto} onChange={e => setGastoModal({...gastoModal, monto: parseFloat(e.target.value) || 0})} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Vencimiento</label>
                                <input type="date" value={gastoModal.fecha_vencimiento} onChange={e => setGastoModal({...gastoModal, fecha_vencimiento: e.target.value})} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Prioridad</label>
                                <select value={gastoModal.categoria} onChange={e => setGastoModal({...gastoModal, categoria: e.target.value})} className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none">
                                    <option value="normal">Normal</option>
                                    <option value="urgente">Urgente</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setGastoModal(null)} className="flex-1 h-12 rounded-xl bg-gray-100 font-black text-gray-400 text-xs uppercase">Cancelar</button>
                            <button onClick={handleSaveGasto} disabled={updateGasto.isPending || createGasto.isPending} className="flex-[2] h-12 rounded-xl bg-black text-white font-black text-xs uppercase hover:scale-105 active:scale-95 transition-all">Guardar</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </section>
    );
}

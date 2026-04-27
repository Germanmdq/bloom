"use client";
import { useState, useEffect } from "react";
import { IconUsers, IconSearch, IconLoader2, IconStar, IconTrendingUp, IconCalendar, IconArrowsUpDown, IconX, IconPhone, IconMail, IconShoppingBag, IconCircleCheck, IconAlertCircle, IconHistory, IconReceipt } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ClientesPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<"spent" | "points" | "orders" | "name">("spent");
    const [selectedClient, setSelectedClient] = useState<any | null>(null);
    const [isPaying, setIsPaying] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState("");

    useEffect(() => { fetchClients(); }, []);
    
    useEffect(() => {
        if (selectedClient) {
            setPaymentAmount(selectedClient.balance > 0 ? selectedClient.balance.toString() : "");
        }
    }, [selectedClient]);

    async function fetchClients() {
        setLoading(true);
        try {
            const res = await fetch("/api/clientes");
            const data = await res.json();
            setClients(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleSettleDebt(clientId: string) {
        const amountToPay = parseFloat(paymentAmount);
        if (isNaN(amountToPay) || amountToPay <= 0) {
            alert("Ingresa un monto válido mayor a 0");
            return;
        }

        if (!confirm(`¿Confirmas el pago de $${amountToPay.toLocaleString()}?`)) return;
        
        setIsPaying(true);
        try {
            const res = await fetch("/api/clientes/pay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clientId, amount: amountToPay })
            });
            if (res.ok) {
                alert("Pago registrado correctamente ✅");
                await fetchClients();
                setSelectedClient(null);
            } else {
                const errData = await res.json();
                alert("Error: " + errData.error);
            }
        } catch (err) {
            alert("Error al procesar el pago");
        } finally {
            setIsPaying(false);
        }
    }

    const sortClients = (list: any[]) => {
        return [...list].sort((a, b) => {
            if (sortBy === "spent") return b.total_spent - a.total_spent;
            if (sortBy === "points") return b.points - a.points;
            if (sortBy === "orders") return b.order_count - a.order_count;
            return a.full_name.localeCompare(b.full_name);
        });
    };

    const filtered = sortClients(clients.filter(c =>
        (c.full_name + (c.email || "") + (c.phone || "")).toLowerCase().includes(search.toLowerCase())
    ));

    const getInactivityInfo = (lastOrder: string | null) => {
        if (!lastOrder) return { label: "Sin pedidos", color: "text-gray-400 bg-gray-100" };
        const days = Math.floor((Date.now() - new Date(lastOrder).getTime()) / (1000 * 60 * 60 * 24));
        if (days > 30) return { label: `Inactivo (${days}d)`, color: "text-red-600 bg-red-50" };
        if (days > 7) return { label: `Regular (${days}d)`, color: "text-amber-600 bg-amber-50" };
        return { label: "Activo", color: "text-green-600 bg-green-50" };
    };

    return (
        <div className="min-h-full pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-gray-900 mb-1 leading-none uppercase">CLIENTES</h2>
                    <p className="text-gray-400 font-bold text-[10px] tracking-[0.2em] uppercase flex items-center gap-2">
                        <IconUsers size={12} className="text-accent" />
                        {clients.length} Registrados • Gestión de CRM
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative flex-1">
                        <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text" placeholder="Filtro rápido..."
                            value={search} onChange={(e) => setSearch(e.target.value)}
                            className="bg-white pl-12 pr-6 py-4 rounded-[1.5rem] border border-gray-100 shadow-sm w-full outline-none focus:ring-4 focus:ring-black/5 transition-all text-sm font-bold"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white px-5 py-3 rounded-[1.5rem] border border-gray-100 shadow-sm">
                        <IconArrowsUpDown size={16} className="text-gray-400" />
                        <select 
                            value={sortBy} 
                            onChange={(e: any) => setSortBy(e.target.value)}
                            className="outline-none text-xs font-black uppercase tracking-widest bg-transparent cursor-pointer"
                        >
                            <option value="spent">Gasto</option>
                            <option value="points">Puntos</option>
                            <option value="orders">Pedidos</option>
                            <option value="name">Nombre</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <IconLoader2 className="animate-spin text-gray-200" size={64} />
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Accediendo a la base de datos...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 text-center gap-3">
                    <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-200 mb-2">
                        <IconUsers size={40} />
                    </div>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">No se encontraron coincidencias</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map((client, idx) => {
                        const inactivity = getInactivityInfo(client.last_order_at);
                        const isDebt = client.balance > 0;
                        
                        return (
                            <motion.div 
                                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                                key={client.id} 
                                onClick={() => setSelectedClient(client)}
                                className="group bg-white p-7 rounded-[2.5rem] border border-transparent hover:border-gray-100 shadow-sm hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden"
                            >
                                <div className="flex items-start justify-between mb-8">
                                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-gray-300 text-3xl group-hover:bg-black group-hover:text-[#FFD60A] transition-all">
                                        {client.full_name?.[0]?.toUpperCase() || "?"}
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${inactivity.color}`}>
                                            {inactivity.label}
                                        </span>
                                        {isDebt && (
                                            <span className="bg-red-600 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse">
                                                Deuda
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <h3 className="font-black text-xl text-gray-900 truncate mb-1">{client.full_name || "S/N"}</h3>
                                <div className="flex flex-col gap-1.5 mb-8">
                                    <p className="text-[11px] font-bold text-gray-400 flex items-center gap-2 tracking-tight truncate">
                                        <IconMail size={12} className="opacity-40" /> {client.email || 'Email no cargado'}
                                    </p>
                                    {client.phone && (
                                        <p className="text-[11px] font-bold text-gray-400 flex items-center gap-2 tracking-tight">
                                            <IconPhone size={12} className="opacity-40" /> {client.phone}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Gasto Total</p>
                                        <p className="text-sm font-black text-gray-900 leading-none">${client.total_spent.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-[8px] font-black uppercase tracking-widest ${isDebt ? 'text-red-400' : 'text-gray-400'} mb-1`}>Saldo Cuenta</p>
                                        <p className={`text-sm font-black ${isDebt ? 'text-red-600' : 'text-gray-900'} leading-none`}>
                                            {isDebt ? `-$${client.balance.toLocaleString()}` : `$${client.balance.toLocaleString()}`}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Detalle MEJORADO */}
            <AnimatePresence>
                {selectedClient && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedClient(null)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 100 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 100 }}
                            className="relative bg-white w-full max-w-2xl h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col"
                        >
                            {/* Close Button UI */}
                            <button onClick={() => setSelectedClient(null)} className="absolute top-6 right-6 w-11 h-11 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white transition-all z-[60] active:scale-95 shadow-xl">
                                <IconX size={20} />
                            </button>

                            {/* Header Gradient */}
                            <div className="bg-gray-950 p-10 relative shrink-0 overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-accent/20 blur-[100px] rounded-full -mr-32 -mt-32" />
                                <div className="relative flex items-center gap-8">
                                    <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-center text-5xl font-black text-[#FFD60A] shadow-2xl">
                                        {selectedClient.full_name?.[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFD60A] mb-1">Perfil de Cliente</p>
                                        <h2 className="text-3xl font-black text-white leading-tight">{selectedClient.full_name}</h2>
                                        <p className="text-white/40 text-sm font-bold flex items-center gap-2 mt-2 truncate">
                                            <IconMail size={14} /> {selectedClient.email || 'Sin correo asociado'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Main Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-8 sm:p-10 space-y-12 no-scrollbar">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-gray-50/50 p-5 rounded-[2.5rem] text-center border border-gray-100 group hover:bg-white hover:shadow-xl transition-all">
                                        <IconTrendingUp className="mx-auto mb-3 text-black opacity-20" size={20} />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Gasto Total</p>
                                        <p className="text-xl font-black text-gray-900">${selectedClient.total_spent.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-gray-50/50 p-5 rounded-[2.5rem] text-center border border-gray-100 group hover:bg-white hover:shadow-xl transition-all">
                                        <IconShoppingBag className="mx-auto mb-3 text-black opacity-20" size={20} />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Frecuencia</p>
                                        <p className="text-xl font-black text-gray-900">{selectedClient.order_count}</p>
                                    </div>
                                    <div className="bg-gray-50/50 p-5 rounded-[2.5rem] text-center border border-gray-100 group hover:bg-white hover:shadow-xl transition-all">
                                        <IconStar className="mx-auto mb-3 text-[#FFD60A]" size={20} fill="currentColor" />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Puntos</p>
                                        <p className="text-xl font-black text-gray-900">{selectedClient.points}</p>
                                    </div>
                                    <div className={`${selectedClient.balance > 0 ? 'bg-red-600 text-white shadow-xl shadow-red-600/20' : selectedClient.balance < 0 ? 'bg-emerald-600 text-white' : 'bg-black text-white'} p-5 rounded-[2.5rem] text-center transition-all relative overflow-hidden`}>
                                         {selectedClient.balance !== 0 && <div className="absolute top-0 right-0 w-8 h-8 -mr-4 -mt-4 bg-white/20 rotate-45" />}
                                        <IconArrowsUpDown className="mx-auto mb-3 opacity-40" size={20} />
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Saldo CC</p>
                                        <p className="text-xl font-black">
                                            {selectedClient.balance > 0 ? `-$${selectedClient.balance.toLocaleString()}` : selectedClient.balance < 0 ? `+$${Math.abs(selectedClient.balance).toLocaleString()}` : `$0`}
                                        </p>
                                    </div>
                                </div>

                                {/* Debt Settlement Section */}
                                <div className={`p-8 rounded-[3rem] ${selectedClient.balance > 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'} border-2 flex flex-col gap-6 shadow-sm`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 ${selectedClient.balance > 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'} rounded-full flex items-center justify-center`}>
                                            <IconReceipt size={28} />
                                        </div>
                                        <div>
                                            <h4 className={`font-black ${selectedClient.balance > 0 ? 'text-red-900' : 'text-emerald-900'} text-lg`}>Registrar Pago</h4>
                                            <p className={`${selectedClient.balance > 0 ? 'text-red-700/60' : 'text-emerald-700/60'} font-bold text-xs uppercase tracking-widest`}>Ingresa el monto que entrega el cliente</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <div className="relative flex-1">
                                            <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-400">$</span>
                                            <input 
                                                type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                                                className="w-full h-16 pl-10 pr-6 rounded-2xl bg-white border-transparent focus:ring-4 ring-black/5 outline-none font-black text-xl text-gray-900 shadow-inner"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <button 
                                            disabled={isPaying} onClick={() => handleSettleDebt(selectedClient.id)}
                                            className={`h-16 px-10 ${selectedClient.balance > 0 ? 'bg-red-600 shadow-red-600/20' : 'bg-emerald-600 shadow-emerald-600/20'} text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-black hover:scale-105 active:scale-95 transition-all shadow-xl`}
                                        >
                                            {isPaying ? <IconLoader2 className="animate-spin" size={18} /> : <><IconCircleCheck size={18} /> Confirmar Pago</>}
                                        </button>
                                    </div>
                                    
                                    {selectedClient.balance > 0 && (
                                        <button 
                                            onClick={() => setPaymentAmount(selectedClient.balance.toString())}
                                            className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors mx-auto"
                                        >
                                            Autocompletar deuda total (${selectedClient.balance.toLocaleString()})
                                        </button>
                                    )}
                                </div>

                                {/* CONSUMPTION HISTORY - NEW SECTION */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-black text-[10px] uppercase tracking-[0.3em] text-gray-400 flex items-center gap-2">
                                            <IconHistory size={16} /> ÚLTIMOS CONSUMOS
                                        </h4>
                                        <span className="text-[10px] font-bold text-gray-400 italic">Últimas 5 órdenes</span>
                                    </div>
                                    <div className="space-y-3">
                                        {selectedClient.last_orders && selectedClient.last_orders.length > 0 ? (
                                            selectedClient.last_orders.map((order: any) => (
                                                <div key={order.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 flex items-center justify-between hover:shadow-lg transition-all group">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-black group-hover:text-white transition-all">
                                                            <IconReceipt size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-gray-900 text-sm">Pedido #{order.id?.slice(0, 8) || 'N/A'}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                {new Date(order.created_at).toLocaleDateString()} • {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-gray-900 text-base">${Number(order.total).toLocaleString()}</p>
                                                        <p className="text-[9px] font-black text-accent uppercase tracking-tighter">Consumo General</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-12 border-2 border-dashed border-gray-100 rounded-[3rem] flex flex-col items-center justify-center text-center opacity-30">
                                                <IconShoppingBag size={32} className="mb-2" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">No hay historial de compras</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* CONTACT FOOTER */}
                                <div className="pt-8 border-t border-gray-100 grid grid-cols-2 gap-4">
                                     <div className="flex items-center gap-3 p-5 bg-gray-50 rounded-[1.5rem] border border-transparent hover:border-gray-200 transition-colors">
                                         <IconPhone size={18} className="text-gray-300" />
                                         <div>
                                             <p className="text-[8px] font-black uppercase opacity-40 text-black mb-0.5">Teléfono</p>
                                             <p className="text-xs font-bold text-gray-900 truncate">{selectedClient.phone || 'S/N'}</p>
                                         </div>
                                     </div>
                                     <div className="flex items-center gap-3 p-5 bg-gray-50 rounded-[1.5rem] border border-transparent hover:border-gray-200 transition-colors">
                                         <IconMail size={18} className="text-gray-300" />
                                         <div>
                                             <p className="text-[8px] font-black uppercase opacity-40 text-black mb-0.5">Email</p>
                                             <p className="text-xs font-bold text-gray-900 truncate">{selectedClient.email || 'S/N'}</p>
                                         </div>
                                     </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

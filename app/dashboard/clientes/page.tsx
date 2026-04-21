"use client";
import { useState, useEffect } from "react";
import { Users, Search, Loader2, Star, TrendingUp, Calendar, ArrowUpDown, X, Phone, Mail, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ClientesPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<"spent" | "points" | "orders" | "name">("spent");
    const [selectedClient, setSelectedClient] = useState<any | null>(null);

    useEffect(() => { fetchClients(); }, []);

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
                    <h2 className="text-4xl font-black tracking-tight text-gray-900 mb-1">Clientes</h2>
                    <p className="text-gray-500 font-medium flex items-center gap-2">
                        <Users size={16} className="text-accent" />
                        {clients.length} Registrados • CRM Bloom
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text" placeholder="Buscar por nombre, correo o tel..."
                            value={search} onChange={(e) => setSearch(e.target.value)}
                            className="bg-white pl-12 pr-6 py-4 rounded-[1.5rem] border border-gray-100 shadow-sm w-full outline-none focus:ring-4 focus:ring-black/5 transition-all"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-[1.5rem] border border-gray-100 shadow-sm">
                        <ArrowUpDown size={16} className="text-gray-400" />
                        <select 
                            value={sortBy} 
                            onChange={(e: any) => setSortBy(e.target.value)}
                            className="outline-none text-sm font-bold bg-transparent cursor-pointer"
                        >
                            <option value="spent">Más vendidos</option>
                            <option value="points">Más puntos</option>
                            <option value="orders">Frecuencia</option>
                            <option value="name">Alfabético</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <Loader2 className="animate-spin text-gray-200" size={64} />
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Cargando base de datos...</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-40 text-center gap-3">
                    <Users size={48} className="text-gray-100" />
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No se encontraron clientes</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map((client, idx) => {
                        const inactivity = getInactivityInfo(client.last_order_at);
                        const isTop = idx < 3 && sortBy === "spent";
                        
                        return (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={client.id} 
                                onClick={() => setSelectedClient(client)}
                                className="group bg-white p-6 rounded-[2.5rem] border border-gray-50 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                            >
                                {isTop && (
                                    <div className={`absolute top-0 right-0 w-20 h-20 -mr-10 -mt-10 rotate-45 flex items-end justify-center pb-2 ${
                                        idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-300' : 'bg-orange-300'
                                    }`}>
                                        <Star size={12} className="text-white mb-1" fill="currentColor" />
                                    </div>
                                )}

                                <div className="flex items-start justify-between mb-6">
                                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-gray-300 text-2xl group-hover:bg-black group-hover:text-white transition-colors">
                                        {client.full_name?.[0]?.toUpperCase() || "?"}
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${inactivity.color}`}>
                                        {inactivity.label}
                                    </span>
                                </div>

                                <h3 className="font-black text-xl text-gray-900 truncate mb-1">{client.full_name || "Sin nombre"}</h3>
                                <div className="flex flex-col gap-1 mb-6">
                                    <p className="text-xs text-gray-400 flex items-center gap-1.5"><Mail size={12} /> {client.email || 'Sin correo'}</p>
                                    {client.phone && <p className="text-xs text-gray-400 flex items-center gap-1.5"><Phone size={12} /> {client.phone}</p>}
                                </div>

                                <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-50">
                                    <div className="text-center">
                                        <p className="text-[8px] font-black uppercase tracking-tight text-gray-400 mb-0.5">Ventas</p>
                                        <p className="text-xs font-bold text-gray-900">${client.total_spent.toLocaleString()}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] font-black uppercase tracking-tight text-gray-400 mb-0.5">Pedidos</p>
                                        <p className="text-xs font-bold text-gray-900">{client.order_count}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[8px] font-black uppercase tracking-tight text-gray-400 mb-0.5">Puntos</p>
                                        <p className="text-xs font-bold text-accent">★{client.points}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className={`text-[8px] font-black uppercase tracking-tight ${client.balance > 0 ? 'text-red-400' : 'text-gray-400'} mb-0.5`}>Saldo</p>
                                        <p className={`text-xs font-bold ${client.balance > 0 ? 'text-red-600' : 'text-gray-900'}`}>${client.balance.toLocaleString()}</p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Detalle */}
            <AnimatePresence>
                {selectedClient && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedClient(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md" 
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 40 }}
                            className="relative bg-white w-full max-w-xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col"
                        >
                            <button 
                                onClick={() => setSelectedClient(null)}
                                className="absolute top-6 right-6 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors z-10"
                            >
                                <X size={20} />
                            </button>

                            <div className="bg-gray-900 p-10 text-white relative h-48 flex items-end">
                                <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20">
                                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-accent/20 to-transparent" />
                                </div>
                                <div className="relative flex items-center gap-6">
                                    <div className="w-24 h-24 bg-white/10 backdrop-blur-md border border-white/20 rounded-[2rem] flex items-center justify-center text-4xl font-black">
                                        {selectedClient.full_name?.[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black">{selectedClient.full_name}</h2>
                                        <p className="text-white/60 font-medium">Cliente desde {new Date(selectedClient.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 space-y-8">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-[2rem] text-center border border-gray-100">
                                        <TrendingUp className="mx-auto mb-2 text-accent" size={20} />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Gasto Total</p>
                                        <p className="text-lg font-black text-gray-900">${selectedClient.total_spent.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-[2rem] text-center border border-gray-100">
                                        <ShoppingBag className="mx-auto mb-2 text-blue-500" size={20} />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Pedidos</p>
                                        <p className="text-lg font-black text-gray-900">{selectedClient.order_count}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-[2rem] text-center border border-gray-100">
                                        <Star className="mx-auto mb-2 text-yellow-500" size={20} fill="currentColor" />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Puntos</p>
                                        <p className="text-lg font-black text-gray-900">{selectedClient.points}</p>
                                    </div>
                                    <div className={`${selectedClient.balance > 0 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'} p-4 rounded-[2rem] text-center border`}>
                                        <ArrowUpDown className={`mx-auto mb-2 ${selectedClient.balance > 0 ? 'text-red-600' : 'text-gray-400'}`} size={20} />
                                        <p className={`text-[9px] font-black uppercase tracking-widest ${selectedClient.balance > 0 ? 'text-red-400' : 'text-gray-400'} mb-1`}>Saldo CC</p>
                                        <p className={`text-lg font-black ${selectedClient.balance > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                            ${selectedClient.balance.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-black text-xs uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                        <Calendar size={14} /> Información de Contacto
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                                            <Mail size={18} className="text-gray-400" />
                                            <p className="text-sm font-bold text-gray-900 truncate">{selectedClient.email || 'No disponible'}</p>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                                            <Phone size={18} className="text-gray-400" />
                                            <p className="text-sm font-bold text-gray-900 truncate">{selectedClient.phone || 'No disponible'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-accent/5 border border-accent/10 rounded-[2rem] flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-1">Última Actividad</p>
                                        <p className="font-bold text-gray-900">
                                            {selectedClient.last_order_at 
                                                ? new Date(selectedClient.last_order_at).toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                                                : "Sin actividad registrada"}
                                        </p>
                                    </div>
                                    <Star size={32} className="text-accent/20" />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

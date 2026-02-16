"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { TableCard } from "@/components/pos/TableCard";
import { CustomerInfoModal } from "@/components/pos/CustomerInfoModal";
import { Search, Monitor, Bike, ShoppingBag, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function TablesPage() {
    const [tables, setTables] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'ALL' | 'LOCAL' | 'DELIVERY' | 'RETIRO'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Modal State
    const [selectedTable, setSelectedTable] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const fetchTables = async () => {
            const { data, error } = await supabase
                .from('salon_tables')
                .select('*')
                .order('id');

            if (data) setTables(data);
            setLoading(false);
        };

        fetchTables();

        // Realtime Subscription
        const channel = supabase
            .channel('schema-db-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'salon_tables',
                },
                (payload) => {
                    fetchTables();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // LOGICA ROBUSTA DE FILTRADO POR ID
    const filteredTables = useMemo(() => {
        let filtered = tables;

        // 1. Filtrar por TABS (Ranges)
        if (activeTab === 'LOCAL') {
            filtered = filtered.filter(t => t.id >= 1 && t.id <= 49);
        } else if (activeTab === 'DELIVERY') {
            filtered = filtered.filter(t => t.id >= 50 && t.id <= 99);
        } else if (activeTab === 'RETIRO') {
            filtered = filtered.filter(t => t.id >= 100);
        }

        // 2. Filtrar por BUSQUEDA
        if (searchQuery) {
            filtered = filtered.filter(t =>
                t.id.toString().includes(searchQuery)
            );
        }

        return filtered;
    }, [tables, activeTab, searchQuery]);

    // COUNTS POR RANGE (Más fiable que string match)
    const counts = useMemo(() => {
        return {
            todas: tables.length,
            local: tables.filter(t => t.id >= 1 && t.id <= 49).length,
            delivery: tables.filter(t => t.id >= 50 && t.id <= 99).length,
            retiro: tables.filter(t => t.id >= 100).length
        };
    }, [tables]);


    const handleTableClick = (tableId: number) => {
        const table = tables.find(t => t.id === tableId);
        if (!table) return;

        // If Occupied, go direct
        if (table.status === 'OCCUPIED') {
            router.push(`/dashboard/tables/${tableId}`);
            return;
        }

        // Determinar tipo basado en ID Range
        const isDelivery = table.id >= 50 && table.id < 100;
        const isRetiro = table.id >= 100;

        // If Free & Delivery/Retiro -> Open Modal
        if (isDelivery || isRetiro) {
            setSelectedTable(table);
            setIsModalOpen(true);
        } else {
            // Local Free -> Direct Navigate
            router.push(`/dashboard/tables/${tableId}`);
        }
    };

    const handleCreateOrder = async (customerData: any) => {
        if (!selectedTable) return;

        try {
            const { error } = await supabase
                .from('salon_tables')
                .update({
                    status: 'OCCUPIED',
                    updated_at: new Date().toISOString(),
                    // In real app, associate customer data here
                })
                .eq('id', selectedTable.id);

            if (error) throw error;

            toast.success("Pedido iniciado");
            setIsModalOpen(false);
            router.push(`/dashboard/tables/${selectedTable.id}`);

        } catch (e) {
            console.error(e);
            toast.error("Error al iniciar pedido");
        }
    };

    if (loading) return <div className="p-10 text-center font-bold text-dark-400">Cargando mesas...</div>;

    return (
        <div className="h-full flex flex-col gap-6">
            <CustomerInfoModal
                isOpen={isModalOpen}
                orderType={selectedTable?.id >= 100 ? 'RETIRO' : 'DELIVERY'}
                tableId={selectedTable?.id || 0}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateOrder}
            />

            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl shadow-soft sticky top-0 z-10 backdrop-blur-md bg-white/80">
                <div className="flex gap-2 p-1 bg-dark-50 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
                    <TabButton
                        label="TODAS"
                        count={counts.todas}
                        active={activeTab === 'ALL'}
                        onClick={() => setActiveTab('ALL')}
                    />
                    <TabButton
                        icon={<Monitor size={14} />}
                        label="LOCAL"
                        count={counts.local}
                        active={activeTab === 'LOCAL'}
                        onClick={() => setActiveTab('LOCAL')}
                        color="text-emerald-600"
                    />
                    <TabButton
                        icon={<Bike size={14} />}
                        label="DELIVERY"
                        count={counts.delivery}
                        active={activeTab === 'DELIVERY'}
                        onClick={() => setActiveTab('DELIVERY')}
                        color="text-blue-600"
                    />
                    <TabButton
                        icon={<ShoppingBag size={14} />}
                        label="RETIRO"
                        count={counts.retiro}
                        active={activeTab === 'RETIRO'}
                        onClick={() => setActiveTab('RETIRO')}
                        color="text-purple-600"
                    />
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar n° mesa..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-dark-50 rounded-xl text-sm font-bold text-dark-900 border-none focus:ring-2 focus:ring-bloom-500/20 transition-all outline-none"
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto pb-20 scrollbar-thin pr-2">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredTables.map(table => (
                        <TableCard
                            key={table.id}
                            table={table}
                            onClick={handleTableClick}
                        />
                    ))}
                </div>
                {filteredTables.length === 0 && (
                    <div className="py-20 text-center text-dark-400 font-bold opacity-60">
                        No se encontraron mesas
                    </div>
                )}
            </div>

            {/* Quick Action FAB (Optional) */}
            <button className="fixed bottom-8 right-8 bg-bloom-500 text-white p-4 rounded-full shadow-strong hover:bg-bloom-600 hover:scale-110 transition-all z-30 md:hidden active:scale-95">
                <Plus size={24} strokeWidth={3} />
            </button>
        </div>
    );
}

function TabButton({ icon, label, count, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 user-select-none
                ${active
                    ? 'bg-bloom-500 text-white shadow-lg shadow-bloom-500/30 transform scale-105'
                    : 'text-dark-500 hover:bg-dark-100 hover:text-dark-900'
                }
            `}
        >
            {icon}
            <span>{label}</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] bg-white/20 text-white mix-blend-overlay font-bold min-w-[20px] text-center`}>
                {count}
            </span>
        </button>
    );
}

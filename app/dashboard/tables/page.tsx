"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { TableCard } from "@/components/pos/TableCard";
import { CustomerInfoModal } from "@/components/pos/CustomerInfoModal";
import { OrderSheet } from "@/components/dashboard/OrderSheet";
import {
    Search, Monitor, Bike, ShoppingBag, Plus,
    LayoutGrid, Map, List, TrendingUp, Clock, ChevronRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type ViewMode = 'grid' | 'map' | 'list';

export default function TablesPage() {
    const [tables, setTables] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'ALL' | 'LOCAL' | 'DELIVERY' | 'RETIRO'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [sideTableId, setSideTableId] = useState<number | null>(null);

    const [selectedTable, setSelectedTable] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showNewMenu, setShowNewMenu] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const fetchTables = async () => {
            const { data, error } = await supabase.from('salon_tables').select('*').order('id');
            if (error) {
                console.error('Error al cargar mesas:', error);
                setFetchError(error.message);
                setLoading(false);
                return;
            }
            if (data && data.length === 0) {
                // Seed inicial: crear 30 mesas si la tabla está vacía
                const rows = Array.from({ length: 30 }, (_, i) => ({
                    id: i + 1,
                    status: 'FREE',
                    total: 0,
                    items: [],
                }));
                await supabase.from('salon_tables').insert(rows);
                const { data: seeded } = await supabase.from('salon_tables').select('*').order('id');
                if (seeded) setTables(seeded);
            } else if (data) {
                setTables(data);
            }
            setLoading(false);
        };
        fetchTables();

        const channel = supabase
            .channel('schema-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'salon_tables' }, () => fetchTables())
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kitchen_tickets' }, () => fetchTables())
            .subscribe();

        // Polling fallback every 10 seconds in case realtime is slow
        const poll = setInterval(fetchTables, 10000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(poll);
        };
    }, []);

    const filteredTables = useMemo(() => {
        let occupied = tables.filter(t => t.status === 'OCCUPIED');
        let freeLocal = tables.filter(t => t.status !== 'OCCUPIED' && t.id >= 1 && t.id <= 36);

        if (activeTab === 'LOCAL') {
            occupied = occupied.filter(t => t.id >= 1 && t.id <= 36);
        } else if (activeTab === 'DELIVERY') {
            occupied = occupied.filter(t => t.id >= 40 && t.id <= 99);
            freeLocal = [];
        } else if (activeTab === 'RETIRO') {
            occupied = occupied.filter(t => t.id >= 100);
            freeLocal = [];
        }

        if (searchQuery) {
            occupied = occupied.filter(t => t.id.toString().includes(searchQuery));
            freeLocal = freeLocal.filter(t => t.id.toString().includes(searchQuery));
        }

        occupied.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
        freeLocal.sort((a, b) => a.id - b.id);
        return [...occupied, ...freeLocal];
    }, [tables, activeTab, searchQuery]);

    const counts = useMemo(() => {
        const occLocal    = tables.filter(t => t.status === 'OCCUPIED' && t.id >= 1 && t.id <= 36).length;
        const freeLocal   = tables.filter(t => t.status !== 'OCCUPIED' && t.id >= 1 && t.id <= 36).length;
        const occDelivery = tables.filter(t => t.status === 'OCCUPIED' && t.id >= 40 && t.id <= 99).length;
        const occRetiro   = tables.filter(t => t.status === 'OCCUPIED' && t.id >= 100).length;
        return { todas: occLocal + freeLocal + occDelivery + occRetiro, local: occLocal + freeLocal, delivery: occDelivery, retiro: occRetiro };
    }, [tables]);

    const stats = useMemo(() => {
        const occupied = tables.filter(t => t.status === 'OCCUPIED');
        const localTotal = tables.filter(t => t.id >= 1 && t.id <= 36).length;
        const localOccupied = occupied.filter(t => t.id >= 1 && t.id <= 36).length;
        const totalActive = occupied.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
        const times = occupied.map(t => {
            const diff = Math.floor((Date.now() - new Date(t.updated_at).getTime()) / 60000);
            return isNaN(diff) ? 0 : diff;
        });
        const avgTime = times.length > 0 ? Math.floor(times.reduce((a, b) => a + b, 0) / times.length) : 0;
        return { localOccupied, localTotal, totalActive, avgTime };
    }, [tables]);

    const handleTableClick = (tableId: number) => {
        const table = tables.find(t => t.id === tableId);
        if (!table) return;

        if (viewMode === 'list') {
            setSideTableId(tableId);
            return;
        }

        if (table.status === 'OCCUPIED') {
            router.push(`/dashboard/tables/${tableId}`);
            return;
        }

        const isDelivery = table.id >= 40 && table.id <= 99;
        const isRetiro = table.id >= 100;
        if (isDelivery || isRetiro) {
            setSelectedTable(table);
            setIsModalOpen(true);
        } else {
            router.push(`/dashboard/tables/${tableId}`);
        }
    };

    const handleCreateOrder = async (customerData: any) => {
        if (!selectedTable) return;
        try {
            await supabase.from('salon_tables').upsert({
                id: selectedTable.id,
                status: 'OCCUPIED',
                updated_at: new Date().toISOString()
            });
            toast.success("Pedido iniciado");
            setIsModalOpen(false);
            router.push(`/dashboard/tables/${selectedTable.id}`);
        } catch {
            toast.error("Error al iniciar pedido");
        }
    };

    const handleNewOrder = async (type: 'DELIVERY' | 'RETIRO') => {
        setShowNewMenu(false);
        const minId = type === 'DELIVERY' ? 40 : 100;
        const maxId = type === 'DELIVERY' ? 99 : 999;

        const usedIds = tables.filter(t => t.id >= minId && t.id <= maxId).map(t => t.id);
        let nextId = minId;
        while (usedIds.includes(nextId) && nextId <= maxId) nextId++;

        if (nextId > maxId) {
            toast.error('No hay más slots disponibles');
            return;
        }

        await supabase.from('salon_tables').upsert({ id: nextId, status: 'FREE', total: 0, items: [] });
        router.push(`/dashboard/tables/${nextId}`);
    };

    if (loading) return <div className="p-10 text-center font-bold text-dark-400">Cargando mesas...</div>;
    if (fetchError) return (
        <div className="p-10 text-center">
            <p className="font-black text-red-500 text-lg mb-2">Error al cargar mesas</p>
            <p className="text-slate-500 text-sm font-mono bg-slate-100 px-4 py-2 rounded-xl inline-block">{fetchError}</p>
        </div>
    );

    return (
        <div className="h-full flex flex-col gap-4">
            <CustomerInfoModal
                isOpen={isModalOpen}
                orderType={selectedTable?.id >= 100 ? 'RETIRO' : 'DELIVERY'}
                tableId={selectedTable?.id || 0}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateOrder}
            />

            {/* STATS BAR */}
            <div className="flex gap-3 shrink-0 overflow-x-auto no-scrollbar pb-1">
                <StatCard
                    icon={<Monitor size={16} className="text-emerald-600" />}
                    label="Ocupación"
                    value={`${stats.localOccupied} / ${stats.localTotal}`}
                    sub={`${Math.round((stats.localOccupied / Math.max(stats.localTotal, 1)) * 100)}% del salón`}
                    accent="border-emerald-200 bg-emerald-50"
                />
                <StatCard
                    icon={<TrendingUp size={16} className="text-amber-600" />}
                    label="Total activo"
                    value={`$${stats.totalActive.toLocaleString()}`}
                    sub="En mesas abiertas"
                    accent="border-amber-200 bg-amber-50"
                />
                <StatCard
                    icon={<Clock size={16} className="text-blue-500" />}
                    label="Tiempo promedio"
                    value={stats.avgTime > 0 ? `${stats.avgTime}m` : '—'}
                    sub="Por mesa ocupada"
                    accent="border-blue-200 bg-blue-50"
                />
            </div>

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 shrink-0">
                <div className="flex gap-1 p-1 bg-slate-50 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
                    <TabButton label="TODAS" count={counts.todas} active={activeTab === 'ALL'} onClick={() => setActiveTab('ALL')} />
                    <TabButton icon={<Monitor size={13} />} label="LOCAL" count={counts.local} active={activeTab === 'LOCAL'} onClick={() => setActiveTab('LOCAL')} />
                    <TabButton icon={<Bike size={13} />} label="DELIVERY" count={counts.delivery} active={activeTab === 'DELIVERY'} onClick={() => setActiveTab('DELIVERY')} />
                    <TabButton icon={<ShoppingBag size={13} />} label="RETIRO" count={counts.retiro} active={activeTab === 'RETIRO'} onClick={() => setActiveTab('RETIRO')} />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-52">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input
                            type="text"
                            placeholder="Buscar n° mesa..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-900 border border-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                        />
                    </div>

                    {/* View Toggle */}
                    <div className="flex gap-0.5 p-1 bg-slate-100 rounded-xl shrink-0">
                        <ViewBtn icon={<LayoutGrid size={15} />} active={viewMode === 'grid'} onClick={() => setViewMode('grid')} label="Grid" />
                        <ViewBtn icon={<Map size={15} />} active={viewMode === 'map'} onClick={() => setViewMode('map')} label="Mapa" />
                        <ViewBtn icon={<List size={15} />} active={viewMode === 'list'} onClick={() => { setViewMode('list'); setSideTableId(null); }} label="Lista" />
                    </div>
                </div>
            </div>

            {/* VIEWS */}
            {viewMode === 'grid' && <GridView tables={filteredTables} onTableClick={handleTableClick} />}
            {viewMode === 'map' && <MapView tables={tables} onTableClick={handleTableClick} />}
            {viewMode === 'list' && (
                <ListView
                    tables={filteredTables}
                    sideTableId={sideTableId}
                    onTableClick={handleTableClick}
                    onCloseSide={() => setSideTableId(null)}
                    onNavigate={(id) => router.push(`/dashboard/tables/${id}`)}
                />
            )}

            {/* FAB: nuevo pedido delivery/retiro */}
            <div className="fixed bottom-20 right-5 md:bottom-8 md:right-8 z-30 flex flex-col items-end gap-2">
                {showNewMenu && (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col">
                        <button
                            onClick={() => handleNewOrder('DELIVERY')}
                            className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                        >
                            <Bike size={18} className="text-blue-500" />
                            <span className="font-bold text-gray-800 text-sm">Nuevo Delivery</span>
                        </button>
                        <button
                            onClick={() => handleNewOrder('RETIRO')}
                            className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left border-t border-gray-50"
                        >
                            <ShoppingBag size={18} className="text-purple-500" />
                            <span className="font-bold text-gray-800 text-sm">Nuevo Retiro</span>
                        </button>
                    </div>
                )}
                <button
                    onClick={() => setShowNewMenu(v => !v)}
                    className="bg-gray-900 text-white p-4 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all"
                >
                    <Plus size={22} strokeWidth={3} className={`transition-transform ${showNewMenu ? 'rotate-45' : ''}`} />
                </button>
            </div>
        </div>
    );
}

// ─── STAT CARD ────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub: string; accent: string }) {
    return (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border bg-white shrink-0 min-w-[140px] flex-1 ${accent}`}>
            <div className="p-2 rounded-xl bg-white shadow-sm border border-white/80 shrink-0">{icon}</div>
            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">{label}</p>
                <p className="text-xl font-black text-slate-900 leading-tight">{value}</p>
                <p className="text-[11px] text-slate-400 font-medium truncate">{sub}</p>
            </div>
        </div>
    );
}

// ─── GRID VIEW ────────────────────────────────────────────────────
function GridView({ tables, onTableClick }: { tables: any[]; onTableClick: (id: number) => void }) {
    return (
        <div className="flex-1 overflow-y-auto pb-20 scrollbar-thin pr-1">
            {tables.length === 0 ? (
                <div className="py-20 text-center text-slate-400 font-bold opacity-60">No se encontraron mesas</div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {tables.map(table => (
                        <TableCard key={table.id} table={table} onClick={onTableClick} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── MAP VIEW ─────────────────────────────────────────────────────
function MapView({ tables, onTableClick }: { tables: any[]; onTableClick: (id: number) => void }) {
    const getTable = (id: number) => tables.find(t => t.id === id);

    const zones = [
        { label: "Salón A", color: "border-emerald-200 bg-emerald-50", header: "bg-emerald-100 text-emerald-700", tables: [1,2,3,4,5,6,7,8,9,10,11,12] },
        { label: "Salón B", color: "border-blue-200 bg-blue-50", header: "bg-blue-100 text-blue-700", tables: [13,14,15,16,17,18,19,20,21,22,23,24] },
        { label: "Terraza", color: "border-purple-200 bg-purple-50", header: "bg-purple-100 text-purple-700", tables: [25,26,27,28,29,30,31,32,33,34,35,36] },
    ];

    const externalTables = tables.filter(t => (t.id >= 40 && t.id <= 99) || t.id >= 100);

    return (
        <div className="flex-1 overflow-y-auto pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
                {zones.map(zone => (
                    <div key={zone.label} className={`rounded-2xl border overflow-hidden ${zone.color}`}>
                        <div className={`px-4 py-2.5 ${zone.header}`}>
                            <h3 className="text-xs font-black uppercase tracking-widest">{zone.label}</h3>
                        </div>
                        <div className="p-3 grid grid-cols-4 gap-2">
                            {zone.tables.map(id => {
                                const table = getTable(id);
                                return table
                                    ? <MiniTableCard key={id} table={table} onClick={onTableClick} />
                                    : <div key={id} className="h-16 rounded-xl bg-white/50 border border-dashed border-slate-200 flex items-center justify-center text-slate-300 font-black text-xs">{id}</div>;
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {externalTables.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden">
                    <div className="px-4 py-2.5 bg-amber-100 text-amber-700">
                        <h3 className="text-xs font-black uppercase tracking-widest">Delivery & Retiro</h3>
                    </div>
                    <div className="p-3 flex flex-wrap gap-2">
                        {externalTables.map(t => <MiniTableCard key={t.id} table={t} onClick={onTableClick} />)}
                    </div>
                </div>
            )}
        </div>
    );
}

function MiniTableCard({ table, onClick }: { table: any; onClick: (id: number) => void }) {
    const isFree = table.status === 'FREE';
    const getTime = () => {
        if (isFree) return '';
        const diff = Math.floor((Date.now() - new Date(table.updated_at).getTime()) / 60000);
        if (isNaN(diff)) return '0m';
        return diff < 60 ? `${diff}m` : `${Math.floor(diff / 60)}h${diff % 60}m`;
    };
    return (
        <button
            onClick={() => onClick(table.id)}
            className={`h-16 w-full rounded-xl flex flex-col items-center justify-center gap-0 transition-all active:scale-95 hover:scale-105 ${
                isFree
                    ? 'bg-white border-2 border-slate-200 hover:border-slate-400 shadow-sm'
                    : 'bg-gradient-to-br from-bloom-400 to-bloom-600 shadow-md hover:shadow-lg'
            }`}
        >
            <span className={`text-xl font-black leading-none ${isFree ? 'text-slate-700' : 'text-white'}`}>{table.id}</span>
            {isFree
                ? <span className="text-[9px] font-bold text-emerald-500 mt-0.5">libre</span>
                : <>
                    <span className="text-[9px] font-black text-white/80">{getTime()}</span>
                    <span className="text-[9px] font-black text-white">${(table.total || 0).toLocaleString()}</span>
                  </>
            }
        </button>
    );
}

// ─── LIST VIEW ────────────────────────────────────────────────────
function ListView({ tables, sideTableId, onTableClick, onCloseSide, onNavigate }: {
    tables: any[];
    sideTableId: number | null;
    onTableClick: (id: number) => void;
    onCloseSide: () => void;
    onNavigate: (id: number) => void;
}) {
    const getType = (id: number) => id >= 100 ? 'Retiro' : id >= 40 ? 'Delivery' : 'Local';
    const getTime = (t: any) => {
        if (t.status === 'FREE') return '';
        const diff = Math.floor((Date.now() - new Date(t.updated_at).getTime()) / 60000);
        if (isNaN(diff)) return '';
        return diff < 60 ? `${diff}m` : `${Math.floor(diff / 60)}h ${diff % 60}m`;
    };

    return (
        <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
            {/* Left: table list */}
            <div className={`${sideTableId ? 'w-72 shrink-0' : 'flex-1 max-w-sm'} flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden`}>
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{tables.length} mesas</p>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                    {tables.map(table => {
                        const isFree = table.status === 'FREE';
                        const isSelected = sideTableId === table.id;
                        return (
                            <button
                                key={table.id}
                                onClick={() => onTableClick(table.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-slate-50 ${isSelected ? 'bg-amber-50 border-r-2 border-amber-500' : ''}`}
                            >
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${isFree ? 'bg-slate-100 text-slate-500' : 'bg-gradient-to-br from-bloom-400 to-bloom-600 text-white'}`}>
                                    {table.id}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-sm text-slate-900 truncate">
                                        Mesa {table.id}
                                        <span className="text-slate-400 font-medium text-xs"> · {getType(table.id)}</span>
                                    </p>
                                    {isFree
                                        ? <p className="text-xs text-emerald-500 font-bold">Libre</p>
                                        : <p className="text-xs text-amber-600 font-bold">${(table.total || 0).toLocaleString()} · {getTime(table)}</p>
                                    }
                                </div>
                                <div className={`w-2 h-2 rounded-full shrink-0 ${isFree ? 'bg-emerald-400' : 'bg-bloom-600 animate-pulse'}`} />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Right: order panel */}
            {sideTableId ? (
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <OrderSheet
                        tableId={sideTableId}
                        onClose={onCloseSide}
                        onOrderComplete={onCloseSide}
                    />
                </div>
            ) : (
                <div className="flex-1 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                        <ChevronRight size={28} className="text-slate-300" />
                    </div>
                    <p className="font-black text-slate-400 text-sm uppercase tracking-wider">Seleccioná una mesa</p>
                    <p className="text-xs text-slate-300 font-medium">El pedido se abre aquí sin salir</p>
                </div>
            )}
        </div>
    );
}

// ─── TAB BUTTON ───────────────────────────────────────────────────
function TabButton({ icon, label, count, active, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 shrink-0
                ${active
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25 scale-105'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }
            `}
        >
            {icon}
            <span>{label}</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold min-w-[18px] text-center ${active ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'}`}>
                {count}
            </span>
        </button>
    );
}

// ─── VIEW TOGGLE BUTTON ───────────────────────────────────────────
function ViewBtn({ icon, active, onClick, label }: any) {
    return (
        <button
            onClick={onClick}
            title={label}
            className={`p-2 rounded-lg transition-all ${active ? 'bg-white shadow-sm text-amber-600 font-black' : 'text-slate-400 hover:text-slate-700'}`}
        >
            {icon}
        </button>
    );
}

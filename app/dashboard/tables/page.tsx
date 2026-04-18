"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { TableCard } from "@/components/pos/TableCard";
import { CustomerInfoModal } from "@/components/pos/CustomerInfoModal";
import { OrderSheet } from "@/components/dashboard/OrderSheet";
import {
    Search, Monitor, Bike, ShoppingBag, Plus,
    LayoutGrid, Map, List, TrendingUp, Clock, ChevronRight, UtensilsCrossed, X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    occupiedCardGradient,
    listRowSelectedClass,
    listPulseDotClass,
    listSubPriceClass,
} from "@/lib/dashboard/table-colors";

// Rangos de IDs por tipo
const RANGE = {
    LOCAL:    { min: 1,   max: 41  },
    DELIVERY: { min: 100, max: 200 },
    RETIRO:   { min: 201, max: 300 },
};

function getType(id: number) {
    if (id >= RANGE.RETIRO.min)   return 'Retiro';
    if (id >= RANGE.DELIVERY.min) return 'Delivery';
    if (id <= RANGE.LOCAL.max)    return 'Local';
    return 'Local';
}

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
    const [localPickerOpen, setLocalPickerOpen] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const fetchTables = async () => {
            const { data, error } = await supabase.from('salon_tables').select('*').order('id');
            if (error) { setFetchError(error.message); setLoading(false); return; }
            setTables(data ?? []);
            setLoading(false);
        };
        fetchTables();

        const channel = supabase
            .channel('schema-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'salon_tables' }, fetchTables)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'kitchen_tickets' }, fetchTables)
            .subscribe();

        const poll = setInterval(fetchTables, 10000);
        return () => { supabase.removeChannel(channel); clearInterval(poll); };
    }, []);

    // Solo mostrar mesas ABIERTAS (OCCUPIED)
    const filteredTables = useMemo(() => {
        let open = tables.filter(t => t.status === 'OCCUPIED');

        if (activeTab === 'LOCAL')    open = open.filter(t => t.id >= RANGE.LOCAL.min    && t.id <= RANGE.LOCAL.max);
        if (activeTab === 'DELIVERY') open = open.filter(t => t.id >= RANGE.DELIVERY.min && t.id <= RANGE.DELIVERY.max);
        if (activeTab === 'RETIRO')   open = open.filter(t => t.id >= RANGE.RETIRO.min);
        if (searchQuery)              open = open.filter(t => t.id.toString().includes(searchQuery));

        return open.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
    }, [tables, activeTab, searchQuery]);

    const counts = useMemo(() => {
        const occ = tables.filter(t => t.status === 'OCCUPIED');
        const local    = occ.filter(t => t.id >= RANGE.LOCAL.min    && t.id <= RANGE.LOCAL.max).length;
        const delivery = occ.filter(t => t.id >= RANGE.DELIVERY.min && t.id <= RANGE.DELIVERY.max).length;
        const retiro   = occ.filter(t => t.id >= RANGE.RETIRO.min).length;
        return { todas: local + delivery + retiro, local, delivery, retiro };
    }, [tables]);

    const stats = useMemo(() => {
        const occupied = tables.filter(t => t.status === 'OCCUPIED');
        const localOccupied = occupied.filter(t => t.id >= RANGE.LOCAL.min && t.id <= RANGE.LOCAL.max).length;
        const totalActive = occupied.reduce((s, t) => s + (Number(t.total) || 0), 0);
        const times = occupied.map(t => {
            const d = Math.floor((Date.now() - new Date(t.updated_at).getTime()) / 60000);
            return isNaN(d) ? 0 : d;
        });
        const avgTime = times.length > 0 ? Math.floor(times.reduce((a, b) => a + b, 0) / times.length) : 0;
        return { localOccupied, totalActive, avgTime };
    }, [tables]);

    const handleTableClick = (tableId: number) => {
        const table = tables.find(t => t.id === tableId);
        if (!table) return;

        if (viewMode === 'list') { setSideTableId(tableId); return; }
        if (table.status === 'OCCUPIED') { router.push(`/dashboard/tables/${tableId}`); return; }

        const type = getType(tableId);
        if (type !== 'Local') {
            setSelectedTable(table);
            setIsModalOpen(true);
        } else {
            router.push(`/dashboard/tables/${tableId}`);
        }
    };

    const handleCreateOrder = async (_customerData: unknown) => {
        if (!selectedTable) return;
        try {
            await supabase.from('salon_tables').upsert({ id: selectedTable.id, status: 'OCCUPIED', updated_at: new Date().toISOString() });
            toast.success("Pedido iniciado");
            setIsModalOpen(false);
            router.push(`/dashboard/tables/${selectedTable.id}`);
        } catch { toast.error("Error al iniciar pedido"); }
    };

    // Abrir mesa nueva por tipo
    const handleNewOrder = async (type: 'LOCAL' | 'DELIVERY' | 'RETIRO') => {
        setShowNewMenu(false);
        if (type === 'LOCAL') { setLocalPickerOpen(true); return; }

        const { min, max } = type === 'DELIVERY' ? RANGE.DELIVERY : RANGE.RETIRO;
        const usedIds = tables.filter(t => t.id >= min && t.id <= max).map(t => t.id);
        let nextId = min;
        while (usedIds.includes(nextId) && nextId <= max) nextId++;
        if (nextId > max) { toast.error('No hay más slots disponibles'); return; }

        await supabase.from('salon_tables').upsert({ id: nextId, status: 'FREE', total: 0, items: [] });
        const table = { id: nextId, status: 'FREE' };
        setSelectedTable(table);
        setIsModalOpen(true);
    };

    // Abrir mesa local por número específico
    const handleOpenLocalTable = async (tableNum: number) => {
        setLocalPickerOpen(false);
        const existing = tables.find(t => t.id === tableNum);
        if (existing?.status === 'OCCUPIED') {
            router.push(`/dashboard/tables/${tableNum}`);
            return;
        }
        await supabase.from('salon_tables').upsert({ id: tableNum, status: 'FREE', total: 0, items: [] });
        router.push(`/dashboard/tables/${tableNum}`);
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
                orderType={selectedTable?.id >= RANGE.RETIRO.min ? 'RETIRO' : 'DELIVERY'}
                tableId={selectedTable?.id || 0}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateOrder}
            />

            {/* MODAL: selector de mesa local */}
            {localPickerOpen && (
                <LocalTablePicker
                    tables={tables}
                    onSelect={handleOpenLocalTable}
                    onClose={() => setLocalPickerOpen(false)}
                />
            )}

            {/* STATS BAR */}
            <div className="flex gap-3 shrink-0 overflow-x-auto no-scrollbar pb-1">
                <StatCard icon={<Monitor size={16} className="text-red-600" />}     label="Salón abierto"   value={String(counts.local)}    sub="mesas ocupadas"    accent="border-red-200 bg-red-50" />
                <StatCard icon={<TrendingUp size={16} className="text-slate-600" />} label="Total activo"   value={`$${stats.totalActive.toLocaleString()}`} sub="en mesas abiertas" accent="border-slate-200 bg-slate-50" />
                <StatCard icon={<Clock size={16} className="text-slate-500" />}      label="Tiempo promedio" value={stats.avgTime > 0 ? `${stats.avgTime}m` : '—'} sub="por mesa" accent="border-slate-200 bg-slate-50" />
            </div>

            {/* HEADER */}
            <div className="flex flex-col gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 shrink-0">
                {/* TOP ROW: Abrir Mesa button */}
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base font-black text-slate-900 tracking-tight">Mesas</h2>
                    <div className="relative">
                        <button
                            onClick={() => setShowNewMenu(v => !v)}
                            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-black hover:bg-gray-700 active:scale-95 transition-all shadow-sm"
                        >
                            <Plus size={16} strokeWidth={3} className={`transition-transform ${showNewMenu ? 'rotate-45' : ''}`} />
                            Abrir Mesa
                        </button>
                        {showNewMenu && (
                            <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col z-30 min-w-[200px]">
                                <button onClick={() => handleNewOrder('LOCAL')} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left">
                                    <UtensilsCrossed size={18} className="text-red-500" />
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">Mesa Local</p>
                                        <p className="text-xs text-gray-400">Salón · mesas 1–41</p>
                                    </div>
                                </button>
                                <button onClick={() => handleNewOrder('DELIVERY')} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left border-t border-gray-50">
                                    <Bike size={18} className="text-green-500" />
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">Delivery</p>
                                        <p className="text-xs text-gray-400">Mesas 100–200</p>
                                    </div>
                                </button>
                                <button onClick={() => handleNewOrder('RETIRO')} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left border-t border-gray-50">
                                    <ShoppingBag size={18} className="text-amber-500" />
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">Retiro</p>
                                        <p className="text-xs text-gray-400">Mesas 201–300</p>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* BOTTOM ROW: Tabs + Search + View */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-3">
                    <div className="flex gap-1 p-1 bg-slate-50 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
                        <TabButton label="TODAS"    count={counts.todas}    active={activeTab === 'ALL'}      onClick={() => setActiveTab('ALL')}      accent="all" />
                        <TabButton icon={<Monitor size={13} />}     label="LOCAL"    count={counts.local}    active={activeTab === 'LOCAL'}    onClick={() => setActiveTab('LOCAL')}    accent="local" />
                        <TabButton icon={<Bike size={13} />}        label="DELIVERY" count={counts.delivery} active={activeTab === 'DELIVERY'} onClick={() => setActiveTab('DELIVERY')} accent="delivery" />
                        <TabButton icon={<ShoppingBag size={13} />} label="RETIRO"   count={counts.retiro}   active={activeTab === 'RETIRO'}   onClick={() => setActiveTab('RETIRO')}   accent="retiro" />
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-52">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input
                                type="text" placeholder="Buscar n° mesa..."
                                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-xl text-sm font-bold text-slate-900 border border-slate-200 focus:ring-2 focus:ring-slate-400/30 outline-none transition-all"
                            />
                        </div>
                        <div className="flex gap-0.5 p-1 bg-slate-100 rounded-xl shrink-0">
                            <ViewBtn icon={<LayoutGrid size={15} />} active={viewMode === 'grid'} onClick={() => setViewMode('grid')} label="Grid" />
                            <ViewBtn icon={<Map size={15} />}         active={viewMode === 'map'}  onClick={() => setViewMode('map')}  label="Mapa" />
                            <ViewBtn icon={<List size={15} />}        active={viewMode === 'list'} onClick={() => { setViewMode('list'); setSideTableId(null); }} label="Lista" />
                        </div>
                    </div>
                </div>
            </div>

            {/* EMPTY STATE */}
            {filteredTables.length === 0 && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <UtensilsCrossed size={28} className="text-slate-300" />
                    </div>
                    <p className="font-black text-slate-400 text-sm uppercase tracking-wider">Sin mesas abiertas</p>
                    <p className="text-xs text-slate-300">Usá el botón + para abrir una mesa</p>
                </div>
            )}

            {/* VIEWS */}
            {filteredTables.length > 0 && viewMode === 'grid' && <GridView tables={filteredTables} onTableClick={handleTableClick} />}
            {filteredTables.length > 0 && viewMode === 'map'  && <MapView tables={filteredTables} onTableClick={handleTableClick} />}
            {filteredTables.length > 0 && viewMode === 'list' && (
                <ListView tables={filteredTables} sideTableId={sideTableId} onTableClick={handleTableClick} onCloseSide={() => setSideTableId(null)} />
            )}

            {/* backdrop to close new menu on outside click */}
            {showNewMenu && <div className="fixed inset-0 z-20" onClick={() => setShowNewMenu(false)} />}
        </div>
    );
}

// ─── LOCAL TABLE PICKER ───────────────────────────────────────────
function LocalTablePicker({ tables, onSelect, onClose }: {
    tables: any[];
    onSelect: (n: number) => void;
    onClose: () => void;
}) {
    const nums = Array.from({ length: 41 }, (_, i) => i + 1);
    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-lg font-black text-gray-900">Abrir Mesa</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Elegí el número de mesa del salón</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                    {nums.map(n => {
                        const table = tables.find(t => t.id === n);
                        const isOpen = table?.status === 'OCCUPIED';
                        return (
                            <button
                                key={n}
                                onClick={() => onSelect(n)}
                                className={`aspect-square rounded-xl flex flex-col items-center justify-center font-black text-sm transition-all active:scale-95 hover:scale-105 ${
                                    isOpen
                                        ? 'bg-red-500 text-white shadow-md shadow-red-500/30'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                {n}
                                {isOpen && <span className="text-[8px] font-bold text-red-200 leading-none">abierta</span>}
                            </button>
                        );
                    })}
                </div>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {tables.map(table => <TableCard key={table.id} table={table} onClick={onTableClick} />)}
            </div>
        </div>
    );
}

// ─── MAP VIEW ─────────────────────────────────────────────────────
function MapView({ tables, onTableClick }: { tables: any[]; onTableClick: (id: number) => void }) {
    const getTable = (id: number) => tables.find(t => t.id === id);

    const zones = [
        { label: "Salón A",  color: "border-red-200 bg-red-50/50",   header: "bg-red-100 text-red-800",   tables: [1,2,3,4,5,6,7,8,9,10] },
        { label: "Salón B",  color: "border-red-200 bg-red-50/50",   header: "bg-red-100 text-red-800",   tables: [11,12,13,14,15,16,17,18,19,20] },
        { label: "Terraza",  color: "border-red-200 bg-red-50/50",   header: "bg-red-100 text-red-800",   tables: [21,22,23,24,25,26,27,28,29,30] },
    ];

    const deliveryTables = tables.filter(t => t.id >= RANGE.DELIVERY.min && t.id <= RANGE.DELIVERY.max);
    const retiroTables   = tables.filter(t => t.id >= RANGE.RETIRO.min);

    return (
        <div className="flex-1 overflow-y-auto pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
                {zones.map(zone => {
                    const zoneTables = zone.tables.map(id => getTable(id)).filter(Boolean);
                    if (zoneTables.length === 0) return null;
                    return (
                        <div key={zone.label} className={`rounded-2xl border overflow-hidden ${zone.color}`}>
                            <div className={`px-4 py-2.5 ${zone.header}`}>
                                <h3 className="text-xs font-black uppercase tracking-widest">{zone.label}</h3>
                            </div>
                            <div className="p-3 flex flex-wrap gap-2">
                                {zoneTables.map((table: any) => <MiniTableCard key={table.id} table={table} onClick={onTableClick} />)}
                            </div>
                        </div>
                    );
                })}
            </div>
            {deliveryTables.length > 0 && (
                <div className="rounded-2xl border border-green-200 bg-green-50/60 overflow-hidden mb-4">
                    <div className="px-4 py-2.5 bg-green-100 text-green-900"><h3 className="text-xs font-black uppercase tracking-widest">Delivery (100–200)</h3></div>
                    <div className="p-3 flex flex-wrap gap-2">{deliveryTables.map(t => <MiniTableCard key={t.id} table={t} onClick={onTableClick} />)}</div>
                </div>
            )}
            {retiroTables.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 overflow-hidden">
                    <div className="px-4 py-2.5 bg-amber-100 text-amber-900"><h3 className="text-xs font-black uppercase tracking-widest">Retiro (201+)</h3></div>
                    <div className="p-3 flex flex-wrap gap-2">{retiroTables.map(t => <MiniTableCard key={t.id} table={t} onClick={onTableClick} />)}</div>
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
        <button onClick={() => onClick(table.id)} className={`h-14 w-full rounded-xl flex flex-col items-center justify-center gap-0 transition-all active:scale-95 hover:scale-105 ${isFree ? 'bg-white border-2 border-slate-200 hover:border-slate-400 shadow-sm' : `${occupiedCardGradient(table.id)} shadow-md hover:shadow-lg`}`}>
            <span className={`text-lg font-black leading-none ${isFree ? 'text-slate-700' : 'text-white'}`}>{table.id}</span>
            {!isFree && <>
                <span className="text-[9px] font-black text-white/80">{getTime()}</span>
                <span className="text-[9px] font-black text-white">${(table.total || 0).toLocaleString()}</span>
            </>}
        </button>
    );
}

// ─── LIST VIEW ────────────────────────────────────────────────────
function ListView({ tables, sideTableId, onTableClick, onCloseSide }: { tables: any[]; sideTableId: number | null; onTableClick: (id: number) => void; onCloseSide: () => void }) {
    const getTime = (t: any) => {
        const diff = Math.floor((Date.now() - new Date(t.updated_at).getTime()) / 60000);
        if (isNaN(diff)) return '';
        return diff < 60 ? `${diff}m` : `${Math.floor(diff / 60)}h ${diff % 60}m`;
    };
    return (
        <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
            <div className={`${sideTableId ? 'w-72 shrink-0' : 'flex-1 max-w-sm'} flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden`}>
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{tables.length} mesas abiertas</p>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
                    {tables.map(table => {
                        const isSelected = sideTableId === table.id;
                        return (
                            <button key={table.id} onClick={() => onTableClick(table.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:bg-slate-50 ${isSelected ? listRowSelectedClass(table.id) : ''}`}>
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${occupiedCardGradient(table.id)} text-white`}>{table.id}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-sm text-slate-900 truncate">Mesa {table.id} <span className="text-slate-400 font-medium text-xs">· {getType(table.id)}</span></p>
                                    <p className={`text-xs font-bold ${listSubPriceClass(table.id)}`}>${(table.total || 0).toLocaleString()} · {getTime(table)}</p>
                                </div>
                                <div className={`w-2 h-2 rounded-full shrink-0 ${listPulseDotClass(table.id)} animate-pulse`} />
                            </button>
                        );
                    })}
                </div>
            </div>
            {sideTableId ? (
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <OrderSheet tableId={sideTableId} onClose={onCloseSide} onOrderComplete={onCloseSide} />
                </div>
            ) : (
                <div className="flex-1 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                        <ChevronRight size={28} className="text-slate-300" />
                    </div>
                    <p className="font-black text-slate-400 text-sm uppercase tracking-wider">Seleccioná una mesa</p>
                </div>
            )}
        </div>
    );
}

// ─── TAB BUTTON ───────────────────────────────────────────────────
function TabButton({ icon, label, count, active, onClick, accent = "all" }: any) {
    const activeStyle = accent === "local" ? "bg-red-600 text-white shadow-md shadow-red-500/30 scale-105" : accent === "delivery" ? "bg-green-600 text-white shadow-md shadow-green-500/30 scale-105" : accent === "retiro" ? "bg-amber-500 text-white shadow-md shadow-amber-500/30 scale-105" : "bg-slate-800 text-white shadow-md scale-105";
    return (
        <button onClick={onClick} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 shrink-0 ${active ? activeStyle : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}>
            {icon}<span>{label}</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold min-w-[18px] text-center ${active ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'}`}>{count}</span>
        </button>
    );
}

function ViewBtn({ icon, active, onClick, label }: any) {
    return (
        <button onClick={onClick} title={label} className={`p-2 rounded-lg transition-all ${active ? "bg-white shadow-sm text-slate-800 font-black" : "text-slate-400 hover:text-slate-700"}`}>{icon}</button>
    );
}

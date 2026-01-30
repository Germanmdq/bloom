"use client";

import { useState, useEffect } from "react";
import { useStock, useInventoryMovements, useCreateMovement, useProducts } from "@/lib/hooks/use-pos-data";
import { Loader2, Plus, ArrowDown, ArrowUp, AlertTriangle, History, Package, Search } from "lucide-react";
import { motion } from "framer-motion";

export default function StockPage() {
    const { data: stock = [], isLoading: stockLoading } = useStock();
    const { data: movements = [], isLoading: movLoading } = useInventoryMovements();
    const { data: rawProducts = [] } = useProducts(); // We need to filter for raw only locally or use another hook if products list is huge
    const createMovement = useCreateMovement();

    // Filter raw products for the dropdown (assuming useProducts returns all active)
    const rawOptions = rawProducts.filter((p: any) => p.kind === 'raw');

    const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [selectedProduct, setSelectedProduct] = useState("");
    const [qty, setQty] = useState("");
    const [type, setType] = useState<'purchase' | 'waste' | 'adjustment'>('purchase');
    const [note, setNote] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Main View Search
    const [viewSearch, setViewSearch] = useState("");

    // F1 Shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F1') {
                e.preventDefault();
                document.getElementById('stock-search')?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const filteredStock = stock.filter((item: any) =>
        item.name.toLowerCase().includes(viewSearch.toLowerCase())
    );

    const filteredOptions = rawOptions.filter((p: any) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct || !qty) return;

        const quantity = parseFloat(qty);
        const finalQty = type === 'purchase' ? quantity : -quantity; // Waste/Adjustment usually negative (out)

        // If adjustment is positive (found extra stock), allow it. 
        // But simplified logic: Purchase (+), Waste (-), Adjustment (+/- user decides? Let's assume adjustment overwrites... NO, ledger means delta.)
        // Let's keep it simple: Purchase (+), Waste (-), Adjustment (can be +/- but usually correction, let's treat as delta).
        // UI should probably allow sign for adjustment. For now let's assume waste is negative, purchase is positive.
        // If type is adjustment, let user enter signed value? Or simplify:

        let finalDelta = quantity;
        if (type === 'waste') finalDelta = -Math.abs(quantity);
        if (type === 'purchase') finalDelta = Math.abs(quantity);
        // Adjustment: Let's assume manual correction implies adding/removing. 
        // If user selects 'Adjustment', maybe show a toggle for Add/Remove?
        // For simplicity v1: Purchase (+), Waste (-), Adjustment (+).
        if (type === 'adjustment') finalDelta = parseFloat(qty); // User types -5 or 5

        try {
            await createMovement.mutateAsync({
                raw_product_id: selectedProduct,
                qty: finalDelta,
                reason: type,
                ref_table: 'manual',
                note: note || 'Manual movement'
            });
            setShowModal(false);
            setQty("");
            setNote("");
            setSearchTerm("");
            setSelectedProduct("");
            alert("Movimiento registrado ✅");
        } catch (error: any) {
            alert("Error: " + error.message);
        }
    };



    if (stockLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Control de Stock</h1>
                    <p className="text-gray-500 font-medium">Gestiona tu inventario y revisa movimientos.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => {
                            setType('purchase');
                            setShowModal(true);
                            setSearchTerm("");
                            setSelectedProduct("");
                        }}
                        className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg"
                    >
                        <Plus size={20} /> Registrar Compra
                    </button>
                    <button
                        onClick={() => {
                            setType('waste');
                            setShowModal(true);
                            setSearchTerm("");
                            setSelectedProduct("");
                        }}
                        className="bg-red-100 text-red-600 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                    >
                        <ArrowDown size={20} /> Registrar Merma
                    </button>
                </div>
            </header>

            <div className="flex items-center justify-between mb-8 border-b border-gray-200 pb-2 gap-4">
                <div className="flex gap-8 translate-y-[1px]">
                    <button
                        onClick={() => setActiveTab('stock')}
                        className={`pb-4 px-2 font-bold text-lg transition-all border-b-4 ${activeTab === 'stock' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        Stock Actual
                    </button>
                    <button
                        onClick={() => setActiveTab('movements')}
                        className={`pb-4 px-2 font-bold text-lg transition-all border-b-4 ${activeTab === 'movements' ? 'border-black text-black' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        Movimientos Recientes
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-2 w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input
                        id="stock-search"
                        type="text"
                        value={viewSearch}
                        onChange={(e) => setViewSearch(e.target.value)}
                        placeholder="Buscar en stock (F1)..."
                        className="w-full h-10 pl-10 pr-4 rounded-xl bg-gray-50 hover:bg-white border-transparent focus:bg-white focus:ring-2 ring-black/5 font-bold outline-none text-sm transition-all"
                        autoComplete="off"
                    />
                </div>
            </div>

            {activeTab === 'stock' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredStock.map((item: any) => {
                        const isLow = item.current_stock <= item.min_stock;
                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`p-6 rounded-[2rem] border-2 ${isLow ? 'border-red-100 bg-red-50/50' : 'border-transparent bg-white'} shadow-sm hover:shadow-xl transition-all`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                                        <Package size={24} />
                                    </div>
                                    {isLow && (
                                        <div className="px-3 py-1 rounded-full bg-red-100 text-red-600 text-xs font-black uppercase flex items-center gap-1">
                                            <AlertTriangle size={12} /> Bajo Stock
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-xl font-black text-gray-900 mb-1">{item.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-4xl font-black ${isLow ? 'text-red-500' : 'text-gray-900'}`}>
                                        {/* @ts-ignore */}
                                        {(['g', 'grams', 'gr', 'gramos'].includes(item.unit?.toLowerCase())
                                            ? Number(item.current_stock / 1000).toLocaleString()
                                            : Number(item.current_stock).toLocaleString())}
                                    </span>
                                    <span className="text-sm font-bold text-gray-400 uppercase">
                                        {/* @ts-ignore */}
                                        {['g', 'grams', 'gr', 'gramos'].includes(item.unit?.toLowerCase()) ? 'kg' : item.unit}
                                    </span>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs font-bold text-gray-400">
                                    <span>
                                        Mínimo: {['g', 'grams', 'gr', 'gramos'].includes(item.unit?.toLowerCase())
                                            ? `${item.min_stock / 1000} kg`
                                            : `${item.min_stock} ${item.unit}`}
                                    </span>
                                    <span>ID: {item.id.slice(0, 4)}...</span>
                                </div>
                            </motion.div>
                        );
                    })}
                    {stock.length === 0 && (
                        <div className="col-span-full py-20 text-center text-gray-400">
                            No hay materias primas registradas.
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'movements' && (
                <div className="bg-white rounded-[2rem] shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                                <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Producto</th>
                                <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Cantidad</th>
                                <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Motivo</th>
                                <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Notas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {movements.map((mov: any) => (
                                <tr key={mov.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-6 text-sm font-bold text-gray-500">
                                        {new Date(mov.created_at).toLocaleString()}
                                    </td>
                                    <td className="p-6 text-sm font-bold text-gray-900">
                                        {mov.products?.name}
                                    </td>
                                    <td className={`p-6 text-sm font-black text-right ${mov.qty > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {mov.qty > 0 ? '+' : ''}{mov.qty} {mov.products?.unit}
                                    </td>
                                    <td className="p-6">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide
                                            ${mov.reason === 'sale' ? 'bg-blue-50 text-blue-600' :
                                                mov.reason === 'purchase' ? 'bg-green-50 text-green-600' :
                                                    mov.reason === 'waste' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {mov.reason}
                                        </span>
                                    </td>
                                    <td className="p-6 text-sm text-gray-400 max-w-xs truncate">
                                        {mov.note || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {movements.length === 0 && (
                        <div className="p-20 text-center text-gray-400">Sin movimientos recientes.</div>
                    )}
                </div>
            )}

            {/* MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative bg-white w-full max-w-md rounded-[2rem] p-8 shadow-2xl"
                    >
                        <h2 className="text-2xl font-black mb-1 capitalize">Registrar {type === 'purchase' ? 'Compra' : type === 'waste' ? 'Merma' : 'Ajuste'}</h2>
                        <p className="text-sm text-gray-400 mb-6 font-bold">Ingresa los detalles del movimiento.</p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 mb-2">Producto</label>
                                <div className="relative">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Buscar producto..."
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                setIsSearchOpen(true);
                                                if (!e.target.value) setSelectedProduct("");
                                            }}
                                            onFocus={() => setIsSearchOpen(true)}
                                            className="w-full h-12 pl-12 pr-4 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none"
                                        />
                                    </div>

                                    {isSearchOpen && searchTerm && (
                                        <div className="absolute z-10 w-full mt-2 bg-white rounded-xl shadow-xl max-h-60 overflow-y-auto border border-gray-100">
                                            {filteredOptions.length > 0 ? (
                                                filteredOptions.map((p: any) => (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => {
                                                            setSelectedProduct(p.id);
                                                            setSearchTerm(p.name);
                                                            setIsSearchOpen(false);
                                                        }}
                                                        className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                                                    >
                                                        <span className="font-bold text-gray-900">{p.name}</span>
                                                        <span className="text-xs text-gray-400 font-bold uppercase">{p.unit}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center text-gray-400 text-sm font-bold">
                                                    No encontrado
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 mb-2">Cantidad ({type === 'waste' ? 'a descontar' : 'a agregar'})</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={qty}
                                    onChange={(e) => setQty(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none"
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 mb-2">Nota (Opcional)</label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none"
                                    placeholder="Detalles..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!selectedProduct || !qty}
                                className="w-full h-14 bg-black text-white rounded-2xl font-black text-lg hover:scale-[1.02] transition-transform mt-4 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                            >
                                Guardar Movimiento
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

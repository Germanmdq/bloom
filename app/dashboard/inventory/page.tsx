"use client";

import { useState, useEffect } from "react";
import { 
    useStock, 
    useInventoryMovements, 
    useCreateMovement, 
    useProducts, 
    useExpenses, 
    useCreateExpense, 
    useSuppliers,
    useCreateSupplier,
    useUpdateSupplier
} from "@/lib/hooks/use-pos-data";
import { 
    Loader2, Plus, ArrowDown, AlertTriangle, Package, Search, 
    Receipt, Users, TrendingDown, Lightbulb, Flame, Home, 
    Wrench, FileText, ShoppingCart, Megaphone, ShieldAlert, 
    MoreHorizontal, Edit2, Phone, Mail, Tag, Check, X, History
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Tab = 'stock' | 'movements' | 'expenses' | 'suppliers';

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState<Tab>('stock');
    
    // Data Hooks
    const { data: stock = [], isLoading: stockLoading } = useStock();
    const { data: movements = [] } = useInventoryMovements();
    const { data: rawProducts = [] } = useProducts();
    const { data: expenses = [], isLoading: expensesLoading } = useExpenses();
    const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
    
    // Mutation Hooks
    const createMovement = useCreateMovement();
    const createExpense = useCreateExpense();
    const createSupplier = useCreateSupplier();
    const updateSupplier = useUpdateSupplier();

    const rawOptions = rawProducts.filter((p: any) => p.kind === 'raw');

    // UI States
    const [showStockModal, setShowStockModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any>(null);

    // Search States
    const [stockSearch, setStockSearch] = useState("");
    const [expenseSearch, setExpenseSearch] = useState("");
    const [supplierSearch, setSupplierSearch] = useState("");

    // Form States - Stock
    const [stockForm, setStockForm] = useState({
        productId: "",
        qty: "",
        type: 'purchase' as 'purchase' | 'waste' | 'adjustment',
        note: "",
        supplierId: ""
    });
    const [stockProductSearch, setStockProductSearch] = useState("");
    const [isStockProductSearchOpen, setIsStockProductSearchOpen] = useState(false);

    // Form States - Expenses
    const [expenseForm, setExpenseForm] = useState({
        description: "",
        amount: "",
        category: "Mercadería",
        supplierId: ""
    });

    // Form States - Suppliers
    const [supplierForm, setSupplierForm] = useState({
        name: "",
        contact_name: "",
        phone: "",
        email: "",
        category: "Mercadería"
    });

    // F1 Shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F1') {
                e.preventDefault();
                const searchId = activeTab === 'stock' ? 'stock-search' : 
                               activeTab === 'expenses' ? 'expense-search' : 
                               activeTab === 'suppliers' ? 'supplier-search' : null;
                if (searchId) document.getElementById(searchId)?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTab]);

    // Filters
    const filteredStock = stock.filter((item: any) =>
        item.name.toLowerCase().includes(stockSearch.toLowerCase())
    );

    const filteredExpenses = expenses.filter((exp: any) =>
        exp.description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        exp.category.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        exp.suppliers?.name?.toLowerCase().includes(expenseSearch.toLowerCase())
    );

    const filteredSuppliers = suppliers.filter((s: any) =>
        s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        s.category?.toLowerCase().includes(supplierSearch.toLowerCase())
    );

    // Handlers
    const handleStockSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stockForm.productId || !stockForm.qty) return;

        let finalDelta = parseFloat(stockForm.qty);
        if (stockForm.type === 'waste') finalDelta = -Math.abs(finalDelta);
        if (stockForm.type === 'purchase') finalDelta = Math.abs(finalDelta);

        try {
            await createMovement.mutateAsync({
                raw_product_id: stockForm.productId,
                qty: finalDelta,
                reason: stockForm.type,
                ref_table: 'manual',
                note: stockForm.note || 'Movimiento manual',
                supplier_id: stockForm.supplierId || null
            });
            setShowStockModal(false);
            setStockForm({ productId: "", qty: "", type: 'purchase', note: "", supplierId: "" });
            setStockProductSearch("");
            alert("Movimiento registrado ✅");
        } catch (err: any) {
            alert("Error: " + err.message);
        }
    };

    const handleExpenseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createExpense.mutateAsync({
                description: expenseForm.description,
                amount: parseFloat(expenseForm.amount),
                category: expenseForm.category,
                supplier_id: expenseForm.supplierId || null
            });
            setShowExpenseModal(false);
            setExpenseForm({ description: "", amount: "", category: "Mercadería", supplierId: "" });
            alert("Gasto registrado ✅");
        } catch (err: any) {
            alert("Error: " + err.message);
        }
    };

    const handleSupplierSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingSupplier) {
                await updateSupplier.mutateAsync({ id: editingSupplier.id, ...supplierForm });
                alert("Proveedor actualizado ✅");
            } else {
                await createSupplier.mutateAsync(supplierForm);
                alert("Proveedor creado ✅");
            }
            setShowSupplierModal(false);
            setEditingSupplier(null);
            setSupplierForm({ name: "", contact_name: "", phone: "", email: "", category: "Mercadería" });
        } catch (err: any) {
            alert("Error: " + err.message);
        }
    };

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const getExpenseIcon = (cat: string) => {
        switch (cat) {
            case 'Luz': return <Lightbulb size={24} />;
            case 'Gas': return <Flame size={24} />;
            case 'Alquiler': return <Home size={24} />;
            case 'Sueldos': return <Users size={24} className="text-blue-500" />;
            case 'Reparaciones': return <Wrench size={24} className="text-orange-500" />;
            case 'Impuestos': return <FileText size={24} className="text-purple-500" />;
            case 'Mercadería': return <ShoppingCart size={24} className="text-emerald-500" />;
            case 'Publicidad': return <Megaphone size={24} className="text-pink-500" />;
            case 'Seguros': return <ShieldAlert size={24} className="text-indigo-500" />;
            default: return <MoreHorizontal size={24} />;
        }
    };

    if (stockLoading || expensesLoading || suppliersLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-gray-200" size={64} />
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto pb-40">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-1 uppercase">Operaciones</h1>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.3em]">Gestión Integral Bloom</p>
                </div>
                
                <div className="flex bg-gray-50 p-1.5 rounded-[2rem] border border-gray-100 shadow-inner">
                    {(['stock', 'movements', 'expenses', 'suppliers'] as Tab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all ${
                                activeTab === tab 
                                ? 'bg-white text-black shadow-md border border-gray-100' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            {tab === 'stock' ? 'Insumos' : tab === 'movements' ? 'Historial' : tab === 'expenses' ? 'Gastos' : 'Proveedores'}
                        </button>
                    ))}
                </div>
            </header>

            {/* CONTENT AREA */}
            <AnimatePresence mode="wait">
                {activeTab === 'stock' && (
                    <motion.div
                        key="stock"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                                <input
                                    id="stock-search"
                                    type="text"
                                    value={stockSearch}
                                    onChange={(e) => setStockSearch(e.target.value)}
                                    placeholder="Buscar insumo (F1)..."
                                    className="w-full h-14 pl-12 pr-6 rounded-2xl bg-white border-transparent focus:ring-2 ring-black/5 shadow-sm outline-none font-bold"
                                />
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => { setStockForm({...stockForm, type: 'purchase'}); setShowStockModal(true); }}
                                    className="h-14 px-8 bg-black text-white rounded-2xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg"
                                >
                                    <Plus size={20} /> Registrar Compra
                                </button>
                                <button
                                    onClick={() => { setStockForm({...stockForm, type: 'waste'}); setShowStockModal(true); }}
                                    className="h-14 px-8 bg-red-50 text-red-600 rounded-2xl font-bold flex items-center gap-2 hover:bg-red-100 transition-all"
                                >
                                    <ArrowDown size={20} /> Merma
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredStock.map((item: any) => {
                                const isLow = item.current_stock <= item.min_stock;
                                return (
                                    <div
                                        key={item.id}
                                        className={`p-8 rounded-[2.5rem] border-2 ${isLow ? 'border-red-100 bg-red-50/50' : 'border-transparent bg-white'} shadow-sm hover:shadow-xl transition-all group`}
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:scale-110 transition-transform">
                                                <Package size={28} />
                                            </div>
                                            {isLow && (
                                                <div className="px-3 py-1 rounded-full bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 animate-pulse">
                                                    <AlertTriangle size={12} /> Bajo Stock
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 mb-2">{item.name}</h3>
                                        <div className="flex items-baseline gap-1">
                                            <span className={`text-5xl font-black ${isLow ? 'text-red-500' : 'text-gray-900'}`}>
                                                {(['g', 'grams', 'gr', 'gramos'].includes(String(item.unit ?? '').toLowerCase())
                                                    ? Number(item.current_stock / 1000).toLocaleString()
                                                    : Number(item.current_stock).toLocaleString())}
                                            </span>
                                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                                {['g', 'grams', 'gr', 'gramos'].includes(String(item.unit ?? '').toLowerCase()) ? 'kg' : item.unit}
                                            </span>
                                        </div>
                                        <div className="mt-6 pt-6 border-t border-gray-100 flex justify-between text-xs font-bold text-gray-400 font-mono">
                                            <span>MIN: {item.min_stock}</span>
                                            <span className="opacity-50">{item.id.slice(0, 8)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'movements' && (
                    <motion.div
                        key="movements"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                         <div className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-gray-100">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Fecha / Hora</th>
                                        <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Insumo</th>
                                        <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Cantidad</th>
                                        <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Motivo</th>
                                        <th className="p-8 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Proveedor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 font-bold">
                                    {movements.map((mov: any) => (
                                        <tr key={mov.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-8 text-sm text-gray-400">
                                                {new Date(mov.created_at).toLocaleString('es-AR')}
                                            </td>
                                            <td className="p-8 text-sm text-gray-900">
                                                {mov.products?.name}
                                            </td>
                                            <td className={`p-8 text-lg font-black text-right ${mov.qty > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {mov.qty > 0 ? '+' : ''}{mov.qty} {mov.products?.unit}
                                            </td>
                                            <td className="p-8">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                                                    ${mov.reason === 'sale' ? 'bg-blue-50 text-blue-600' :
                                                        mov.reason === 'purchase' ? 'bg-green-50 text-green-600' :
                                                            mov.reason === 'waste' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                                    {mov.reason}
                                                </span>
                                            </td>
                                            <td className="p-8 text-sm text-gray-400 max-w-xs truncate">
                                                {mov.suppliers?.name || 'Manual'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {movements.length === 0 && (
                                <div className="p-24 text-center">
                                    <History size={48} className="mx-auto text-gray-200 mb-4" />
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Sin movimientos registrados</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'expenses' && (
                    <motion.div
                        key="expenses"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-8">
                                <div className="bg-white px-8 py-5 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4">
                                    <TrendingDown className="text-red-500" size={24} />
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Gastos</p>
                                        <p className="text-2xl font-black text-gray-900">${totalExpenses.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="relative w-64">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <input
                                        id="expense-search"
                                        type="text"
                                        value={expenseSearch}
                                        onChange={(e) => setExpenseSearch(e.target.value)}
                                        placeholder="Filtrar gastos (F1)..."
                                        className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white border-transparent shadow-sm outline-none font-bold text-sm"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => setShowExpenseModal(true)}
                                className="h-14 px-10 bg-red-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-red-500/20"
                            >
                                <Plus size={20} /> Registrar Gasto
                            </button>
                        </div>

                        <div className="space-y-4">
                            {filteredExpenses.map((expense: any) => (
                                <div
                                    key={expense.id}
                                    className="bg-white p-6 rounded-[2rem] border border-transparent hover:border-gray-100 hover:shadow-xl transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-gray-50 flex items-center justify-center text-gray-400 group-hover:scale-105 transition-transform">
                                            {getExpenseIcon(expense.category)}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-gray-900">{expense.description}</h4>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(expense.expense_date).toLocaleDateString()}</span>
                                                {expense.suppliers?.name && (
                                                    <>
                                                        <span className="w-1 h-1 rounded-full bg-gray-200" />
                                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">💼 {expense.suppliers.name}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-red-600">-${expense.amount.toLocaleString()}</p>
                                        <span className="text-[10px] font-black text-gray-400 border border-gray-100 px-3 py-1 rounded-full uppercase tracking-tighter mt-2 inline-block font-mono">
                                            {expense.category}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'suppliers' && (
                    <motion.div
                        key="suppliers"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                         <div className="flex items-center justify-between mb-8">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                                <input
                                    id="supplier-search"
                                    type="text"
                                    value={supplierSearch}
                                    onChange={(e) => setSupplierSearch(e.target.value)}
                                    placeholder="Buscar proveedores (F1)..."
                                    className="w-full h-14 pl-12 pr-6 rounded-2xl bg-white border-transparent focus:ring-2 ring-black/5 shadow-sm outline-none font-bold"
                                />
                            </div>
                            <button
                                onClick={() => { setEditingSupplier(null); setSupplierForm({ name: "", contact_name: "", phone: "", email: "", category: "Mercadería" }); setShowSupplierModal(true); }}
                                className="h-14 px-10 bg-emerald-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/20"
                            >
                                <Plus size={20} /> Nuevo Proveedor
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredSuppliers.map((supplier: any) => (
                                <div
                                    key={supplier.id}
                                    className="bg-white p-8 rounded-[2.5rem] border border-transparent hover:border-gray-100 shadow-sm hover:shadow-xl transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Users size={28} />
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingSupplier(supplier);
                                                setSupplierForm({
                                                    name: supplier.name,
                                                    contact_name: supplier.contact_name || "",
                                                    phone: supplier.phone || "",
                                                    email: supplier.email || "",
                                                    category: supplier.category || "Mercadería"
                                                });
                                                setShowSupplierModal(true);
                                            }}
                                            className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-black transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 mb-1">{supplier.name}</h3>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-6 font-mono">{supplier.category}</p>
                                    
                                    <div className="space-y-3">
                                        {supplier.contact_name && (
                                            <div className="flex items-center gap-3 text-sm text-gray-500 font-bold">
                                                <Users size={14} className="opacity-40" />
                                                {supplier.contact_name}
                                            </div>
                                        )}
                                        {supplier.phone && (
                                            <div className="flex items-center gap-3 text-sm text-gray-500 font-bold">
                                                <Phone size={14} className="opacity-40" />
                                                {supplier.phone}
                                            </div>
                                        )}
                                        {supplier.email && (
                                            <div className="flex items-center gap-3 text-sm text-gray-500 font-bold">
                                                <Mail size={14} className="opacity-40" />
                                                {supplier.email}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MODALS */}
            
            {/* STOCK MODAL */}
            <AnimatePresence>
                {showStockModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowStockModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white/95 backdrop-blur-3xl p-10 rounded-[3rem] shadow-2xl w-full max-w-xl border border-white/50 overflow-visible">
                            <h2 className="text-3xl font-black mb-1 capitalize">Registro de {stockForm.type === 'purchase' ? 'Compra' : 'Merma'}</h2>
                            <p className="text-sm font-bold text-gray-400 mb-8 uppercase tracking-widest font-mono">Gestión de Insumos</p>
                            
                            <form onSubmit={handleStockSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="relative">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Insumo</label>
                                        <div className="relative">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                placeholder="Buscar..."
                                                value={stockProductSearch}
                                                onChange={(e) => {
                                                    setStockProductSearch(e.target.value);
                                                    setIsStockProductSearchOpen(true);
                                                    if (!e.target.value) setStockForm({...stockForm, productId: ""});
                                                }}
                                                onFocus={() => setIsStockProductSearchOpen(true)}
                                                className="w-full h-14 pl-12 pr-4 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none"
                                            />
                                            {isStockProductSearchOpen && stockProductSearch && (
                                                <div className="absolute z-[110] w-full mt-2 bg-white rounded-2xl shadow-2xl max-h-48 overflow-y-auto border border-gray-100 p-2">
                                                    {rawOptions.filter((p: any) => p.name.toLowerCase().includes(stockProductSearch.toLowerCase())).map((p: any) => (
                                                        <div
                                                            key={p.id}
                                                            onClick={() => {
                                                                setStockForm({...stockForm, productId: p.id});
                                                                setStockProductSearch(p.name);
                                                                setIsStockProductSearchOpen(false);
                                                            }}
                                                            className="p-4 hover:bg-gray-50 rounded-xl cursor-pointer flex justify-between items-center transition-colors"
                                                        >
                                                            <span className="font-bold text-gray-900">{p.name}</span>
                                                            <span className="text-[10px] text-gray-400 font-black uppercase font-mono">{p.unit}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Proveedor (Opcional)</label>
                                        <select
                                            value={stockForm.supplierId}
                                            onChange={(e) => setStockForm({...stockForm, supplierId: e.target.value})}
                                            className="w-full h-14 px-5 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="">Sin Proveedor</option>
                                            {suppliers.map((s: any) => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Cantidad</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={stockForm.qty}
                                            onChange={(e) => setStockForm({...stockForm, qty: e.target.value})}
                                            className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none"
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Nota</label>
                                        <input
                                            type="text"
                                            value={stockForm.note}
                                            onChange={(e) => setStockForm({...stockForm, note: e.target.value})}
                                            className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none"
                                            placeholder="Detalles..."
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <button type="button" onClick={() => setShowStockModal(false)} className="flex-1 h-14 rounded-2xl font-black text-gray-400 bg-gray-100 hover:bg-gray-200 transition-all uppercase text-[10px] tracking-widest">
                                        Cerrar
                                    </button>
                                    <button 
                                        type="submit" 
                                        className={`flex-[2] h-14 rounded-2xl font-black text-white transition-all shadow-xl shadow-black/10 hover:scale-105 active:scale-95 ${stockForm.type === 'waste' ? 'bg-red-600' : 'bg-black'}`}
                                    >
                                        {stockForm.type === 'purchase' ? 'Confirmar Compra' : 'Confirmar Merma'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* EXPENSE MODAL */}
            <AnimatePresence>
                {showExpenseModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowExpenseModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white/95 backdrop-blur-3xl p-10 rounded-[3rem] shadow-2xl w-full max-w-xl border border-white/50">
                            <h2 className="text-3xl font-black mb-1 capitalize">Registrar Gasto</h2>
                            <p className="text-sm font-bold text-gray-400 mb-8 uppercase tracking-widest font-mono">Salida de Caja</p>
                            
                            <form onSubmit={handleExpenseSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Descripción del Gasto</label>
                                    <input
                                        type="text"
                                        required
                                        value={expenseForm.description}
                                        onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                        className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none"
                                        placeholder="Ej: Pago de servicios, Mercadería semanal..."
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Monto ($ Total)</label>
                                        <input
                                            type="number"
                                            required
                                            value={expenseForm.amount}
                                            onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                            className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Categoría</label>
                                        <select
                                            value={expenseForm.category}
                                            onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                                            className="w-full h-14 px-5 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="Mercadería">Mercadería</option>
                                            <option value="Sueldos">Sueldos / Personal</option>
                                            <option value="Servicios">Servicios (Luz, Agua, Gas)</option>
                                            <option value="Alquiler">Alquiler</option>
                                            <option value="Reparaciones">Reparaciones</option>
                                            <option value="Impuestos">Impuestos</option>
                                            <option value="Publicidad">Publicidad</option>
                                            <option value="Seguros">Seguros</option>
                                            <option value="Otros">Otros</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Proveedor Asociado</label>
                                    <select
                                        value={expenseForm.supplierId}
                                        onChange={(e) => setExpenseForm({...expenseForm, supplierId: e.target.value})}
                                        className="w-full h-14 px-5 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">Proveedor Ocasional / Otros</option>
                                        {suppliers.map((s: any) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <button type="button" onClick={() => setShowExpenseModal(false)} className="flex-1 h-14 rounded-2xl font-black text-gray-400 bg-gray-100 hover:bg-gray-200 transition-all uppercase text-[10px] tracking-widest">
                                        Cerrar
                                    </button>
                                    <button type="submit" className="flex-[2] h-14 rounded-2xl font-black text-white bg-red-600 transition-all shadow-xl shadow-red-500/20 hover:scale-105 active:scale-95">
                                        Confirmar Gasto
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* SUPPLIER MODAL */}
            <AnimatePresence>
                {showSupplierModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSupplierModal(false)} />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white/95 backdrop-blur-3xl p-10 rounded-[3rem] shadow-2xl w-full max-w-xl border border-white/50">
                            <h2 className="text-3xl font-black mb-1">{editingSupplier ? 'Ficha de' : 'Nuevo'} Proveedor</h2>
                            <p className="text-sm font-bold text-gray-400 mb-8 uppercase tracking-widest font-mono">Agenda de Contactos</p>
                            
                            <form onSubmit={handleSupplierSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Razón Social / Nombre Comercial</label>
                                    <input
                                        type="text"
                                        required
                                        value={supplierForm.name}
                                        onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                                        className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none"
                                        placeholder="Ej: Distribuidora Norte"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Persona de Contacto</label>
                                        <input
                                            type="text"
                                            value={supplierForm.contact_name}
                                            onChange={e => setSupplierForm({ ...supplierForm, contact_name: e.target.value })}
                                            className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none"
                                            placeholder="Nombre del vendedor..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Rubro Principal</label>
                                        <select
                                            value={supplierForm.category}
                                            onChange={e => setSupplierForm({ ...supplierForm, category: e.target.value })}
                                            className="w-full h-14 px-5 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none appearance-none cursor-pointer"
                                        >
                                            <option value="Mercadería">Mercadería (Insumos)</option>
                                            <option value="Bebidas">Bebidas / Alcohol</option>
                                            <option value="Servicios">Servicios y Energía</option>
                                            <option value="Mantenimiento">Mantenimiento y Arreglos</option>
                                            <option value="Papelería">Papelería y Descartables</option>
                                            <option value="Publicidad">Publicidad y Branding</option>
                                            <option value="Otros">Otros</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Teléfono / WhatsApp</label>
                                        <input
                                            type="text"
                                            value={supplierForm.phone}
                                            onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                                            className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none"
                                            placeholder="+54..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Correo Electrónico</label>
                                        <input
                                            type="email"
                                            value={supplierForm.email}
                                            onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })}
                                            className="w-full h-14 px-6 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 ring-black font-bold outline-none"
                                            placeholder="proveedor@empresa.com"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <button type="button" onClick={() => {setShowSupplierModal(false); setEditingSupplier(null);}} className="flex-1 h-14 rounded-2xl font-black text-gray-400 bg-gray-100 hover:bg-gray-200 transition-all uppercase text-[10px] tracking-widest">
                                        Cerrar
                                    </button>
                                    <button type="submit" className="flex-[2] h-14 rounded-2xl font-black text-white bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95">
                                        {editingSupplier ? 'Guardar Cambios' : 'Registrar Proveedor'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}

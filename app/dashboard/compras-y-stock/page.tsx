"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    IconPlus, IconCheck, IconX, IconAlertTriangle, IconClock,
    IconTruck, IconPackage, IconReceipt, IconHistory, IconPencil,
    IconCash, IconCreditCard, IconChevronDown, IconShieldExclamation,
    IconSearch, IconLoader2,
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
    useSuppliers, useSupplies, usePurchases, useFixedExpenses,
    useCreatePurchase, useUpdateFixedExpense, useCreateSupply, useUpdateSupply,
} from "@/lib/hooks/use-pos-data";

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentMethod = "CASH" | "ACCOUNT";
type Tab = "insumos" | "proveedores" | "historial";

interface PurchaseLine {
    supply_id: string;
    supply_name: string;
    unit: string;
    quantity: string;
    unit_price: string;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

function daysUntil(dateStr: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr + "T00:00:00");
    return Math.round((d.getTime() - today.getTime()) / 86400000);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComprasStockPage() {
    // ─── Data ─────────────────────────────────────────────────────────────────
    const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
    const { data: allSupplies = [], isLoading: suppliesLoading } = useSupplies();
    const { data: purchases = [] } = usePurchases();
    const { data: fixedExpenses = [] } = useFixedExpenses();

    const createPurchase = useCreatePurchase();
    const updateFixedExpense = useUpdateFixedExpense();
    const createSupply = useCreateSupply();
    const updateSupply = useUpdateSupply();

    // ─── Purchase form state ───────────────────────────────────────────────────
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [cuit, setCuit] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
    const [lines, setLines] = useState<PurchaseLine[]>([]);

    // ─── UI state ─────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<Tab>("insumos");
    const [supplierSearch, setSupplierSearch] = useState("");
    const [showAddSupplyModal, setShowAddSupplyModal] = useState(false);
    const [newSupply, setNewSupply] = useState({ name: "", unit: "un", supplier_id: "" });
    const [editingExpense, setEditingExpense] = useState<any>(null);
    const [editingSupply, setEditingSupply] = useState<any>(null);

    // ─── Derived ──────────────────────────────────────────────────────────────
    const selectedSupplier = useMemo(
        () => suppliers.find((s: any) => s.id === selectedSupplierId),
        [suppliers, selectedSupplierId]
    );

    const supplierSupplies = useMemo(
        () => allSupplies.filter((s: any) => s.supplier_id === selectedSupplierId),
        [allSupplies, selectedSupplierId]
    );

    const purchaseTotal = useMemo(
        () => lines.reduce((acc, l) => acc + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0),
        [lines]
    );

    const upcomingExpenses = useMemo(() => {
        const in7Days = Date.now() + 7 * 86400000;
        return fixedExpenses.filter((e: any) => {
            if (e.status !== "PENDING" || !e.due_date) return false;
            return new Date(e.due_date + "T00:00:00").getTime() <= in7Days;
        });
    }, [fixedExpenses]);

    // ─── Handlers ─────────────────────────────────────────────────────────────

    function handleSupplierSelect(id: string) {
        setSelectedSupplierId(id);
        const sup = suppliers.find((s: any) => s.id === id);
        setCuit(sup?.cuit ?? "");
        setLines([]);
    }

    function toggleSupplyLine(supply: any) {
        setLines(prev => {
            const exists = prev.find(l => l.supply_id === supply.id);
            if (exists) return prev.filter(l => l.supply_id !== supply.id);
            return [...prev, {
                supply_id: supply.id,
                supply_name: supply.name,
                unit: supply.unit,
                quantity: "",
                unit_price: supply.last_purchase_price ? String(supply.last_purchase_price) : "",
            }];
        });
    }

    function updateLine(supply_id: string, field: "quantity" | "unit_price", value: string) {
        setLines(prev => prev.map(l => l.supply_id === supply_id ? { ...l, [field]: value } : l));
    }

    async function handleConfirmPurchase() {
        if (!selectedSupplierId) { toast.error("Seleccioná un proveedor"); return; }
        const validLines = lines.filter(l => parseFloat(l.quantity) > 0 && parseFloat(l.unit_price) > 0);
        if (validLines.length === 0) { toast.error("Agregá al menos un ítem con cantidad y precio"); return; }

        try {
            await createPurchase.mutateAsync({
                supplierId: selectedSupplierId,
                invoiceNumber,
                cuit,
                paymentMethod,
                items: validLines.map(l => ({
                    supply_id: l.supply_id,
                    supply_name: l.supply_name,
                    quantity: parseFloat(l.quantity),
                    unit_price: parseFloat(l.unit_price),
                })),
            });
            toast.success(`Compra registrada · ${fmt(purchaseTotal)}`);
            setLines([]); setInvoiceNumber(""); setCuit(""); setSelectedSupplierId(""); setPaymentMethod("CASH");
        } catch (e: any) {
            toast.error(e.message ?? "Error al registrar la compra");
        }
    }

    async function markExpensePaid(id: string) {
        try {
            await updateFixedExpense.mutateAsync({ id, status: "PAID" });
            toast.success("Marcado como pagado");
        } catch { toast.error("Error al actualizar"); }
    }

    async function handleAddSupply() {
        if (!newSupply.name.trim() || !newSupply.supplier_id) {
            toast.error("Completá nombre y proveedor"); return;
        }
        try {
            await createSupply.mutateAsync(newSupply);
            toast.success("Insumo agregado");
            setShowAddSupplyModal(false);
            setNewSupply({ name: "", unit: "un", supplier_id: "" });
        } catch { toast.error("Error al agregar insumo"); }
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto">

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Compras & Stock</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Insumos, proveedores y gastos fijos</p>
                </div>
                <button
                    onClick={() => setShowAddSupplyModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
                >
                    <IconPlus size={16} /> Nuevo Insumo
                </button>
            </div>

            {/* ── BLOQUE A: Próximos Vencimientos ─────────────────────────────── */}
            {upcomingExpenses.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <IconAlertTriangle size={18} className="text-red-500" />
                        <h2 className="font-semibold text-gray-900">Próximos Vencimientos</h2>
                        <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                            {upcomingExpenses.length}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {upcomingExpenses.map((exp: any) => {
                            const days = daysUntil(exp.due_date);
                            const urgent = exp.category === "URGENT";
                            return (
                                <motion.div
                                    key={exp.id}
                                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                    className={`relative rounded-2xl border p-4 ${urgent
                                        ? "bg-red-50 border-red-200"
                                        : "bg-amber-50 border-amber-200"
                                    }`}
                                >
                                    {urgent && (
                                        <IconShieldExclamation size={14} className="absolute top-3 right-3 text-red-400" />
                                    )}
                                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${urgent ? "text-red-500" : "text-amber-600"}`}>
                                        {days < 0 ? "Vencido" : days === 0 ? "Hoy" : `${days}d`}
                                    </p>
                                    <p className="font-bold text-gray-900 text-sm leading-snug">{exp.name}</p>
                                    {exp.amount > 0 && (
                                        <p className={`text-lg font-black mt-1 ${urgent ? "text-red-600" : "text-amber-700"}`}>
                                            {fmt(exp.amount)}
                                        </p>
                                    )}
                                    <button
                                        onClick={() => markExpensePaid(exp.id)}
                                        className={`mt-3 w-full text-xs font-semibold py-1.5 rounded-lg transition-colors ${urgent
                                            ? "bg-red-100 hover:bg-red-200 text-red-700"
                                            : "bg-amber-100 hover:bg-amber-200 text-amber-700"
                                        }`}
                                    >
                                        Marcar pagado
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* ── BLOQUE B: Formulario de Carga ────────────────────────────────── */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <IconTruck size={20} className="text-gray-500" />
                    <h2 className="font-semibold text-gray-900">Nueva Compra</h2>
                </div>

                <div className="p-6 space-y-6">
                    {/* Cabecera del formulario */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Proveedor */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Proveedor</label>
                            <select
                                value={selectedSupplierId}
                                onChange={e => handleSupplierSelect(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
                            >
                                <option value="">Seleccioná proveedor…</option>
                                {suppliers.map((s: any) => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Número de factura */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">N° Factura</label>
                            <input
                                type="text" placeholder="Ej: A-0001-000123"
                                value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                            />
                        </div>

                        {/* CUIT */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">CUIT (opcional)</label>
                            <input
                                type="text" placeholder="20-12345678-9"
                                value={cuit} onChange={e => setCuit(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                            />
                        </div>
                    </div>

                    {/* Método de pago */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Método de Pago</label>
                        <div className="flex gap-3">
                            {(["CASH", "ACCOUNT"] as const).map(m => (
                                <button
                                    key={m}
                                    onClick={() => setPaymentMethod(m)}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                                        paymentMethod === m
                                            ? m === "CASH"
                                                ? "bg-emerald-600 text-white border-emerald-600"
                                                : "bg-blue-600 text-white border-blue-600"
                                            : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                                    }`}
                                >
                                    {m === "CASH" ? <IconCash size={16} /> : <IconCreditCard size={16} />}
                                    {m === "CASH" ? "Efectivo" : "Cuenta Corriente"}
                                </button>
                            ))}
                        </div>
                        {paymentMethod === "ACCOUNT" && selectedSupplier && (
                            <p className="text-xs text-blue-600 font-medium pt-1">
                                Saldo actual de {selectedSupplier.name}: {fmt(selectedSupplier.balance ?? 0)}
                                {" → "}nuevo saldo: {fmt((selectedSupplier.balance ?? 0) + purchaseTotal)}
                            </p>
                        )}
                    </div>

                    {/* Lista de insumos del proveedor */}
                    {selectedSupplierId && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Insumos de {selectedSupplier?.name}
                            </p>

                            {suppliesLoading ? (
                                <div className="flex items-center gap-2 text-gray-400 py-4">
                                    <IconLoader2 size={16} className="animate-spin" /> Cargando…
                                </div>
                            ) : supplierSupplies.length === 0 ? (
                                <p className="text-sm text-gray-400 py-2">
                                    No hay insumos para este proveedor.{" "}
                                    <button onClick={() => { setNewSupply(s => ({ ...s, supplier_id: selectedSupplierId })); setShowAddSupplyModal(true); }} className="text-gray-600 underline">Agregar</button>
                                </p>
                            ) : (
                                <div className="rounded-xl border border-gray-200 overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left font-semibold w-8"></th>
                                                <th className="px-4 py-2.5 text-left font-semibold">Insumo</th>
                                                <th className="px-4 py-2.5 text-left font-semibold">Stock actual</th>
                                                <th className="px-4 py-2.5 text-right font-semibold">Cantidad</th>
                                                <th className="px-4 py-2.5 text-right font-semibold">Precio unit.</th>
                                                <th className="px-4 py-2.5 text-right font-semibold">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {supplierSupplies.map((supply: any) => {
                                                const line = lines.find(l => l.supply_id === supply.id);
                                                const active = !!line;
                                                const subtotal = active
                                                    ? (parseFloat(line!.quantity) || 0) * (parseFloat(line!.unit_price) || 0)
                                                    : 0;
                                                return (
                                                    <tr key={supply.id} className={active ? "bg-gray-50" : "hover:bg-gray-50/50"}>
                                                        <td className="px-4 py-3">
                                                            <button
                                                                onClick={() => toggleSupplyLine(supply)}
                                                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                                                    active ? "bg-gray-900 border-gray-900" : "border-gray-300 hover:border-gray-500"
                                                                }`}
                                                            >
                                                                {active && <IconCheck size={12} className="text-white" strokeWidth={3} />}
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <p className="font-medium text-gray-900">{supply.name}</p>
                                                            <p className="text-xs text-gray-400">{supply.unit}</p>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600">
                                                            {supply.stock ?? 0} {supply.unit}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number" min="0" placeholder="0"
                                                                disabled={!active}
                                                                value={line?.quantity ?? ""}
                                                                onChange={e => updateLine(supply.id, "quantity", e.target.value)}
                                                                className="w-24 ml-auto block text-right px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number" min="0" placeholder="$0"
                                                                disabled={!active}
                                                                value={line?.unit_price ?? ""}
                                                                onChange={e => updateLine(supply.id, "unit_price", e.target.value)}
                                                                className="w-28 ml-auto block text-right px-3 py-1.5 rounded-lg border border-gray-200 text-sm disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-semibold text-gray-700">
                                                            {active && subtotal > 0 ? fmt(subtotal) : "—"}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer del form */}
                    {lines.length > 0 && (
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide">Total compra</p>
                                <p className="text-3xl font-black text-gray-900">{fmt(purchaseTotal)}</p>
                            </div>
                            <button
                                onClick={handleConfirmPurchase}
                                disabled={createPurchase.isPending}
                                className="flex items-center gap-2 px-8 py-3.5 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-black transition-colors disabled:opacity-50"
                            >
                                {createPurchase.isPending
                                    ? <><IconLoader2 size={16} className="animate-spin" /> Guardando…</>
                                    : <><IconCheck size={16} /> Confirmar Compra</>
                                }
                            </button>
                        </div>
                    )}

                    {!selectedSupplierId && (
                        <p className="text-sm text-gray-400 text-center py-6">
                            Seleccioná un proveedor para cargar la compra
                        </p>
                    )}
                </div>
            </section>

            {/* ── BLOQUE C: Gestión ─────────────────────────────────────────────── */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    {(["insumos", "proveedores", "historial"] as Tab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-4 text-sm font-semibold capitalize transition-colors ${
                                activeTab === tab
                                    ? "text-gray-900 border-b-2 border-gray-900"
                                    : "text-gray-400 hover:text-gray-600"
                            }`}
                        >
                            {tab === "insumos" ? "Insumos" : tab === "proveedores" ? "Proveedores" : "Historial"}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {/* Tab: Insumos */}
                    {activeTab === "insumos" && (
                        <div>
                            <div className="mb-4">
                                <div className="relative max-w-xs">
                                    <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text" placeholder="Buscar insumo…"
                                        value={supplierSearch}
                                        onChange={e => setSupplierSearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold">Insumo</th>
                                            <th className="px-4 py-3 text-left font-semibold">Proveedor</th>
                                            <th className="px-4 py-3 text-right font-semibold">Stock</th>
                                            <th className="px-4 py-3 text-right font-semibold">Último precio</th>
                                            <th className="px-4 py-3 text-center font-semibold">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {allSupplies
                                            .filter((s: any) =>
                                                !supplierSearch ||
                                                s.name.toLowerCase().includes(supplierSearch.toLowerCase())
                                            )
                                            .map((supply: any) => {
                                                const lowStock = (supply.stock ?? 0) < 3;
                                                return (
                                                    <tr key={supply.id} className="hover:bg-gray-50/50">
                                                        <td className="px-4 py-3 font-medium text-gray-900">{supply.name}</td>
                                                        <td className="px-4 py-3 text-gray-500">
                                                            {supply.suppliers?.name ?? "—"}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className={`font-semibold ${lowStock ? "text-red-600" : "text-gray-700"}`}>
                                                                {supply.stock ?? 0} {supply.unit}
                                                            </span>
                                                            {lowStock && (
                                                                <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold">bajo</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-gray-500">
                                                            {supply.last_purchase_price ? fmt(supply.last_purchase_price) : "—"}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button
                                                                onClick={() => setEditingSupply(supply)}
                                                                className="text-gray-400 hover:text-gray-700 transition-colors p-1"
                                                            >
                                                                <IconPencil size={15} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                                {allSupplies.length === 0 && !suppliesLoading && (
                                    <p className="text-center text-gray-400 py-10 text-sm">No hay insumos cargados</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab: Proveedores */}
                    {activeTab === "proveedores" && (
                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Proveedor</th>
                                        <th className="px-4 py-3 text-left font-semibold">CUIT</th>
                                        <th className="px-4 py-3 text-left font-semibold">Rubro</th>
                                        <th className="px-4 py-3 text-right font-semibold">Cuenta Corriente</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {suppliers.map((s: any) => (
                                        <tr key={s.id} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                                            <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.cuit ?? "—"}</td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                                                    {s.category ?? "—"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`font-bold ${(s.balance ?? 0) > 0 ? "text-red-600" : "text-gray-400"}`}>
                                                    {(s.balance ?? 0) > 0 ? fmt(s.balance) : "$0"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {suppliers.length === 0 && !suppliersLoading && (
                                <p className="text-center text-gray-400 py-10 text-sm">No hay proveedores</p>
                            )}
                        </div>
                    )}

                    {/* Tab: Historial */}
                    {activeTab === "historial" && (
                        <div className="space-y-3">
                            {purchases.length === 0 ? (
                                <p className="text-center text-gray-400 py-10 text-sm">No hay compras registradas</p>
                            ) : (
                                purchases.map((p: any) => (
                                    <div key={p.id} className="rounded-xl border border-gray-200 p-4 hover:bg-gray-50/50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <p className="font-semibold text-gray-900">{p.suppliers?.name ?? "—"}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">
                                                    {new Date(p.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                                                    {p.invoice_number && <> · F. {p.invoice_number}</>}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-black text-gray-900 text-lg">{fmt(p.total)}</p>
                                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                                    p.payment_method === "CASH"
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : "bg-blue-100 text-blue-700"
                                                }`}>
                                                    {p.payment_method === "CASH" ? "Efectivo" : "Cta. Cte."}
                                                </span>
                                            </div>
                                        </div>
                                        {p.purchase_items?.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {p.purchase_items.map((item: any, i: number) => (
                                                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                                                        {item.supply_name} · {item.quantity} u.
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* ── Gastos Fijos Completos ────────────────────────────────────────── */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <IconReceipt size={20} className="text-gray-500" />
                    <h2 className="font-semibold text-gray-900">Gastos Fijos del Mes</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">Gasto</th>
                                <th className="px-4 py-3 text-left font-semibold">Prioridad</th>
                                <th className="px-4 py-3 text-right font-semibold">Monto</th>
                                <th className="px-4 py-3 text-left font-semibold">Vence</th>
                                <th className="px-4 py-3 text-center font-semibold">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {fixedExpenses.map((e: any) => (
                                <tr key={e.id} className={`hover:bg-gray-50/50 ${e.status === "PAID" ? "opacity-50" : ""}`}>
                                    <td className="px-4 py-3 font-medium text-gray-900">{e.name}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                            e.category === "URGENT"
                                                ? "bg-red-100 text-red-700"
                                                : "bg-amber-100 text-amber-700"
                                        }`}>
                                            {e.category === "URGENT" ? "Urgente" : "Normal"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-gray-700">
                                        {e.amount > 0 ? fmt(e.amount) : "A confirmar"}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">
                                        {e.due_date
                                            ? new Date(e.due_date + "T00:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
                                            : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {e.status === "PAID" ? (
                                            <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">Pagado</span>
                                        ) : (
                                            <button
                                                onClick={() => markExpensePaid(e.id)}
                                                className="text-xs bg-gray-100 hover:bg-emerald-100 hover:text-emerald-700 text-gray-600 font-semibold px-3 py-1 rounded-full transition-colors"
                                            >
                                                Pendiente
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {fixedExpenses.length === 0 && (
                        <p className="text-center text-gray-400 py-10 text-sm">Sin gastos fijos configurados</p>
                    )}
                </div>
            </section>

            {/* ── Modal: Nuevo Insumo ───────────────────────────────────────────── */}
            <AnimatePresence>
                {showAddSupplyModal && (
                    <>
                        <motion.div
                            key="overlay"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                            onClick={() => setShowAddSupplyModal(false)}
                        />
                        <motion.div
                            key="modal"
                            initial={{ opacity: 0, scale: 0.95, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 16 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                        >
                            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                    <h3 className="font-bold text-gray-900">Nuevo Insumo</h3>
                                    <button onClick={() => setShowAddSupplyModal(false)} className="text-gray-400 hover:text-gray-700">
                                        <IconX size={20} />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</label>
                                        <input
                                            type="text" placeholder="Ej: Café molido"
                                            value={newSupply.name} onChange={e => setNewSupply(s => ({ ...s, name: e.target.value }))}
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidad</label>
                                            <select
                                                value={newSupply.unit} onChange={e => setNewSupply(s => ({ ...s, unit: e.target.value }))}
                                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
                                            >
                                                <option value="un">Unidad (un)</option>
                                                <option value="kg">Kilogramo (kg)</option>
                                                <option value="l">Litro (l)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Proveedor</label>
                                            <select
                                                value={newSupply.supplier_id} onChange={e => setNewSupply(s => ({ ...s, supplier_id: e.target.value }))}
                                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
                                            >
                                                <option value="">Seleccioná…</option>
                                                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <button
                                            onClick={handleAddSupply}
                                            disabled={createSupply.isPending}
                                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-black transition-colors disabled:opacity-50"
                                        >
                                            {createSupply.isPending ? "Guardando…" : "Agregar Insumo"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Modal: Editar Insumo ──────────────────────────────────────────── */}
            <AnimatePresence>
                {editingSupply && (
                    <>
                        <motion.div
                            key="edit-overlay"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                            onClick={() => setEditingSupply(null)}
                        />
                        <motion.div
                            key="edit-modal"
                            initial={{ opacity: 0, scale: 0.95, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 16 }}
                            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                        >
                            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                    <h3 className="font-bold text-gray-900">Editar: {editingSupply.name}</h3>
                                    <button onClick={() => setEditingSupply(null)} className="text-gray-400 hover:text-gray-700">
                                        <IconX size={20} />
                                    </button>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock actual</label>
                                        <input
                                            type="number" min="0"
                                            value={editingSupply.stock ?? ""}
                                            onChange={e => setEditingSupply((s: any) => ({ ...s, stock: e.target.value }))}
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
                                        />
                                    </div>
                                    <div className="pt-2">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await updateSupply.mutateAsync({ id: editingSupply.id, stock: parseFloat(editingSupply.stock) || 0 });
                                                    toast.success("Stock actualizado");
                                                    setEditingSupply(null);
                                                } catch { toast.error("Error al actualizar"); }
                                            }}
                                            disabled={updateSupply.isPending}
                                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-black transition-colors disabled:opacity-50"
                                        >
                                            {updateSupply.isPending ? "Guardando…" : "Guardar"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

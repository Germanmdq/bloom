"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Trash2, CreditCard, Check, Loader2, X, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { useOrderStore } from "@/lib/store/order-store";
import { useQueryClient } from "@tanstack/react-query";
import { useProducts, useCategories, useCreateOrder, useSendKitchenTicket } from "@/lib/hooks/use-pos-data";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { WebOrderList } from "@/components/pos/WebOrderList";
import { orderSheetHeaderBorderClass } from "@/lib/dashboard/table-colors";
import { orderMatchesWebVirtualTable, WEB_ORDER_TABLE_DELIVERY, WEB_ORDER_TABLE_RETIRO } from "@/lib/orders/web-virtual-tables";
import type { CartItem } from "@/lib/store/order-store";

/** Ítems guardados en salon_tables o JSON de kitchen_tickets → mismo formato que el carrito POS. */
function normalizeTableItem(raw: any): CartItem {
    const name = String(raw?.name ?? "").trim() || "Ítem";
    const price = Number(raw?.price) || 0;
    const quantity = Math.max(1, Number(raw?.quantity) || 1);
    const id =
        raw?.id != null && String(raw.id).length > 0
            ? String(raw.id)
            : `qr-${name}-${price}`;
    return { id, name, price, quantity };
}

type OrderSheetProps = {
    tableId: number;
    onClose: () => void;
    onOrderComplete?: () => void;
    webOrderId?: string;
};

export function OrderSheet({ tableId, onClose, onOrderComplete, webOrderId }: OrderSheetProps) {
    const {
        cart, addToCart, removeFromCart, clearCart,
        paymentMethod, setPaymentMethod, notes, setNotes,
        discount, setDiscount
    } = useOrderStore();

    const supabase = createClient();

    const { data: categories = [], isLoading: catLoading } = useCategories();
    const { data: products = [], isLoading: prodLoading } = useProducts();
    const queryClient = useQueryClient();
    const createOrder = useCreateOrder();
    const sendKitchenTicket = useSendKitchenTicket();

    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const finishingRef = useRef(false);
    const [selectedWaiter, setSelectedWaiter] = useState<string>("");
    const [invoiceType, setInvoiceType] = useState('Factura C');
    const [, setClientName] = useState('Consumidor Final');
    const [isFinishing, setIsFinishing] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [extraTotal] = useState(0);
    const [productSearch, setProductSearch] = useState("");
    const [waiters, setWaiters] = useState<Array<{ id: string; full_name: string }>>([]);
    const [orderType, setOrderType] = useState<'LOCAL' | 'DELIVERY' | 'TAKEAWAY'>('LOCAL');
    const [webOrders, setWebOrders] = useState<any[]>([]);
    const [currentWebOrderId, setCurrentWebOrderId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [mpPosOrderId, setMpPosOrderId] = useState<string | null>(null);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");

    const onMpOrderReady = useCallback((id: string | null) => {
        setMpPosOrderId(id);
    }, []);

    const isWebTable = tableId === WEB_ORDER_TABLE_RETIRO || tableId === WEB_ORDER_TABLE_DELIVERY;

    /** Al cambiar de mesa, vaciar el store ya (evita mezclar pedidos entre mesas). */
    useLayoutEffect(() => {
        useOrderStore.getState().clearCart();
    }, [tableId]);

    const refreshData = async () => {
        if (isWebTable) {
            try {
                const resp = await fetch("/api/orders/list", { credentials: "include" });
                const res = await resp.json();
                if (!resp.ok) {
                    console.error("[OrderSheet] /api/orders/list", resp.status, res);
                    setWebOrders([]);
                    return;
                }
                if (Array.isArray(res.data)) {
                    setWebOrders(res.data.filter((o: any) => orderMatchesWebVirtualTable(o, tableId)));
                }
            } catch (e) {
                console.error("Error loading web orders:", e);
                setWebOrders([]);
            }
        } else {
            // Estado de mesa + tickets QR (mismo pedido: la API /api/table-order intenta volcar el QR en salon_tables.items;
            // si eso falla por RLS/red, hidratamos el carrito desde kitchen_tickets para que cobrar funcione igual).
            const [{ data: tableData, error: tableError }, { data: tickets }] = await Promise.all([
                supabase.from("salon_tables").select("*").eq("id", tableId).single(),
                supabase
                    .from("kitchen_tickets")
                    .select("*")
                    .eq("table_id", tableId)
                    .order("created_at", { ascending: true })
                    .limit(30),
            ]);
            if (tableData?.order_type) {
                setOrderType(tableData.order_type as any);
            } else {
                // Fallback por rango de ID si no está definido en DB
                if (tableId >= 100 && tableId < 200) setOrderType('DELIVERY');
                else if (tableId >= 200) setOrderType('TAKEAWAY');
                else setOrderType('LOCAL');
            }

            // Intentar recuperar data del cliente desde las notas guardadas (formato simple)
            const savedNotes = tableData?.notes || "";
            if (savedNotes.includes("📦 ")) {
                // Formato: 📦 Nombre | Dir | Tel || Notas Reales
                const parts = savedNotes.split(" || ");
                const meta = parts[0].replace("📦 ", "").split(" | ");
                if (meta.length >= 3) {
                    setCustomerName(meta[0]);
                    setCustomerAddress(meta[1]);
                    setCustomerPhone(meta[2]);
                    if (parts[1]) setNotes(parts[1]);
                }
            } else {
                setNotes(savedNotes);
            }
            const status = tableData?.status as string | undefined;
            const persisted = Array.isArray(tableData?.items) ? tableData.items : [];

            // Mesa libre: carrito vacío. No usar kitchen_tickets (son históricos QR/cocina, no “cuenta abierta”).
            if (status === "FREE") {
                return;
            }

            if (persisted.length > 0) {
                persisted.forEach((item: any) => addToCart(normalizeTableItem(item)));
            } else if (status === "OCCUPIED" && tickets?.length) {
                // Solo si la mesa está ocupada y no hay items en salon_tables: recuperar desde tickets QR.
                for (const ticket of tickets) {
                    for (const raw of ticket.items || []) {
                        const item = normalizeTableItem(raw);
                        if (item.name) addToCart(item);
                    }
                }
            }
        }
    };

    const handleSelectWebOrder = (order: any) => {
        clearCart();
        setCurrentWebOrderId(order.id);
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
                if (item.is_meta) {
                    setClientName(item.name.replace('Cliente: ', ''));
                } else {
                    addToCart({
                        id: item.id || item.product_id || 'manual-' + Math.random(),
                        name: item.name,
                        price: Number(item.price),
                        quantity: Number(item.quantity)
                    });
                }
            });
        }
    };

    const handleBackToWebList = () => {
        clearCart();
        setCurrentWebOrderId(null);
        refreshData();
    };

    useEffect(() => {
        const init = async () => {
            const { data: waiterData } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('role', 'WAITER');
            if (waiterData) {
                setWaiters(waiterData);
                if (waiterData.length > 0) setSelectedWaiter(waiterData[0].id);
            }

            if (webOrderId) {
                const resp = await fetch("/api/orders/list", { credentials: "include" });
                const res = await resp.json();
                if (resp.ok && Array.isArray(res.data)) {
                    const order = res.data.find((o: any) => o.id === webOrderId);
                    if (order) handleSelectWebOrder(order);
                }
            } else {
                await refreshData();
            }
        };
        init();

        // Realtime: re-fetch when kitchen_tickets change for this table
        if (!isWebTable) {
            const channel = supabase
                .channel(`kitchen-tickets-table-${tableId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'kitchen_tickets',
                    filter: `table_id=eq.${tableId}`,
                }, () => {
                    refreshData();
                })
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [tableId, webOrderId]);

    const persistTableState = async () => {
        if (finishingRef.current) return;
        if (cart.length === 0) return;
        const currentTotal = useOrderStore.getState().getTotal();
        const currentCart = useOrderStore.getState().cart;
        const metaPrefix = (customerName || customerAddress || customerPhone) 
            ? `📦 ${customerName} | ${customerAddress} | ${customerPhone} || ` 
            : "";
        const finalNotes = metaPrefix + notes;

        const { error } = await supabase
            .from('salon_tables')
            .upsert({ id: tableId, status: 'OCCUPIED', total: currentTotal, items: currentCart, notes: finalNotes });
        if (error) {
            // Fallback: columna items puede no existir en DB aún
            const { error: e2 } = await supabase
                .from('salon_tables')
                .upsert({ id: tableId, status: 'OCCUPIED', total: currentTotal });
            if (e2) console.error("Failed to sync table:", e2.message);
        }
    };

    useEffect(() => {
        const timer = setTimeout(persistTableState, 1000);
        return () => clearTimeout(timer);
    }, [cart, tableId, customerName, customerPhone, customerAddress, notes]);

    const handleClose = async () => {
        if (cart.length === 0) {
            // Only reset to FREE if there are no pending kitchen tickets from QR orders
            const { data: pendingTickets } = await supabase
                .from('kitchen_tickets')
                .select('id')
                .eq('table_id', tableId)
                .eq('status', 'PENDING')
                .limit(1);
            if (!pendingTickets || pendingTickets.length === 0) {
                await supabase.from('salon_tables').update({ status: 'FREE', total: 0, items: [] }).eq('id', tableId);
            }
        } else {
            await persistTableState();
        }
        onClose();
    };

    const handleFreeTable = async () => {
        if (!confirm('¿Liberar esta mesa? Se perderán los items sin cobrar.')) return;
        clearCart();
        await supabase.from('salon_tables').update({ status: 'FREE', total: 0, items: [] }).eq('id', tableId);
        onClose();
    };

    const subtotal = useOrderStore(state => state.getTotal());
    const total = subtotal + extraTotal;
    const finalTotal = total - (total * (discount / 100));
    const isLoading = catLoading || prodLoading;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.startsWith('F')) e.preventDefault();
            switch (e.key) {
                case 'F1': sendToKitchen(); break;
                case 'F2': setShowReceiptModal(true); break;
                case 'F3': document.getElementById('product-search')?.focus(); break;
                case 'F12':
                    if (total > 0 && !isFinishing) {
                        showPaymentModal ? finishOrder() : setShowPaymentModal(true);
                    }
                    break;
                case 'Escape':
                    if (showPaymentModal) setShowPaymentModal(false);
                    else if (showReceiptModal) setShowReceiptModal(false);
                    else handleClose();
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleClose, total, isFinishing, showPaymentModal, showReceiptModal]);

    const finishOrder = async (ctx?: { mpOrderId?: string | null }) => {
        if (finalTotal === 0 && discount === 0) return;
        const mpId = ctx?.mpOrderId ?? mpPosOrderId;
        finishingRef.current = true;
        setIsFinishing(true);
        try {
            if (paymentMethod === "MERCADO_PAGO") {
                if (!mpId) {
                    throw new Error(
                        "Generá el cobro con Point o abrí el QR, o revisá el mensaje de error arriba."
                    );
                }
                const statusRes = await fetch(
                    `/api/payments/pos-order-status?order_id=${encodeURIComponent(mpId)}`,
                    { credentials: "include" }
                );
                const statusJson = (await statusRes.json()) as { paid?: boolean; error?: string };
                if (!statusRes.ok || !statusJson.paid) {
                    throw new Error(
                        statusJson.error ||
                            "El pago aún no figura acreditado. Si el cliente ya pagó, esperá unos segundos y volvé a confirmar."
                    );
                }
                await supabase.from("salon_tables").update({ status: "FREE", total: 0, items: [] }).eq("id", tableId);
                if (currentWebOrderId) {
                    await fetch(`/api/orders/delete?id=${currentWebOrderId}`, { method: "DELETE" });
                }
                setMpPosOrderId(null);
                queryClient.invalidateQueries({ queryKey: ["orders"] });
            } else {
                await createOrder.mutateAsync({
                    table_id: tableId,
                    total: finalTotal,
                    payment_method: paymentMethod,
                    waiter_id: selectedWaiter || null,
                    items: cart,
                });
                await supabase.from("salon_tables").update({ status: "FREE", total: 0, items: [] }).eq("id", tableId);
                if (currentWebOrderId) {
                    await fetch(`/api/orders/delete?id=${currentWebOrderId}`, { method: "DELETE" });
                }
            }
            setFeedback({ message: "¡Venta registrada!", type: "success" });
            setTimeout(() => {
                setFeedback(null);
                clearCart();
                finishingRef.current = false;
                setIsFinishing(false);
                if (isWebTable) {
                    setCurrentWebOrderId(null);
                    refreshData();
                } else {
                    if (onOrderComplete) onOrderComplete();
                    onClose();
                }
            }, 2000);
        } catch (error: any) {
            finishingRef.current = false;
            setIsFinishing(false);
            setFeedback({ message: `Error: ${error.message}`, type: "error" });
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    const sendToKitchen = async () => {
        if (cart.length === 0) {
            setFeedback({ message: "La comanda está vacía", type: 'error' });
            setTimeout(() => setFeedback(null), 2000);
            return;
        }
        setIsFinishing(true);
        try {
            await sendKitchenTicket.mutateAsync({
                table_id: String(tableId),
                items: cart.map(i => ({ name: i.name, quantity: i.quantity })),
                notes: notes
            });
            setFeedback({ message: "Enviado a cocina", type: 'success' });
            setTimeout(() => {
                setFeedback(null);
                onClose();
            }, 1500);
        } catch (error: any) {
            setFeedback({ message: `Error: ${error.message}`, type: 'error' });
            setTimeout(() => setFeedback(null), 3000);
        }
        setIsFinishing(false);
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
        );
    }

    if (isWebTable && !currentWebOrderId) {
        return (
            <WebOrderList
                tableId={tableId}
                webOrders={webOrders}
                onSelectOrder={handleSelectWebOrder}
                onClose={onClose}
            />
        );
    }

    const normalize = (s: string) =>
        (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const searchTerm = normalize(productSearch.trim());
    const displayProducts = searchTerm
        ? products.filter((p: any) =>
            normalize(p.name).includes(searchTerm) ||
            normalize(p.description ?? '').includes(searchTerm)
        )
        : activeCategory
            ? products.filter((p: any) => p.category_id === activeCategory)
            : products;

    return (
        <div className="h-full flex flex-col bg-gray-100 overflow-hidden">

            {/* ── HEADER ── */}
            <div className={`flex items-center justify-between px-5 py-3 bg-white border-b border-gray-200 shrink-0 ${orderSheetHeaderBorderClass(tableId)}`}>
                <div className="flex items-center gap-3">
                    {isWebTable && currentWebOrderId && (
                        <button onClick={handleBackToWebList} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                            <ChevronLeft size={18} className="text-gray-500" />
                        </button>
                    )}
                    <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center text-white font-black text-base">
                        {tableId === WEB_ORDER_TABLE_RETIRO ? 'R' : tableId === WEB_ORDER_TABLE_DELIVERY ? 'E' : tableId}
                    </div>
                    <div>
                        <p className="font-black text-gray-900 leading-none">
                            {tableId === WEB_ORDER_TABLE_RETIRO ? 'Retiro' : tableId === WEB_ORDER_TABLE_DELIVERY ? 'Envío' : `Mesa ${tableId}`}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                            {cart.length === 0 ? 'Sin productos' : `${cart.reduce((s, i) => s + i.quantity, 0)} productos`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={selectedWaiter}
                        onChange={(e) => setSelectedWaiter(e.target.value)}
                        className="h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none"
                    >
                        {waiters.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                    </select>
                    <select
                        value={invoiceType}
                        onChange={(e) => setInvoiceType(e.target.value)}
                        className="h-9 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none"
                    >
                        <option>Factura C</option>
                        <option>Factura B</option>
                        <option>Ticket</option>
                    </select>
                    <button
                        onClick={handleFreeTable}
                        className="h-9 px-3 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 text-xs font-semibold transition-colors"
                    >
                        Liberar
                    </button>
                    <button
                        onClick={handleClose}
                        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* ── BODY ── */}
            <div className="flex-1 flex overflow-hidden">

                {/* ── IZQUIERDA: búsqueda + categorías + productos ── */}
                <div className="flex-1 flex flex-col overflow-hidden">

                    {/* Barra de búsqueda */}
                    <div className="px-4 py-3 bg-white border-b border-gray-100 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                            <input
                                id="product-search"
                                type="text"
                                value={productSearch}
                                onChange={(e) => { setProductSearch(e.target.value); setActiveCategory(null); }}
                                placeholder="Buscar producto..."
                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-800 border border-gray-200 outline-none focus:ring-2 focus:ring-gray-300 transition-all"
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    {/* Sub-header: volver a categorías cuando hay una activa */}
                    {(activeCategory || searchTerm) && (
                        <div className="px-4 py-2 bg-white border-b border-gray-100 shrink-0 flex items-center gap-2">
                            <button
                                onClick={() => { setActiveCategory(null); setProductSearch(''); }}
                                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                <ChevronLeft size={14} />
                                {searchTerm
                                    ? `Resultados para "${productSearch}"`
                                    : (categories.find((c: any) => c.id === activeCategory)?.name ?? 'Categoría')}
                            </button>
                        </div>
                    )}

                    {/* Área principal: categorías o productos */}
                    <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                        {!searchTerm && !activeCategory ? (
                            /* Vista de categorías como cards */
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {categories.map((cat: any) => {
                                    const count = products.filter((p: any) => p.category_id === cat.id).length;
                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md active:scale-95 transition-all text-left border border-gray-100 hover:border-gray-300"
                                        >
                                            <p className="font-bold text-gray-900 text-sm leading-snug">{cat.name}</p>
                                            <p className="text-xs text-gray-400 mt-1">{count} productos</p>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : displayProducts.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-300 text-sm font-medium">
                                Sin resultados
                            </div>
                        ) : (
                            /* Vista de productos */
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {displayProducts.map((item: any) => (
                                    <button
                                        key={item.id}
                                        onClick={() => addToCart({ id: item.id, name: item.name, price: Number(item.price), quantity: 1 })}
                                        className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-md active:scale-95 transition-all text-center border border-gray-100 hover:border-gray-300 flex flex-col justify-center min-h-[120px]"
                                    >
                                        <div className="flex-1 flex flex-col justify-center">
                                            <p className="text-lg font-black text-gray-900 leading-tight mb-2 line-clamp-3 uppercase">{item.name}</p>
                                            <p className="text-md font-bold text-gray-500">${Number(item.price).toLocaleString()}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── DERECHA: Datos Cliente + Carrito ── */}
                <div className="w-72 xl:w-96 flex flex-col bg-white border-l border-gray-200 shrink-0">

                    {/* Datos del Cliente (Solo Delivery/Retiro o si el ID está en el rango) */}
                    {(orderType === 'DELIVERY' || orderType === 'TAKEAWAY' || tableId >= 100) && (
                        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-col gap-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Datos de Entrega</h4>
                            <div className="grid gap-2">
                                <input
                                    type="text"
                                    placeholder="Nombre del Cliente"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-black transition-all"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        placeholder="Teléfono"
                                        value={customerPhone}
                                        onChange={(e) => setCustomerPhone(e.target.value)}
                                        className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-black transition-all"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Dirección"
                                        value={customerAddress}
                                        onChange={(e) => setCustomerAddress(e.target.value)}
                                        className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-black transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Lista de items */}
                    <div className="flex-1 overflow-y-auto no-scrollbar">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-300 p-6 text-center">
                                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-2">
                                    <CreditCard size={20} className="text-gray-300" />
                                </div>
                                <p className="text-sm font-medium">Seleccioná productos</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {cart.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                                        <div className="w-6 h-6 bg-gray-900 rounded-lg flex items-center justify-center shrink-0">
                                            <span className="text-white text-[10px] font-black">{item.quantity}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                                            <p className="text-xs text-gray-400">${item.price.toLocaleString()} c/u</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-sm font-black text-gray-900">${(item.price * item.quantity).toLocaleString()}</p>
                                        </div>
                                        <button onClick={() => removeFromCart(idx)} className="shrink-0 p-1 rounded-lg hover:bg-red-50 transition-colors">
                                            <Trash2 size={13} className="text-gray-300 hover:text-red-400" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer del carrito */}
                    <div className="border-t border-gray-100 p-4 flex flex-col gap-3 shrink-0">
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Notas de cocina..."
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 outline-none placeholder:text-gray-300"
                        />

                        <div className="flex items-center justify-between py-1">
                            <span className="text-sm text-gray-500">Total</span>
                            <span className="text-2xl font-black text-gray-900">${total.toLocaleString()}</span>
                        </div>

                        <button
                            onClick={() => setShowPaymentModal(true)}
                            disabled={total === 0 || isFinishing}
                            className="w-full h-12 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            Cobrar ${total.toLocaleString()}
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={sendToKitchen}
                                disabled={cart.length === 0 || isFinishing}
                                className="h-10 bg-gray-100 text-gray-700 rounded-xl font-semibold text-xs hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-30"
                            >
                                Enviar cocina
                            </button>
                            <button
                                onClick={() => setShowReceiptModal(true)}
                                className="h-10 bg-gray-100 text-gray-700 rounded-xl font-semibold text-xs hover:bg-gray-200 active:scale-95 transition-all"
                            >
                                Ticket
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── MODALES ── */}
            {showReceiptModal && (
                <ReceiptModal
                    tableId={tableId}
                    invoiceType={invoiceType}
                    extraTotal={extraTotal}
                    cart={cart}
                    total={total}
                    onClose={() => setShowReceiptModal(false)}
                />
            )}

            {showPaymentModal && (
                <PaymentModal
                    tableId={tableId}
                    total={total}
                    finalTotal={finalTotal}
                    discount={discount}
                    setDiscount={setDiscount}
                    paymentMethod={paymentMethod}
                    setPaymentMethod={setPaymentMethod}
                    cart={cart}
                    isFinishing={isFinishing}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setMpPosOrderId(null);
                    }}
                    onConfirm={finishOrder}
                    onMpOrderReady={onMpOrderReady}
                    waiterId={selectedWaiter || null}
                />
            )}

            {/* ── FEEDBACK ── */}
            <AnimatePresence>
                {feedback && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                            className={`pointer-events-auto px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3 text-center ${
                                feedback.type === 'success' ? 'bg-gray-900 text-white' : 'bg-white text-red-500 border border-red-100'
                            }`}
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${feedback.type === 'success' ? 'bg-white/10' : 'bg-red-50'}`}>
                                {feedback.type === 'success' ? <Check size={24} className="text-white" /> : <X size={24} className="text-red-500" />}
                            </div>
                            <p className="font-bold text-lg">{feedback.message}</p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

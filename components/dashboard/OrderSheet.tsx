"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Trash2, CreditCard, Check, Loader2, X, ChevronLeft, Printer } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { useOrderStore } from "@/lib/store/order-store";
import { useQueryClient } from "@tanstack/react-query";
import { useProducts, useCategories, useCreateOrder, useSendKitchenTicket } from "@/lib/hooks/use-pos-data";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
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
    /** Pass the full order object to skip the fetch and load the cart instantly */
    webOrderData?: any;
    initialShowPayment?: boolean;
};

export function OrderSheet({ tableId, onClose, onOrderComplete, webOrderId, webOrderData, initialShowPayment }: OrderSheetProps) {
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

    const [deliveryPersons, setDeliveryPersons] = useState<any[]>([]);
    const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState<string>("");
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [customerSearchQuery, setCustomerSearchQuery] = useState("");
    const [customerResults, setCustomerResults] = useState<any[]>([]);
    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
    const [webOrderIsPaid, setWebOrderIsPaid] = useState(false);
    const [webOrderPaymentMethod, setWebOrderPaymentMethod] = useState<string | null>(null);
    const [completedOrderData, setCompletedOrderData] = useState<{ cart: any[], total: number } | null>(null);

    const handleCustomerSearch = async (q: string) => {
        setCustomerSearchQuery(q);
        if (q.length < 2) {
            setCustomerResults([]);
            return;
        }
        setIsSearchingCustomer(true);
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, phone, balance')
            .ilike('full_name', `%${q}%`)
            .limit(5);
        setCustomerResults(data || []);
        setIsSearchingCustomer(false);
    };

    const isWebTable = tableId === WEB_ORDER_TABLE_RETIRO || tableId === WEB_ORDER_TABLE_DELIVERY;

    useEffect(() => {
        if (initialShowPayment && cart.length > 0) {
            setShowPaymentModal(true);
        }
    }, [initialShowPayment, cart.length]);

    useEffect(() => {
        fetch("/api/delivery-persons").then(r => r.json()).then(data => {
            if (Array.isArray(data)) setDeliveryPersons(data);
        }).catch(console.error);
    }, []);

    const onMpOrderReady = useCallback((id: string | null) => {
        setMpPosOrderId(id);
    }, []);

    /** Sincronizar ID de pedido web si viene por prop */
    useEffect(() => {
        if (webOrderId) {
            setCurrentWebOrderId(webOrderId);
        }
    }, [webOrderId]);

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
            const [{ data: tableData, error: tableError }, { data: tickets }] = await Promise.all([
                supabase.from("salon_tables").select("*").eq("id", tableId).single(),
                supabase.from("kitchen_tickets").select("*").eq("table_id", tableId).eq("status", "pending")
            ]);

            if (tableData) {
                if (tableData.order_type) setOrderType(tableData.order_type);
                
                const metaCust = tableData.items?.find((i: any) => i.id === 'meta-customer');
                if (metaCust?.name) {
                    setCustomerName(metaCust.name.replace('Cliente: ', ''));
                }
            } else {
                if (tableId >= 100 && tableId < 200) setOrderType('DELIVERY');
                else if (tableId >= 200) setOrderType('TAKEAWAY');
                else setOrderType('LOCAL');
            }

            const status = tableData?.status as string | undefined;
            
            // SECURITY: If the table is FREE, we MUST clear any legacy data in DB to prevent "ghost orders"
            // specifically clearing from kitchen_tickets which causes the "re-appear" bug.
            if (status !== "OCCUPIED") {
                await supabase.from("kitchen_tickets").delete().eq("table_id", tableId);
                await supabase.from("salon_tables").update({ items: [], total: 0 }).eq("id", tableId);
            }

            const persisted = (status === "OCCUPIED" && Array.isArray(tableData?.items)) ? tableData.items : [];

            // Limpiar datos previos del estado local SIEMPRE
            useOrderStore.getState().clearCart();
            setCustomerName("");
            setCustomerAddress("");
            setCustomerPhone("");

            if (status === "OCCUPIED" && persisted.length > 0) {
                persisted.forEach((item: any) => {
                    if (item.id === 'meta-customer') {
                        const rawName = item.name || "";
                        const cleanName = rawName.replace(/^Cliente:\s*/, "");
                        setCustomerName(cleanName);
                        setCustomerAddress(item.address || "");
                        setCustomerPhone(item.phone || "");
                        if (item.customer_id) setSelectedCustomerId(item.customer_id);
                    } else {
                        addToCart(normalizeTableItem(item));
                    }
                });
            } else if (status === "OCCUPIED" && tickets?.length) {
                // Solo si la mesa está ocupada y no hay items en salon_tables: recuperar desde tickets 
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
        setWebOrderIsPaid(!!order.paid);
        setWebOrderPaymentMethod(order.payment_method || null);
        if (order.customer_name) setCustomerName(order.customer_name);
        if (order.customer_phone) setCustomerPhone(order.customer_phone);
        if (order.delivery_info && order.delivery_type === 'delivery') setCustomerAddress(order.delivery_info);
        if (order.items) {
            const itemsArray = Array.isArray(order.items) 
                ? order.items 
                : (typeof order.items === 'string' ? JSON.parse(order.items) : []);
                
            itemsArray.forEach((item: any) => {
                if (!item.is_meta && item.name) {
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
            // Load waiters in parallel, don't block UI
            supabase.from('profiles').select('id, full_name').eq('role', 'WAITER').then(({ data: waiterData }) => {
                if (waiterData) {
                    setWaiters(waiterData);
                }
            });

            if (webOrderData) {
                // ✅ Data already in memory — load instantly, no fetch needed
                handleSelectWebOrder(webOrderData);
            } else if (webOrderId) {
                // Fallback: fetch by ID if data wasn't passed as prop
                try {
                    const resp = await fetch("/api/orders/list", { credentials: "include" });
                    const res = await resp.json();
                    if (resp.ok && Array.isArray(res.data)) {
                        const order = res.data.find((o: any) => o.id === webOrderId);
                        if (order) handleSelectWebOrder(order);
                    }
                } catch (e) {
                    console.error('[OrderSheet] fetch order by id failed', e);
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
        const currentCart = [...useOrderStore.getState().cart];
        
        // Agregar metadata del cliente como un item virtual para persistencia
        if (customerName || customerAddress || customerPhone) {
            currentCart.push({
                id: 'meta-customer',
                name: customerName,
                address: customerAddress,
                phone: customerPhone,
                customer_id: selectedCustomerId,
                price: 0,
                quantity: 1
            } as any);
        }

        const { error } = await supabase
            .from('salon_tables')
            .upsert({ 
                id: tableId, 
                status: 'OCCUPIED', 
                total: currentTotal, 
                items: currentCart,
                updated_at: new Date().toISOString()
            });
        
        if (error) {
            console.error("Failed to sync table:", error.message);
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
        
        // Detect ID from multiple sources to ensure success
        const idToCancel = webOrderId || currentWebOrderId;

        if (idToCancel) {
            await supabase.from('orders').update({ status: 'cancelled' }).eq('id', idToCancel);
        }

        clearCart();
        // Also clear salon_tables entry if it exists for this virtual table
        await supabase.from('salon_tables').update({ status: 'FREE', total: 0, items: [] }).eq('id', tableId);
        
        // IMPORTANT: Clear kitchen tickets so the next time the table opens it is empty
        await supabase.from('kitchen_tickets').delete().eq('table_id', tableId);
        
        if (onOrderComplete) onOrderComplete();
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

    const finishOrder = async (ctx?: { mpOrderId?: string | null; customerId?: string | null }) => {
        if (finalTotal === 0 && discount === 0) return;
        const mpId = ctx?.mpOrderId ?? mpPosOrderId;
        const effectiveCustomerId = ctx?.customerId ?? selectedCustomerId;
        
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
                
                // Clear everything for this table
                await supabase.from("salon_tables").update({ status: "FREE", total: 0, items: [] }).eq("id", tableId);
                await supabase.from("kitchen_tickets").delete().eq("table_id", tableId);
                
                if (webOrderId || currentWebOrderId) {
                    const idToComplete = webOrderId || currentWebOrderId;
                    await supabase.from('orders').update({ status: 'completed', paid: true }).eq('id', idToComplete);
                }
                setMpPosOrderId(null);
                queryClient.invalidateQueries({ queryKey: ["orders"] });
                queryClient.invalidateQueries({ queryKey: ["customers"] });
            } else {
                // ── NUEVA LÓGICA DE FIDELIZACIÓN Y SALDO ──
                const customerIdForDb = isWebTable ? (webOrderData?.customer_id || null) : effectiveCustomerId;
                
                if (customerIdForDb) {
                    console.log('🔔 [FinishOrder] Procesando cliente vinculando:', customerIdForDb);
                    // 1. Contar cafés para el sistema de fidelidad
                    const coffeeCount = cart.reduce((acc, item) => {
                        const n = item.name.toLowerCase();
                        if (n.includes('cafe') || n.includes('café') || n.includes('medialuna') || n.includes('factura')) {
                            return acc + item.quantity;
                        }
                        return acc;
                    }, 0);

                    // 2. Actualizar stamps y saldo (si es cuenta corriente)
                    const { data: prof, error: getError } = await supabase.from('profiles').select('full_name, coffee_stamps, balance').eq('id', customerIdForDb).single();
                    
                    if (getError) {
                        console.error('❌ [FinishOrder] Error al obtener perfil:', getError.message);
                    } else {
                        console.log('👤 [FinishOrder] Cliente encontrado:', prof?.full_name, '| Saldo actual:', prof?.balance);
                    }

                    let newStamps = (prof?.coffee_stamps || 0) + coffeeCount;
                    let newBalance = Number(prof?.balance || 0);

                    if (paymentMethod === "CUENTA_CORRIENTE") {
                        console.log('🏦 [FinishOrder] Aplicando deuda CC:', finalTotal);
                        newBalance += finalTotal;
                    }

                    const { error: updError } = await supabase.from('profiles').update({
                        coffee_stamps: newStamps % 11,
                        balance: newBalance
                    }).eq('id', customerIdForDb);

                    if (updError) {
                        console.error('❌ [FinishOrder] Error al actualizar saldo/puntos:', updError.message);
                        alert("Error al actualizar saldo del cliente: " + updError.message);
                    } else {
                        console.log('✅ [FinishOrder] Saldo actualizado con éxito. Nuevo saldo:', newBalance);
                    }
                } else {
                    console.warn('⚠️ [FinishOrder] No hay customerId vinculado, se omite balance/puntos.');
                }

                await createOrder.mutateAsync({
                    table_id: tableId,
                    total: finalTotal,
                    payment_method: paymentMethod,
                    waiter_id: selectedWaiter || null,
                    discount: discount,
                    status: (isWebTable || tableId >= 100) ? 'completed' : 'paid',
                    customer_id: customerIdForDb,
                    delivery_person_id: selectedDeliveryPerson ? parseInt(selectedDeliveryPerson) : null,
                    items: cart,
                });

                // ── LÓGICA DE DESCUENTO DE STOCK (INSUMOS) ──
                try {
                    for (const item of cart) {
                        const { data: productInfo } = await supabase
                            .from('products')
                            .select('raw_product_id')
                            .eq('id', item.id)
                            .maybeSingle();

                        if (productInfo?.raw_product_id) {
                            const { data: rawProd } = await supabase
                                .from('raw_products')
                                .select('current_stock')
                                .eq('id', productInfo.raw_product_id)
                                .single();

                            if (rawProd) {
                                const newStock = Number(rawProd.current_stock ?? 0) - item.quantity;
                                await supabase
                                    .from('raw_products')
                                    .update({ current_stock: newStock })
                                    .eq('id', productInfo.raw_product_id);
                            }
                        }
                    }
                } catch (stockErr) {
                    console.error("Error al descontar stock de insumos:", stockErr);
                }

                // ── LÓGICA DE ACTUALIZACIÓN DE PRODUCTOS (TOTAL VENDIDOS) ──
                try {
                    const updatePromises = cart.map(item => {
                        // Usamos rpc de postgres para incrementar de forma atómica para evitar colisiones
                        // Si no hay rpc, usamos una actualización simple
                        return supabase.rpc('increment_product_sales', { 
                            row_id: item.id, 
                            amount: item.quantity 
                        }).then(({ error: rpcError }) => {
                            if (rpcError) {
                                // Fallback a update estándar si el RPC no existe
                                return supabase
                                    .from('products')
                                    .select('total_vendidos')
                                    .eq('id', item.id)
                                    .single()
                                    .then(({ data: prod }) => {
                                        const currentVal = prod?.total_vendidos || 0;
                                        return supabase
                                            .from('products')
                                            .update({ total_vendidos: currentVal + item.quantity })
                                            .eq('id', item.id);
                                    });
                            }
                        });
                    });
                    await Promise.all(updatePromises);
                } catch (err) {
                    console.error("Error actualizando acumulados de venta:", err);
                }
                
                // If it's a web order, we mark it as completed and paid
                if (webOrderId || currentWebOrderId) {
                    const idToComplete = webOrderId || currentWebOrderId;
                    await supabase.from('orders').update({ status: 'completed', paid: true }).eq('id', idToComplete);
                }

                await supabase.from("salon_tables").update({ status: "FREE", total: 0, items: [] }).eq("id", tableId);
            }
            // Guardar datos para impresión post-cobro antes de limpiar el carrito
            setCompletedOrderData({ cart: [...cart], total: finalTotal });
            setFeedback({ message: "¡Venta registrada!", type: "success" });
            
            setTimeout(() => {
                setFeedback(null);
                clearCart();
                finishingRef.current = false;
                setIsFinishing(false);
                // No cerramos automáticamente, dejamos que el usuario decida imprimir o salir
            }, 800);
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
                items: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
                notes: notes
            });
            // PERSISTIMOS LOS ITEMS EN LA MESA ANTES DE CERRAR
            await supabase.from("salon_tables")
                .update({ 
                    status: 'OCCUPIED',
                    items: cart, 
                    total: cart.reduce((acc, item) => acc + (item.price * item.quantity), 0),
                    updated_at: new Date().toISOString()
                })
                .eq("id", tableId);

            setFeedback({ message: "Enviado a cocina", type: 'success' });
            setTimeout(() => {
                setFeedback(null);
                onClose();
            }, 1000);
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

            {/* ── HEADER: Dynamic Status Widget ── */}
            <div className="px-6 py-5 bg-white border-b border-gray-100 shrink-0 shadow-[0_8px_30px_rgba(0,0,0,0.04)] z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        {isWebTable && currentWebOrderId && (
                            <button onClick={handleBackToWebList} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-all active:scale-90">
                                <ChevronLeft size={20} className="text-gray-900" />
                            </button>
                        )}
                        
                        {/* Status Circle Identifier */}
                        <div className="w-14 h-14 bg-gray-900 rounded-[1.25rem] flex items-center justify-center text-white shadow-lg shadow-black/10 transition-transform hover:scale-105">
                            <span className="font-black text-2xl tracking-tighter">
                                {(() => {
                                    const clean = customerName.replace('Cliente: ', '');
                                    if (tableId === WEB_ORDER_TABLE_RETIRO) return 'R';
                                    if (tableId === WEB_ORDER_TABLE_DELIVERY) return 'E';
                                    return clean ? clean.charAt(0).toUpperCase() : tableId;
                                })()}
                            </span>
                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                                    {(() => {
                                        const clean = customerName.replace('Cliente: ', '');
                                        if (tableId === WEB_ORDER_TABLE_RETIRO) return 'Retiro';
                                        if (tableId === WEB_ORDER_TABLE_DELIVERY) return 'Envío';
                                        return clean ? clean : `Mesa ${tableId}`;
                                    })()}
                                </h2>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                    webOrderIsPaid ? 'bg-green-100 text-green-700' : (cart.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400')
                                }`}>
                                    {webOrderIsPaid ? 'YA ABONADO' : (cart.length > 0 ? 'Ocupada' : 'Libre')}
                                </span>
                            </div>
                            <p className="text-sm font-bold text-gray-400 mt-1">
                                {customerName ? `Mesa ${tableId}` : (cart.length === 0 ? 'Sincronizando...' : `${cart.reduce((s, i) => s + i.quantity, 0)} productos en comanda`)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end mr-4">
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-1">Mesa {tableId}</span>
                            <div className="flex items-center gap-2">
                                 <select
                                    value={selectedWaiter}
                                    onChange={(e) => setSelectedWaiter(e.target.value)}
                                    className="h-9 px-3 bg-gray-50/50 border border-transparent rounded-xl text-xs font-bold text-gray-600 outline-none hover:bg-gray-100 transition-colors cursor-pointer"
                                >
                                    <option value="">Seleccionar Mozo...</option>
                                    {waiters.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="h-10 w-[1px] bg-gray-100 mx-2" />

                        <button
                            onClick={handleFreeTable}
                            className="h-11 px-5 rounded-xl text-red-500 bg-red-50 hover:bg-red-100 text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                        >
                            Liberar
                        </button>
                        
                        <button
                            onClick={handleClose}
                            className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-900 transition-all active:scale-90"
                        >
                            <X size={20} />
                        </button>
                    </div>
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
                                autoFocus
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
                    <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
                        {!searchTerm && !activeCategory ? (
                            /* Categorías: Bento Grid Estilo Apple (Hero Layout) */
                            <div 
                                className="grid gap-4 w-full h-full pb-20"
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                    gridAutoRows: 'minmax(140px, auto)',
                                    gridTemplateAreas: `
                                        "big big s1"
                                        "big big s2"
                                        "s3 s4 s5"
                                    `
                                }}
                            >
                                {categories.map((cat: any, idx: number) => {
                                    const count = products.filter((p: any) => p.category_id === cat.id).length;
                                    const getSafeIcon = (name: string) => {
                                        const n = name.toLowerCase();
                                        if (n.includes('caf')) return '☕';
                                        if (n.includes('piz')) return '🍕';
                                        if (n.includes('ham')) return '🍔';
                                        if (n.includes('beb') || n.includes('jug')) return '🍹';
                                        if (n.includes('dul') || n.includes('pos')) return '🍰';
                                        if (n.includes('ens')) return '🥗';
                                        if (n.includes('mila') || n.includes('pla')) return '🍽️';
                                        if (n.includes('pan') || n.includes('fact')) return '🥐';
                                        if (n.includes('tost')) return '🥪';
                                        if (n.includes('papa')) return '🍟';
                                        if (n.includes('cerve')) return '🍺';
                                        if (n.includes('vino')) return '🍷';
                                        return '🌟';
                                    };

                                    const icon = getSafeIcon(cat.name);
                                    
                                    // Asignar área según el índice (Bento Pattern)
                                    const area = idx === 0 ? 'big' : idx === 1 ? 's1' : idx === 2 ? 's2' : idx === 3 ? 's3' : idx === 4 ? 's4' : idx === 5 ? 's5' : 'auto';

                                    return (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            style={{ gridArea: area }}
                                            className={`group relative bg-white rounded-[24px] p-6 shadow-[0_15px_45px_rgba(0,0,0,0.06)] hover:shadow-2xl active:scale-95 transition-all text-center border border-gray-50 flex flex-col items-center justify-center gap-4 overflow-hidden ${idx === 0 ? 'min-h-[300px]' : ''}`}
                                        >
                                            {/* Pastel Tint */}
                                            <div className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity bg-current" />
                                            
                                            <motion.div 
                                                whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
                                                className={`${idx === 0 ? 'text-8xl' : 'text-5xl'} drop-shadow-md select-none transition-all`}
                                            >
                                                {icon}
                                            </motion.div>

                                            <div>
                                                <p className={`${idx === 0 ? 'text-lg' : 'text-xs'} font-black text-gray-900 leading-tight uppercase tracking-tight`}>{cat.name}</p>
                                                <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-wider">{count} items</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : displayProducts.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-300 text-sm font-medium">
                                Sin resultados
                            </div>
                        ) : (
                            /* Productos: Grilla Inteligente Adaptativa (v2.1) */
                            <div className={`grid gap-4 w-full h-full pb-20 ${
                                displayProducts.length === 4 ? 'grid-cols-2' : 
                                displayProducts.length >= 5 ? 'grid-cols-3' : 'grid-cols-1'
                            }`}>
                                {displayProducts.map((item: any) => {
                                    // Mapeador de Iconos Ultra-Específico
                                    const getSmartIcon = (name: string, cat: string) => {
                                        const n = (name + " " + cat).toLowerCase();
                                        if (n.includes('rucula') || n.includes('ensala') || n.includes('vegeta')) return '🥗';
                                        if (n.includes('crudo') || n.includes('jamon') || n.includes('bacon') || n.includes('pancet')) return '🥓';
                                        if (n.includes('mila') || n.includes('carne') || n.includes('bife') || n.includes('lomo') || n.includes('parri')) return '🥩';
                                        if (n.includes('choriz') || n.includes('salchi')) return '🌭';
                                        if (n.includes('poll') || n.includes('supre') || n.includes('alitas')) return '🍗';
                                        if (n.includes('piz') || n.includes('muzza') || n.includes('fuga')) return '🍕';
                                        if (n.includes('ham') || n.includes('burg')) return '🍔';
                                        if (n.includes('caf') || n.includes('latte') || n.includes('capu')) return '☕';
                                        if (n.includes('te ') || n.includes('infus')) return '🫖';
                                        if (n.includes('helad') || n.includes('postr')) return '🍦';
                                        if (n.includes('torta') || n.includes('dulc') || n.includes('cake')) return '🍰';
                                        if (n.includes('soda') || n.includes('agua') || n.includes('coca')) return '🥤';
                                        if (n.includes('jug') || n.includes('batid')) return '🍹';
                                        if (n.includes('cerve') || n.includes('pinta')) return '🍺';
                                        if (n.includes('vino')) return '🍷';
                                        if (n.includes('sand') || n.includes('tosta') || n.includes('mig')) return '🥪';
                                        if (n.includes('papa') || n.includes('frit')) return '🍟';
                                        if (n.includes('factu') || n.includes('media') || n.includes('pan')) return '🥐';
                                        if (n.includes('pasta') || n.includes('fideo')) return '🍝';
                                        if (n.includes('empa')) return '🥧';
                                        return '🍽️';
                                    };

                                    const catName = categories.find((c: any) => c.id === item.category_id)?.name || "";
                                    const icon = getSmartIcon(item.name, catName);

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => addToCart({ id: item.id, name: item.name, price: Number(item.price), quantity: 1 })}
                                            className="group relative bg-white rounded-[24px] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.05)] hover:shadow-2xl active:scale-95 transition-all text-center border border-gray-50 flex flex-col items-center justify-center gap-4 overflow-hidden h-full"
                                        >
                                            <motion.div 
                                                whileHover={{ scale: 1.15, rotate: [0, -5, 5, 0] }}
                                                className="text-6xl md:text-7xl drop-shadow-md select-none"
                                            >
                                                {icon}
                                            </motion.div>
                                            
                                            <div className="w-full">
                                                <p className="text-[14px] font-black text-gray-900 leading-tight uppercase tracking-tight mb-2">
                                                    {item.name}
                                                </p>
                                                <div className="flex justify-center">
                                                    <span className="px-4 py-1.5 bg-gray-900 text-white rounded-full text-[10px] font-black tracking-widest">
                                                        ${Number(item.price).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── DERECHA: Datos Cliente + Carrito ── */}
                <div className="w-72 xl:w-96 flex flex-col bg-white border-l border-gray-200 shrink-0">

                    {/* Cliente / Cuenta Corriente Selector (Only for local tables) */}
                    {!isWebTable && (
                        <div className="px-4 py-3 bg-white border-b border-gray-100 shrink-0">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Cliente / Cuenta Corriente</label>
                            
                            {!selectedCustomerId ? (
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={customerSearchQuery}
                                        onChange={(e) => handleCustomerSearch(e.target.value)}
                                        placeholder="Buscar cliente por nombre..."
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-black transition-all"
                                    />
                                    {isSearchingCustomer && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-gray-400" />}
                                    
                                    {customerResults.length > 0 && (
                                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-gray-50">
                                            {customerResults.map(c => (
                                                <button
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedCustomerId(c.id);
                                                        setCustomerName(c.full_name);
                                                        setCustomerResults([]);
                                                        setCustomerSearchQuery("");
                                                    }}
                                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex justify-between items-center"
                                                >
                                                    <div>
                                                        <p className="font-bold text-sm text-gray-900">{c.full_name}</p>
                                                        <p className="text-[10px] text-gray-400">{c.phone || 'Sin teléfono'}</p>
                                                    </div>
                                                    {Number(c.balance || 0) > 0 && (
                                                        <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-md">Debe ${Number(c.balance).toLocaleString()}</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-3 bg-gray-900 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-black text-xs">
                                            {customerName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white leading-none">{customerName}</p>
                                            <p className="text-[10px] text-white/50 mt-1 uppercase font-bold tracking-wider">Cliente vinculado</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setSelectedCustomerId(null);
                                            setCustomerName("");
                                        }}
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Formulario de cliente (solo si es delivery/retiro no web y no vinculaste un cliente arriba) */}
                    {(orderType === 'DELIVERY' || orderType === 'TAKEAWAY' || tableId >= 100) && !isWebTable && !selectedCustomerId && (
                        <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 shrink-0">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Datos de Entrega</label>
                            <div className="space-y-2">
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

                        {/* Delivery Person Selector */}
                        {(orderType === 'DELIVERY' || orderType === 'TAKEAWAY') && (
                            <div className="mb-4">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Repartidor (opcional)</label>
                                <select 
                                    value={selectedDeliveryPerson}
                                    onChange={(e) => setSelectedDeliveryPerson(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-black/5"
                                >
                                    <option value="">-- Sin asignar --</option>
                                    {deliveryPersons.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button
                            onClick={() => webOrderIsPaid ? finishOrder() : setShowPaymentModal(true)}
                            disabled={finalTotal === 0 || isFinishing}
                            className={`w-full h-12 rounded-2xl font-bold text-sm active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                                webOrderIsPaid ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-900 text-white hover:bg-gray-800'
                            }`}
                        >
                            {webOrderIsPaid 
                                ? `Finalizar (Pago con ${webOrderPaymentMethod === 'MERCADO_PAGO' ? 'Mercado Pago' : 'Online'})` 
                                : `Cobrar $${finalTotal.toLocaleString()}`
                            }
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

            {/* ── PANTALLA DE ÉXITO Y TICKET POST-COBRO ── */}
            <AnimatePresence>
                {completedOrderData && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[120] bg-white flex flex-col items-center justify-center p-8 text-center"
                    >
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                            <Check size={40} className="text-emerald-500" strokeWidth={3} />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">¡Venta Finalizada!</h3>
                        <p className="text-gray-500 mb-8">El pedido de la <strong>Mesa {tableId}</strong> fue registrado con éxito.</p>
                        
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            <button
                                onClick={() => setShowReceiptModal(true)}
                                className="w-full h-14 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-neutral-800 transition-all active:scale-95 shadow-xl shadow-black/10"
                            >
                                <Printer size={20} /> Imprimir Ticket
                            </button>
                            <button
                                onClick={() => {
                                    setCompletedOrderData(null);
                                    if (onOrderComplete) onOrderComplete();
                                    onClose();
                                }}
                                className="w-full h-12 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                            >
                                Finalizar y Cerrar
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── MODALES ── */}
            {showReceiptModal && (
                <ReceiptModal
                    tableId={tableId}
                    invoiceType={invoiceType}
                    extraTotal={extraTotal}
                    cart={completedOrderData ? completedOrderData.cart : cart}
                    total={completedOrderData ? completedOrderData.total : total}
                    customerName={customerName}
                    onClose={() => {
                        setShowReceiptModal(false);
                        if (completedOrderData) {
                            setCompletedOrderData(null);
                            if (onOrderComplete) onOrderComplete();
                            onClose();
                        }
                    }}
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
                    selectedCustomerId={selectedCustomerId}
                    setSelectedCustomerId={setSelectedCustomerId}
                    customerName={customerName}
                    setCustomerName={setCustomerName}
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

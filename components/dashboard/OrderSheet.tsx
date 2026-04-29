"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
    IconSearch, IconTrash, IconCreditCard, IconCheck, IconLoader2, IconX, 
    IconChevronLeft, IconPrinter, IconToolsKitchen2, IconStar,
    IconSoup, IconMeat, IconPizza, IconCup, IconIceCream, IconGlassFull,
    IconBeer, IconCake, IconBread, IconCookie, IconCheese, IconFish, 
    IconCarrot, IconBottle, IconCoffee, IconGlass, IconSalad, IconBurger,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { useOrderStore } from "@/lib/store/order-store";
import { useQueryClient } from "@tanstack/react-query";
import { useProducts, useCategories, useCreateOrder, useSendKitchenTicket, useAppSettings } from "@/lib/hooks/use-pos-data";
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
    initialTableData?: any;
    initialShowPayment?: boolean;
};

export function OrderSheet({ tableId, onClose, onOrderComplete, webOrderId, webOrderData, initialTableData, initialShowPayment }: OrderSheetProps) {
    const {
        cart, addToCart, setCart, removeFromCart, clearCart,
        paymentMethod, setPaymentMethod, notes, setNotes,
        discount, setDiscount
    } = useOrderStore();

    const supabase = createClient();

    const { data: categories = [], isLoading: catLoading } = useCategories();
    const { data: products = [], isLoading: prodLoading } = useProducts();
    const { data: appSettings } = useAppSettings();
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
    const [isKitchenReceipt, setIsKitchenReceipt] = useState(false);
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
    const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
    const [showConfigurator, setShowConfigurator] = useState(false);
    const [pendingProduct, setPendingProduct] = useState<any>(null);
    const [configStep, setConfigStep] = useState<'drink-group' | 'drink-detail' | 'garnish' | 'notes' | 'empanada-flavor'>('drink-group');
    const [selectedDrinkGroup, setSelectedDrinkGroup] = useState<string | null>(null);
    const [selectedDrink, setSelectedDrink] = useState<any>(null);
    const [selectedGarnish, setSelectedGarnish] = useState<any>(null);
    const [selectedFlavor, setSelectedFlavor] = useState<string | null>(null);
    const [configNotes, setConfigNotes] = useState("");

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

    // Auto-limpiar feedback después de 3 segundos
    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    // Auto-Slider para Promociones
    useEffect(() => {
        const promoProducts = products.filter((p: any) => 
            p.name.toLowerCase().includes('promo') || 
            p.name.toLowerCase().includes('oferta')
        );
        if (promoProducts.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentPromoIndex(prev => (prev + 1) % promoProducts.length);
        }, 4000);

        return () => clearInterval(interval);
    }, [products]);

    /** Sincronizar ID de pedido web si viene por prop */
    useEffect(() => {
        if (webOrderId) {
            setCurrentWebOrderId(webOrderId);
        }
    }, [webOrderId]);

    /** Al cambiar de mesa, vaciar el store ya (evita mezclar pedidos entre mesas). */
    useLayoutEffect(() => {
        useOrderStore.getState().clearCart();
        
        // INSTANT LOAD: If we have data from parent, use it NOW
        if (initialTableData && initialTableData.status === 'OCCUPIED') {
            const items = Array.isArray(initialTableData.items) ? initialTableData.items : [];
            const newCartItems: CartItem[] = [];
            items.forEach((item: any) => {
                if (item.id === 'meta-customer') {
                    const rawName = item.name || "";
                    const cleanName = rawName.replace(/^Cliente:\s*/, "");
                    setCustomerName(cleanName);
                    setCustomerAddress(item.address || "");
                    setCustomerPhone(item.phone || "");
                    if (item.customer_id) setSelectedCustomerId(item.customer_id);
                } else {
                    newCartItems.push(normalizeTableItem(item));
                }
            });
            useOrderStore.getState().setCart(newCartItems);
        }
    }, [tableId, initialTableData]);

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
            const [{ data: tableData }, { data: tickets }] = await Promise.all([
                supabase.from("salon_tables").select("id, status, items, order_type").eq("id", tableId).single(),
                supabase.from("kitchen_tickets").select("items").eq("table_id", tableId).eq("status", "pending")
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
            if (status !== "OCCUPIED") {
                // Non-blocking cleanup
                supabase.from("kitchen_tickets").delete().eq("table_id", tableId).then(() => {});
                supabase.from("salon_tables").update({ items: [], total: 0 }).eq("id", tableId).then(() => {});
            }

            const persisted = (status === "OCCUPIED" && Array.isArray(tableData?.items)) ? tableData.items : [];

            // Limpiar datos previos del estado local SIEMPRE
            useOrderStore.getState().clearCart();
            setCustomerName("");
            setCustomerAddress("");
            setCustomerPhone("");

            const newCartItems: CartItem[] = [];

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
                        newCartItems.push(normalizeTableItem(item));
                    }
                });
            } else if (status === "OCCUPIED" && tickets?.length) {
                // Solo si la mesa está ocupada y no hay items en salon_tables: recuperar desde tickets 
                for (const ticket of tickets) {
                    for (const raw of ticket.items || []) {
                        const item = normalizeTableItem(raw);
                        if (item.name) newCartItems.push(item);
                    }
                }
            }
            
            if (newCartItems.length > 0) {
                setCart(newCartItems);
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
                
            const newItems: CartItem[] = [];
            itemsArray.forEach((item: any) => {
                if (!item.is_meta && item.name) {
                    newItems.push({
                        id: item.id || item.product_id || 'manual-' + Math.random(),
                        name: item.name,
                        price: Number(item.price),
                        quantity: Number(item.quantity)
                    });
                }
            });
            setCart(newItems);
        }
    };

    const handleBackToWebList = () => {
        clearCart();
        setCurrentWebOrderId(null);
        refreshData();
    };

    useEffect(() => {
        const init = async () => {
            // Load waiters only if not already loaded
            if (waiters.length === 0) {
                supabase.from('profiles').select('id, full_name').eq('role', 'WAITER').then(({ data }) => {
                    if (data) setWaiters(data);
                });
            }

            if (webOrderData) {
                handleSelectWebOrder(webOrderData);
            } else if (initialTableData) {
                // Already loaded in useLayoutEffect
                return;
            } else if (webOrderId) {
                // Fetch only the specific order, not the whole list
                fetch(`/api/orders/${webOrderId}`).then(r => r.json()).then(res => {
                    if (res.data) handleSelectWebOrder(res.data);
                }).catch(console.error);
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
                    const { error: updErr } = await supabase.from('orders').update({ status: 'completed' }).eq('id', idToComplete);
                    if (updErr) console.error("❌ [FinishOrder] Error actualizando pedido web:", updErr.message);
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

                // ── LÓGICA DE INVENTARIO UNIVERSAL (BLOOM) ──
                try {
                    for (const item of cart) {
                        // Solo descontamos si no se descontó antes (ej: al enviar a cocina)
                        if ((item as any).stock_processed) continue;

                        const nombreLower = item.name.toLowerCase();
                        let unidadesARestar = item.quantity;
                        
                        if (nombreLower.includes("doble") && (nombreLower.includes("café") || nombreLower.includes("cafe") || nombreLower.includes("cortado"))) {
                            unidadesARestar = item.quantity * 2;
                        }

                        const { data: prod } = await supabase.from('products').select('stock, vendidos').eq('id', item.id).maybeSingle();
                        if (prod) {
                            await supabase.from('products').update({ 
                                stock: (prod.stock || 0) - unidadesARestar, 
                                vendidos: (prod.vendidos || 0) + item.quantity 
                            }).eq('id', item.id);
                        }
                    }
                } catch (err) {
                    console.error("Error en inventario (FinishOrder):", err);
                }
                
                // If it's a web order, we mark it as completed and paid
                if (webOrderId || currentWebOrderId) {
                    const idToComplete = webOrderId || currentWebOrderId;
                    const { error: updErr } = await supabase.from('orders').update({ status: 'completed' }).eq('id', idToComplete);
                    if (updErr) console.error("❌ [FinishOrder] Error actualizando pedido web:", updErr.message);
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

    const sendToKitchen = async (skipClose = false) => {
        if (cart.length === 0) {
            setFeedback({ message: "La comanda está vacía", type: 'error' });
            setTimeout(() => setFeedback(null), 2000);
            return;
        }
        setIsFinishing(true);
        try {
            await sendKitchenTicket.mutateAsync({
                table_id: String(tableId),
                items: cart,
                notes: notes || "",
            });

            // ── LÓGICA DE INVENTARIO DEFINITIVA (BLOOM) ──
            try {
                for (const item of cart) {
                    const nombreLower = item.name.toLowerCase();
                    let unidadesARestar = item.quantity;
                    
                    // REGLA DE ORO: Café Doble = -2 Stock
                    if (nombreLower.includes("doble") && (nombreLower.includes("café") || nombreLower.includes("cafe") || nombreLower.includes("cortado"))) {
                        unidadesARestar = item.quantity * 2;
                    }

                    console.log(`🚀 PROCESANDO STOCK: ${item.name} (${unidadesARestar} unidades)`);

                    // 1. Obtener datos actuales del producto
                    const { data: currentProd, error: fetchError } = await supabase
                        .from('products')
                        .select('stock, vendidos')
                        .eq('id', item.id)
                        .maybeSingle();

                    if (fetchError) {
                        console.error(`❌ Error al buscar ${item.name}:`, fetchError);
                        continue;
                    }

                    if (currentProd) {
                        const nuevoStock = (currentProd.stock || 0) - unidadesARestar;
                        const nuevosVendidos = (currentProd.vendidos || 0) + item.quantity;

                        // 2. Aplicar descuento
                        const { error: updateError } = await supabase
                            .from('products')
                            .update({ 
                                stock: nuevoStock, 
                                vendidos: nuevosVendidos 
                            })
                            .eq('id', item.id);

                        if (updateError) {
                            console.error(`❌ Error actualizando ${item.name}:`, updateError);
                        } else {
                            console.log(`✅ ${item.name} actualizado. Stock: ${nuevoStock}`);
                            // Marcamos el item como procesado para no restarlo de nuevo al cobrar
                            (item as any).stock_processed = true;
                        }
                    } else {
                        console.warn(`⚠️ El producto "${item.name}" no tiene ID de base de datos válido. No se puede restar stock.`);
                    }
                }
                
                // ── PERSISTENCIA TOTAL (UPSERT) ──
                // Usamos Number(tableId) para asegurar que la DB no lo rechace si viene como string
                const { error: upsertError } = await supabase.from("salon_tables")
                    .upsert({ 
                        id: Number(tableId),
                        items: cart,
                        status: 'OCCUPIED',
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });
                
                if (upsertError) {
                    console.error("❌ Error crítico al abrir mesa en DB:", upsertError.message);
                    // Intento de rescate: solo actualizar estado si el upsert completo falló
                    await supabase.from("salon_tables")
                        .update({ status: 'OCCUPIED' })
                        .eq('id', Number(tableId));
                }

            } catch (err) {
                console.error("❌ Fallo crítico en proceso de cocina:", err);
            }

            setFeedback({ message: "Enviado a cocina", type: 'success' });
            
            // Cierre controlado
            setTimeout(() => {
                setFeedback(null);
                onClose(); 
            }, 800);

        } catch (error: any) {
            console.error("Error general en sendToKitchen:", error);
            setFeedback({ message: `Error: ${error.message}`, type: 'error' });
            setTimeout(() => {
                setFeedback(null);
                onClose();
            }, 2000);
        }
        setIsFinishing(false);
    };

    const normalize = (s: string) =>
        (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const searchTerm = normalize(productSearch.trim());

    const displayProducts = useMemo(() => {
        if (searchTerm) {
            return products.filter((p: any) =>
                normalize(p.name).includes(searchTerm) ||
                normalize(p.description ?? '').includes(searchTerm)
            );
        }
        if (activeCategory) {
            return products.filter((p: any) => p.category_id === activeCategory);
        }
        return products;
    }, [products, productSearch, activeCategory]);

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        products.forEach((p: any) => {
            if (p.category_id) {
                counts[p.category_id] = (counts[p.category_id] || 0) + 1;
            }
        });
        return counts;
    }, [products]);

    const featuredProduct = useMemo(() => {
        return appSettings?.plato_del_dia_id 
            ? products.find((p: any) => p.id === appSettings.plato_del_dia_id)
            : products.find((p: any) => p.kind === 'plato_del_dia');
    }, [appSettings, products]);

    const categoryMap = useMemo(() => {
        const map: Record<string, string> = {};
        categories.forEach((c: any) => { map[c.id] = c.name; });
        return map;
    }, [categories]);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50">
                <IconLoader2 className="animate-spin text-slate-400" size={32} />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 overflow-hidden">

            {/* ── HEADER: Minimalist & Premium ── */}
            <div className="px-8 py-6 bg-white border-b border-slate-100 shrink-0 shadow-sm z-20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        {isWebTable && currentWebOrderId && (
                            <button onClick={handleBackToWebList} className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-all active:scale-95">
                                <IconChevronLeft size={22} className="text-slate-900" />
                            </button>
                        )}
                        
                        <div className="relative group">
                            <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-slate-200 transition-all group-hover:scale-105">
                                <span className="font-bold text-3xl tracking-tighter">
                                    {(() => {
                                        const clean = customerName.replace('Cliente: ', '');
                                        if (tableId === WEB_ORDER_TABLE_RETIRO) return 'R';
                                        if (tableId === WEB_ORDER_TABLE_DELIVERY) return 'E';
                                        if (clean) return clean.charAt(0).toUpperCase();
                                        return tableId < 100 ? tableId : 'N';
                                    })()}
                                </span>
                            </div>
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3">
                                <input
                                    type="text"
                                    value={customerName.replace('Cliente: ', '')}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder={tableId < 100 ? `Mesa ${tableId}` : "Nombre del pedido..."}
                                    className="text-4xl font-black text-slate-900 tracking-tighter leading-none bg-transparent border-none outline-none p-0 w-full placeholder:text-slate-200"
                                />
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[10px] font-black uppercase tracking-wider">{orderType}</span>
                                <span className="text-[10px] text-slate-400 font-bold">• {cart.reduce((s, i) => s + i.quantity, 0)} ÍTEMS</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={selectedWaiter}
                            onChange={(e) => setSelectedWaiter(e.target.value)}
                            className="h-10 px-3 bg-slate-50 border border-transparent rounded-xl text-xs font-bold text-slate-600 outline-none hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                            <option value="">Mozo...</option>
                            {waiters.map(w => <option key={w.id} value={w.id}>{w.full_name}</option>)}
                        </select>
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
                            <IconX size={20} />
                        </button>
                    </div>
                </div>

            {/* ── BODY ── */}
            <div className="flex-1 flex overflow-hidden">

                {/* ── IZQUIERDA: búsqueda + categorías + productos ── */}
                <div className="flex-1 flex flex-col overflow-hidden">

                    {/* Barra de búsqueda */}
                    <div className="px-4 py-3 bg-white border-b border-gray-100 shrink-0 flex gap-2">
                        <div className="relative flex-1">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
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
                        <button
                            onClick={() => {
                                const desc = prompt("Descripción del ítem (opcional):", "");
                                if (desc === null) return;
                                const priceStr = prompt("Precio final ($):", "");
                                if (priceStr === null) return;
                                const price = parseFloat(priceStr.replace(',', '.'));
                                if (isNaN(price) || price < 0) {
                                    alert("Precio inválido");
                                    return;
                                }
                                addToCart({ 
                                    id: `varios-${Date.now()}`, 
                                    name: desc.trim() ? `Varios - ${desc.trim()}` : 'Varios', 
                                    price: price, 
                                    quantity: 1 
                                });
                            }}
                            className="bg-gray-900 text-white px-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black active:scale-95 transition-all shadow-md shrink-0 flex items-center"
                        >
                            + Varios
                        </button>
                    </div>

                    {/* Sub-header: volver a categorías cuando hay una activa */}
                    {(activeCategory || searchTerm) && (
                        <div className="px-4 py-2 bg-white border-b border-gray-100 shrink-0 flex items-center gap-2">
                            <button
                                onClick={() => { setActiveCategory(null); setProductSearch(''); }}
                                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
                            >
                                <IconChevronLeft size={14} />
                                {searchTerm
                                    ? `Resultados para "${productSearch}"`
                    : (categories.find((c: any) => c.id === activeCategory)?.name ?? 'Categoría')}
                            </button>
                        </div>
                    )}

                    {/* Área principal: categorías o productos */}
                    <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
                        {!searchTerm && !activeCategory ? (
                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    {/* Botón Menú del Día - Negro */}
                                    <button
                                        onClick={() => {
                                            if (featuredProduct) {
                                                if (featuredProduct.options) {
                                                    setPendingProduct(featuredProduct);
                                                    setShowConfigurator(true);
                                                } else {
                                                    addToCart(featuredProduct);
                                                }
                                            } else {
                                                const cat = categories.find(c => c.name.toLowerCase().includes('men'));
                                                if (cat) setActiveCategory(cat.id);
                                            }
                                        }}
                                        className="relative overflow-hidden p-6 rounded-[2rem] bg-black text-white text-left transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-xl group flex flex-col justify-end min-h-[160px]"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <IconStar size={60} />
                                        </div>
                                        <div className="relative z-10">
                                            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] font-bold uppercase tracking-widest mb-2">
                                                {featuredProduct ? "Especial de Hoy" : "Menú del Día"}
                                            </span>
                                            <h3 className="text-2xl font-black tracking-tight leading-none mb-1">
                                                {featuredProduct ? featuredProduct.name : "Configurar"}
                                            </h3>
                                            <p className="text-slate-400 font-bold text-sm">
                                                {featuredProduct ? `$${Number(featuredProduct.price).toLocaleString()}` : "Ver promociones →"}
                                            </p>
                                        </div>
                                    </button>

                                    {/* Botón Platos Diarios - Blanco */}
                                    <button
                                        onClick={() => {
                                            const cat = categories.find(c => c.name.toLowerCase().includes('plato'));
                                            if (cat) setActiveCategory(cat.id);
                                        }}
                                        className="relative overflow-hidden p-6 rounded-[2rem] bg-white border border-gray-100 text-left transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-sm group flex flex-col justify-end min-h-[160px]"
                                    >
                                        <div className="absolute top-0 right-0 p-4 opacity-10 text-gray-400">
                                            <IconToolsKitchen2 size={60} />
                                        </div>
                                        <div className="relative z-10">
                                            <h3 className="text-2xl font-black text-slate-900 leading-none mb-1">Platos Diarios</h3>
                                            <p className="text-slate-400 font-bold text-sm">Ver opciones de hoy →</p>
                                        </div>
                                    </button>
                                </div>

                                {/* Grilla de Categorías */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {categories.filter(c => 
                                        !c.name.toLowerCase().includes('plato') && 
                                        !c.name.toLowerCase().includes('menú')
                                    ).map((cat: any) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setActiveCategory(cat.id)}
                                            className="group relative h-32 bg-white border border-gray-100 rounded-[2rem] p-5 flex flex-col items-center justify-center gap-3 transition-all hover:shadow-xl hover:-translate-y-1 hover:border-black active:scale-95"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-black group-hover:text-white transition-all">
                                                <IconToolsKitchen2 size={24} />
                                            </div>
                                            <span className="text-[12px] font-black uppercase tracking-tight text-slate-900 group-hover:text-black transition-colors">
                                                {cat.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* Productos: grilla responsiva (evita deformaciones en modales chicos) */
                            <div className="grid gap-4 w-full pb-20 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
                                {displayProducts.map((item: any) => {
                                    // Mapeador de Iconos Ultra-Específico
                                    const getSmartIcon = (name: string, cat: string) => {
                                        const n = (name + " " + cat).toLowerCase();
                                        const props = { size: 32, stroke: 1.5, className: "text-slate-400 group-hover:text-white transition-colors" };

                                        if (n.includes('rucula') || n.includes('ensala') || n.includes('vegeta')) return <IconSalad {...props} />;
                                        if (n.includes('mila') || n.includes('carne') || n.includes('bife') || n.includes('lomo') || n.includes('parri') || n.includes('beef')) return <IconMeat {...props} />;
                                        if (n.includes('poll') || n.includes('supre') || n.includes('alitas')) return <IconMeat {...props} />;
                                        if (n.includes('piz') || n.includes('muzza') || n.includes('fuga')) return <IconPizza {...props} />;
                                        if (n.includes('ham') || n.includes('burg')) return <IconBurger {...props} />;
                                        if (n.includes('caf') || n.includes('latte') || n.includes('capu')) return <IconCoffee {...props} />;
                                        if (n.includes('te ') || n.includes('infus')) return <IconCup {...props} />;
                                        if (n.includes('helad') || n.includes('postr')) return <IconIceCream {...props} />;
                                        if (n.includes('torta') || n.includes('dulc') || n.includes('cake')) return <IconCake {...props} />;
                                        if (n.includes('soda') || n.includes('agua') || n.includes('coca')) return <IconBottle {...props} />;
                                        if (n.includes('jug') || n.includes('batid')) return <IconGlassFull {...props} />;
                                        if (n.includes('cerve') || n.includes('pinta')) return <IconBeer {...props} />;
                                        if (n.includes('vino')) return <IconGlass {...props} />;
                                        if (n.includes('papa') || n.includes('frit')) return <IconToolsKitchen2 {...props} />;
                                        if (n.includes('factu') || n.includes('media') || n.includes('pan')) return <IconBread {...props} />;
                                        if (n.includes('pasta') || n.includes('fideo')) return <IconSoup {...props} />;
                                        if (n.includes('empa')) return <IconCookie {...props} />;
                                        return <IconToolsKitchen2 {...props} />;
                                    };

                                    const catName = categoryMap[item.category_id] || "";
                                    const IconComponent = getSmartIcon(item.name, catName);

                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                const catNameLower = catName.toLowerCase();
                                                const isEmpanada = item.name.toLowerCase().includes("empa") || catNameLower.includes("empa");
                                                
                                                if (catNameLower.includes("plato") || catNameLower.includes("menú") || isEmpanada) {
                                                    setPendingProduct(item);
                                                    if (isEmpanada) {
                                                        setConfigStep('empanada-flavor');
                                                    } else {
                                                        setConfigStep('drink-group');
                                                    }
                                                    setSelectedDrinkGroup(null);
                                                    setSelectedDrink(null);
                                                    setSelectedGarnish(null);
                                                    setSelectedFlavor(null);
                                                    setConfigNotes("");
                                                    setShowConfigurator(true);
                                                } else {
                                                    addToCart({
                                                        id: item.id,
                                                        name: item.name,
                                                        price: item.price,
                                                        quantity: 1
                                                    });
                                                }
                                            }}
                                            className="group relative bg-white rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all border border-slate-100 flex flex-col items-center justify-center gap-6 overflow-hidden min-h-[170px]"
                                        >
                                            <motion.div 
                                                whileHover={{ scale: 1.1, y: -5 }}
                                                className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center group-hover:bg-slate-900 transition-all shadow-sm group-hover:shadow-xl group-hover:shadow-slate-200"
                                            >
                                                {IconComponent}
                                            </motion.div>
                                            
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.15em] mb-1.5">{catName}</p>
                                                <p className="text-base font-bold text-slate-900 leading-tight tracking-tight mb-4 group-hover:text-black">
                                                    {item.name}
                                                </p>
                                                <div className="flex justify-center">
                                                    <span className="px-5 py-2 bg-slate-100 text-slate-900 group-hover:bg-slate-900 group-hover:text-white rounded-2xl text-[13px] font-bold tracking-tighter transition-all">
                                                        ${Number(item.price || 0).toLocaleString()}
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

                    {/* Lista de Productos en el Carrito */}
                    <div className="flex-1 overflow-y-auto px-4 py-2 no-scrollbar scroll-smooth">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 py-10">
                                <IconToolsKitchen2 size={40} className="mb-2" />
                                <p className="text-xs font-bold uppercase tracking-widest">Carrito Vacío</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {cart.map((item, index) => (
                                    <div key={index} className="group relative bg-white border border-gray-100 p-3 rounded-2xl flex gap-3 items-center hover:border-black transition-all">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-all shrink-0">
                                            <IconToolsKitchen2 size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-900 truncate uppercase tracking-tight">{item.name}</p>
                                            <p className="text-[10px] font-black text-slate-400 mt-0.5">
                                                ${Number(item.price).toLocaleString()} x {item.quantity}
                                            </p>
                                            {item.notes && <p className="text-[9px] text-emerald-500 font-bold mt-1 leading-tight">Nota: {item.notes}</p>}
                                        </div>
                                        <div className="shrink-0 flex flex-col items-end gap-1">
                                            <span className="px-2 py-1 rounded-lg bg-slate-50 text-slate-700 text-[10px] font-black">
                                                x{item.quantity}
                                            </span>
                                            <span className="text-xs font-black text-slate-900 tracking-tight">
                                                ${(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer del carrito */}
                    <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Notas especiales..."
                                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all placeholder:text-slate-300 shadow-sm"
                            />
                        </div>

                        <div className="flex items-center justify-between px-2">
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Final</span>
                            <span className="text-4xl font-bold text-slate-900 tracking-tighter">${Number(finalTotal || 0).toLocaleString()}</span>
                        </div>

                        <button
                            onClick={() => webOrderIsPaid ? finishOrder() : setShowPaymentModal(true)}
                            disabled={finalTotal === 0 || isFinishing}
                            className={`w-full h-16 rounded-[1.5rem] font-bold text-lg active:scale-95 transition-all shadow-xl disabled:opacity-30 disabled:cursor-not-allowed ${
                                webOrderIsPaid ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
                            }`}
                        >
                            {webOrderIsPaid 
                                ? `Finalizar Pago` 
                                : `Ir a Cobrar`
                            }
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => sendToKitchen()}
                                disabled={cart.length === 0 || isFinishing}
                                className="h-14 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                            >
                                Cocina
                            </button>
                            <button
                                onClick={async () => {
                                    await sendToKitchen(true); // Enviamos a cocina sin cerrar la mesa
                                    setIsKitchenReceipt(true); // Es comanda
                                    setShowReceiptModal(true); // Abrimos el ticket para imprimir
                                }}
                                disabled={cart.length === 0 || isFinishing}
                                className="h-14 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                            >
                                <IconPrinter size={16} /> Comanda
                            </button>
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
                            <IconCheck size={40} className="text-emerald-500" strokeWidth={3} />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">¡Venta Finalizada!</h3>
                        <p className="text-gray-500 mb-8">El pedido de la <strong>Mesa {tableId}</strong> fue registrado con éxito.</p>
                        
                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            <button
                                onClick={() => {
                                    setIsKitchenReceipt(false); // Es ticket de pago
                                    setShowReceiptModal(true);
                                }}
                                className="w-full h-14 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-neutral-800 transition-all active:scale-95 shadow-xl shadow-black/10"
                            >
                                <IconPrinter size={20} /> Imprimir Ticket
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
                    isKitchen={isKitchenReceipt}
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
                                {feedback.type === 'success' ? <IconCheck size={24} className="text-white" /> : <IconX size={24} className="text-red-500" />}
                            </div>
                            <p className="font-bold text-lg">{feedback.message}</p>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Product Configurator Modal (Drink, Garnish, Notes) */}
            <AnimatePresence>
                {showConfigurator && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="absolute inset-0 bg-black/70 backdrop-blur-xl" 
                            onClick={() => setShowConfigurator(false)} 
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 30 }} 
                            animate={{ opacity: 1, scale: 1, y: 0 }} 
                            exit={{ opacity: 0, scale: 0.9, y: 30 }} 
                            className="relative bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden p-10"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Personalizar Pedido</h2>
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
                                        {pendingProduct?.name}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setShowConfigurator(false)}
                                    className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-black transition-colors"
                                >
                                    <IconX size={28} />
                                </button>
                            </div>

                            {/* Stepper Header */}
                            <div className="flex gap-1.5 mb-6">
                                {(pendingProduct?.name.toLowerCase().includes('empa') ? ['flavor', 'notes'] : ['drink', 'garnish', 'notes']).map((step) => (
                                    <div 
                                        key={step}
                                        className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                                            ((step === 'drink') && (configStep === 'drink-group' || configStep === 'drink-detail')) ||
                                            (step === 'garnish' && configStep === 'garnish') ||
                                            (step === 'flavor' && configStep === 'empanada-flavor') ||
                                            (step === 'notes' && configStep === 'notes')
                                                ? 'bg-black' : 'bg-gray-100'
                                        }`}
                                    />
                                ))}
                            </div>

                            <div className="min-h-[300px]">
                                {configStep === 'empanada-flavor' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        <h3 className="text-lg font-black mb-2 flex items-center gap-2">
                                            {pendingProduct?.name.toLowerCase().includes('docena') ? '🥟 Gustos (Media / Docena)' : '🥟 Sabor de Empanada'}
                                        </h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                                            {pendingProduct?.name.toLowerCase().includes('docena') ? 'Elegí el gusto principal o combinalos en notas' : 'Seleccioná el gusto'}
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['Carne', 'Pollo', 'Jamón y Queso', 'Choclo'].map(flavor => (
                                                <button
                                                    key={flavor}
                                                    onClick={() => { 
                                                        setSelectedFlavor(flavor); 
                                                        setConfigStep('notes'); 
                                                    }}
                                                    className="p-6 rounded-[2rem] bg-gray-50 hover:bg-black hover:text-white transition-all text-center shadow-sm group active:scale-95"
                                                >
                                                    <p className="font-black text-xs uppercase tracking-widest">{flavor}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {configStep === 'drink-group' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                        <h3 className="text-lg font-black mb-4 flex items-center gap-2">🥤 Selección de Bebida</h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['Línea Coca-Cola', 'Línea Aquarius', 'Aguas', 'Otras'].map(group => (
                                                <button
                                                    key={group}
                                                    onClick={() => { setSelectedDrinkGroup(group); setConfigStep('drink-detail'); }}
                                                    className="p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all text-left"
                                                >
                                                    <p className="font-black text-xs uppercase tracking-wider">{group}</p>
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => { setSelectedDrink({ name: "Sin bebida" }); setConfigStep('garnish'); }}
                                                className="p-4 rounded-2xl bg-gray-100 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:bg-gray-200"
                                            >
                                                Sin bebida
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {configStep === 'drink-detail' && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                        <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                                            🥤 {selectedDrinkGroup}
                                        </h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(selectedDrinkGroup === 'Línea Coca-Cola' 
                                                ? ['Coca-Cola', 'Coca Zero', 'Sprite', 'Sprite Zero', 'Schweppes Pomelo']
                                                : selectedDrinkGroup === 'Línea Aquarius'
                                                ? ['Aquarius Pera', 'Aquarius Manzana', 'Aquarius Pomelo', 'Aquarius Uva']
                                                : selectedDrinkGroup === 'Aguas'
                                                ? ['Agua con Gas', 'Agua sin Gas']
                                                : ['Jugo de Naranja', 'Limonada']
                                            ).map(drink => (
                                                <button
                                                    key={drink}
                                                    onClick={() => { setSelectedDrink({ name: drink }); setConfigStep('garnish'); }}
                                                    className="p-3 rounded-xl bg-gray-50 hover:bg-black hover:text-white transition-all text-left"
                                                >
                                                    <p className="font-bold text-xs">{drink}</p>
                                                </button>
                                            ))}
                                        </div>
                                        <button onClick={() => setConfigStep('drink-group')} className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black">← Volver</button>
                                    </motion.div>
                                )}

                                {configStep === 'garnish' && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                        <h3 className="text-lg font-black mb-4 flex items-center gap-2">🥗 Guarnición</h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['Puré de Papas', 'Papas Fritas', 'Puré de Zapallo', 'Ensalada'].map(g => (
                                                <button
                                                    key={g}
                                                    onClick={() => { 
                                                        setSelectedGarnish({ name: g }); 
                                                        setConfigStep('notes'); 
                                                        if (g === 'Ensalada') setFeedback({ message: 'Recordá poner el sabor de la ensalada en notas', type: 'success' });
                                                    }}
                                                    className="p-4 rounded-2xl bg-gray-50 hover:bg-black hover:text-white transition-all text-left"
                                                >
                                                    <p className="font-black text-xs uppercase tracking-wider">{g}</p>
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => { setSelectedGarnish({ name: "Sin guarnición" }); setConfigStep('notes'); }}
                                                className="p-4 rounded-2xl bg-gray-100 text-gray-400 font-black text-[10px] uppercase tracking-widest"
                                            >
                                                Sin guarnición
                                            </button>
                                        </div>
                                        <button onClick={() => setConfigStep('drink-group')} className="mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-black">← Volver</button>
                                    </motion.div>
                                )}

                                {configStep === 'notes' && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                        <h3 className="text-lg font-black mb-4">📝 Observaciones {selectedGarnish?.name === 'Ensalada' && <span className="text-red-500">(Sabor de ensalada)</span>}</h3>
                                        <textarea
                                            value={configNotes}
                                            onChange={(e) => setConfigNotes(e.target.value)}
                                            placeholder={selectedGarnish?.name === 'Ensalada' ? "Especificá el sabor de la ensalada..." : "Ej: Sin sal, carne bien cocida..."}
                                            className="w-full p-5 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-4 ring-black/5 outline-none font-bold text-base min-h-[120px] resize-none"
                                        />
                                        
                                        <div className="mt-6 flex gap-2">
                                            <button 
                                                onClick={() => setConfigStep('garnish')}
                                                className="flex-1 py-4 rounded-xl bg-gray-100 text-gray-500 font-black text-[10px] uppercase tracking-widest"
                                            >
                                                Volver
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if (pendingProduct) {
                                                        const isEmpanada = pendingProduct.name.toLowerCase().includes("empa");
                                                        
                                                        addToCart({
                                                            id: pendingProduct.id,
                                                            name: isEmpanada ? `${pendingProduct.name} (${selectedFlavor || 'Varios'})` : pendingProduct.name,
                                                            price: Number(pendingProduct.price || 0),
                                                            quantity: 1,
                                                            notes: configNotes
                                                        });
                                                        if (selectedGarnish && selectedGarnish.name !== "Sin guarnición") {
                                                            addToCart({ id: Math.random().toString(), name: `Guarnición: ${selectedGarnish.name}`, price: 0, quantity: 1 });
                                                        }
                                                        if (selectedDrink && selectedDrink.name !== "Sin bebida") {
                                                            const isMenuDelDia = pendingProduct?.id === featuredProduct?.id;
                                                            addToCart({ 
                                                                id: Math.random().toString(), 
                                                                name: `Bebida: ${selectedDrink.name}`, 
                                                                price: isMenuDelDia ? 0 : 2500, 
                                                                quantity: 1 
                                                            });
                                                        }
                                                        setFeedback({ message: 'Agregado correctamente', type: 'success' });
                                                        setShowConfigurator(false);
                                                    }
                                                }}
                                                className="flex-[2] py-4 rounded-xl bg-black text-white font-black text-[10px] uppercase tracking-widest shadow-xl"
                                            >
                                                Finalizar y Agregar
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    </div>
);
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import QRCode from "react-qr-code";
import { CartItem } from "@/lib/store/order-store";
import { PaymentMethod } from "@/lib/types";

const POINT_POLL_MS = 1200;
const POINT_POLL_MAX = 100;

interface PaymentModalProps {
    tableId: number;
    total: number;
    finalTotal: number;
    discount: number;
    setDiscount: (v: number) => void;
    paymentMethod: PaymentMethod;
    setPaymentMethod: (m: PaymentMethod) => void;
    cart: CartItem[];
    isFinishing: boolean;
    onClose: () => void;
    onConfirm: (ctx?: { mpOrderId?: string | null }) => void;
    /** UUID de `orders` al generar preferencia QR (webhook marca paid). */
    onMpOrderReady?: (orderId: string | null) => void;
    waiterId?: string | null;
}

export function PaymentModal({
    tableId,
    total,
    finalTotal,
    discount,
    setDiscount,
    paymentMethod,
    setPaymentMethod,
    cart,
    isFinishing,
    onClose,
    onConfirm,
    onMpOrderReady,
    waiterId = null,
}: PaymentModalProps) {
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [isGeneratingQR, setIsGeneratingQR] = useState(false);
    const [qrError, setQrError] = useState<string | null>(null);
    const [showQrOption, setShowQrOption] = useState(false);

    const [pointBusy, setPointBusy] = useState(false);
    const [pointWaiting, setPointWaiting] = useState(false);
    const [pointError, setPointError] = useState<string | null>(null);

    const onMpOrderReadyRef = useRef(onMpOrderReady);
    onMpOrderReadyRef.current = onMpOrderReady;

    const cartKey = useMemo(
        () =>
            JSON.stringify(
                cart.map((i) => ({ id: i.id, n: i.name, p: i.price, q: i.quantity }))
            ),
        [cart]
    );

    useEffect(() => {
        if (paymentMethod !== "MERCADO_PAGO" || !showQrOption) {
            setQrCodeUrl(null);
            setQrError(null);
            setIsGeneratingQR(false);
            onMpOrderReadyRef.current?.(null);
            return;
        }

        let cancelled = false;
        setIsGeneratingQR(true);
        setQrError(null);
        setQrCodeUrl(null);
        onMpOrderReadyRef.current?.(null);

        void (async () => {
            try {
                const resp = await fetch("/api/payments/pos-preference", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        table_id: tableId,
                        items: cart.map((i) => ({
                            id: i.id,
                            name: i.name,
                            price: i.price,
                            quantity: i.quantity,
                        })),
                        subtotal: total,
                        final_total: finalTotal,
                        waiter_id: waiterId || null,
                    }),
                });
                const data = (await resp.json()) as {
                    init_point?: string;
                    order_id?: string;
                    error?: string;
                };
                if (cancelled) return;
                if (!resp.ok || !data.init_point) {
                    setQrError(data.error || "No se pudo generar el cobro con Mercado Pago");
                    onMpOrderReadyRef.current?.(null);
                    return;
                }
                setQrCodeUrl(data.init_point);
                onMpOrderReadyRef.current?.(data.order_id ?? null);
            } catch (err) {
                if (cancelled) return;
                console.error("Error generating QR:", err);
                setQrError("Error de red al crear el cobro");
                onMpOrderReadyRef.current?.(null);
            } finally {
                if (!cancelled) setIsGeneratingQR(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [paymentMethod, showQrOption, finalTotal, total, cartKey, tableId, waiterId]);

    useEffect(() => {
        if (paymentMethod !== "MERCADO_PAGO") {
            setShowQrOption(false);
            setPointWaiting(false);
            setPointBusy(false);
            setPointError(null);
        }
    }, [paymentMethod]);

    const handleSelectMercadoPago = () => {
        setPaymentMethod("MERCADO_PAGO");
        setPointError(null);
        setShowQrOption(false);
    };

    const pollPointUntilPaid = async (paymentIntentId: string, orderId: string) => {
        for (let i = 0; i < POINT_POLL_MAX; i++) {
            await new Promise((r) => setTimeout(r, POINT_POLL_MS));
            const res = await fetch(
                `/api/payments/point-intent?payment_intent_id=${encodeURIComponent(paymentIntentId)}`,
                { credentials: "include" }
            );
            const j = (await res.json()) as {
                paid?: boolean;
                pending?: boolean;
                failed?: boolean;
                error?: string;
                payment_status?: string;
            };
            if (!res.ok) {
                throw new Error(j.error || "Error consultando el terminal");
            }
            if (j.paid) {
                onMpOrderReadyRef.current?.(orderId);
                onConfirm({ mpOrderId: orderId });
                return;
            }
            if (j.failed) {
                throw new Error(
                    j.payment_status
                        ? `Pago no aprobado (${j.payment_status})`
                        : "Operación cancelada o rechazada en el terminal"
                );
            }
        }
        throw new Error("Tiempo de espera agotado. Revisá el Point o intentá de nuevo.");
    };

    const handleCobrarConPoint = async () => {
        setPointError(null);
        setPointBusy(true);
        setPointWaiting(false);
        onMpOrderReadyRef.current?.(null);
        try {
            const resp = await fetch("/api/payments/point-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    table_id: tableId,
                    items: cart.map((i) => ({
                        id: i.id,
                        name: i.name,
                        price: i.price,
                        quantity: i.quantity,
                    })),
                    subtotal: total,
                    final_total: finalTotal,
                    waiter_id: waiterId || null,
                }),
            });
            const data = (await resp.json()) as {
                payment_intent_id?: string;
                order_id?: string;
                error?: string;
            };
            if (!resp.ok || !data.payment_intent_id || !data.order_id) {
                throw new Error(data.error || "No se pudo enviar el cobro al Point");
            }
            onMpOrderReadyRef.current?.(data.order_id);
            setPointWaiting(true);
            await pollPointUntilPaid(data.payment_intent_id, data.order_id);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Error en cobro Point";
            setPointError(msg);
            onMpOrderReadyRef.current?.(null);
        } finally {
            setPointBusy(false);
            setPointWaiting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 md:p-20">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative bg-white w-full max-w-5xl h-full max-h-[600px] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row"
            >
                {/* Left panel: total + discount */}
                <div className="md:w-1/3 bg-[#FFD60A] p-10 flex flex-col justify-between relative overflow-hidden">
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-widest opacity-40 mb-2">Total a Cobrar</h3>
                        <p className="text-6xl font-black tracking-tighter text-black mb-8">${finalTotal.toLocaleString()}</p>
                    </div>

                    <div className="flex flex-col gap-2 bg-black/5 p-4 rounded-xl">
                        <label className="text-[10px] font-black uppercase opacity-40">Descuento (%)</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={discount === 0 ? "" : discount}
                                onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                                placeholder="0"
                                className="w-full bg-transparent text-2xl font-black outline-none border-b-2 border-black/10 focus:border-black/50 transition-colors py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="text-xl font-black opacity-40">%</span>
                        </div>
                    </div>

                    <div className="mt-8">
                        <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2">Detalles</p>
                        <div className="text-sm font-bold flex flex-col gap-1">
                            <span>Items: {cart.length}</span>
                        </div>
                    </div>
                </div>

                {/* Right panel: payment method + action */}
                <div className="flex-1 p-12 bg-white flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Método de Pago</h3>
                        {waiterId && (
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mozo</span>
                                <span className="text-xs font-bold text-gray-700">Enviado</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <button
                            onClick={() => setPaymentMethod("CASH")}
                            className={`p-6 rounded-3xl border-2 text-left transition-all ${paymentMethod === "CASH" ? "border-[#FFD60A] bg-[#FFD60A]/5" : "border-gray-100"}`}
                        >
                            <p className="font-black text-lg">Efectivo</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Cash / Delivery</p>
                        </button>
                        <button
                            onClick={handleSelectMercadoPago}
                            className={`p-6 rounded-3xl border-2 text-left transition-all ${paymentMethod === "MERCADO_PAGO" ? "border-sky-500 bg-sky-50" : "border-gray-100"}`}
                        >
                            <p className="font-black text-lg">Mercado Pago</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Point / QR / Online</p>
                        </button>
                        <button
                            onClick={() => setPaymentMethod("BANK_TRANSFER")}
                            className={`p-6 rounded-3xl border-2 text-left transition-all ${paymentMethod === "BANK_TRANSFER" ? "border-purple-500 bg-purple-50" : "border-gray-100"}`}
                        >
                            <p className="font-black text-lg">Transferencia</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">CBU / Alias</p>
                        </button>
                        <button
                            onClick={() => setPaymentMethod("CUENTA_CORRIENTE")}
                            className={`p-6 rounded-3xl border-2 text-left transition-all ${paymentMethod === "CUENTA_CORRIENTE" ? "border-orange-500 bg-orange-50" : "border-gray-100"}`}
                        >
                            <p className="font-black text-lg">Cuenta Corriente</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Clientes Frecuentes</p>
                        </button>
                    </div>

                    <div className="flex-1 bg-gray-50 rounded-3xl p-8 flex items-center justify-center border border-gray-100 mb-4 overflow-y-auto">
                        {paymentMethod === "CASH" && (
                            <input
                                type="number"
                                placeholder={total.toString()}
                                className="text-4xl font-black text-center bg-transparent outline-none w-full"
                                autoFocus
                            />
                        )}
                        {paymentMethod === "BANK_TRANSFER" && (
                            <div className="text-center">
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Transferencia Bancaria</p>
                                <p className="text-xs font-semibold text-gray-400">Verificá el comprobante o el ingreso en la cuenta antes de confirmar.</p>
                            </div>
                        )}
                        {paymentMethod === "CUENTA_CORRIENTE" && (
                            <div className="text-center">
                                <p className="text-sm font-bold text-orange-600 uppercase tracking-widest mb-2">Anotar en Cuenta Corriente</p>
                                <p className="text-xs font-semibold text-gray-400">El total se sumará al saldo pendiente del cliente.</p>
                            </div>
                        )}
                        {paymentMethod === "MERCADO_PAGO" && (
                            <div className="text-center w-full max-w-sm space-y-5">
                                {pointWaiting ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="animate-spin h-10 w-10 text-sky-600" />
                                        <p className="text-sm font-bold text-gray-800">Procesando en el terminal…</p>
                                        <p className="text-xs font-medium text-gray-500">
                                            Pedile al cliente que pague en el Point Smart (N950).
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            disabled={pointBusy || isFinishing || finalTotal <= 0}
                                            onClick={() => void handleCobrarConPoint()}
                                            className="w-full rounded-2xl bg-sky-600 py-4 font-black text-white shadow-lg transition hover:bg-sky-700 disabled:opacity-30"
                                        >
                                            {pointBusy ? "Enviando al Point…" : "Cobrar con Point"}
                                        </button>
                                        {pointError ? (
                                            <p className="text-sm font-semibold text-red-600 leading-snug">{pointError}</p>
                                        ) : (
                                            <p className="text-xs font-medium text-gray-500">
                                                Envía el monto al terminal para tarjeta (crédito, 1 cuota).
                                            </p>
                                        )}

                                        <div className="border-t border-gray-200 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowQrOption((v) => !v);
                                                    setQrError(null);
                                                }}
                                                className="text-xs font-bold uppercase tracking-wide text-sky-700 underline-offset-2 hover:underline"
                                            >
                                                {showQrOption ? "Ocultar QR (celular)" : "Pagar con QR en el celular"}
                                            </button>
                                        </div>

                                        {showQrOption && (
                                            <div className="pt-2">
                                                {isGeneratingQR ? (
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Loader2 className="animate-spin mx-auto h-8 w-8 text-sky-600" />
                                                        <p className="text-sm font-semibold text-gray-600">Generando QR…</p>
                                                    </div>
                                                ) : qrError ? (
                                                    <p className="text-sm font-semibold text-red-600 leading-snug">{qrError}</p>
                                                ) : qrCodeUrl ? (
                                                    <div className="flex flex-col items-center gap-4">
                                                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                                                            Escaneá con la app de Mercado Pago
                                                        </p>
                                                        <div className="rounded-[2rem] bg-white p-4 shadow-xl">
                                                            <QRCode value={qrCodeUrl} size={180} />
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="flex-1 py-6 rounded-3xl bg-gray-50 text-gray-400 font-bold hover:bg-gray-100"
                        >
                            Volver
                        </button>
                        <button
                            disabled={isFinishing || pointWaiting || pointBusy}
                            onClick={() => onConfirm()}
                            className="flex-[2] py-6 rounded-[2rem] bg-black text-[#FFD60A] font-black hover:scale-[1.03] disabled:opacity-20 shadow-2xl"
                        >
                            {isFinishing ? "..." : "Confirmar Venta"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

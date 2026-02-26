"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { CartItem } from "@/lib/store/order-store";
import { PaymentMethod } from "@/lib/types";

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
    onConfirm: () => void;
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
}: PaymentModalProps) {
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [isGeneratingQR, setIsGeneratingQR] = useState(false);

    const generateQR = async () => {
        setIsGeneratingQR(true);
        try {
            const resp = await fetch('/api/mercadopago/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart.map(i => ({
                        title: i.name,
                        unit_price: i.price,
                        quantity: i.quantity
                    })),
                    orderId: `table-${tableId}-${Date.now()}`
                })
            });
            const data = await resp.json();
            if (data.init_point) setQrCodeUrl(data.init_point);
        } catch (err) {
            console.error("Error generating QR:", err);
        } finally {
            setIsGeneratingQR(false);
        }
    };

    const handleSelectMercadoPago = () => {
        setPaymentMethod('MERCADO_PAGO');
        if (!qrCodeUrl) generateQR();
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
                                value={discount === 0 ? '' : discount}
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
                    <h3 className="text-2xl font-black uppercase tracking-tighter mb-8">Método de Pago</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <button
                            onClick={() => setPaymentMethod('CASH')}
                            className={`p-6 rounded-3xl border-2 text-left transition-all ${paymentMethod === 'CASH' ? 'border-[#FFD60A] bg-[#FFD60A]/5' : 'border-gray-100'}`}
                        >
                            <p className="font-black text-lg">Efectivo</p>
                        </button>
                        <button
                            onClick={handleSelectMercadoPago}
                            className={`p-6 rounded-3xl border-2 text-left transition-all ${paymentMethod === 'MERCADO_PAGO' ? 'border-sky-500 bg-sky-50' : 'border-gray-100'}`}
                        >
                            <p className="font-black text-lg">Mercado Pago</p>
                        </button>
                    </div>

                    <div className="flex-1 bg-gray-50 rounded-3xl p-8 flex items-center justify-center border border-gray-100 mb-4">
                        {paymentMethod === 'CASH' && (
                            <input
                                type="number"
                                placeholder={total.toString()}
                                className="text-4xl font-black text-center bg-transparent outline-none w-full"
                                autoFocus
                            />
                        )}
                        {paymentMethod === 'MERCADO_PAGO' && (
                            <div className="text-center w-full">
                                {isGeneratingQR ? (
                                    <Loader2 className="animate-spin mx-auto" />
                                ) : qrCodeUrl ? (
                                    <div className="flex flex-col items-center gap-6">
                                        <div className="bg-white p-6 rounded-[2rem] shadow-2xl">
                                            <QRCodeSVG value={qrCodeUrl} size={180} />
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-red-500">Error QR</p>
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
                            disabled={isFinishing}
                            onClick={onConfirm}
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

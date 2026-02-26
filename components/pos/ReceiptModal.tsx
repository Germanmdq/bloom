"use client";

import { Printer } from "lucide-react";
import { CartItem } from "@/lib/store/order-store";

interface ReceiptModalProps {
    tableId: number;
    invoiceType: string;
    extraTotal: number;
    cart: CartItem[];
    total: number;
    onClose: () => void;
}

export function ReceiptModal({ tableId, invoiceType, extraTotal, cart, total, onClose }: ReceiptModalProps) {
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-20">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-3xl" onClick={onClose} />
            <div className="relative bg-white w-full max-w-[400px] rounded-sm p-8 shadow-2xl flex flex-col font-mono">
                <div className="text-center border-b-2 border-dashed border-black pb-4 mb-4">
                    <h2 className="font-bold text-xl uppercase">BLOOM</h2>
                    <p className="text-xs">{new Date().toLocaleString()}</p>
                    <p className="text-xs font-bold">Mesa: {tableId} - {invoiceType}</p>
                </div>
                <div className="flex-1 space-y-2 mb-4 text-xs">
                    {extraTotal > 0 && (
                        <div className="grid grid-cols-[1fr_50px_50px]">
                            <span>Cargos Previos</span>
                            <span className="text-right">1</span>
                            <span className="text-right">${extraTotal}</span>
                        </div>
                    )}
                    {cart.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_50px_50px]">
                            <span>{item.name}</span>
                            <span className="text-right">{item.quantity}</span>
                            <span className="text-right">${item.price * item.quantity}</span>
                        </div>
                    ))}
                </div>
                <div className="border-t-2 border-dashed border-black pt-2 mb-8">
                    <div className="flex justify-between font-bold text-lg">
                        <span>TOTAL</span>
                        <span>${total.toLocaleString()}</span>
                    </div>
                </div>
                <div className="flex gap-2 print:hidden">
                    <button
                        onClick={() => window.print()}
                        className="flex-1 py-4 bg-black text-white font-bold rounded-lg flex items-center justify-center gap-2"
                    >
                        <Printer size={16} /> Imprimir
                    </button>
                    <button onClick={onClose} className="px-4 py-4 bg-gray-100 rounded-lg">Cerrar</button>
                </div>
            </div>
        </div>
    );
}

"use client";

import { IconPrinter, IconX } from "@tabler/icons-react";
import { CartItem } from "@/lib/store/order-store";
import IconPhoto from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ReceiptModalProps {
    tableId: number;
    invoiceType: string;
    extraTotal: number;
    cart: CartItem[];
    total: number;
    customerName?: string;
    onClose: () => void;
}

export function ReceiptModal({ tableId, invoiceType, extraTotal, cart, total, customerName, onClose }: ReceiptModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        
        // Listener para cerrar cuando la impresión termina o se cancela
        const handleAfterPrint = () => {
            onClose();
        };
        window.addEventListener('onafterprint', handleAfterPrint);

        const timer = setTimeout(() => {
            window.print();
        }, 300); // Un poco más rápido

        return () => {
            clearTimeout(timer);
            window.removeEventListener('onafterprint', handleAfterPrint);
        };
    }, [onClose]);

    if (!mounted) return null;

    const ticketContent = (
        <div id="bloom-print-portal" className="fixed inset-0 z-[9999] bg-white flex flex-col items-start overflow-y-auto">
            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: 72mm auto; }
                    body > *:not(#bloom-print-portal) { display: none !important; }
                    #bloom-print-portal { 
                        position: absolute !important; 
                        display: block !important;
                        width: 72mm !important;
                        left: 0 !important;
                        top: 0 !important;
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    .no-print { display: none !important; }
                    .print-tail { display: block !important; height: 150mm !important; }
                }
                .no-print { display: flex; }
                .print-tail { display: none; }
            `}</style>

            {/* UI de Pantalla (Botones Flotantes) */}
            <div className="fixed top-4 right-4 z-[10000] flex gap-2 no-print">
                <button 
                    onClick={() => window.print()} 
                    className="h-12 px-6 bg-black text-white font-bold rounded-xl shadow-2xl active:scale-95 transition-transform"
                >
                    Imprimir de nuevo
                </button>
                <button 
                    onClick={onClose} 
                    className="w-12 h-12 bg-white border border-gray-200 text-gray-800 font-bold rounded-xl shadow-2xl flex items-center justify-center hover:bg-gray-50 mb-4"
                >
                    <IconX size={24} />
                </button>
            </div>

            {/* Contenido del Ticket */}
            <div className="w-[72mm] p-4 bg-white flex flex-col gap-2 print:px-6 print:py-4">
                <div className="text-center py-2">
                    <h2 className="font-bold text-2xl tracking-tighter leading-none">BLOOM</h2>
                    <p className="text-[10px] uppercase font-bold mt-1">IconCoffee & More</p>
                    <div className="border-b border-dashed border-black my-2" />
                    <div className="flex justify-between text-[11px] font-bold">
                        <span>{customerName ? `Alias: ${customerName}` : `Mesa: ${tableId}`}</span>
                        <span>{new Date().toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="space-y-1 my-1">
                    <div className="grid grid-cols-[1fr_20px_60px] text-[10px] border-b border-black pb-1 font-black">
                        <span>ITEM</span>
                        <span className="text-center">C</span>
                        <span className="text-right">TOTAL</span>
                    </div>
                    {cart.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-[1fr_20px_60px] text-[11px] gap-1 py-0.5 border-b border-gray-50 leading-tight">
                            <span className="truncate">{item.name}</span>
                            <span className="text-center">{item.quantity}</span>
                            <span className="text-right font-bold">${(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                    ))}
                </div>

                <div className="border-t-2 border-black pt-2 mt-1">
                    <div className="flex justify-between font-black text-xl tracking-tighter">
                        <span>TOTAL</span>
                        <span>${total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold opacity-60 mt-0.5">
                        <span>{cart.reduce((s, i) => s + i.quantity, 0)} Items</span>
                        <span>Abonado</span>
                    </div>
                </div>

                <div className="text-center mt-6 opacity-80 pb-4 border-b border-black border-dashed">
                    <p className="text-[11px] font-bold">¡GRACIAS POR TU VISITA!</p>
                    <p className="text-[9px]">bloommdp.com</p>
                </div>

                {/* ESPACIO FORZADO: Avance de papel al final */}
                <div className="print-tail w-full" style={{ height: '140mm' }} />
            </div>
        </div>
    );

    return createPortal(ticketContent, document.body);
}

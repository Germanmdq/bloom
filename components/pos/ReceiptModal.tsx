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
    isKitchen?: boolean;
    onClose: () => void;
}

export function ReceiptModal({ tableId, invoiceType, extraTotal, cart, total, customerName, isKitchen = false, onClose }: ReceiptModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        const handleAfterPrint = () => {
            onClose();
        };

        window.addEventListener('afterprint', handleAfterPrint);

        // Pequeño delay para asegurar que el DOM se renderizó antes de imprimir
        const timer = setTimeout(() => {
            window.print();
        }, 500);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, [onClose]);

    if (!mounted) return null;

    const ticketContent = (
        <div id="bloom-print-portal" className="fixed inset-0 z-[-1] opacity-0 pointer-events-none bg-white flex flex-col items-start overflow-hidden">
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
                        opacity: 1 !important;
                        z-index: 9999 !important;
                    }
                    .no-print { display: none !important; }
                    .print-tail { display: block !important; height: 180mm !important; }
                }
                .no-print { display: none; }
                .print-tail { display: none; }
            `}</style>

            {/* Contenido del Ticket */}
            <div className="w-[72mm] p-4 bg-white flex flex-col gap-2 print:px-6 print:py-4">
                <div className="text-center py-2">
                    <h2 className="font-bold text-2xl tracking-tighter leading-none">{isKitchen ? 'COMANDA' : 'BLOOM'}</h2>
                    <p className="text-[10px] uppercase font-bold mt-1">{isKitchen ? 'ORDEN DE PRODUCCIÓN' : 'IconCoffee & More'}</p>
                    <div className="border-b border-dashed border-black my-2" />
                    <div className="flex justify-between text-[11px] font-bold">
                        <span>{customerName ? `Alias: ${customerName}` : `Mesa: ${tableId}`}</span>
                        <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>

                <div className="space-y-1 my-1">
                    <div className={`grid ${isKitchen ? 'grid-cols-[1fr_40px]' : 'grid-cols-[1fr_20px_60px]'} text-[10px] border-b border-black pb-1 font-black`}>
                        <span>ITEM</span>
                        <span className="text-right">CANT</span>
                        {!isKitchen && <span className="text-right">TOTAL</span>}
                    </div>
                    {cart.map((item, idx) => (
                        <div key={idx} className={`grid ${isKitchen ? 'grid-cols-[1fr_40px]' : 'grid-cols-[1fr_20px_60px]'} text-[12px] gap-1 py-1 border-b border-gray-50 leading-tight`}>
                            <div className="flex flex-col">
                                <span className="font-bold">{item.name}</span>
                                {item.notes && <span className="text-[9px] italic text-gray-600">Nota: {item.notes}</span>}
                            </div>
                            <span className="text-right font-black">x{item.quantity}</span>
                            {!isKitchen && <span className="text-right font-bold">${(Number(item.price || 0) * (item.quantity || 1)).toLocaleString()}</span>}
                        </div>
                    ))}
                </div>

                {!isKitchen && (
                    <div className="border-t-2 border-black pt-2 mt-1">
                        <div className="flex justify-between font-black text-xl tracking-tighter">
                            <span>TOTAL</span>
                            <span>${Number(total || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold opacity-60 mt-0.5">
                            <span>{cart.reduce((s, i) => s + i.quantity, 0)} Items</span>
                            <span>Abonado</span>
                        </div>
                    </div>
                )}

                <div className="text-center mt-6 opacity-80 pb-4 border-b border-black border-dashed">
                    <p className="text-[11px] font-bold">{isKitchen ? '--- FIN DE COMANDA ---' : '¡GRACIAS POR TU VISITA!'}</p>
                    {!isKitchen && <p className="text-[9px]">bloommdp.com</p>}
                </div>

                {/* ESPACIO FORZADO: Avance de papel al final aumentado a 180mm */}
                <div className="print-tail w-full" style={{ height: '180mm' }} />
            </div>
        </div>
    );

    return createPortal(ticketContent, document.body);
}

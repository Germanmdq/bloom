"use client";

import { Printer, X } from "lucide-react";
import { CartItem } from "@/lib/store/order-store";
import Image from "next/image";
import { useEffect } from "react";

interface ReceiptModalProps {
    tableId: number;
    invoiceType: string;
    extraTotal: number;
    cart: CartItem[];
    total: number;
    onClose: () => void;
}

import { createPortal } from "react-dom";

interface ReceiptModalProps {
    tableId: number;
    invoiceType: string;
    extraTotal: number;
    cart: CartItem[];
    total: number;
    onClose: () => void;
}

export function ReceiptModal({ tableId, invoiceType, extraTotal, cart, total, onClose }: ReceiptModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        console.log("[ReceiptModal] Mounted, triggering print");
        const timer = setTimeout(() => {
            window.print();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    if (!mounted) return null;

    const ticketContent = (
        <div id="bloom-print-portal" className="fixed inset-0 z-[9999] bg-white flex flex-col font-mono text-black print:p-0 print:m-0">
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
                    }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="w-full max-w-[72mm] mx-auto p-4 bg-white flex flex-col gap-2">
                <div className="text-center py-2">
                    <h2 className="font-bold text-2xl tracking-tighter">BLOOM</h2>
                    <p className="text-[10px] uppercase">Coffee & More</p>
                    <div className="border-b border-dashed border-black my-2" />
                    <div className="flex justify-between text-[11px] font-bold">
                        <span>Mesa: {tableId}</span>
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
                        <div key={idx} className="grid grid-cols-[1fr_20px_60px] text-[11px] gap-1 py-0.5 border-b border-gray-50">
                            <span className="truncate">{item.name}</span>
                            <span className="text-center">{item.quantity}</span>
                            <span className="text-right font-bold">${(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                    ))}
                </div>

                <div className="border-t-2 border-black pt-2 mt-1">
                    <div className="flex justify-between font-black text-xl">
                        <span>TOTAL</span>
                        <span>${total.toLocaleString()}</span>
                    </div>
                </div>

                <div className="text-center mt-6 mb-24 opacity-80">
                    <p className="text-[11px] font-bold">¡GRACIAS POR TU VISITA!</p>
                    <p className="text-[9px]">bloommdp.com</p>
                </div>

                <div className="mt-4 flex gap-2 print:hidden no-print">
                    <button onClick={() => window.print()} className="flex-1 h-12 bg-black text-white font-bold rounded-xl">Re-imprimir</button>
                    <button onClick={onClose} className="w-12 h-12 bg-gray-100 rounded-xl">X</button>
                </div>
            </div>
        </div>
    );

    return createPortal(ticketContent, document.body);
}

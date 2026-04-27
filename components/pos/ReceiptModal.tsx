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

export function ReceiptModal({ tableId, invoiceType, extraTotal, cart, total, onClose }: ReceiptModalProps) {
    
    // Auto-trigger print on mount
    useEffect(() => {
        console.log("[ReceiptModal] Auto-triggering window.print()");
        const timer = setTimeout(() => {
            window.print();
        }, 800); // Increased delay to ensure window focus and rendering
        return () => clearTimeout(timer);
    }, []);

    // Auto-close after printing (optional but good UX for POS)
    useEffect(() => {
        const handleAfterPrint = () => {
            // Optional: onClose(); 
        };
        window.addEventListener('afterprint', handleAfterPrint);
        return () => window.removeEventListener('afterprint', handleAfterPrint);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-20">
            {/* Background overlay - hidden on print */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-md print:hidden" onClick={onClose} />
            
            {/* Ticket Container */}
            <div className="relative bg-white w-full max-w-[320px] rounded-lg shadow-2xl flex flex-col font-mono text-black overflow-hidden print:shadow-none print:max-w-none print:w-[80mm] print:m-0 print:rounded-none">
                
                {/* Print Styles Injection */}
                <style jsx global>{`
                    @media print {
                        @page {
                            margin: 0;
                            size: 72mm auto;
                        }
                        /* Ocultar el resto de la interfaz de forma radical */
                        body > * {
                            display: none !important;
                        }
                        #bloom-print-container {
                            display: block !important;
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 68mm !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                            color: black !important;
                        }
                        .print-hidden {
                            display: none !important;
                        }
                    }
                `}</style>

                {/* El contenedor que Chrome va a ver como "único" al imprimir */}
                <div id="bloom-print-container" className="flex flex-col bg-white text-black font-mono p-1 leading-tight">
                    {/* Header */}
                    <div className="text-center py-2">
                        <h2 className="font-bold text-xl tracking-tighter">BLOOM</h2>
                        <p className="text-[10px] uppercase">Coffee & More</p>
                        <p className="text-[9px] opacity-80">Almirante Brown 2005</p>
                        
                        <div className="border-b border-dashed border-black my-2" />
                        
                        <div className="flex justify-between text-[10px] items-center">
                            <span className="font-bold">Mesa: {tableId}</span>
                            <span>{new Date().toLocaleDateString()}</span>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="space-y-1 my-2">
                        <div className="grid grid-cols-[1fr_20px_50px] text-[9px] border-b border-black pb-0.5 font-black uppercase">
                            <span>Producto</span>
                            <span className="text-center">C</span>
                            <span className="text-right">Total</span>
                        </div>
                        
                        {cart.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-[1fr_20px_50px] text-[10px] gap-1 leading-none py-0.5">
                                <span className="truncate">{item.name}</span>
                                <span className="text-center">{item.quantity}</span>
                                <span className="text-right">${(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t border-black pt-2 mt-1">
                        <div className="flex justify-between font-black text-lg">
                            <span>TOTAL</span>
                            <span>${total.toLocaleString()}</span>
                        </div>
                        <p className="text-[9px] opacity-70">
                            {cart.reduce((s, i) => s + i.quantity, 0)} items abonados
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-6 mb-24">
                        <p className="text-[11px] font-bold">¡GRACIAS POR TU VISITA!</p>
                        <p className="text-[9px]">bloommdp.com</p>
                    </div>
                </div>

                {/* Actions - Hidden on print */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2 print:hidden">
                    <button
                        onClick={() => window.print()}
                        className="flex-1 h-12 bg-black text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors shadow-lg shadow-black/10 active:scale-95"
                    >
                        <Printer size={18} /> Imprimir Ticket
                    </button>
                    <button 
                        onClick={onClose} 
                        className="w-12 h-12 flex items-center justify-center bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-red-500 hover:border-red-100 transition-all active:scale-95"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}

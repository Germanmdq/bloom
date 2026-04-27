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
                            size: 80mm auto;
                        }
                        /* Limpieza total de lo que no es ticket */
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                        }
                        body > * {
                            display: none !important;
                        }
                        #bloom-ticket-printable {
                            display: block !important;
                            width: 72mm !important;
                            padding: 4mm !important;
                            margin: 0 !important;
                            background: white !important;
                        }
                        .print-no-show {
                            display: none !important;
                        }
                    }
                `}</style>

                <div id="bloom-ticket-printable" className="flex flex-col gap-3 bg-white text-black font-mono">
                    {/* Header */}
                    <div className="text-center space-y-1">
                        <div className="flex justify-center mb-1">
                            <Image 
                                src="/images/bloom-logo.png" 
                                alt="Bloom" 
                                width={110} 
                                height={35} 
                                className="grayscale brightness-0"
                            />
                        </div>
                        <p className="text-[10px] font-bold uppercase">Coffee & More</p>
                        <p className="text-[9px] opacity-70">Almirante Brown 2005, Mar del Plata</p>
                        
                        <div className="border-b border-dashed border-black/40 my-2" />
                        
                        <div className="flex justify-between text-[10px] font-bold">
                            <span>Mesa: {tableId}</span>
                            <span>{new Date().toLocaleDateString()}</span>
                        </div>
                        <p className="text-[9px] font-bold text-left">{invoiceType}</p>
                    </div>

                    {/* Items Table - REDUCIDO el ancho para que entre todo */}
                    <div className="space-y-1.5 my-1">
                        <div className="grid grid-cols-[1fr_25px_50px] text-[9px] font-black border-b border-black pb-0.5 uppercase">
                            <span>P RODUCTO</span>
                            <span className="text-center">C</span>
                            <span className="text-right">TOTAL</span>
                        </div>
                        
                        {extraTotal > 0 && (
                            <div className="grid grid-cols-[1fr_25px_50px] text-[10px] gap-1">
                                <span className="truncate italic">Cargos Previos</span>
                                <span className="text-center">1</span>
                                <span className="text-right">${extraTotal.toLocaleString()}</span>
                            </div>
                        )}
                        
                        {cart.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-[1fr_25px_50px] text-[10px] leading-tight gap-1">
                                <span className="font-medium pr-1">{item.name}</span>
                                <span className="text-center opacity-70">{item.quantity}</span>
                                <span className="text-right font-bold">${(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t-2 border-black border-double pt-2 mt-1">
                        <div className="flex justify-between font-black text-base">
                            <span>TOTAL</span>
                            <span>${total.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-[9px] font-bold opacity-60">
                            <span>{cart.reduce((s, i) => s + i.quantity, 0)} Items</span>
                            <span>Abonado</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-4 mb-20 space-y-1">
                        <p className="text-[10px] font-bold uppercase">¡Gracias por tu visita!</p>
                        <p className="text-[8px]">bloommdp.com</p>
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

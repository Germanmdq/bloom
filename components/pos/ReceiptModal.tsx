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
                        body * {
                            visibility: hidden;
                        }
                        #bloom-ticket-content, #bloom-ticket-content * {
                            visibility: visible;
                        }
                        #bloom-ticket-content {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 80mm !important;
                            padding: 10px !important;
                            background: white !important;
                        }
                    }
                `}</style>

                <div id="bloom-ticket-content" className="p-6 flex flex-col gap-4">
                    {/* Header */}
                    <div className="text-center space-y-1">
                        <div className="flex justify-center mb-2">
                            <Image 
                                src="/images/bloom-logo.png" 
                                alt="Bloom" 
                                width={120} 
                                height={40} 
                                className="grayscale brightness-0"
                            />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest leading-none">Coffee & More</p>
                        <p className="text-[10px] opacity-70">Almirante Brown 2005, Mar del Plata</p>
                        <div className="h-px w-full border-b border-dashed border-black/30 my-3" />
                        <div className="flex justify-between items-center text-[11px] font-bold">
                            <span>Mesa: {tableId}</span>
                            <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[10px] font-bold text-left mt-1">{invoiceType}</p>
                    </div>

                    {/* Items Table */}
                    <div className="flex-1 space-y-2.5 my-2">
                        <div className="grid grid-cols-[1fr_30px_60px] text-[10px] font-black border-b border-black pb-1 uppercase tracking-tighter">
                            <span>Producto</span>
                            <span className="text-center">Cant</span>
                            <span className="text-right">Total</span>
                        </div>
                        
                        {extraTotal > 0 && (
                            <div className="grid grid-cols-[1fr_30px_60px] text-[11px] gap-1">
                                <span className="truncate">Cargos Previos</span>
                                <span className="text-center">1</span>
                                <span className="text-right">${extraTotal.toLocaleString()}</span>
                            </div>
                        )}
                        
                        {cart.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-[1fr_30px_60px] text-[11px] leading-tight gap-1">
                                <span className="font-medium break-words">{item.name}</span>
                                <span className="text-center opacity-70">{item.quantity}</span>
                                <span className="text-right font-bold">${(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div className="border-t-2 border-black border-double pt-3 mt-2 space-y-1">
                        <div className="flex justify-between font-black text-lg tracking-tighter">
                            <span>TOTAL</span>
                            <span>${total.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-bold opacity-60">
                            <span>Items: {cart.reduce((s, i) => s + i.quantity, 0)}</span>
                            <span>Abonado</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-6 space-y-1">
                        <p className="text-[10px] font-bold">¡GRACIAS POR TU VISITA!</p>
                        <p className="text-[9px] opacity-50">bloommdp.com</p>
                        <div className="flex justify-center mt-4">
                            {/* Placeholder for QR if needed in future */}
                        </div>
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

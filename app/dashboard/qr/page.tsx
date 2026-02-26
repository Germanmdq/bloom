"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, QrCode } from "lucide-react";

export default function QRCodesPage() {
    const [tableCount, setTableCount] = useState(30);

    const tables = Array.from({ length: tableCount }, (_, i) => i + 1);
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 print:hidden">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                        <QrCode size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Códigos QR de Mesas</h1>
                        <p className="text-gray-500 text-sm">Imprimí y pegá uno en cada mesa</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
                        <span className="text-sm font-bold text-gray-700">Mesas:</span>
                        <select
                            value={tableCount}
                            onChange={(e) => setTableCount(Number(e.target.value))}
                            className="text-sm font-black bg-transparent border-none outline-none cursor-pointer text-gray-900"
                        >
                            <option value={10}>1 al 10</option>
                            <option value={20}>1 al 20</option>
                            <option value={30}>1 al 30</option>
                            <option value={49}>1 al 49</option>
                        </select>
                    </div>

                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-bold hover:bg-gray-800 active:scale-95 transition-all shadow-sm"
                    >
                        <Printer size={18} />
                        Imprimir todo
                    </button>
                </div>
            </div>

            {/* Instruction banner */}
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl print:hidden">
                <p className="text-amber-800 text-sm font-medium">
                    💡 <strong>Cómo usarlos:</strong> Imprimí esta página, recortá cada QR y pegálo en la mesa correspondiente.
                    Los clientes lo escanean con la cámara del celular y ven el menú con el número de mesa ya cargado.
                </p>
            </div>

            {/* QR Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 print:grid-cols-4 print:gap-3">
                {tables.map((tableNum) => (
                    <div
                        key={tableNum}
                        className="bg-white border-2 border-gray-200 rounded-2xl p-5 flex flex-col items-center gap-2 hover:border-gray-400 transition-colors print:break-inside-avoid print:border print:rounded-xl print:p-4"
                    >
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Mesa</p>
                        <p className="text-6xl font-black text-gray-900 leading-none">{tableNum}</p>

                        <div className="my-1">
                            <QRCodeSVG
                                value={`${baseUrl}/menu?table=${tableNum}`}
                                size={160}
                                level="M"
                                bgColor="#ffffff"
                                fgColor="#000000"
                            />
                        </div>

                        <p className="text-[10px] text-gray-400 font-medium text-center leading-tight">
                            Escaneá para ver el menú
                        </p>
                    </div>
                ))}
            </div>

            {/* Print styles */}
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    .print\\:break-inside-avoid,
                    .print\\:break-inside-avoid * { visibility: visible; }
                    #__next { visibility: visible; }
                    .print\\:grid-cols-4 { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; }
                }
            `}</style>
        </div>
    );
}

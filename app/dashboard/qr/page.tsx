"use client";

import { QRCodeSVG } from "qrcode.react";
import { Printer, QrCode } from "lucide-react";

const TABLES = Array.from({ length: 40 }, (_, i) => ({
    id: i + 1,
    label: String(i + 1),
    type: "mesa",
}));

const BAR_TABLES = [
    { id: 41, label: "1", type: "barra" },
    { id: 42, label: "2", type: "barra" },
    { id: 43, label: "3", type: "barra" },
];

function QRCard({ id, label, type }: { id: number; label: string; type: string }) {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const isBarra = type === "barra";

    return (
        <div
            className={`bg-white flex flex-col items-center gap-2 p-5 rounded-2xl print:break-inside-avoid print:rounded-xl print:p-4 ${
                isBarra
                    ? "border-2 border-amber-400"
                    : "border-2 border-gray-200"
            }`}
        >
            <p className={`text-[11px] font-black uppercase tracking-widest ${isBarra ? "text-amber-500" : "text-gray-400"}`}>
                {isBarra ? "Barra" : "Mesa"}
            </p>
            <p className="text-6xl font-black text-gray-900 leading-none">{label}</p>

            <div className="my-1">
                <QRCodeSVG
                    value={`${baseUrl}/menu?table=${id}`}
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
    );
}

export default function QRCodesPage() {
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

                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-bold hover:bg-gray-800 active:scale-95 transition-all shadow-sm"
                >
                    <Printer size={18} />
                    Imprimir todo
                </button>
            </div>

            {/* Instruction banner */}
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl print:hidden">
                <p className="text-amber-800 text-sm font-medium">
                    💡 <strong>Cómo usarlos:</strong> Imprimí esta página, recortá cada QR y pegálo en la mesa correspondiente.
                    Los clientes lo escanean con la cámara del celular y ven el menú con el número de mesa ya cargado.
                </p>
            </div>

            {/* Mesas 1-40 */}
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 print:hidden">
                Salón — 40 mesas
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 print:grid-cols-4 print:gap-3">
                {TABLES.map((t) => (
                    <QRCard key={t.id} {...t} />
                ))}
            </div>

            {/* Barra */}
            <h2 className="text-sm font-black text-amber-500 uppercase tracking-widest mt-10 mb-4 print:mt-6 print:hidden">
                Barra — 3 lugares
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 max-w-sm print:max-w-none print:grid-cols-4 print:gap-3">
                {BAR_TABLES.map((t) => (
                    <QRCard key={t.id} {...t} />
                ))}
            </div>

            {/* Print styles */}
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    .print\\:break-inside-avoid,
                    .print\\:break-inside-avoid * { visibility: visible; }
                    #__next { visibility: visible; }
                }
            `}</style>
        </div>
    );
}

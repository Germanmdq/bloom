"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, QrCode, Settings2 } from "lucide-react";
import Link from "next/link";

function printSingle(id: number, label: string, type: string, baseUrl: string) {
    const isBarra = type === "barra";
    const url = `${baseUrl}/menu?table=${id}`;
    const win = window.open("", "_blank", "width=400,height=500");
    if (!win) return;
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>QR ${isBarra ? "Barra" : "Mesa"} ${label}</title>
            <style>
                body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; }
                .card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 24px; border: 2px solid ${isBarra ? "#fbbf24" : "#e5e7eb"}; border-radius: 16px; }
                .tag { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: ${isBarra ? "#f59e0b" : "#9ca3af"}; }
                .num { font-size: 64px; font-weight: 900; line-height: 1; color: #111; }
                .hint { font-size: 9px; color: #9ca3af; font-weight: 500; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="card">
                <p class="tag">${isBarra ? "Barra" : "Mesa"}</p>
                <p class="num">${label}</p>
                <div id="qr"></div>
                <p class="hint">Escaneá para pedir</p>
            </div>
            <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
            <script>
                QRCode.toCanvas(document.createElement('canvas'), "${url}", { width: 180, margin: 1 }, function(err, canvas) {
                    if (!err) document.getElementById('qr').appendChild(canvas);
                    setTimeout(() => { window.print(); window.close(); }, 300);
                });
            </script>
        </body>
        </html>
    `);
    win.document.close();
}

function QRCard({ id, label, type, baseUrl }: { id: number; label: string; type: string; baseUrl: string }) {
    const isBarra = type === "barra";
    return (
        <div
            className={`bg-white flex flex-col items-center gap-2 p-4 rounded-2xl print:break-inside-avoid print:rounded-xl print:shadow-none border-2 group relative ${
                isBarra ? "border-amber-400" : "border-gray-200"
            }`}
        >
            {/* Print single button */}
            <button
                onClick={() => printSingle(id, label, type, baseUrl)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 hover:bg-black hover:text-white text-gray-400 rounded-lg p-1.5 print:hidden"
                title={`Imprimir ${isBarra ? "Barra" : "Mesa"} ${label}`}
            >
                <Printer size={13} />
            </button>

            <p className={`text-[10px] font-black uppercase tracking-widest ${isBarra ? "text-amber-500" : "text-gray-400"}`}>
                {isBarra ? "Barra" : "Mesa"}
            </p>
            <p className="text-5xl font-black text-gray-900 leading-none">{label}</p>
            <div className="my-1">
                <QRCodeSVG
                    value={`${baseUrl}/menu?table=${id}`}
                    size={140}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#000000"
                />
            </div>
            <p className="text-[9px] text-gray-400 font-medium">Escaneá para pedir</p>
        </div>
    );
}

export default function QRCodesPage() {
    const [mesas, setMesas] = useState(0);
    const [barra, setBarra] = useState(0);
    const [baseUrl, setBaseUrl] = useState("");

    useEffect(() => {
        setBaseUrl(window.location.origin);
        const stored = localStorage.getItem("bloom_salon_config");
        if (stored) {
            try {
                const { mesas: m, barra: b } = JSON.parse(stored);
                if (m) setMesas(m);
                if (b !== undefined) setBarra(b);
            } catch {}
        }
    }, []);

    const TABLES = Array.from({ length: mesas }, (_, i) => ({
        id: i + 1,
        label: String(i + 1),
        type: "mesa",
    }));

    const BAR_TABLES = Array.from({ length: barra }, (_, i) => ({
        id: mesas + i + 1,
        label: String(i + 1),
        type: "barra",
    }));

    const noConfig = mesas === 0 && barra === 0;

    return (
        <div className="p-6 space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                        <QrCode size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Códigos QR</h1>
                        <p className="text-gray-400 text-sm font-medium">
                            {noConfig ? "Configurá tu salón en Ajustes" : `${mesas} mesas · ${barra} barra`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/settings"
                        className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:border-gray-400 transition-all"
                    >
                        <Settings2 size={15} />
                        Ajustar mesas
                    </Link>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-bold hover:bg-gray-800 active:scale-95 transition-all"
                    >
                        <Printer size={16} />
                        Imprimir todo
                    </button>
                </div>
            </div>

            {/* Sin configuración */}
            {noConfig && (
                <div className="flex flex-col items-center justify-center py-24 text-center print:hidden">
                    <p className="text-gray-300 text-6xl font-black mb-4">—</p>
                    <p className="text-gray-500 font-bold mb-2">No hay mesas configuradas</p>
                    <p className="text-gray-400 text-sm mb-6">Andá a Ajustes → Distribución del Salón y guardá la cantidad de mesas.</p>
                    <Link
                        href="/dashboard/settings"
                        className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all"
                    >
                        <Settings2 size={16} />
                        Ir a Ajustes
                    </Link>
                </div>
            )}

            {/* Mesas */}
            {mesas > 0 && (
                <section>
                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 print:hidden">
                        Salón — {mesas} mesas
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 print:grid-cols-5 print:gap-3">
                        {TABLES.map(t => <QRCard key={t.id} {...t} baseUrl={baseUrl} />)}
                    </div>
                </section>
            )}

            {/* Barra */}
            {barra > 0 && (
                <section>
                    <h2 className="text-xs font-black text-amber-500 uppercase tracking-widest mb-4 print:hidden">
                        Barra — {barra} lugares
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 print:grid-cols-5 print:gap-3">
                        {BAR_TABLES.map(t => <QRCard key={t.id} {...t} baseUrl={baseUrl} />)}
                    </div>
                </section>
            )}
        </div>
    );
}

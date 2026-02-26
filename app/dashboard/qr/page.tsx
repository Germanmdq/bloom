"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, QrCode, Settings2, Check } from "lucide-react";

function QRCard({ id, label, type, baseUrl }: { id: number; label: string; type: string; baseUrl: string }) {
    const isBarra = type === "barra";
    return (
        <div
            className={`bg-white flex flex-col items-center gap-2 p-4 rounded-2xl print:break-inside-avoid print:rounded-xl print:shadow-none border-2 ${
                isBarra ? "border-amber-400" : "border-gray-200"
            }`}
        >
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

const STORAGE_KEY = "qr_config";

export default function QRCodesPage() {
    const [mesas, setMesas] = useState(10);
    const [barra, setBarra] = useState(3);
    const [saved, setSaved] = useState(false);
    const [baseUrl, setBaseUrl] = useState("");

    useEffect(() => {
        setBaseUrl(window.location.origin);
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const { mesas: m, barra: b } = JSON.parse(stored);
                if (m) setMesas(m);
                if (b) setBarra(b);
            } catch {}
        }
    }, []);

    function handleSave() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ mesas, barra }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

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
                        <p className="text-gray-400 text-sm font-medium">Configurá y generá los QR de tu local</p>
                    </div>
                </div>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-xl font-bold hover:bg-gray-800 active:scale-95 transition-all"
                >
                    <Printer size={16} />
                    Imprimir todo
                </button>
            </div>

            {/* Config panel */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 print:hidden">
                <div className="flex items-center gap-2 mb-5">
                    <Settings2 size={16} className="text-gray-400" />
                    <span className="text-sm font-black uppercase tracking-widest text-gray-400">Configuración</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                            Mesas del salón
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={200}
                            value={mesas}
                            onChange={e => setMesas(Math.max(1, Math.min(200, Number(e.target.value))))}
                            className="w-full bg-gray-50 border-2 border-transparent focus:border-black rounded-xl px-4 py-3 text-2xl font-black outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-amber-500 mb-2">
                            Lugares de barra
                        </label>
                        <input
                            type="number"
                            min={0}
                            max={50}
                            value={barra}
                            onChange={e => setBarra(Math.max(0, Math.min(50, Number(e.target.value))))}
                            className="w-full bg-amber-50 border-2 border-transparent focus:border-amber-400 rounded-xl px-4 py-3 text-2xl font-black outline-none transition-all"
                        />
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className={`mt-5 flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        saved
                            ? "bg-green-500 text-white"
                            : "bg-black text-white hover:bg-gray-800"
                    }`}
                >
                    {saved ? <><Check size={16} /> Guardado</> : "Guardar configuración"}
                </button>
            </div>

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

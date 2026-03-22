"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer, QrCode, Settings2, X, AlertTriangle, Pencil, Check } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type TableEntry = { id: number; label: string; type: string };

function QRModal({ table, baseUrl, onClose }: { table: TableEntry; baseUrl: string; onClose: () => void }) {
    const isBarra = table.type === "barra";
    const zona = table.type === "barra" ? "barra" : "mesa";
    const url = `${baseUrl}/menu?table=${table.id}&zona=${zona}&num=${table.label}`;

    function handlePrint() {
        const win = window.open("", "_blank", "width=420,height=540");
        if (!win) return;
        win.document.write(`<!DOCTYPE html><html><head><title>QR ${isBarra ? "Barra" : "Mesa"} ${table.label}</title>
        <style>
            body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;background:#fff}
            .card{display:flex;flex-direction:column;align-items:center;gap:10px;padding:32px;border:2px solid ${isBarra ? "#fbbf24" : "#e5e7eb"};border-radius:20px}
            .tag{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:${isBarra ? "#f59e0b" : "#9ca3af"}}
            .num{font-size:80px;font-weight:900;line-height:1;color:#111;margin:0}
            .hint{font-size:10px;color:#9ca3af;font-weight:600;margin-top:4px}
            @media print{body{margin:0}}
        </style></head><body>
        <div class="card">
            <p class="tag">${isBarra ? "Barra" : "Mesa"}</p>
            <p class="num">${table.label}</p>
            <div id="qr"></div>
            <p class="hint">Escaneá para pedir</p>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
        <script>QRCode.toCanvas(document.createElement('canvas'),"${url}",{width:220,margin:1},function(e,c){if(!e)document.getElementById('qr').appendChild(c);setTimeout(()=>{window.print();window.close()},300)});</script>
        </body></html>`);
        win.document.close();
    }

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className={`bg-white rounded-3xl p-10 flex flex-col items-center gap-4 shadow-2xl relative border-4 ${isBarra ? "border-bloom-400" : "border-gray-900"}`}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-300 hover:text-gray-700 transition-colors"
                >
                    <X size={22} />
                </button>

                <p className={`text-xs font-black uppercase tracking-widest ${isBarra ? "text-amber-500" : "text-gray-400"}`}>
                    {isBarra ? "Barra" : "Mesa"}
                </p>
                <p className="text-8xl font-black text-gray-900 leading-none">{table.label}</p>

                <div className="my-2">
                    <QRCodeSVG
                        value={url}
                        size={240}
                        level="M"
                        bgColor="#ffffff"
                        fgColor="#000000"
                    />
                </div>

                <p className="text-xs text-gray-400 font-medium">Escaneá para pedir</p>

                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 active:scale-95 transition-all mt-2 w-full justify-center"
                >
                    <Printer size={17} />
                    Imprimir este QR
                </button>
            </div>
        </div>
    );
}

function QRCard({ table, baseUrl, onClick }: { table: TableEntry; baseUrl: string; onClick: () => void }) {
    const isBarra = table.type === "barra";
    const url = `${baseUrl}/menu?table=${table.id}&zona=${table.type === "barra" ? "barra" : "mesa"}&num=${table.label}`;

    return (
        <button
            onClick={onClick}
            className={`bg-white flex flex-col items-center gap-2 p-4 rounded-2xl print:break-inside-avoid print:rounded-xl border-2 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all text-left w-full ${
                isBarra ? "border-bloom-400" : "border-gray-200"
            }`}
        >
            <p className={`text-[10px] font-black uppercase tracking-widest ${isBarra ? "text-amber-500" : "text-gray-400"}`}>
                {isBarra ? "Barra" : "Mesa"}
            </p>
            <p className="text-5xl font-black text-gray-900 leading-none">{table.label}</p>
            <div className="my-1 pointer-events-none">
                <QRCodeSVG value={url} size={130} level="M" bgColor="#ffffff" fgColor="#000000" />
            </div>
            <p className="text-[9px] text-gray-400 font-medium">Tocá para imprimir</p>
        </button>
    );
}

export default function QRCodesPage() {
    const supabase = createClient();
    const [mesas, setMesas] = useState(10);
    const [barra, setBarra] = useState(3);
    const [baseUrl, setBaseUrl] = useState("");
    const [editingUrl, setEditingUrl] = useState(false);
    const [urlInput, setUrlInput] = useState("");
    const [selected, setSelected] = useState<TableEntry | null>(null);
    const [loading, setLoading] = useState(true);

    const isLocalhost = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

    useEffect(() => {
        // Priority: env var > app_settings > window.origin
        const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
        if (envUrl) {
            setBaseUrl(envUrl);
            setUrlInput(envUrl);
        } else {
            setBaseUrl(window.location.origin);
            setUrlInput(window.location.origin);
        }

        const loadSettings = async () => {
            const { data } = await supabase
                .from("app_settings")
                .select("mesas, barra, site_url")
                .eq("id", 1)
                .single();
            if (data) {
                setMesas(data.mesas);
                setBarra(data.barra);
                // Saved site_url only overrides if no env var
                if (data.site_url && !process.env.NEXT_PUBLIC_SITE_URL) {
                    setBaseUrl(data.site_url);
                    setUrlInput(data.site_url);
                }
            }
            setLoading(false);
        };
        loadSettings();
    }, []);

    const saveUrl = async () => {
        const clean = urlInput.replace(/\/$/, ""); // remove trailing slash
        setBaseUrl(clean);
        setEditingUrl(false);
        // Save to app_settings
        await supabase.from("app_settings").update({ site_url: clean }).eq("id", 1);
    };

    const TABLES: TableEntry[] = Array.from({ length: mesas }, (_, i) => ({
        id: i + 1, label: String(i + 1), type: "mesa",
    }));

    const BAR_TABLES: TableEntry[] = Array.from({ length: barra }, (_, i) => ({
        id: mesas + i + 1, label: String(i + 1), type: "barra",
    }));

    const noConfig = !loading && mesas === 0 && barra === 0;

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="p-6 space-y-6 pb-24">
            {selected && (
                <QRModal table={selected} baseUrl={baseUrl} onClose={() => setSelected(null)} />
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center">
                        <QrCode size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Códigos QR</h1>
                        <p className="text-gray-400 text-sm font-medium">
                            {noConfig ? "Configurá tu salón en Ajustes" : `${mesas} mesas · ${barra} barra — tocá cualquiera para reimprimir`}
                        </p>
                    </div>
                </div>
                <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:border-gray-400 transition-all print:hidden"
                >
                    <Settings2 size={15} />
                    Ajustar mesas
                </Link>
            </div>

            {/* URL Banner — CRÍTICO */}
            <div className={`print:hidden rounded-2xl border-2 p-4 space-y-2 ${isLocalhost ? "border-red-300 bg-red-50" : "border-green-200 bg-green-50"}`}>
                {isLocalhost && (
                    <div className="flex items-center gap-2 text-red-600 font-black text-sm">
                        <AlertTriangle size={16} />
                        ¡Los QR apuntan a localhost! Los teléfonos no pueden escanearlos.
                        Ingresá la URL de producción (ej: https://tu-app.vercel.app)
                    </div>
                )}
                {!isLocalhost && (
                    <p className="text-green-700 font-black text-sm flex items-center gap-1.5">
                        <Check size={15} /> QR apuntan a: <span className="font-medium">{baseUrl}</span>
                    </p>
                )}
                {editingUrl ? (
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={urlInput}
                            onChange={e => setUrlInput(e.target.value)}
                            placeholder="https://tu-app.vercel.app"
                            className="flex-1 px-3 py-2 rounded-xl border-2 border-gray-200 text-sm font-medium outline-none focus:border-bloom-500"
                        />
                        <button onClick={saveUrl} className="px-4 py-2 bg-black text-white rounded-xl text-sm font-black">
                            Guardar
                        </button>
                        <button onClick={() => setEditingUrl(false)} className="px-3 py-2 bg-gray-100 rounded-xl text-sm">
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setEditingUrl(true)}
                        className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
                    >
                        <Pencil size={12} /> Cambiar URL
                    </button>
                )}
            </div>

            {/* Sin configuración */}
            {noConfig && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
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
                        {TABLES.map(t => (
                            <QRCard key={t.id} table={t} baseUrl={baseUrl} onClick={() => setSelected(t)} />
                        ))}
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
                        {BAR_TABLES.map(t => (
                            <QRCard key={t.id} table={t} baseUrl={baseUrl} onClick={() => setSelected(t)} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

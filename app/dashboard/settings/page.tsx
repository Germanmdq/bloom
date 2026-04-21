"use client";

import { useState, useEffect } from "react";
import { Save, Store, Sliders, Database, Printer, Shield, Download, LayoutGrid, Keyboard, Star, Check } from "lucide-react";
import type { ComparisonType } from "@/components/dashboard/SalesComparisonPanel";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

export default function SettingsPage() {
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(true);

    const [restaurantName, setRestaurantName] = useState("Bloom Cafe");
    const [address, setAddress] = useState("Av. Libertador 1234, CABA");
    const [phone, setPhone] = useState("5491112345678");
    const [taxRate, setTaxRate] = useState("21");
    const [currency, setCurrency] = useState("ARS");
    const [stockTracking, setStockTracking] = useState(true);
    const [printTickets, setPrintTickets] = useState(true);
    const [mesas, setMesas] = useState(10);
    const [barra, setBarra] = useState(3);
    const [f1Action, setF1Action] = useState<ComparisonType>('yesterday');
    const [f2Action, setF2Action] = useState<ComparisonType>('last_week');
    const [platoDiaProducts, setPlatoDiaProducts] = useState<any[]>([]);
    const [selectedPlatoDia, setSelectedPlatoDia] = useState<string | null>(null);
    const [savingPlatoDia, setSavingPlatoDia] = useState(false);
    const [fachadaImageUrl, setFachadaImageUrl] = useState("");

    useEffect(() => {
        const loadSettings = async () => {
            // Intento de carga robusto para evitar errores de esquema (400)
            try {
                const { data, error } = await supabase
                    .from("app_settings")
                    .select("id, mesas, barra, whatsapp, plato_del_dia_id, fachada_image_url")
                    .eq("id", 1)
                    .single();

                if (error) {
                    console.warn('[Settings] Carga principal falló, probando columnas individuales...', error.message);
                    // Probar columnas básicas una a una si falla la carga completa
                    const { data: base } = await supabase.from("app_settings").select("mesas, barra, whatsapp").eq("id", 1).maybeSingle();
                    if (base) {
                        setMesas(base.mesas || 10);
                        setBarra(base.barra || 3);
                        setPhone(base.whatsapp || "");
                    }
                } else if (data) {
                    setMesas(data.mesas);
                    setBarra(data.barra);
                    setPhone(data.whatsapp);
                    if (data.plato_del_dia_id) setSelectedPlatoDia(data.plato_del_dia_id);
                    if (typeof data.fachada_image_url === "string") setFachadaImageUrl(data.fachada_image_url);
                }
            } catch (err: any) {
                console.error('[Settings] Error en loadSettings:', err.message);
            }

            const savedF1 = localStorage.getItem('bloom_f1_action') as ComparisonType | null;
            const savedF2 = localStorage.getItem('bloom_f2_action') as ComparisonType | null;
            if (savedF1) setF1Action(savedF1);
            if (savedF2) setF2Action(savedF2);

            // Load Platos Diarios products
            const { data: catData } = await supabase
                .from('categories')
                .select('id')
                .ilike('name', '%plato%diario%')
                .single();
            if (catData) {
                const { data: prods } = await supabase
                    .from('products')
                    .select('id, name, image_url, kind')
                    .eq('category_id', catData.id)
                    .eq('active', true)
                    .order('name');
                if (prods) {
                    setPlatoDiaProducts(prods);
                    const featured = prods.find((p: any) => p.kind === 'plato_del_dia');
                    if (featured) setSelectedPlatoDia(featured.id);
                }
            }
            setIsLoading(false);
        };
        loadSettings();
    }, []);

    const handleSavePlatoDia = async (productId: string) => {
        setSavingPlatoDia(true);
        setSelectedPlatoDia(productId);
        // Guardar en app_settings
        const { error } = await supabase
            .from('app_settings')
            .update({ plato_del_dia_id: productId, updated_at: new Date().toISOString() })
            .eq('id', 1);
        if (error) {
            // Si la columna no existe aún, intentar con kind en products
            await supabase.from('products').update({ kind: 'plato_del_dia' }).eq('id', productId);
            console.error('app_settings error:', error.message);
        }
        setSavingPlatoDia(false);
    };

    const handleSave = async () => {
        setIsLoading(true);
        const payload: any = {
            mesas,
            barra,
            whatsapp: phone,
            updated_at: new Date().toISOString(),
        };

        // Attempt full update first
        const { error } = await supabase
            .from("app_settings")
            .update({
                ...payload,
                fachada_image_url: fachadaImageUrl.trim() || null,
            })
            .eq("id", 1);

        if (error) {
            console.warn('[Settings] Guardado completo falló, reintentando sin fachada_image_url...', error.message);
            // Fallback: try without the problematic column
            const { error: retryError } = await supabase
                .from("app_settings")
                .update(payload)
                .eq("id", 1);

            if (retryError) {
                alert("Error crítico al guardar: " + retryError.message);
            } else {
                alert("Ajustes guardados (Nota: fachada_image_url no se guardó porque la columna no existe en la DB).");
            }
        } else {
            alert("Ajustes guardados correctamente.");
        }

        // Save F-key actions to localStorage
        localStorage.setItem('bloom_f1_action', f1Action);
        localStorage.setItem('bloom_f2_action', f2Action);
        setIsLoading(false);
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-1">Ajustes</h1>
                    <p className="text-gray-500 font-medium text-sm">Configurá tu sistema POS.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="bg-black text-[#FFD60A] px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 self-start sm:self-auto"
                >
                    {isLoading ? "Guardando..." : <><Save size={18} /> Guardar</>}
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* RESTAURANT PROFILE */}
                <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-[#FFD60A]/20 flex items-center justify-center text-black">
                            <Store size={24} />
                        </div>
                        <h2 className="text-xl font-black text-gray-900">Perfil del Local</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black uppercase text-gray-400 mb-2">Nombre del Restaurante</label>
                            <input
                                type="text"
                                value={restaurantName}
                                onChange={(e) => setRestaurantName(e.target.value)}
                                className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none focus:ring-2 ring-[#FFD60A]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase text-gray-400 mb-2">Dirección</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none focus:ring-2 ring-[#FFD60A]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase text-gray-400 mb-2">Teléfono</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none focus:ring-2 ring-[#FFD60A]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase text-gray-400 mb-2">
                                URL imagen fachada (sitio público)
                            </label>
                            <input
                                type="url"
                                value={fachadaImageUrl}
                                onChange={(e) => setFachadaImageUrl(e.target.value)}
                                placeholder="https://….supabase.co/storage/v1/object/public/site/…"
                                className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none focus:ring-2 ring-[#FFD60A] text-sm"
                            />
                            <p className="text-[11px] text-gray-400 font-medium mt-1.5">
                                Vacío = imagen local. Podés pegar la URL tras subir con{" "}
                                <code className="text-gray-600">npm run upload:fachada</code>.
                            </p>
                        </div>
                    </div>
                </section>

                {/* SYSTEM PREFERENCES */}
                <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <Sliders size={24} />
                        </div>
                        <h2 className="text-xl font-black text-gray-900">Preferencias</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 mb-2">Impuestos (%)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={taxRate}
                                        onChange={(e) => setTaxRate(e.target.value)}
                                        className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none focus:ring-2 ring-blue-500"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-400">%</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black uppercase text-gray-400 mb-2">Moneda</label>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none focus:ring-2 ring-blue-500"
                                >
                                    <option value="ARS">ARS ($)</option>
                                    <option value="USD">USD (US$)</option>
                                    <option value="EUR">EUR (€)</option>
                                </select>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-gray-100">
                            <div className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${stockTracking ? 'bg-green-500' : 'bg-gray-200'}`} onClick={() => setStockTracking(!stockTracking)}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${stockTracking ? 'translate-x-4' : ''}`} />
                                    </div>
                                    <span className="font-bold text-sm">Control de Stock Activo</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-6 rounded-full p-1 transition-colors ${printTickets ? 'bg-green-500' : 'bg-gray-200'}`} onClick={() => setPrintTickets(!printTickets)}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${printTickets ? 'translate-x-4' : ''}`} />
                                    </div>
                                    <span className="font-bold text-sm">Imprimir Tickets Cocina</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SALON CONFIG */}
                <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 md:col-span-2">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-700">
                            <LayoutGrid size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Distribución del Salón</h2>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">Se usa para generar los QR de cada mesa</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 max-w-sm">
                        <div>
                            <label className="block text-xs font-black uppercase text-gray-400 mb-2">Mesas del salón</label>
                            <input
                                type="number"
                                min={1}
                                max={200}
                                value={mesas}
                                onChange={e => setMesas(Math.max(1, Math.min(200, Number(e.target.value))))}
                                className="w-full h-12 px-4 rounded-xl bg-gray-50 text-xl font-black outline-none focus:ring-2 ring-[#FFD60A]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase text-amber-500 mb-2">Lugares de barra</label>
                            <input
                                type="number"
                                min={0}
                                max={50}
                                value={barra}
                                onChange={e => setBarra(Math.max(0, Math.min(50, Number(e.target.value))))}
                                className="w-full h-12 px-4 rounded-xl bg-amber-50 text-xl font-black outline-none focus:ring-2 ring-bloom-400"
                            />
                        </div>
                    </div>
                </section>

                {/* KEYBOARD SHORTCUTS */}
                <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 md:col-span-2">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-[#FFD60A]/20 flex items-center justify-center text-black">
                            <Keyboard size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Atajos de Teclado</h2>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">
                                Configurá qué comparativa de ventas muestra cada tecla de función
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black uppercase text-gray-400 mb-2">
                                F1 — Comparativa
                            </label>
                            <select
                                value={f1Action}
                                onChange={(e) => setF1Action(e.target.value as ComparisonType)}
                                className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none focus:ring-2 ring-[#FFD60A]"
                            >
                                <option value="yesterday">Día Anterior</option>
                                <option value="last_week">Mismo Día — Semana Anterior</option>
                                <option value="last_month">Mismo Día — Mes Anterior</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase text-gray-400 mb-2">
                                F2 — Comparativa
                            </label>
                            <select
                                value={f2Action}
                                onChange={(e) => setF2Action(e.target.value as ComparisonType)}
                                className="w-full h-12 px-4 rounded-xl bg-gray-50 font-bold outline-none focus:ring-2 ring-[#FFD60A]"
                            >
                                <option value="yesterday">Día Anterior</option>
                                <option value="last_week">Mismo Día — Semana Anterior</option>
                                <option value="last_month">Mismo Día — Mes Anterior</option>
                            </select>
                        </div>
                    </div>
                    <p className="text-[11px] text-gray-400 font-medium mt-4">
                        Presioná F1 o F2 en cualquier pantalla del dashboard (fuera del POS) para ver la comparativa configurada.
                    </p>
                </section>

                {/* PLATO DEL DÍA */}
                <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 md:col-span-2">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-bloom-50 flex items-center justify-center text-bloom-600">
                            <Star size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Plato del Día</h2>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">El plato seleccionado se destacará en el menú público</p>
                        </div>
                        {savingPlatoDia && <span className="ml-auto text-xs text-gray-400 animate-pulse">Guardando...</span>}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {platoDiaProducts.map(product => {
                            const isSelected = selectedPlatoDia === product.id;
                            return (
                                <button
                                    key={product.id}
                                    onClick={() => handleSavePlatoDia(product.id)}
                                    className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-200 flex flex-col text-left ${
                                        isSelected ? 'border-bloom-600 shadow-lg shadow-bloom-100' : 'border-gray-100 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="relative h-28 bg-gray-100 w-full">
                                        {product.image_url ? (
                                            <Image src={product.image_url} alt={product.name} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                                        )}
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-bloom-600/20 flex items-center justify-center">
                                                <div className="bg-bloom-600 rounded-full p-1">
                                                    <Check size={16} className="text-white" strokeWidth={3} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <p className={`text-xs font-black leading-tight ${isSelected ? 'text-bloom-600' : 'text-gray-700'}`}>
                                            {product.name}
                                        </p>
                                        {isSelected && (
                                            <span className="inline-block mt-1 text-[10px] font-black uppercase bg-bloom-100 text-bloom-600 px-2 py-0.5 rounded-full">
                                                ⭐ Plato del día
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* DEVICE & DATA */}
                <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 md:col-span-2">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                            <Database size={24} />
                        </div>
                        <h2 className="text-xl font-black text-gray-900">Datos & Dispositivos</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            onClick={() => {
                                const currentPrinter = localStorage.getItem('bloom_printer_ip') || '';
                                const newPrinter = prompt("Ingresa la IP o Nombre de la Impresora de Red (simulada):", currentPrinter);
                                if (newPrinter !== null) {
                                    localStorage.setItem('bloom_printer_ip', newPrinter);
                                    alert(`Impresora configurada a: ${newPrinter}`);
                                    // Trigger browser print as test
                                    window.print();
                                }
                            }}
                            className="h-24 rounded-2xl bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center gap-2 group transition-all"
                        >
                            <Printer className="text-gray-400 group-hover:text-black transition-colors" />
                            <span className="text-xs font-black uppercase text-gray-400 group-hover:text-black">Configurar Impresora</span>
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    const { createClient } = await import("@/lib/supabase/client");
                                    const supabase = createClient();

                                    const { data: sales, error } = await supabase
                                        .from('orders')
                                        .select('*')
                                        .order('created_at', { ascending: false });

                                    if (error) throw error;

                                    if (!sales || sales.length === 0) {
                                        alert("No hay ventas para exportar.");
                                        return;
                                    }

                                    // Generate CSV
                                    const headers = ["ID", "Fecha", "Total", "Estado", "Mesa"];
                                    const rows = sales.map(sale => [
                                        sale.id,
                                        new Date(sale.created_at).toLocaleString(),
                                        sale.total,
                                        sale.status,
                                        sale.table_id || '-'
                                    ]);

                                    const csvContent = "data:text/csv;charset=utf-8,"
                                        + [headers, ...rows].map(e => e.join(",")).join("\n");

                                    const encodedUri = encodeURI(csvContent);
                                    const link = document.createElement("a");
                                    link.setAttribute("href", encodedUri);
                                    link.setAttribute("download", `ventas_bloom_${new Date().toISOString().slice(0, 10)}.csv`);
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);

                                } catch (error: any) {
                                    alert("Error al exportar: " + error.message);
                                }
                            }}
                            className="h-24 rounded-2xl bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center gap-2 group transition-all"
                        >
                            <Download className="text-gray-400 group-hover:text-black transition-colors" />
                            <span className="text-xs font-black uppercase text-gray-400 group-hover:text-black">Exportar Ventas CSV</span>
                        </button>
                        <button
                            onClick={() => {
                                if (confirm("ADVERTENCIA: ¿Estás seguro de que quieres resetear la configuración local del dispositivo? Se cerrará la sesión.")) {
                                    localStorage.clear();
                                    sessionStorage.clear();
                                    // Clear cookies manually if needed or let supabase handle signout
                                    document.cookie.split(";").forEach((c) => {
                                        document.cookie = c
                                            .replace(/^ +/, "")
                                            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                                    });
                                    window.location.href = "/";
                                }
                            }}
                            className="h-24 rounded-2xl bg-red-50 hover:bg-red-100 flex flex-col items-center justify-center gap-2 group transition-all"
                        >
                            <Shield className="text-red-300 group-hover:text-red-500 transition-colors" />
                            <span className="text-xs font-black uppercase text-red-300 group-hover:text-red-500">Resetear Sistema</span>
                        </button>
                    </div>
                </section>

            </div>
        </div>
    );
}

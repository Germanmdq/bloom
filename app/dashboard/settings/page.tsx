"use client";

import { useState } from "react";
import { Save, Store, Receipt, Sliders, Database, Printer, Bell, Shield, Download } from "lucide-react";
import { motion } from "framer-motion";

export default function SettingsPage() {
    const [isLoading, setIsLoading] = useState(false);

    // Mock State - In a real app, this would come from a DB or Context
    const [restaurantName, setRestaurantName] = useState("Bloom Cafe");
    const [address, setAddress] = useState("Av. Libertador 1234, CABA");
    const [phone, setPhone] = useState("+54 11 4455-6677");
    const [taxRate, setTaxRate] = useState("21");
    const [currency, setCurrency] = useState("ARS");
    const [stockTracking, setStockTracking] = useState(true);
    const [printTickets, setPrintTickets] = useState(true);

    const handleSave = () => {
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            alert("Ajustes guardados correctamente (Simulación)");
        }, 1000);
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Ajustes & Configuración</h1>
                    <p className="text-gray-500 font-medium">Personaliza el comportamiento de tu sistema POS.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="bg-black text-[#FFD60A] px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                >
                    {isLoading ? "Guardando..." : <><Save size={20} /> Guardar Cambios</>}
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

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

                {/* DEVICE & DATA */}
                <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 md:col-span-2">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                            <Database size={24} />
                        </div>
                        <h2 className="text-xl font-black text-gray-900">Datos & Dispositivos</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button className="h-24 rounded-2xl bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center gap-2 group transition-all">
                            <Printer className="text-gray-400 group-hover:text-black transition-colors" />
                            <span className="text-xs font-black uppercase text-gray-400 group-hover:text-black">Configurar Impresora</span>
                        </button>
                        <button className="h-24 rounded-2xl bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center gap-2 group transition-all">
                            <Download className="text-gray-400 group-hover:text-black transition-colors" />
                            <span className="text-xs font-black uppercase text-gray-400 group-hover:text-black">Exportar Ventas CSV</span>
                        </button>
                        <button className="h-24 rounded-2xl bg-red-50 hover:bg-red-100 flex flex-col items-center justify-center gap-2 group transition-all">
                            <Shield className="text-red-300 group-hover:text-red-500 transition-colors" />
                            <span className="text-xs font-black uppercase text-red-300 group-hover:text-red-500">Resetear Sistema</span>
                        </button>
                    </div>
                </section>

            </div>
        </div>
    );
}

"use client";
import { useState, useEffect } from "react";
import { Users, Search, Loader2 } from "lucide-react";

export default function ClientesPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    useEffect(() => { fetchClients(); }, []);

    async function fetchClients() {
        setLoading(true);
        const res = await fetch("/api/clientes");
        const data = await res.json();
        setClients(data);
        setLoading(false);
    }

    const filtered = clients.filter(c =>
        (c.full_name + c.email).toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-full">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-4xl font-black tracking-tight text-gray-900">Clientes</h2>
                    <p className="text-gray-500 font-medium">{clients.length} Registrados</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text" placeholder="Buscar..."
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        className="bg-white pl-12 pr-6 py-3.5 rounded-[1.5rem] border border-gray-100 shadow-sm w-80 outline-none focus:ring-4 focus:ring-black/5"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-40">
                    <Loader2 className="animate-spin text-gray-200" size={48} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {filtered.map(client => (
                        <div key={client.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-50 shadow-sm hover:shadow-xl transition-all cursor-pointer">
                            <div className="w-12 h-12 bg-gray-100 rounded-2xl mb-4 flex items-center justify-center font-black text-gray-400 text-lg">
                                {client.full_name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <h3 className="font-bold text-gray-900 truncate">{client.full_name || "Sin nombre"}</h3>
                            <p className="text-xs text-gray-400 truncate">{client.email}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

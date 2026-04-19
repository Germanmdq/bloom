"use client";
import { useState, useEffect } from "react";
import { UserPlus, Loader2 } from "lucide-react";

export default function PersonalPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newName, setNewName] = useState("");
    const [newRole, setNewRole] = useState("WAITER");

    useEffect(() => { fetchStaff(); }, []);

    async function fetchStaff() {
        setLoading(true);
        const res = await fetch("/api/personal");
        const data = await res.json();
        setStaff(data);
        setLoading(false);
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        await fetch("/api/personal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ full_name: newName, role: newRole })
        });
        setIsAdding(false);
        setNewName("");
        fetchStaff();
    }

    return (
        <div className="min-h-full">
            <div className="flex justify-between items-center mb-10">
                <h2 className="text-4xl font-black tracking-tight text-gray-900">Personal</h2>
                <button
                    onClick={() => setIsAdding(true)}
                    className="bg-black text-white px-6 py-3.5 rounded-[1.5rem] font-bold flex items-center gap-2 shadow-xl"
                >
                    <UserPlus size={20} /> Agregar
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-40">
                    <Loader2 className="animate-spin text-gray-200" size={48} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {staff.map(member => (
                        <div key={member.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm">
                            <div className="text-4xl mb-4">{member.role === 'WAITER' ? '🤵' : '👨‍🍳'}</div>
                            <h3 className="font-black text-xl">{member.full_name}</h3>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{member.role}</span>
                        </div>
                    ))}
                </div>
            )}

            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-md">
                    <div className="bg-white p-10 rounded-[3rem] w-full max-w-md shadow-2xl">
                        <h3 className="text-2xl font-black mb-6">Nuevo Empleado</h3>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <input
                                type="text" required placeholder="Nombre completo"
                                value={newName} onChange={e => setNewName(e.target.value)}
                                className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold"
                            />
                            <select
                                value={newRole} onChange={e => setNewRole(e.target.value)}
                                className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold appearance-none"
                            >
                                <option value="WAITER">Mesero</option>
                                <option value="KITCHEN">Cocina</option>
                            </select>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold">Cancelar</button>
                                <button type="submit" className="flex-1 bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Receipt, Plus, TrendingDown, Lightbulb, Flame, Home } from "lucide-react";

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    const [newExpense, setNewExpense] = useState({
        description: "",
        amount: "",
        category: "Servicios"
    });

    const supabase = createClient();

    useEffect(() => {
        fetchExpenses();
    }, []);

    async function fetchExpenses() {
        setLoading(true);
        const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .order('expense_date', { ascending: false });

        if (!error) setExpenses(data || []);
        setLoading(false);
    }

    async function handleAddExpense(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase
            .from('expenses')
            .insert([{
                description: newExpense.description,
                amount: parseFloat(newExpense.amount),
                category: newExpense.category
            }]);

        if (!error) {
            setIsAdding(false);
            setNewExpense({ description: "", amount: "", category: "Servicios" });
            fetchExpenses();
        } else {
            alert(`Error: ${error.message}`);
        }
        setLoading(false);
    }

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    return (
        <div className="pb-20">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Gastos</h2>
                    <p className="text-gray-500 mt-1">Control de costos del local</p>
                </div>
                <div className="bg-white/70 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/40 shadow-sm flex items-center gap-3">
                    <TrendingDown className="text-red-500" size={20} />
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Total Mes</p>
                        <p className="text-xl font-bold text-gray-900 leading-tight">${totalExpenses.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <button
                onClick={() => setIsAdding(true)}
                className="w-full mb-8 bg-white/40 hover:bg-white/60 backdrop-blur-md border border-dashed border-gray-300 rounded-[2rem] py-10 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-gray-900 transition-all group"
            >
                <div className="p-4 rounded-full bg-white shadow-sm group-hover:scale-110 transition-transform">
                    <Plus size={24} />
                </div>
                <span className="font-bold uppercase tracking-widest text-xs">Registrar Gasto</span>
            </button>

            <div className="space-y-4">
                {expenses.map((expense) => (
                    <motion.div
                        key={expense.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white/70 backdrop-blur-2xl p-6 rounded-3xl border border-white/40 shadow-sm flex items-center justify-between"
                    >
                        <div className="flex items-center gap-6">
                            <div className="p-4 rounded-2xl bg-gray-50 text-gray-400">
                                {expense.category === 'Luz' ? <Lightbulb size={24} /> :
                                    expense.category === 'Gas' ? <Flame size={24} /> :
                                        expense.category === 'Alquiler' ? <Home size={24} /> : <Receipt size={24} />}
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-gray-900">{expense.description}</h4>
                                <p className="text-sm text-gray-500">{new Date(expense.expense_date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold text-red-600">-${expense.amount.toLocaleString()}</p>
                            <span className="text-[10px] font-bold text-gray-400 border border-gray-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                {expense.category}
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Add Expense Modal */}
            <AnimatePresence>
                {isAdding && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                            onClick={() => setIsAdding(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white/90 backdrop-blur-3xl p-10 rounded-[2.5rem] border border-white/40 shadow-2xl w-full max-w-lg"
                        >
                            <h3 className="text-3xl font-bold text-gray-900 mb-8">Registrar Gasto</h3>
                            <form onSubmit={handleAddExpense} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Descripción</label>
                                    <input
                                        type="text"
                                        required
                                        value={newExpense.description}
                                        onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                                        className="w-full bg-white/50 border border-black/5 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-black/5 outline-none"
                                        placeholder="Ej: Factura de Luz Edesur"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Monto</label>
                                    <input
                                        type="number"
                                        required
                                        value={newExpense.amount}
                                        onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                        className="w-full bg-white/50 border border-black/5 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-black/5 outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Categoría</label>
                                    <select
                                        value={newExpense.category}
                                        onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                                        className="w-full bg-white/50 border border-black/5 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-black/5 outline-none appearance-none"
                                    >
                                        <option value="Servicios">Servicios</option>
                                        <option value="Luz">Luz</option>
                                        <option value="Gas">Gas</option>
                                        <option value="Alquiler">Alquiler</option>
                                        <option value="Mercadería">Mercadería</option>
                                        <option value="Otros">Otros</option>
                                    </select>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsAdding(false)}
                                        className="flex-1 py-4 rounded-2xl font-bold bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-2 py-4 px-8 rounded-2xl font-bold bg-red-600 text-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-red-500/20"
                                    >
                                        {loading ? "Registrando..." : "Guardar Gasto"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

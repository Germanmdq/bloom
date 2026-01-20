
"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useKitchenTickets } from "@/lib/hooks/use-pos-data";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle2, ChevronRight, CookingPot, Timer, MessageSquare, Loader2 } from "lucide-react";

type KitchenTicket = {
    id: string;
    table_id: number;
    items: { name: string; quantity: number }[];
    status: 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED';
    notes?: string;
    created_at: string;
};

export default function KitchenPage() {
    const queryClient = useQueryClient();
    const { data: tickets = [], isLoading } = useKitchenTickets();
    const supabase = createClient();

    useEffect(() => {
        // Subscribe to real-time changes with Optimistic Updates
        const channel = supabase
            .channel('kitchen_realtime')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'kitchen_tickets' },
                (payload) => {
                    queryClient.setQueryData(['kitchen_tickets'], (oldTickets: KitchenTicket[] = []) => {
                        if (payload.eventType === 'INSERT') {
                            return [...oldTickets, payload.new as KitchenTicket];
                        } else if (payload.eventType === 'UPDATE') {
                            const updated = payload.new as KitchenTicket;
                            if (updated.status === 'DELIVERED') {
                                return oldTickets.filter(t => t.id !== updated.id);
                            }
                            return oldTickets.map(t => t.id === updated.id ? updated : t);
                        } else if (payload.eventType === 'DELETE') {
                            return oldTickets.filter(t => t.id !== payload.old.id);
                        }
                        return oldTickets;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient, supabase]);

    async function updateStatus(id: string, currentStatus: string) {
        // Optimistic Update can be added here technically, but the Realtime subscription 
        // will handle the UI update immediately upon confirmation from DB. 
        // For true instant UI, we'd use useMutation's onMutate. 
        // Keeping it simple with the Supabase call for now as per instructions to use Realtime.

        const statusMap: Record<string, string> = {
            'PENDING': 'PREPARING',
            'PREPARING': 'READY',
            'READY': 'DELIVERED'
        };

        const nextStatus = statusMap[currentStatus];
        if (!nextStatus) return;

        await supabase
            .from('kitchen_tickets')
            .update({ status: nextStatus })
            .eq('id', id);
    }

    if (isLoading) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-10 font-black uppercase tracking-widest text-gray-400 gap-4">
            <Loader2 className="animate-spin text-[#FFD60A]" size={48} />
            Cargando Cocina...
        </div>
    );

    return (
        <div className="p-8 bg-[#F8F9FA] min-h-screen">
            <header className="flex items-center justify-between mb-12">
                <div>
                    <h1 className="text-5xl font-black tracking-tighter text-black uppercase">Panel de Cocina</h1>
                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Sistema en Tiempo Real • {tickets.length} comandas activas
                    </p>
                </div>
                <div className="bg-black text-[#FFD60A] px-6 py-4 rounded-3xl font-black flex items-center gap-3 shadow-xl">
                    <CookingPot size={24} />
                    Cocina Bloom v1.0
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence mode="popLayout">
                    {tickets.map((ticket: KitchenTicket) => (
                        <motion.div
                            key={ticket.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, x: -50 }}
                            className={`bg-white rounded-[3rem] p-8 shadow-sm border-2 transition-all flex flex-col ${ticket.status === 'READY' ? 'border-green-500 bg-green-50/20' :
                                ticket.status === 'PREPARING' ? 'border-orange-400 bg-orange-50/20' :
                                    'border-transparent shadow-2xl'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center text-2xl font-black">
                                        {ticket.table_id}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-xl text-black">Mesa {ticket.table_id}</h3>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                            <Clock size={12} />
                                            {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${ticket.status === 'READY' ? 'bg-green-500 text-white' :
                                    ticket.status === 'PREPARING' ? 'bg-orange-400 text-white' :
                                        'bg-gray-100 text-gray-400'
                                    }`}>
                                    {ticket.status === 'PENDING' ? 'Pendiente' :
                                        ticket.status === 'PREPARING' ? 'Preparando' : '¡Listo!'}
                                </span>
                            </div>

                            <div className="flex-1 space-y-4 mb-8">
                                {ticket.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-black/5">
                                        <span className="font-bold text-gray-900">{item.name}</span>
                                        <span className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center text-xs font-black">
                                            {item.quantity}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {ticket.notes && (
                                <div className="mb-8 p-4 bg-yellow-50 rounded-2xl border border-yellow-200 flex gap-3">
                                    <MessageSquare size={16} className="text-yellow-600 shrink-0 mt-1" />
                                    <p className="text-sm font-medium text-yellow-800 italic">{ticket.notes}</p>
                                </div>
                            )}

                            <button
                                onClick={() => updateStatus(ticket.id, ticket.status)}
                                className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-3 ${ticket.status === 'READY' ? 'bg-green-600 text-white hover:bg-green-700' :
                                    ticket.status === 'PREPARING' ? 'bg-black text-[#FFD60A] hover:scale-105' :
                                        'bg-black text-white hover:scale-105'
                                    }`}
                            >
                                {ticket.status === 'PENDING' && (
                                    <> <Timer size={20} /> Empezar a Preparar </>
                                )}
                                {ticket.status === 'PREPARING' && (
                                    <> <CheckCircle2 size={20} /> ¡Plato Listo! </>
                                )}
                                {ticket.status === 'READY' && (
                                    <> <ChevronRight size={20} /> Entregar a Mozo </>
                                )}
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {tickets.length === 0 && (
                <div className="flex flex-col items-center justify-center py-40 gap-6 opacity-20">
                    <CookingPot size={100} />
                    <p className="text-2xl font-black uppercase tracking-widest">No hay comandas pendientes</p>
                </div>
            )}
        </div>
    );
}

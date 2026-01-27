import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

export interface PedidoWhatsApp {
    id: number;
    numero_cliente: string;
    nombre_cliente: string;
    mensaje: string;
    items_parseados: any;
    estado: string;
    timestamp: string;
    total?: number;
}

interface WhatsAppStore {
    pedidos: PedidoWhatsApp[];
    isConnected: boolean;
    loading: boolean;
    setPedidos: (pedidos: PedidoWhatsApp[]) => void;
    addPedido: (pedido: PedidoWhatsApp) => void;
    updatePedido: (id: number, updates: Partial<PedidoWhatsApp>) => void;
    setConnected: (connected: boolean) => void;
    checkConnection: () => Promise<void>;
    cambiarEstado: (pedidoId: number, nuevoEstado: string) => Promise<void>;
}

export const useWhatsAppStore = create<WhatsAppStore>((set, get) => ({
    pedidos: [],
    isConnected: false,
    loading: true,

    setPedidos: (pedidos) => set({ pedidos, loading: false }),

    addPedido: (pedido) => set((state) => ({
        pedidos: [pedido, ...state.pedidos]
    })),

    updatePedido: (id, updates) => set((state) => ({
        pedidos: state.pedidos.map(p =>
            p.id === id ? { ...p, ...updates } : p
        )
    })),

    setConnected: (connected) => set({ isConnected: connected }),

    checkConnection: async () => {
        try {
            // Assuming the service runs on localhost:3001
            // In production this URL needs to be configured
            const response = await fetch('http://localhost:3001/api/status');
            const data = await response.json();
            set({ isConnected: data.connected });
        } catch (error) {
            set({ isConnected: false });
        }
    },

    cambiarEstado: async (pedidoId, nuevoEstado) => {
        const supabase = createClient();

        const { error } = await supabase
            .from('pedidos_whatsapp')
            .update({ estado: nuevoEstado })
            .eq('id', pedidoId);

        if (!error) {
            get().updatePedido(pedidoId, { estado: nuevoEstado });

            // Notificar al servicio de WhatsApp
            try {
                await fetch('http://localhost:3001/api/update-pedido', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pedidoId, estado: nuevoEstado })
                });
            } catch (e) {
                console.error('Failed to notify WhatsApp service', e);
            }
        }
    }
}));

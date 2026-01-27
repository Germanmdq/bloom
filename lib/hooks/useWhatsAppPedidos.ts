import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';
import { useWhatsAppStore } from '@/lib/store/whatsappStore';

export function useWhatsAppPedidos() {
    const supabase = createClient();
    const queryClient = useQueryClient();
    const { addPedido, updatePedido } = useWhatsAppStore();

    // Query para obtener pedidos
    const { data: pedidos, isLoading } = useQuery({
        queryKey: ['pedidos-whatsapp'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pedidos_whatsapp')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data;
        },
        refetchInterval: 30000, // Refetch cada 30 segundos
    });

    // Suscripción en tiempo real
    useEffect(() => {
        const channel = supabase
            .channel('pedidos-whatsapp-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'pedidos_whatsapp'
                },
                (payload) => {
                    console.log('New order received:', payload.new);
                    addPedido(payload.new as any);
                    queryClient.invalidateQueries({ queryKey: ['pedidos-whatsapp'] });

                    // Notificación del navegador
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification('Nuevo pedido de WhatsApp!', {
                            body: `Pedido de ${payload.new.nombre_cliente}`,
                            // icon: '/icon-whatsapp.png',
                            tag: `pedido-${payload.new.id}`
                        });
                    }

                    // Audio could be added here
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'pedidos_whatsapp'
                },
                (payload) => {
                    updatePedido(payload.new.id, payload.new as any);
                    queryClient.invalidateQueries({ queryKey: ['pedidos-whatsapp'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [addPedido, updatePedido, queryClient, supabase]);

    // Mutation para cambiar estado
    const cambiarEstadoMutation = useMutation({
        mutationFn: async ({ id, estado }: { id: number; estado: string }) => {
            const { error } = await supabase
                .from('pedidos_whatsapp')
                .update({ estado })
                .eq('id', id);

            if (error) throw error;

            // Notificar al servicio de WhatsApp
            await fetch('http://localhost:3001/api/update-pedido', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pedidoId: id, estado })
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pedidos-whatsapp'] });
        }
    });

    return {
        pedidos,
        isLoading,
        cambiarEstado: cambiarEstadoMutation.mutate,
        isUpdating: cambiarEstadoMutation.isPending
    };
}

import { useEffect } from 'react';
import { createClient } from '../supabase/client';
import { toast } from 'sonner';

const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export function useOrderNotification() {
    const supabase = createClient();

    useEffect(() => {
        const channel = supabase
            .channel('dashboard-orders-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'orders',
                },
                (payload: any) => {
                    console.log('🔔 New Order:', payload);
                    const newOrder = payload.new;
                    const total = Number(newOrder.total ?? 0);
                    const customer = newOrder.customer_name || `Pedido #${newOrder.id?.slice(0, 4)}`;
                    const isWeb = newOrder.order_type === 'web';
                    
                    toast.success(`Nuevo pedido: ${customer}`, {
                        description: `Total: $${total.toLocaleString()}`,
                        duration: 8000,
                    });

                    // Only play sound for remote/web orders to avoid self-sound during POS checkout
                    if (isWeb) {
                        const audio = new Audio(NOTIFICATION_SOUND_URL);
                        audio.play().catch(e => console.log('Audio play failed', e));
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'kitchen_tickets',
                },
                (payload: any) => {
                    console.log('🔔 New Kitchen Ticket:', payload);
                    const ticket = payload.new;
                    
                    toast.info(`Comanda Mesa ${ticket.table_id}`, {
                        description: 'Nuevo pedido enviado a cocina',
                        duration: 5000,
                    });

                    // Sound for kitchen ticket
                    const audio = new Audio(NOTIFICATION_SOUND_URL);
                    audio.play().catch(e => console.log('Audio play failed', e));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase]);
}

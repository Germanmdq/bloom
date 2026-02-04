
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { BloomAgent } from "@/lib/bloom-agent";

const supabase = createClient();

export function useProducts() {
    return useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('active', true)
                .order('name');
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('sort_order', { ascending: true }); // ← ORDEN CORRECTO

            if (error) throw error;
            return data; // ← SIN SORTING ADICIONAL
        },
        staleTime: 1000 * 60 * 60,
    });
}

export function useSendKitchenTicket() {
    return useMutation({
        mutationFn: async (ticket: { table_id: string; items: any[]; notes: string }) => {
            const { data, error } = await supabase
                .from('kitchen_tickets')
                .insert([{
                    table_id: ticket.table_id,
                    items: ticket.items,
                    notes: ticket.notes,
                    status: 'PENDING'
                }])
                .select();
            if (error) throw error;
            return data;
        }
    });
}

export function useCreateOrder() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (orderData: any) => {
            // Map Cart Items to Bloom Agent Format
            const items = orderData.items.map((i: any) => ({
                product_id: i.id, // Cart has 'id', Agent needs 'product_id'
                quantity: i.quantity,
                price: i.price,
                name: i.name
            }));

            // Use Bloom Agent to Validate Stock & Process Sale
            return await BloomAgent.processOrder({
                table_id: orderData.table_id,
                items: items,
                payment_method: orderData.payment_method,
                waiter_id: orderData.waiter_id
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        }
    });
}

export function useKitchenTickets() {
    return useQuery({
        queryKey: ['kitchen_tickets'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('kitchen_tickets')
                .select('*')
                .neq('status', 'DELIVERED')
                .order('created_at', { ascending: true });
            if (error) throw error;
            return data;
        },
        staleTime: 5000, // Fallback: 5 seconds if Realtime fails
    });
}

export function useStock() {
    return useQuery({
        queryKey: ['stock'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('v_stock')
                .select('*')
                .order('name');
            if (error) throw error;
            return data;
        },
        staleTime: 0, // Always fetch fresh stock
    });
}

export function useInventoryMovements() {
    return useQuery({
        queryKey: ['inventory_movements'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inventory_movements')
                .select('*, products(name, unit)')
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            return data;
        },
    });
}

export function useCreateMovement() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (movement: any) => {
            const { data, error } = await supabase
                .from('inventory_movements')
                .insert([movement])
                .select();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock'] });
            queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
        }
    });
}

export function useUserRole() {
    return useQuery({
        queryKey: ['user_role'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return 'WAITER'; // Default safe fallback

            const { data, error } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (error) {
                // If profile doesn't exist yet, return waiter/default
                return 'WAITER';
            }
            return data?.role || 'WAITER';
        },
        staleTime: 1000 * 60 * 10, // Cache for 10 min
    });
}

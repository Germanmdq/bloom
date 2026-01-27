
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

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
                .order('name');
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 60, // 1 hour
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
            const { data, error } = await supabase
                .from('orders')
                .insert([orderData])
                .select();
            if (error) throw error;
            return data;
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
        staleTime: 1000 * 60, // 1 minute
    });
}

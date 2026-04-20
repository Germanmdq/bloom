import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET() {
    const svc = createServiceRoleClient();
    
    // Fetch customers joined with their orders to calculate stats
    const { data: profiles, error } = await svc
        .from("profiles")
        .select(`
            id, 
            full_name, 
            email, 
            phone,
            points,
            created_at,
            orders(total, created_at)
        `)
        .eq("is_customer", true)
        .order("full_name");

    if (error) {
        console.error("Error fetching clients:", error);
        return NextResponse.json([], { status: 500 });
    }

    // Process and aggregate stats for each customer
    const processedClients = (profiles || []).map((p: any) => {
        const orders = p.orders || [];
        const totalSpent = orders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
        const orderCount = orders.length;
        
        // Find last order date
        let lastOrderAt = null;
        if (orders.length > 0) {
            const dates = orders.map((o: any) => new RegExp(o.created_at).test('Z') ? new Date(o.created_at).getTime() : new Date(o.created_at + 'Z').getTime());
            lastOrderAt = new Date(Math.max(...dates)).toISOString();
        }

        return {
            id: p.id,
            full_name: p.full_name,
            email: p.email,
            phone: p.phone,
            points: p.points || 0,
            created_at: p.created_at,
            total_spent: totalSpent,
            order_count: orderCount,
            last_order_at: lastOrderAt
        };
    });

    return NextResponse.json(processedClients);
}

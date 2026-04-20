import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET() {
    const svc = createServiceRoleClient();
    
    // Fetch profiles that are marked as customers OR don't have staff roles
    // This ensures that existing clients who weren't explicitly marked show up
    const STAFF_ROLES = ["ADMIN", "WAITER", "KITCHEN", "MANAGER"];
    
    const { data: profiles, error } = await svc
        .from("profiles")
        .select(`
            id, 
            full_name, 
            email, 
            phone,
            points,
            created_at,
            is_customer,
            role,
            orders(total, created_at)
        `)
        .order("full_name");

    if (error) {
        console.error("Error fetching clients:", error);
        return NextResponse.json([], { status: 500 });
    }

    // Filter: Include if is_customer is true OR if they don't have a staff role
    const filteredProfiles = (profiles || []).filter((p: any) => 
        p.is_customer === true || !STAFF_ROLES.includes(p.role)
    );

    // Process and aggregate stats for each customer
    const processedClients = filteredProfiles.map((p: any) => {
        const orders = p.orders || [];
        const totalSpent = orders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
        const orderCount = orders.length;
        
        // Find last order date
        let lastOrderAt = null;
        if (orders.length > 0) {
            try {
                const dates = orders.map((o: any) => new Date(o.created_at).getTime());
                lastOrderAt = new Date(Math.max(...dates)).toISOString();
            } catch (e) {
                console.error("Date processing error:", e);
            }
        }

        return {
            id: p.id,
            full_name: p.full_name || "Cliente S/N",
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

import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET() {
    try {
        const svc = createServiceRoleClient();
        
        // 1. Fetch profiles first (Simpler query to avoid join errors)
        const { data: profiles, error: pError } = await svc
            .from("profiles")
            .select("id, full_name, email, phone, points, created_at, is_customer, role")
            .order("full_name");

        if (pError) throw pError;

        // 2. Fetch ALL orders to aggregate (More robust than join if schema is unstable)
        const { data: allOrders, error: oError } = await svc
            .from("orders")
            .select("customer_id, total, created_at");

        if (oError) {
            console.warn("Could not fetch orders for stats, showing basic profiles:", oError);
        }

        const STAFF_ROLES = ["ADMIN", "WAITER", "KITCHEN", "MANAGER"];
        const orders = allOrders || [];

        // 3. Process and aggregate
        const processedClients = (profiles || [])
            .filter((p: any) => p.is_customer === true || !STAFF_ROLES.includes(p.role))
            .map((p: any) => {
                const clientOrders = orders.filter((o: any) => o.customer_id === p.id);
                const totalSpent = clientOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
                const orderCount = clientOrders.length;
                
                let lastOrderAt = null;
                if (clientOrders.length > 0) {
                    try {
                        const dates = clientOrders.map((o: any) => new Date(o.created_at).getTime());
                        lastOrderAt = new Date(Math.max(...dates)).toISOString();
                    } catch (e) {}
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
    } catch (err: any) {
        console.error("CRITICAL ERROR in /api/clientes:", err);
        return NextResponse.json({ 
            error: "Internal Server Error", 
            message: err.message,
            hint: "Check if all columns (is_customer, points, phone, role) exist in profiles table"
        }, { status: 500 });
    }
}

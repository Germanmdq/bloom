import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(req: Request) {
    try {
        const { clientId, amount } = await req.json();
        if (!clientId) return NextResponse.json({ error: "Client ID required" }, { status: 400 });

        const svc = createServiceRoleClient();

        // Si amount es undefined, ponemos el balance en 0 (Saldar toda la deuda)
        // Si no, restamos el monto del balance actual
        if (amount === undefined) {
            const { error } = await svc
                .from("profiles")
                .update({ balance: 0 })
                .eq("id", clientId);
            
            if (error) throw error;
        } else {
            // Obtener balance actual
            const { data: profile } = await svc
                .from("profiles")
                .select("balance")
                .eq("id", clientId)
                .single();
            
            const currentBalance = Number(profile?.balance || 0);
            const newBalance = currentBalance - Number(amount);

            const { error } = await svc
                .from("profiles")
                .update({ balance: newBalance })
                .eq("id", clientId);
            
            if (error) throw error;
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Error paying balance:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

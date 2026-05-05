import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function POST(req: Request) {
    try {
        const { clientId, amount, method } = await req.json();
        if (!clientId) return NextResponse.json({ error: "Client ID required" }, { status: 400 });

        const svc = createServiceRoleClient();

        const { data: profile } = await svc
            .from("profiles")
            .select("balance")
            .eq("id", clientId)
            .single();

        const currentBalance = Number(profile?.balance || 0);
        const paidAmount = amount !== undefined ? Number(amount) : currentBalance;
        const newBalance = currentBalance - paidAmount;

        const { error } = await svc
            .from("profiles")
            .update({ balance: newBalance })
            .eq("id", clientId);

        if (error) throw error;

        // Registrar en historial de pagos
        await svc.from("payments_history").insert({
            profile_id: clientId,
            amount: paidAmount,
            method: method || "CASH",
            remaining_balance: newBalance,
        });

        // Insertar en orders para que aparezca en la caja diaria
        const { data: prof } = await svc.from("profiles").select("full_name").eq("id", clientId).single();
        await svc.from("orders").insert({
            total: paidAmount,
            payment_method: method || "CASH",
            status: "completed",
            paid: true,
            customer_id: clientId,
            customer_name: prof?.full_name ?? null,
            items: [{ id: "cc-payment", name: "Pago Cuenta Corriente", price: paidAmount, quantity: 1 }],
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Error paying balance:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

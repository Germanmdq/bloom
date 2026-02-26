"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OrderSheet } from "@/components/dashboard/OrderSheet";
import { useOrderStore } from "@/lib/store/order-store";

export default function TableOrderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const tableId = parseInt(id);
    const router = useRouter();
    const clearCart = useOrderStore((s) => s.clearCart);

    // Limpiar el carrito al entrar a una mesa para no arrastrar
    // ítems de la mesa anterior (el total previo queda en salon_tables.total
    // y OrderSheet lo carga como "Cargos Previos")
    useEffect(() => {
        clearCart();
    }, [tableId]);

    if (isNaN(tableId)) {
        router.replace("/dashboard/tables");
        return null;
    }

    return (
        <OrderSheet
            tableId={tableId}
            onClose={() => router.push("/dashboard/tables")}
            onOrderComplete={() => router.push("/dashboard/tables")}
        />
    );
}

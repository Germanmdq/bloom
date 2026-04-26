/**
 * Formats a payment receipt for ESC/POS thermal printers.
 * Returns a string formatted with standard thermal printer widths (e.g. 32-42 chars).
 */
export function formatDebtPaymentTicket(data: {
    customer_name: string;
    amount_paid: number;
    remaining_balance: number;
    date: string;
}) {
    const cafeName = "BLOOM CAFÉ";
    const date = new Date(data.date).toLocaleString("es-AR");
    
    const lines = [
        "\x1b\x61\x01", // Center align
        "\x1b\x45\x01", // Bold on
        cafeName,
        "\x1b\x45\x00", // Bold off
        "--------------------------------",
        "COMPROBANTE DE PAGO",
        "DE SALDO PENDIENTE",
        "--------------------------------",
        "\x1b\x61\x00", // Left align
        `Fecha: ${date}`,
        `Cliente: ${data.customer_name}`,
        "--------------------------------",
        "\x1b\x45\x01", // Bold on
        `MONTO PAGADO: $${data.amount_paid.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
        "\x1b\x45\x00", // Bold off
        `SALDO RESTANTE: $${data.remaining_balance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`,
        "--------------------------------",
        "\x1b\x61\x01", // Center align
        "¡Gracias por tu pago!",
        "bloom-cafe.com.ar",
        "\n\n\n\n\x1d\x56\x42\x00", // Cut paper
    ];

    return lines.join("\n");
}

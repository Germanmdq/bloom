/** Colores POS: local (mesa salón) = rojo, delivery = azul, retiro = amarillo */

export type TableChannel = "local" | "delivery" | "retiro";

export function tableChannelFromId(id: number): TableChannel {
    if (id >= 100) return "retiro";
    if (id >= 40) return "delivery";
    return "local";
}

/** Tarjeta ocupada — degradado de fondo */
export function occupiedCardGradient(id: number): string {
    const ch = tableChannelFromId(id);
    if (ch === "retiro") return "bg-gradient-to-br from-amber-400 to-amber-600";
    if (ch === "delivery") return "bg-gradient-to-br from-blue-500 to-blue-700";
    return "bg-gradient-to-br from-red-500 to-red-700";
}

/** Barra de tiempo dentro de la tarjeta */
export function occupiedTimeBarFill(id: number, minutes: number): string {
    if (minutes > 60) return "bg-white/90";
    if (minutes > 30) return "bg-white/60";
    return "bg-white/40";
}

/** Lista: fila seleccionada */
export function listRowSelectedClass(id: number): string {
    const ch = tableChannelFromId(id);
    if (ch === "retiro") return "bg-amber-50 border-r-2 border-amber-500";
    if (ch === "delivery") return "bg-blue-50 border-r-2 border-blue-500";
    return "bg-red-50 border-r-2 border-red-500";
}

export function listPulseDotClass(id: number): string {
    const ch = tableChannelFromId(id);
    if (ch === "retiro") return "bg-amber-500";
    if (ch === "delivery") return "bg-blue-500";
    return "bg-red-500";
}

export function listSubPriceClass(id: number): string {
    const ch = tableChannelFromId(id);
    if (ch === "retiro") return "text-amber-700";
    if (ch === "delivery") return "text-blue-700";
    return "text-red-700";
}

/** Barra superior del panel de pedido (mesa / delivery / retiro) */
export function orderSheetHeaderBorderClass(tableId: number): string {
    if (tableId === 998) return "border-t-4 border-t-amber-500";
    if (tableId === 999) return "border-t-4 border-t-blue-600";
    if (tableId >= 100) return "border-t-4 border-t-amber-500";
    if (tableId >= 40) return "border-t-4 border-t-blue-600";
    return "border-t-4 border-t-red-600";
}

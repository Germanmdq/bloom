/** Mesas virtuales POS para pedidos web (OrderSheet / WebOrderList). */
export const WEB_ORDER_TABLE_RETIRO = 998;
export const WEB_ORDER_TABLE_DELIVERY = 999;

/**
 * Incluye filas antiguas con `table_id` null pero `order_type` web y tipo de entrega coherente.
 */
export function orderMatchesWebVirtualTable(
  o: { table_id?: number | null; delivery_type?: string | null; order_type?: string | null },
  virtualTableId: number
): boolean {
  if (o.table_id === virtualTableId) return true;
  const isWeb = String(o.order_type ?? "").toLowerCase() === "web";
  if (!isWeb) return false;
  if (o.table_id != null && o.table_id !== virtualTableId) return false;
  const dt = String(o.delivery_type ?? "").toLowerCase();
  if (virtualTableId === WEB_ORDER_TABLE_DELIVERY) return dt === "delivery";
  if (virtualTableId === WEB_ORDER_TABLE_RETIRO) return dt === "local" || dt === "retiro";
  return false;
}

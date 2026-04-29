"use client";

import { CartItem } from "@/lib/store/order-store";
import { useEffect } from "react";

interface ReceiptModalProps {
    tableId: number;
    invoiceType: string;
    extraTotal: number;
    cart: CartItem[];
    total: number;
    customerName?: string;
    isKitchen?: boolean;
    onClose: () => void;
}

export function ReceiptModal({ tableId, invoiceType, extraTotal, cart, total, customerName, isKitchen = false, onClose }: ReceiptModalProps) {
    useEffect(() => {
        const escapeHtml = (s: unknown) =>
            String(s ?? "")
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#039;");

        const now = new Date();
        const headerLeft = customerName ? `Alias: ${customerName}` : `Mesa: ${tableId}`;
        const headerRight = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        const itemsHtml = cart
            .map((item) => {
                const name = escapeHtml(item.name);
                const notes = (item as any)?.notes ? `<div class="note">Nota: ${escapeHtml((item as any).notes)}</div>` : "";
                const qty = Number(item.quantity || 1);
                const price = Number((item as any)?.price || 0);
                const lineTotal = (price * qty).toLocaleString();
                return `
                    <div class="row">
                        <div class="col name">
                            <div class="item-name">${name}</div>
                            ${notes}
                        </div>
                        <div class="col qty">x${qty}</div>
                        ${isKitchen ? "" : `<div class="col total">$${escapeHtml(lineTotal)}</div>`}
                    </div>
                `;
            })
            .join("");

        const itemsCount = cart.reduce((s, i) => s + (Number(i.quantity) || 0), 0);

        const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${isKitchen ? "Comanda" : "Ticket"} ${escapeHtml(tableId)}</title>
    <style>
      /* Algunos drivers de térmicas recortan el final si el alto es "auto".
         Forzamos una "hoja" muy larga y además dejamos margen inferior. */
      @page { margin: 0 0 25mm 0; size: 72mm auto; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body { width: 72mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; }
      .ticket { width: 72mm; padding: 12px 12px 30mm 12px; box-sizing: border-box; }
      .center { text-align: center; }
      .h1 { font-weight: 900; font-size: 22px; letter-spacing: -0.02em; line-height: 1; }
      .sub { font-weight: 800; font-size: 10px; text-transform: uppercase; margin-top: 4px; }
      .dash { border-bottom: 1px dashed #000; margin: 8px 0; }
      .meta { display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; }
      .head { margin-bottom: 8px; }
      .cols { display: grid; grid-template-columns: ${isKitchen ? "1fr 40px" : "1fr 20px 60px"}; gap: 6px; align-items: start; }
      .cols.header { font-size: 10px; font-weight: 900; border-bottom: 1px solid #000; padding-bottom: 4px; }
      .row { display: grid; grid-template-columns: ${isKitchen ? "1fr 40px" : "1fr 20px 60px"}; gap: 6px; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; line-height: 1.15; }
      .name { min-width: 0; }
      .item-name { font-weight: 800; }
      .note { font-size: 9px; font-style: italic; color: #4b5563; margin-top: 2px; }
      .qty, .total { text-align: right; font-weight: 900; }
      .total { font-weight: 800; }
      .sum { border-top: 2px solid #000; padding-top: 8px; margin-top: 6px; }
      .sumline { display: flex; justify-content: space-between; align-items: baseline; }
      .sumline .label { font-weight: 900; font-size: 18px; letter-spacing: -0.02em; }
      .sumline .value { font-weight: 900; font-size: 18px; letter-spacing: -0.02em; }
      .sumsub { display: flex; justify-content: space-between; font-size: 10px; font-weight: 800; opacity: 0.6; margin-top: 2px; }
      .end { text-align: center; opacity: 0.85; padding: 14px 0 0 0; border-top: 1px dashed #000; margin-top: 10px; }
      .end .msg { font-size: 11px; font-weight: 800; }
      .end .site { font-size: 9px; margin-top: 2px; }
      /* Extra padding real para evitar que el corte se coma el final */
      .pad { height: 40mm; }
    </style>
  </head>
  <body>
    <div class="ticket">
      <div class="head center">
        <div class="h1">${isKitchen ? "COMANDA" : "BLOOM"}</div>
        <div class="sub">${isKitchen ? "ORDEN DE PRODUCCIÓN" : "IconCoffee & More"}</div>
        <div class="dash"></div>
        <div class="meta">
          <div>${escapeHtml(headerLeft)}</div>
          <div>${escapeHtml(headerRight)}</div>
        </div>
      </div>

      <div class="cols header">
        <div>ITEM</div>
        <div style="text-align:right">CANT</div>
        ${isKitchen ? "" : `<div style="text-align:right">TOTAL</div>`}
      </div>
      ${itemsHtml}

      ${isKitchen ? "" : `
        <div class="sum">
          <div class="sumline">
            <div class="label">TOTAL</div>
            <div class="value">$${escapeHtml(Number(total || 0).toLocaleString())}</div>
          </div>
          <div class="sumsub">
            <div>${escapeHtml(itemsCount)} Items</div>
            <div>Abonado</div>
          </div>
        </div>
      `}

      <div class="end">
        <div class="msg">${isKitchen ? "--- FIN DE COMANDA ---" : "¡GRACIAS POR TU VISITA!"}</div>
        ${isKitchen ? "" : `<div class="site">bloommdp.com</div>`}
      </div>

      <div class="pad"></div>
    </div>
  </body>
</html>`;

        const iframe = document.createElement("iframe");
        iframe.setAttribute("aria-hidden", "true");
        iframe.tabIndex = -1;
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.style.opacity = "0";
        iframe.style.pointerEvents = "none";
        document.body.appendChild(iframe);

        const cleanup = () => {
            try {
                iframe.remove();
            } catch {}
        };

        // Cargamos el HTML por srcdoc y esperamos onload para evitar impresión en blanco.
        iframe.srcdoc = html;

        const win = iframe.contentWindow;
        if (!win) {
            cleanup();
            onClose();
            return;
        }

        const handleAfterPrint = () => {
            try {
                win.removeEventListener("afterprint", handleAfterPrint);
            } catch {}
            cleanup();
            onClose();
        };

        win.addEventListener("afterprint", handleAfterPrint);

        const timer = window.setTimeout(() => {
            // Fallback si onload no dispara (raro): evitamos dejar el iframe colgado.
            handleAfterPrint();
        }, 15000);

        iframe.onload = async () => {
            try {
                // Esperar a que el documento esté completamente listo.
                const doc = win.document;
                if (doc.readyState !== "complete") {
                    await new Promise<void>((resolve) => {
                        const onReady = () => {
                            if (doc.readyState === "complete") {
                                doc.removeEventListener("readystatechange", onReady);
                                resolve();
                            }
                        };
                        doc.addEventListener("readystatechange", onReady);
                    });
                }

                // Esperar fonts si el navegador lo soporta (ayuda a evitar impresión vacía).
                const fontsReady: Promise<unknown> | undefined = (doc as any)?.fonts?.ready;
                if (fontsReady) await fontsReady;

                // 2 frames para asegurar layout final.
                await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

                // Fuerza reflow.
                void doc.body?.offsetHeight;
                win.focus();
                win.print();
            } catch {
                handleAfterPrint();
            }
        };

        return () => {
            window.clearTimeout(timer);
            try {
                win.removeEventListener("afterprint", handleAfterPrint);
            } catch {}
            cleanup();
        };
    }, [cart, customerName, isKitchen, onClose, tableId, total]);

    // No renderizamos UI: esto es solo un “job” de impresión
    return null;
}

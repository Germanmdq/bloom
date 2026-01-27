
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CartItem } from '@/lib/store/order-store';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export type Suggestion = {
    item: string;
    reason: string;
    price: number;
};

// Cache suggestions to avoid spamming API on every render
let suggestionCache: Record<string, Suggestion[]> = {};

export async function getUpsellSuggestions(currentCart: CartItem[]): Promise<Suggestion[]> {
    if (!apiKey) {
        console.warn("Gemini API Key missing");
        return [];
    }

    if (currentCart.length === 0) return [];

    // Simple cache key based on item names
    const cacheKey = currentCart.map(i => i.name).sort().join('|');
    if (suggestionCache[cacheKey]) return suggestionCache[cacheKey];

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
        Eres un experto camarero vendedor.
        Orden actual: ${currentCart.map(i => i.name).join(', ')}.
        
        Sugiere 2 productos complementarios del menú para aumentar la venta (upselling).
        Deben ser cosas que combinen bien.
        
        Responde SOLO un array JSON válido, sin markdown, con este formato:
        [
            {"item": "Nombre del producto", "reason": "Razón corta y persuasiva (max 5 palabras)", "price": 0}
        ]
        
        Ejemplos de precios: Café (2500), Medialuna (1200), Tostado (4500), Jugo (3000), Agua (2000), Postre (3500).
        Inventa un precio realista si no lo sabes.
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean markdown if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const suggestions = JSON.parse(jsonStr);

        suggestionCache[cacheKey] = suggestions;
        return suggestions;
    } catch (error) {
        console.error("Gemini Upsell Error:", error);
        return [];
    }
}

export async function estimatePrepTime(ticketCount: number, activeItems: number): Promise<number> {
    if (!apiKey) return 15; // Default fallback

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Simple heuristic + AI adjustment
    const prompt = `
        Cocina de restaurante.
        Tickets pendientes: ${ticketCount}.
        Total platos individuales a preparar: ${activeItems}.
        
        Estima el tiempo de espera en minutos para un NUEVO pedido que entre ahora.
        Considera que cada cocinero saca 1 plato cada 5-8 minutos y hay 2 cocineros.
        
        Responde SOLO el número (ej: 25).
    `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const minutes = parseInt(text.replace(/\D/g, ''));
        return isNaN(minutes) ? 15 : minutes;
    } catch (error) {
        return 15;
    }
}


import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY
});

export async function POST(request: NextRequest) {
    try {
        const { currentOrder, availableProducts } = await request.json();

        // Valida que tengas productos disponibles
        if (!availableProducts || availableProducts.length === 0) {
            return NextResponse.json({ suggestions: [] });
        }

        const orderItems = currentOrder.map((i: any) => i.name).join(', ');

        // Lista de productos disponibles para que la IA elija SOLO de ahí
        const menuList = availableProducts
            .map((p: any) => `${p.name} ($${p.price})`)
            .join(', ');

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `Eres un asistente de ventas de restaurante. SOLO puedes sugerir productos que existen en el menú. 
          
REGLA CRÍTICA: Responde ÚNICAMENTE con productos de la lista del menú proporcionada. NO inventes productos.

Respondes SOLO en JSON válido, sin texto adicional.`
                },
                {
                    role: "user",
                    content: `Orden actual del cliente: ${orderItems || 'vacía'}

MENÚ DISPONIBLE (SOLO sugiere de esta lista):
${menuList}

Instrucciones:
1. Sugiere 2 productos del MENÚ que complementen la orden
2. Usa el NOMBRE EXACTO y PRECIO EXACTO del menú
3. Si la orden está vacía, sugiere los productos más populares
4. NO inventes productos que no estén en el menú

Responde EXACTAMENTE en este formato JSON:
{
  "suggestions": [
    {"item": "nombre_exacto_del_menu", "reason": "razón en máximo 8 palabras", "price": precio_exacto},
    {"item": "otro_producto_del_menu", "reason": "razón corta", "price": precio_exacto}
  ]
}`
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5, // Baja la temperatura para más precisión
            max_tokens: 300,
            response_format: { type: "json_object" }
        });

        const response = completion.choices[0]?.message?.content;
        const cleanJson = response?.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanJson || '{"suggestions":[]}');

        // 🔒 VALIDACIÓN: Solo devuelve productos que existen en el menú
        const validSuggestions = (parsed.suggestions || []).filter((s: any) => {
            return availableProducts.some((p: any) =>
                p.name.toLowerCase() === s.item.toLowerCase()
            );
        });

        // console.log('✅ [API] Valid suggestions from menu:', validSuggestions);

        return NextResponse.json({ suggestions: validSuggestions });

    } catch (error: any) {
        console.error('❌ Error in API route:', error);
        return NextResponse.json(
            { error: error.message, suggestions: [] },
            { status: 500 }
        );
    }
}

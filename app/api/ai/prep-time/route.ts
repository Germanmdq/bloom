import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

function getGroqClient(): Groq | null {
    const apiKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
    if (!apiKey?.trim()) return null;
    return new Groq({ apiKey });
}

export async function POST(request: NextRequest) {
    try {
        const groq = getGroqClient();
        if (!groq) {
            return NextResponse.json({ time: 15, message: 'GROQ_API_KEY no configurada' }, { status: 503 });
        }

        const { items } = await request.json();

        const itemsList = (items as { name: string }[]).map((i) => i.name).join(', ');

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "Eres un chef experto. Respondes SOLO con un número (minutos)."
                },
                {
                    role: "user",
                    content: `Items a preparar: ${itemsList}

Estima el tiempo TOTAL de preparación en minutos. Solo el número.`
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_tokens: 10
        });

        const response = completion.choices[0]?.message?.content?.trim();
        const time = parseInt(response || '15');

        // console.log('✅ Est time:', time);

        return NextResponse.json({ time: isNaN(time) ? 15 : time });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        console.error('❌ Error in API route (Prep Time):', error);
        return NextResponse.json({ error: message, time: 15 }, { status: 500 });
    }
}

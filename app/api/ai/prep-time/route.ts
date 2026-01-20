
import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY
});

export async function POST(request: NextRequest) {
    try {
        const { items } = await request.json();

        // console.log('🤖 API Route received items for prep time:', items);

        const itemsList = items.map((i: any) => i.name).join(', ');

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

    } catch (error: any) {
        console.error('❌ Error in API route (Prep Time):', error);
        return NextResponse.json(
            { error: error.message, time: 15 },
            { status: 500 }
        );
    }
}

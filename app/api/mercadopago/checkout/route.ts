import { createPaymentPreference } from '@/lib/mercadopago';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { items, orderId } = await req.json();

        if (!items || items.length === 0) {
            return NextResponse.json({ error: 'No items in cart' }, { status: 400 });
        }

        const preference = await createPaymentPreference(items, orderId || `temp_${Date.now()}`);

        return NextResponse.json({
            id: preference.id,
            init_point: preference.init_point
        });
    } catch (error: any) {
        console.error('Checkout API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

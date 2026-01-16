import { MercadoPagoConfig, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || ''
});

export async function createPaymentPreference(items: any[], orderId: string) {
    const preference = new Preference(client);

    const body = {
        items: items.map(item => ({
            id: item.productId,
            title: item.name,
            unit_price: Number(item.price),
            quantity: Number(item.quantity),
            currency_id: 'ARS'
        })),
        back_urls: {
            success: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/orders/success`,
            failure: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/orders/failure`,
            pending: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/orders/pending`
        },
        auto_return: 'approved' as const,
        external_reference: orderId,
    };

    try {
        const response = await preference.create({ body });
        return response;
    } catch (error) {
        console.error('Error creating payment preference:', error);
        throw error;
    }
}

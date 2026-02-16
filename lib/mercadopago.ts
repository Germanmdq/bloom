import MercadoPagoConfig, { Preference } from 'mercadopago';

// Initialize the client object
const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN || '',
    options: { timeout: 5000 }
});

// Initialize the preference class
export const preference = new Preference(client);

export default client;

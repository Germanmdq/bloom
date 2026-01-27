require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

let clientReady = false;
let currentQR = null;

// Initialize WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    currentQR = qr;
    qrcode.generate(qr, { small: true });
    console.log('📱 QR generated');
});

client.on('ready', () => {
    clientReady = true;
    currentQR = null;
    console.log('✅ WhatsApp conectado!');
});

client.on('authenticated', () => {
    console.log('🔐 Authenticated');
});

client.on('auth_failure', msg => {
    console.error('❌ AUTH FAILURE', msg);
});

// Parsear pedido con Groq
async function parsearPedidoConIA(texto) {
    try {
        if (!process.env.GROQ_API_KEY) {
            console.warn('⚠️ GROQ_API_KEY missing, skipping AI parsing');
            return { items: [], total_estimado: null, delivery: false };
        }

        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: `Sos un asistente que parsea pedidos de restaurante. 
          Extrae los items, cantidades y detalles del pedido.
          Responde SOLO con un JSON válido en este formato:
          {
            "items": [
              {"nombre": "...", "cantidad": 1, "notas": "..."}
            ],
            "total_estimado": null,
            "delivery": false
          }`
                },
                {
                    role: 'user',
                    content: texto
                }
            ],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.3,
            max_tokens: 500
        });

        const content = completion.choices[0].message.content;
        // Extract JSON if wrapped in markdown code blocks
        const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
        const resultado = JSON.parse(jsonStr);
        return resultado;
    } catch (error) {
        console.error('Error parseando con IA:', error);
        return { items: [], total_estimado: null, delivery: false };
    }
}

client.on('message', async (msg) => {
    try {
        // Ignore status updates and other non-chat messages
        if (msg.isStatus || msg.from === 'status@broadcast') return;

        console.log('📩 Message received:', msg.body);

        const contact = await msg.getContact();

        // Simple filter: Only treat as order if it contains keywords or is long enough?
        // For now, we process everything for demo purposes or maybe checking for specific intents could be better.
        // But per instructions, specific logic wasn't requested, just the flow.

        const items_parseados = await parsearPedidoConIA(msg.body);

        // Only save if AI detected items or if it looks like an order (logic can be improved)
        if (items_parseados.items && items_parseados.items.length === 0) {
            // Maybe not an order, just chat. 
            // We can decide to save it anyway or filter. 
            // For debugging/demo, let's save everything but mark as 'consulta' maybe?
            // Utilizing specific table schema.
        }

        const pedido = {
            numero_cliente: msg.from.replace('@c.us', ''),
            nombre_cliente: contact.pushname || contact.number || 'Desconocido',
            mensaje: msg.body,
            timestamp: new Date(msg.timestamp * 1000).toISOString(),
            estado: 'pendiente',
            items_parseados: items_parseados
        };

        const { data, error } = await supabase
            .from('pedidos_whatsapp')
            .insert(pedido)
            .select()
            .single();

        if (error) {
            console.error('Error saving to Supabase:', error);
        } else {
            console.log(`💾 Saved order #${data.id}`);
            await msg.reply(
                `✅ *Pedido recibido!*\n\n` +
                `Número: #${data.id}\n` +
                `Estamos preparando tu orden.\n\n` +
                `Te avisaremos cuando esté lista. 🍽️`
            );
        }
    } catch (error) {
        console.error('Error handling message:', error);
    }
});

// API Endpoints
app.get('/api/status', (req, res) => {
    res.json({
        connected: clientReady,
        qr: currentQR
    });
});

app.post('/api/send-message', async (req, res) => {
    const { to, message } = req.body;

    if (!clientReady) {
        return res.status(503).json({ error: 'WhatsApp no conectado' });
    }

    try {
        const chatId = to.includes('@c.us') ? to : `549${to}@c.us`; // Argentina
        await client.sendMessage(chatId, message);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/update-pedido', async (req, res) => {
    const { pedidoId, estado } = req.body;

    try {
        const { data: pedido, error } = await supabase
            .from('pedidos_whatsapp')
            .select('*')
            .eq('id', pedidoId)
            .single();

        if (error || !pedido) {
            return res.status(404).json({ error: 'Pedido not found' });
        }

        if (pedido && estado === 'listo') {
            const chatId = `549${pedido.numero_cliente}@c.us`;
            await client.sendMessage(
                chatId,
                `🎉 *Tu pedido #${pedidoId} está listo!*\n\nYa podés pasar a retirarlo. Gracias! 🍽️`
            );
        }

        res.json({ success: true });
    } catch (e) {
        console.error('Error updating pedido:', e);
        res.status(500).json({ error: e.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 WhatsApp Service en puerto ${PORT}`);
});

try {
    client.initialize();
} catch (e) {
    console.error('Failed to initialize WhatsApp client:', e);
}

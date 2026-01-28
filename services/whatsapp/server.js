const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// --- Configuration ---
const PORT = process.env.PORT || 3001;

// Fix for Chrome DevTools probe 404/CSP error
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.sendStatus(204);
});
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !GROQ_API_KEY) {
  console.error("❌ Missing environment variables. Please check .env file.");
  process.exit(1);
}

// --- Clients ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const groq = new Groq({ apiKey: GROQ_API_KEY });

// --- WhatsApp Client Setup ---
console.log("🔄 Initializing WhatsApp Client...");
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  }
});

let qrCodeData = null;
let isClientReady = false;

client.on('qr', (qr) => {
  console.log('📌 QR Code received. Scan it to login.');
  qrCodeData = qr;
  isClientReady = false;
});

client.on('ready', () => {
  console.log('✅ WhatsApp Client is ready!');
  isClientReady = true;
  qrCodeData = null;
});

client.on('authenticated', () => {
  console.log('🔐 Client authenticated.');
});

client.on('auth_failure', (msg) => {
  console.error('❌ Authentication failure:', msg);
});

// --- AI Parsing Logic ---
async function parseOrderWithGroq(message) {
  try {
    const systemPrompt = `
    Eres un asistente de IA para un restaurante. Tu trabajo es leer el mensaje del cliente e interpretar su pedido.
    
    Analiza el siguiente mensaje y extrae la información en formato JSON estrictamente válido.
    
    Estructura JSON requerida:
    {
      "items": [
        { "nombre": "Nombre del producto", "cantidad": 1, "notas": "sin cebolla" }
      ],
      "tipo_entrega": "delivery" | "retiro",
      "direccion": "Dirección completa si es delivery, o null si es retiro",
      "notas_generales": "Cualquier otra aclaración del pedido"
    }

    Si el mensaje NO es un pedido (ej: "Hola", "¿Están abiertos?", "Gracias"), devuelve null.
    NO inventes información. Si no se especifica cantidad, asume 1.
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      response_format: { type: 'json_object' }
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content);
  } catch (error) {
    console.error("⚠️ Error parsing with Groq:", error);
    return null;
  }
}

// --- Message Handling ---
client.on('message', async (msg) => {
  // Ignore status updates and my own messages (unless specifically testing)
  if (msg.from === 'status@broadcast') return;

  const chat = await msg.getChat();
  const contact = await msg.getContact();
  const rawMessage = msg.body;
  const phoneNumber = contact.number;
  const customerName = contact.pushname || contact.name || "Cliente Desconocido";

  console.log(`📩 New message from ${customerName} (${phoneNumber}): ${rawMessage}`);

  // 1. Parse message with AI
  const parsedOrder = await parseOrderWithGroq(rawMessage);

  if (parsedOrder && parsedOrder.items && parsedOrder.items.length > 0) {
    console.log("🍽️ Order detected:", parsedOrder);

    // 2. Save to Supabase
    const { data, error } = await supabase
      .from('pedidos_whatsapp')
      .insert([
        {
          numero_cliente: phoneNumber,
          nombre_cliente: customerName,
          mensaje: rawMessage,
          items_parseados: parsedOrder,
          estado: 'pendiente',
          notas: parsedOrder.notas_generales
        }
      ])
      .select();

    if (error) {
      console.error("❌ Error saving to Supabase:", error);
      client.sendMessage(msg.from, "⚠️ Hubo un error procesando tu pedido. Por favor intenta de nuevo o llama al local.");
    } else {
      console.log("✅ Order saved to DB:", data[0].id);

      // 3. Auto-reply
      let reply = `¡Hola ${customerName}! 👋 Hemos recibido tu pedido.\n\n`;
      reply += `📜 *Resumen:*\n`;
      parsedOrder.items.forEach(item => {
        reply += `- ${item.cantidad}x ${item.nombre} ${item.notas ? `(${item.notas})` : ''}\n`;
      });
      reply += `\nEstamos confirmando los detalles. Te avisaremos cuando empecemos a prepararlo. ⏳`;

      client.sendMessage(msg.from, reply);
    }
  } else {
    // Optional: Auto-reply for non-orders or just log
    console.log("ℹ️ Message was not identified as an order.");
    // client.sendMessage(msg.from, "Hola! Soy el asistente virtual de Bloom. Si quieres hacer un pedido, simplemente dime qué te gustaría comer. 🍔");
  }
});

// --- API Endpoints ---

// Get Status
app.get('/status', (req, res) => {
  res.json({
    ready: isClientReady,
    qr: qrCodeData ? true : false
  });
});

// Get QR Code Image
app.get('/qr', async (req, res) => {
  if (isClientReady) {
    return res.send('<html><body><h1>✅ WhatsApp ya está conectado!</h1></body></html>');
  }
  if (!qrCodeData) {
    return res.send('<html><body><h1>⏳ Esperando QR... (recarga en unos segundos)</h1></body></html>');
  }

  try {
    const qrImage = await qrcode.toDataURL(qrCodeData);
    res.send(`
      <html>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:sans-serif;">
          <h1>Escanea este QR con WhatsApp</h1>
          <img src="${qrImage}" />
          <p>Ve a WhatsApp > Configuración > Dispositivos Vinculados > Vincular dispositivo</p>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send("Error generating QR");
  }
});

// Send Message (for Database Triggers or manual use)
app.post('/send-message', async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) return res.status(400).json({ error: "Missing phone or message" });
  if (!isClientReady) return res.status(503).json({ error: "WhatsApp client not ready" });

  try {
    const formattedPhone = phone.includes('@c.us') ? phone : `${phone}@c.us`;
    await client.sendMessage(formattedPhone, message);
    res.json({ success: true });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`🔗 Open http://localhost:${PORT}/qr to scan QR code`);
  client.initialize();
});

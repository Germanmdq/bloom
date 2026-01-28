# 📱 WhatsApp Integration Module

Módulo de integración completa de WhatsApp para Bloom POS.
Permite recibir pedidos automáticamente mediante IA y gestionarlos desde el Dashboard.

## 🚀 Instalación Rápida

1.  **Configurar Variables de Entorno**
    Copia el archivo `.env.example` en `services/whatsapp/` y renómbralo a `.env`.
    ```bash
    cp services/whatsapp/.env.example services/whatsapp/.env
    ```
    Rellena las claves:
    - `SUPABASE_URL`: Tu URL de proyecto Supabase.
    - `SUPABASE_SERVICE_KEY`: Tu clave `service_role` (no la `anon`).
    - `GROQ_API_KEY`: Tu API Key de Groq.

2.  **Base de Datos**
    Corre el script SQL ubicado en `supabase/migrations/20240127_pedidos_whatsapp.sql` en tu Dashboard de Supabase (SQL Editor).

3.  **Iniciar Todo**
    En la raíz del proyecto ejecuta:
    ```bash
    npm run dev:all
    ```
    Esto iniciará el POS (puerto 3000) y el servicio WhatsApp (puerto 3001).

4.  **Vincular WhatsApp**
    - Ve a `http://localhost:3001/qr` en tu navegador.
    - Escanea el código QR con el WhatsApp de tu negocio.
    - ¡Listo! Los mensajes entrantes serán procesados.

## 🛠 Arquitectura

- **Frontend**: Next.js + Zustand + React Query (Realtime).
- **Backend Service**: Node.js + whatsapp-web.js + Express.
- **IA**: Llama 3.3 70B via Groq SDK para parsing de lenguaje natural.
- **DB**: Supabase (Tabla `pedidos_whatsapp`).

## 🧪 Pruebas
1. Manda un mensaje al número conectado: *"Quiero 2 pizzas de muzzarella y una coca sin azúcar para enviar a Av. Siempre Viva 123"*.
2. Verifica que aparezca la tarjeta en `/pos/whatsapp`.
3. Mueve la tarjeta de estado usando los botones.

## ⚠️ Notas
- El servicio de WhatsApp requiere que la terminal esté corriendo.
- Si reinicias el proceso, la sesión se guarda localmente (si habilitas `WHATSAPP_SESSION_PATH`).

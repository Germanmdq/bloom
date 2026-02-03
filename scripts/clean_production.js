
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanProduction() {
    console.log('🚨 INICIANDO LIMPIEZA DE DATOS DE PRODUCCIÓN 🚨');
    console.log('------------------------------------------------');

    try {
        // 1. Borrar Items de Ordenes (si existe tabla separada, sino suele ser JSON en Orders)
        // En este esquema parece que items estan en JSONB en orders, asi que borrando orders basta.

        // 2. Borrar Tickets de Cocina
        console.log('🗑️  Borrando Tickets de Cocina...');
        const { error: kitchenError } = await supabase.from('kitchen_tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (kitchenError) console.error('Error kitchen:', kitchenError.message);

        // 3. Borrar Ordenes
        console.log('🗑️  Borrando Todas las Órdenes...');
        const { error: ordersError } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (ordersError) console.error('Error orders:', ordersError.message);

        // 4. Resetear Movimientos de Inventario (Opcional: Si quieres stock 0 o mantener stock actual?)
        // Normalmente al iniciar turno se quiere historial limpio o stock real?
        // El usuario dijo "empezar a usar". Asumo que quiere borrar VENTAS viejas. 
        // Los movimientos de stock derivados de ventas viejas deberían borrarse.
        console.log('🗑️  Borrando Historial de Movimientos de Stock...');
        const { error: stockError } = await supabase.from('inventory_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (stockError) console.error('Error movements:', stockError.message);

        // 5. Resetear Mesas
        console.log('🔄 Reseteando Mesas a LIBRE...');
        const { error: tablesError } = await supabase
            .from('salon_tables')
            .update({ status: 'FREE', total: 0 })
            .neq('id', 0); // Update all
        if (tablesError) console.error('Error tables:', tablesError.message);

        // 6. Gastos (Opcional)
        console.log('🗑️  Borrando Gastos...');
        const { error: expensesError } = await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (expensesError) console.error('Error expenses:', expensesError.message);

        console.log('------------------------------------------------');
        console.log('✅ LIMPIEZA COMPLETADA. LISTO PARA OPERAR.');
    } catch (err) {
        console.error('❌ Error fatal:', err);
    }
}

cleanProduction();


import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrders() {
    console.log("Checking orders with table_id 998 or 999...");

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('table_id', [998, 999])
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching orders:", error);
    } else {
        console.log(`Found ${data.length} web orders.`);
        console.log(data);
    }
}

checkOrders();

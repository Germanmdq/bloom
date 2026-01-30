
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://elvifblvjvcbwabhrlco.supabase.co";
const supabaseKey = "sb_publishable_lpgxFMUClqI3WP-QX2Pi3w_eK0NkH02";

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupKitchenTable() {
    console.log('Checking kitchen_tickets table...');

    const { error } = await supabase.from('kitchen_tickets').select('*').limit(1);

    if (error) {
        console.error('Error accessing kitchen_tickets table:', error.message);
        // Supabase JS client usually returns specific error codes
        // But message is often clear enough

        console.log('\n!!! TABLE kitchen_tickets LIKELY DOES NOT EXIST OR PERMISSIONS ARE WRONG !!!');
        console.log('Error details:', error);
        console.log('SQL to create table:');
        console.log(`
            create table public.kitchen_tickets (
              id uuid not null default gen_random_uuid (),
              created_at timestamp with time zone not null default now(),
              table_id text not null,
              items jsonb not null,
              notes text null,
              status text not null default 'PENDING'::text,
              constraint kitchen_tickets_pkey primary key (id)
            );
          `);
    } else {
        console.log('✅ Table kitchen_tickets exists and is accessible.');
    }
}

setupKitchenTable();

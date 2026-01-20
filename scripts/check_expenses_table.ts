
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExpensesTable() {
    console.log('Checking expenses table...');

    const { error: selectError } = await supabase.from('expenses').select('*').limit(1);

    if (selectError) {
        console.error('Error accessing expenses table:', selectError.message);
        return;
    } else {
        console.log('✅ Table expenses exists (SELECT worked).');
    }

    console.log('Testing INSERT permission...');
    const { data, error: insertError } = await supabase.from('expenses').insert([{
        description: 'Test Expense Script',
        amount: 100,
        category: 'Otros'
    }]).select();

    if (insertError) {
        console.error('❌ INSERT Failed:', insertError.message);
        console.log('\nLIKELY RLS ISSUE. Run this SQL to fix permissions:');
        console.log(`
            alter table public.expenses enable row level security;
            
            create policy "Enable all access for all users"
            on "public"."expenses"
            as PERMISSIVE
            for ALL
            to public
            using (true)
            with check (true);
        `);
    } else {
        console.log('✅ INSERT worked.', data);
        // Clean up
        const id = data[0].id;
        await supabase.from('expenses').delete().eq('id', id);
        console.log('✅ Test row cleaned up.');
    }
}

checkExpensesTable();


import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://elvifblvjvcbwabhrlco.supabase.co";
const supabaseKey = "sb_publishable_lpgxFMUClqI3WP-QX2Pi3w_eK0NkH02";

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchCategories() {
    const { data, error } = await supabase.from('categories').select('id, name');
    if (error) {
        console.error("Error fetching categories:", error);
    } else {
        console.log("Current Categories:");
        data.forEach(c => console.log(`- ${c.name} (ID: ${c.id})`));
    }
}

fetchCategories();

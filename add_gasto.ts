import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('gastos_fijos').insert({
    nombre: 'Diariero',
    monto: 33000,
    fecha_vencimiento: '2026-05-01',
    estado: 'pendiente',
    categoria: 'normal'
  });
  console.log("Done", error || data);
}
run();

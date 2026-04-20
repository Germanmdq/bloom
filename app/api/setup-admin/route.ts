import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const email = 'admin@bloom.com';
        const password = '123456'; // Mínimo 6 caracteres por seguridad de Supabase

        // 1. Crear usuario en Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { full_name: 'Administrador' }
        });

        if (authError) {
            // Si ya existe, lo intentamos promover igualmente
            if (authError.message.includes('already registered')) {
                const { data: existing } = await supabase.from('profiles').select('id').eq('full_name', 'Administrador').maybeSingle();
                // Si no tiene perfil, lo buscamos en auth.users (mejor que el usuario lo maneje manualmente o lo promovemos por email)
            } else {
                throw authError;
            }
        }

        const userId = authData?.user?.id;

        if (userId) {
            // 2. Crear/Actualizar perfil como ADMIN
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    full_name: 'Administrador Principal',
                    role: 'ADMIN',
                    is_customer: false
                });

            if (profileError) throw profileError;
        }

        return NextResponse.json({ 
            success: true, 
            message: "Admin creado con éxito",
            login: email,
            pass: password,
            note: "Ya podés borrar este archivo api/setup-admin/route.ts por seguridad."
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

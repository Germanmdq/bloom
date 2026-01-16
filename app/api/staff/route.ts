import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { email, password, fullName, role } = await req.json();

        console.log("Creando empleado:", { email, fullName, role });

        // Create a Supabase client with the service role key to bypass RLS and create users
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // 1. Create the user in Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName, role }
        });

        if (authError) {
            console.error("Error al crear usuario en Auth:", authError);
            return NextResponse.json({ message: authError.message }, { status: 400 });
        }

        console.log("Usuario creado con éxito en Auth:", authData.user.id);

        // Note: The trigger 'on_auth_user_created' in SQL (schema.sql) 
        // will automatically create the profile in public.profiles.

        return NextResponse.json({ message: "Usuario creado con éxito", user: authData.user });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('id');

        if (!userId) {
            return NextResponse.json({ message: "ID de usuario requerido" }, { status: 400 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // Borrar de Auth (esto borra de profiles automáticamente si configuraste ON DELETE CASCADE)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) {
            return NextResponse.json({ message: error.message }, { status: 400 });
        }

        return NextResponse.json({ message: "Usuario eliminado con éxito" });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

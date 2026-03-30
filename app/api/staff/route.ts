import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabaseUrl } from "@/lib/supabase/env";

export async function POST(req: Request) {
    try {
        const { email, password, fullName, role } = await req.json();

        console.log("Creando empleado:", { email, fullName, role });

        // Create a Supabase client with the service role key to bypass RLS and create users
        const supabaseAdmin = createClient(
            getSupabaseUrl(),
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
        const userId = searchParams.get("id")?.trim();

        if (!userId) {
            return NextResponse.json({ message: "ID de usuario requerido" }, { status: 400 });
        }

        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
        if (!serviceKey) {
            return NextResponse.json({ message: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor" }, { status: 500 });
        }

        const supabaseAdmin = createClient(getSupabaseUrl(), serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });

        /**
         * auth.users delete suele hacer CASCADE al perfil. Las órdenes con waiter_id → profiles(id)
         * o created_by → auth.users pueden bloquear el borrado si el FK es NO ACTION.
         * Migración: 20260330200000_orders_staff_fk_on_delete_set_null.sql
         * Siguiente paso desconecta referencias por si la BD aún no tiene ON DELETE SET NULL.
         */
        const { error: wErr } = await supabaseAdmin
            .from("orders")
            .update({ waiter_id: null })
            .eq("waiter_id", userId);
        if (wErr) {
            console.error("[staff DELETE] orders.waiter_id", wErr);
        }

        const { error: cErr } = await supabaseAdmin
            .from("orders")
            .update({ created_by: null })
            .eq("created_by", userId);
        if (cErr) {
            // Columna puede no existir en todas las instancias
            if (!cErr.message?.toLowerCase().includes("column")) {
                console.error("[staff DELETE] orders.created_by", cErr);
            }
        }

        const { error: hoursErr } = await supabaseAdmin.from("staff_hours").delete().eq("profile_id", userId);
        if (hoursErr && hoursErr.code !== "42P01") {
            // 42P01 = undefined_table
            console.warn("[staff DELETE] staff_hours", hoursErr.message);
        }

        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) {
            console.error("[staff DELETE] auth.admin.deleteUser", error);
            return NextResponse.json(
                {
                    message:
                        error.message ||
                        "No se pudo eliminar el usuario. Revisá restricciones FK hacia auth.users o aplicá la migración orders_staff_fk_on_delete_set_null.",
                },
                { status: 400 }
            );
        }

        return NextResponse.json({ message: "Usuario eliminado con éxito" });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error";
        return NextResponse.json({ message }, { status: 500 });
    }
}

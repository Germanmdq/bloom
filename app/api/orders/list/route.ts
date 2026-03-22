import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function GET() {
    try {
        // If SERVICE_ROLE is available, use it to bypass RLS completely.
        // If not, fall back to ANON key (which seems to work for read-all based on script test).
        const supabaseUrl = getSupabaseUrl();
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || getSupabaseAnonKey();

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase API Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data }, { status: 200 });
    } catch (error) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

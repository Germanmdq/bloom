import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Create a Supabase client with the ANON key
        // NOTE: This will only work if your RLS policies allow INSERT for anon users.
        // If this fails, you MUST go to Supabase Dashboard > Table Editor > orders > generic policies
        // And add a policy: "Enable insert for everyone" (Target roles: anon)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase
            .from('orders')
            .insert([body])
            .select();

        if (error) {
            console.error("Supabase API Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data }, { status: 200 });
    } catch (error) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

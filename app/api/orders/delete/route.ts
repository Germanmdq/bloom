
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        // Determine the environment variables to use
        // Using service role to ensure we can delete despite RLS
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Supabase Delete Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Server Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

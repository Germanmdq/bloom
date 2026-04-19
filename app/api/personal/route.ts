import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createClient();
    const { data } = await supabase.from("staff").select("*").eq("active", true).order("full_name");
    return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const body = await request.json();
    const { data } = await supabase
        .from("staff")
        .insert({ full_name: body.full_name, role: body.role })
        .select()
        .single();
    return NextResponse.json(data);
}

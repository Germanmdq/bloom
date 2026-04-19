import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createClient();
    const { data } = await supabase
        .from("profiles")
        .select("*")
        .neq("role", "ADMIN")
        .order("full_name");
    return NextResponse.json(data ?? []);
}

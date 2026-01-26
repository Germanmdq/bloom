import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MenuProductCard } from "@/components/Menu/MenuProductCard";
import { PublicMenu } from "@/components/Menu/PublicMenu";

export default async function PublicMenuPage() {
    const supabase = await createClient();

    // Fetch categories
    const { data: categories } = await supabase
        .from('categories')
        .select('*')
        .order('name');

    // Sort categories: Drinks/Cafeteria to the end
    categories?.sort((a, b) => {
        const isDrink = (name: string) => {
            const n = name.toLowerCase();
            return n.includes('bebida') || n.includes('cafeter') || n.includes('jugo') || n.includes('licuado');
        };

        const aIsDrink = isDrink(a.name);
        const bIsDrink = isDrink(b.name);

        if (aIsDrink && !bIsDrink) return 1;
        if (!aIsDrink && bIsDrink) return -1;

        return a.name.localeCompare(b.name);
    });

    // Fetch products
    const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('name');

    return (
        <div className="min-h-screen bg-[#FDFBF7] text-[#3E2723]">
            {/* Header / Nav */}
            <header className="sticky top-0 z-50 bg-[#6B4E3D] text-[#F5E6D3] py-4 px-6 shadow-md flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase hover:opacity-80 transition-opacity">
                    <ArrowLeft size={16} /> Volver
                </Link>
                <div className="font-serif text-xl font-bold tracking-widest">BLOOM</div>
                <div className="w-16"></div> {/* Spacer for alignment */}
            </header>

            {/* Menu Content */}
            <main className="max-w-3xl mx-auto p-8">
                <div className="text-center mb-16 mt-8">
                    <h1 className="text-5xl font-serif font-bold text-[#E8A387] mb-4">Nuestra Carta</h1>
                    <p className="text-gray-500 italic">Sabores caseros, ingredientes frescos.</p>
                </div>

                <PublicMenu categories={categories || []} products={products || []} />

                <div className="text-center pt-12 border-t border-[#E8A387]/20 mt-12 text-gray-400 text-sm">
                    <p>Precios sujetos a cambios sin previo aviso.</p>
                    <p>Consultar por opciones sin TACC.</p>
                </div>
            </main>
        </div>
    );
}

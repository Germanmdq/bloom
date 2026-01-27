import { createClient } from "@/lib/supabase/server";
import ProductsClient from "@/components/dashboard/ProductsClient";

export default async function ProductsPage() {
    const supabase = await createClient();

    const { data: categories } = await supabase.from('categories').select('*');
    const { data: products } = await supabase.from('products').select('*, categories(name)');

    return (
        <ProductsClient
            initialProducts={products || []}
            initialCategories={categories || []}
        />
    );
}

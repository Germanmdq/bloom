"use client";

import { useState, useEffect, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Plus, ChevronRight } from "lucide-react";
import { ProductFormModal } from "./ProductFormModal";
import { CategoryDetailModal } from "./CategoryDetailModal";

interface Category {
    id: string;
    name: string;
}

interface Product {
    id: string;
    name: string;
    description?: string;
    price: number | string;
    category_id?: string;
    image_url?: string;
    categories?: { name: string };
}

interface ProductsClientProps {
    initialProducts: Product[];
    initialCategories: Category[];
}

const EMPTY_PRODUCT = { id: "", name: "", description: "", price: "", category_id: "", image_url: "" };

function formatName(name: string): string {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export default function ProductsClient({ initialProducts, initialCategories }: ProductsClientProps) {
    const [products, setProducts] = useState<Product[]>(initialProducts);
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [currentProduct, setCurrentProduct] = useState(EMPTY_PRODUCT);

    const supabase = createClient();

    const fetchData = async () => {
        const { data: catData } = await supabase.from('categories').select('*');
        const { data: prodData } = await supabase.from('products').select('*, categories(name)');
        if (catData) setCategories(catData);
        if (prodData) setProducts(prodData);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (isEditing) setIsEditing(false);
                if (selectedCategory) setSelectedCategory(null);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isEditing, selectedCategory]);

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const productData = {
            name: currentProduct.name,
            description: currentProduct.description,
            price: parseFloat(currentProduct.price),
            category_id: currentProduct.category_id,
            image_url: currentProduct.image_url
        };

        if (currentProduct.id) {
            const { error } = await supabase.from('products').update(productData).eq('id', currentProduct.id);
            if (error) alert(error.message);
        } else {
            const { error } = await supabase.from('products').insert([productData]);
            if (error) alert(error.message);
        }

        setIsEditing(false);
        await fetchData();
        setLoading(false);
    };

    const handleAddCategory = async (name: string): Promise<Category | null> => {
        setLoading(true);
        const { data, error } = await supabase
            .from('categories')
            .insert([{ name }])
            .select()
            .single();
        setLoading(false);
        if (error) { alert(error.message); return null; }
        if (data) setCategories(prev => [...prev, data]);
        return data;
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Seguro que quieres eliminar este producto?")) return;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) alert(error.message);
        await fetchData();
    };

    const handleEdit = (product: Product) => {
        setCurrentProduct({
            id: product.id,
            name: product.name,
            description: product.description || "",
            price: String(product.price),
            category_id: product.category_id || "",
            image_url: product.image_url || ""
        });
        setSelectedCategory(null);
        setIsEditing(true);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const productsByCategory = filteredProducts.reduce((acc: Record<string, Product[]>, product) => {
        const catName = product.categories?.name || "Otros";
        if (!acc[catName]) acc[catName] = [];
        acc[catName].push(product);
        return acc;
    }, {});

    const categoryGridItems = categories
        .map(cat => ({ name: cat.name, count: productsByCategory[cat.name]?.length || 0, id: cat.id }))
        .filter(c => c.count > 0 || productsByCategory[c.name]);

    if (productsByCategory["Otros"] && !categoryGridItems.find(c => c.name === "Otros")) {
        categoryGridItems.push({ name: "Otros", count: productsByCategory["Otros"].length, id: "others" });
    }

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Menú</h2>
                    <p className="text-gray-500 mt-1">Gestiona productos, precios e imágenes</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-black transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-white/70 backdrop-blur-xl pl-10 pr-4 py-3 rounded-2xl border border-white/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-black/5 w-64 transition-all"
                        />
                    </div>
                    <button
                        onClick={() => {
                            setCurrentProduct({ ...EMPTY_PRODUCT, category_id: categories.length > 0 ? categories[0].id : "" });
                            setIsEditing(true);
                        }}
                        className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-[1.02] transition-all shadow-xl shadow-black/10"
                    >
                        <Plus size={20} />
                        <span>Nuevo Producto</span>
                    </button>
                </div>
            </div>

            {/* Category Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryGridItems.map((category) => (
                    <motion.div
                        key={category.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedCategory(category.name)}
                        className="cursor-pointer group relative bg-white/70 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/40 flex justify-between items-center"
                    >
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">{formatName(category.name)}</h3>
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider">
                                {category.count} Productos
                            </span>
                        </div>
                        <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                            <ChevronRight size={24} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {selectedCategory && (
                    <CategoryDetailModal
                        categoryName={selectedCategory}
                        products={productsByCategory[selectedCategory] || []}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onClose={() => setSelectedCategory(null)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isEditing && (
                    <ProductFormModal
                        product={currentProduct}
                        categories={categories}
                        loading={loading}
                        onChange={setCurrentProduct}
                        onSave={handleSave}
                        onAddCategory={handleAddCategory}
                        onClose={() => setIsEditing(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

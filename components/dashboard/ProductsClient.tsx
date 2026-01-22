"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

import {
    Search,
    Plus,
    Filter,
    Edit3,
    Trash2,
    Coffee,
    Tag,
    DollarSign,
    Image as ImageIcon,
    Check,
    X,
    ChevronRight
} from "lucide-react";
import Image from "next/image";

function formatName(name: string): string {
    if (!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

interface ProductsClientProps {
    initialProducts: any[];
    initialCategories: any[];
}

export default function ProductsClient({ initialProducts, initialCategories }: ProductsClientProps) {
    const [products, setProducts] = useState<any[]>(initialProducts);
    const [categories, setCategories] = useState<any[]>(initialCategories);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Form state
    const [currentProduct, setCurrentProduct] = useState<any>({
        id: "",
        name: "",
        description: "",
        price: "",
        category_id: "",
        image_url: ""
    });
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    const supabase = createClient();

    async function fetchData() {
        // Keep fetchData for refreshing data after mutations
        const { data: catData } = await supabase.from('categories').select('*');
        const { data: prodData } = await supabase.from('products').select('*, categories(name)');

        if (catData) setCategories(catData);
        if (prodData) setProducts(prodData);
    }

    // Handle Escape key to close modals
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

    async function handleSave(e: React.FormEvent) {
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
            // Update
            const { error } = await supabase
                .from('products')
                .update(productData)
                .eq('id', currentProduct.id);
            if (error) alert(error.message);
        } else {
            // Create
            const { error } = await supabase
                .from('products')
                .insert([productData]);
            if (error) alert(error.message);
        }

        setIsEditing(false);
        await fetchData(); // Refresh data
        setLoading(false);
    }

    async function handleAddCategory() {
        if (!newCategoryName.trim()) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('categories')
            .insert([{ name: newCategoryName }])
            .select()
            .single();

        if (error) {
            alert(error.message);
        } else if (data) {
            setCategories([...categories, data]);
            setCurrentProduct({ ...currentProduct, category_id: data.id });
            setIsAddingCategory(false);
            setNewCategoryName("");
        }
        setLoading(false);
    }

    async function handleDelete(id: string) {
        if (!confirm("¿Seguro que quieres eliminar este producto?")) return;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) alert(error.message);
        await fetchData();
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group products by category to get counts
    const productsByCategory = filteredProducts.reduce((acc: any, product) => {
        const categoryName = product.categories?.name || "Otros";
        if (!acc[categoryName]) acc[categoryName] = [];
        acc[categoryName].push(product);
        return acc;
    }, {});

    // Create a list of categories to display in the main grid
    // We prioritize the fetched categories but also Include "Otros" if there are products there
    const categoryGridItems = categories.map(cat => ({
        name: cat.name,
        count: productsByCategory[cat.name]?.length || 0,
        id: cat.id
    })).filter(c => c.count > 0 || productsByCategory[c.name]); // Show categories that have filters or exist in base list

    // Check if "Otros" has items and add it if not present
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
                            setCurrentProduct({ id: "", name: "", description: "", price: "", category_id: categories.length > 0 ? categories[0].id : "", image_url: "" });
                            setIsEditing(true);
                            setIsAddingCategory(false);
                        }}
                        className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-[1.02] transition-all shadow-xl shadow-black/10"
                    >
                        <Plus size={20} />
                        <span>Nuevo Producto</span>
                    </button>
                </div>
            </div>

            {/* Main Category Grid */}
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

            {/* Category Detail Modal (Popup) */}
            <AnimatePresence>
                {selectedCategory && (
                    <div className="fixed inset-0 z-40 flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                            onClick={() => setSelectedCategory(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white/90 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/40 shadow-2xl w-full max-w-7xl overflow-y-auto max-h-[90vh]"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-4xl font-black text-gray-900 tracking-tighter">
                                    {formatName(selectedCategory)}
                                </h3>
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {productsByCategory[selectedCategory]?.map((product: any) => (
                                    <div
                                        key={product.id}
                                        className="group relative bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col hover:shadow-lg transition-all"
                                    >
                                        <div className="flex-1 flex flex-col px-1 pt-2">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-gray-900 text-xl tracking-tight">{formatName(product.name)}</h4>
                                                <span className="font-black text-gray-900 bg-gray-50 px-3 py-1 rounded-xl text-sm border border-gray-100">
                                                    ${parseFloat(product.price).toLocaleString("es-AR")}
                                                </span>
                                            </div>

                                            {product.description && (
                                                <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1 font-medium leading-relaxed">
                                                    {product.description}
                                                </p>
                                            )}

                                            <div className="mt-auto pt-4 border-t border-gray-100 flex items-center gap-2 justify-end">
                                                <button
                                                    onClick={() => {
                                                        setCurrentProduct(product);
                                                        setIsEditing(true);
                                                    }}
                                                    className="p-2 rounded-xl bg-gray-50 text-black hover:bg-gray-100 transition-colors"
                                                >
                                                    <Edit3 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!productsByCategory[selectedCategory] || productsByCategory[selectedCategory].length === 0) && (
                                    <div className="col-span-full py-10 text-center text-gray-500">
                                        No hay productos en esta categoría.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {isEditing && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                            onClick={() => setIsEditing(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative bg-white/90 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/40 shadow-2xl w-full max-w-2xl overflow-y-auto max-h-[90vh]"
                        >
                            <h3 className="text-4xl font-black text-gray-900 mb-10 tracking-tighter">
                                {currentProduct.id ? "Editar Producto" : "Nuevo Producto"}
                            </h3>

                            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Nombre</label>
                                        <div className="relative">
                                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                            <input
                                                type="text" required
                                                value={currentProduct.name || ""}
                                                onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                                                className="w-full bg-white/60 border border-black/5 rounded-[1.5rem] pl-12 pr-5 py-4 focus:ring-4 focus:ring-black/5 outline-none transition-all font-bold"
                                                placeholder="Ej: Flat White"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Precio</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                            <input
                                                type="number" step="0.01" required
                                                value={currentProduct.price || ""}
                                                onChange={e => setCurrentProduct({ ...currentProduct, price: e.target.value })}
                                                className="w-full bg-white/60 border border-black/5 rounded-[1.5rem] pl-12 pr-5 py-4 focus:ring-4 focus:ring-black/5 outline-none transition-all font-black text-lg"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-3 ml-1">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Categoría</label>
                                            <button
                                                type="button"
                                                onClick={() => setIsAddingCategory(!isAddingCategory)}
                                                className="text-[10px] font-black text-black bg-[#FFD60A] px-2 py-1 rounded-md uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                                            >
                                                {isAddingCategory ? "Cancelar" : "+ Nueva"}
                                            </button>
                                        </div>

                                        {isAddingCategory ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={newCategoryName || ""}
                                                    onChange={e => setNewCategoryName(e.target.value)}
                                                    className="flex-1 bg-white/60 border border-black/5 rounded-[1.2rem] px-4 py-3 focus:ring-4 focus:ring-black/5 outline-none font-bold text-sm"
                                                    placeholder="Nombre de categoría..."
                                                    autoFocus
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddCategory}
                                                    className="bg-black text-white px-4 rounded-[1.2rem] font-bold hover:scale-105 transition-all"
                                                >
                                                    <Check size={18} />
                                                </button>
                                            </div>
                                        ) : (
                                            <select
                                                required
                                                value={currentProduct.category_id || ""}
                                                onChange={e => setCurrentProduct({ ...currentProduct, category_id: e.target.value })}
                                                className="w-full bg-white/60 border border-black/5 rounded-[1.5rem] px-5 py-4 focus:ring-4 focus:ring-black/5 outline-none appearance-none font-bold text-black"
                                            >
                                                <option value="" disabled>Seleccionar...</option>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Imagen URL</label>
                                        <div className="relative">
                                            <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                            <input
                                                type="text"
                                                value={currentProduct.image_url || ""}
                                                onChange={e => setCurrentProduct({ ...currentProduct, image_url: e.target.value })}
                                                className="w-full bg-white/60 border border-black/5 rounded-[1.5rem] pl-12 pr-5 py-4 focus:ring-4 focus:ring-black/5 outline-none transition-all"
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">Descripción</label>
                                        <textarea
                                            rows={4}
                                            value={currentProduct.description || ""}
                                            onChange={e => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                                            className="w-full bg-white/60 border border-black/5 rounded-[1.5rem] px-5 py-4 focus:ring-4 focus:ring-black/5 outline-none transition-all resize-none font-medium"
                                            placeholder="Detalles del producto..."
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2 flex gap-4 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="flex-1 py-5 rounded-[1.5rem] font-bold bg-white text-gray-400 border border-gray-100 hover:bg-gray-50 transition-all"
                                    >
                                        Descartar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-[2] py-5 rounded-[1.5rem] font-bold bg-black text-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-black/20"
                                    >
                                        {loading ? "Guardando..." : "Guardar Producto"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

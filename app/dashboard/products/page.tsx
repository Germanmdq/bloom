"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Filter, Edit3, Trash2, Coffee, Tag, DollarSign, Image as ImageIcon, Check } from "lucide-react";
import Image from "next/image";

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isEditing, setIsEditing] = useState(false);

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

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        const { data: catData } = await supabase.from('categories').select('*');
        const { data: prodData } = await supabase.from('products').select('*, categories(name)');

        if (catData) setCategories(catData);
        if (prodData) setProducts(prodData);
        setLoading(false);
    }

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
        fetchData();
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
        fetchData();
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredProducts.map((product) => (
                    <motion.div
                        key={product.id}
                        layoutId={product.id}
                        className="group relative bg-white/70 backdrop-blur-2xl rounded-[2.5rem] p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/40 flex flex-col"
                    >
                        <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-gray-50 mb-6 border border-gray-100/50">
                            {product.image_url ? (
                                <Image
                                    src={product.image_url}
                                    alt={product.name}
                                    fill
                                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-200">
                                    <Coffee size={48} />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <button
                                    onClick={() => {
                                        setCurrentProduct(product);
                                        setIsEditing(true);
                                        setIsAddingCategory(false);
                                    }}
                                    className="p-4 rounded-2xl bg-white text-black hover:scale-110 transition-transform shadow-lg"
                                >
                                    <Edit3 size={20} />
                                </button>
                                <button
                                    onClick={() => handleDelete(product.id)}
                                    className="p-4 rounded-2xl bg-red-500 text-white hover:scale-110 transition-transform shadow-lg"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col px-1">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-gray-900 text-xl tracking-tight">{product.name}</h4>
                                <span className="font-black text-gray-900 bg-white shadow-sm px-3 py-1 rounded-xl text-sm border border-gray-100">
                                    ${parseFloat(product.price).toLocaleString("es-AR")}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1 font-medium leading-relaxed">
                                {product.description || "Sin descripción"}
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                                    {product.categories?.name || "Sin categoría"}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

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
                                                value={currentProduct.name}
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
                                                value={currentProduct.price}
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
                                                    value={newCategoryName}
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
                                                value={currentProduct.category_id}
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
                                                value={currentProduct.image_url}
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
                                            value={currentProduct.description}
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

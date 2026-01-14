"use client";

import { useState } from "react";
import { menuData } from "@/lib/data"; // Categories and Products
import { Plus } from "lucide-react";

type OrderSheetProps = {
    tableId: number;
    onClose: () => void;
};

// Temp simple cart state
type CartItem = {
    productId: string;
    name: string;
    price: number;
    quantity: number;
};

export function OrderSheet({ tableId, onClose }: OrderSheetProps) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [activeCategory, setActiveCategory] = useState(menuData[0].id);

    const addToCart = (product: any) => {
        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                return prev.map(item =>
                    item.productId === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
        });
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-3xl font-bold text-gray-900 tracking-tight">Mesa {tableId}</h3>
                    <p className="text-gray-500">Agregar productos</p>
                </div>
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                >
                    ✕
                </button>
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
                {menuData.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeCategory === cat.id
                            ? "bg-gray-900 text-white shadow-md"
                            : "bg-white text-gray-500 hover:bg-gray-50 border border-gray-100"
                            }`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto min-h-0 mb-6 pr-2">
                <div className="grid grid-cols-1 gap-3">
                    {menuData.find(c => c.id === activeCategory)?.items.map(item => (
                        <div
                            key={item.id}
                            onClick={() => addToCart(item)}
                            className="flex items-center gap-4 p-3 rounded-2xl bg-white hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all cursor-pointer group"
                        >
                            {/* Placeholder for image if exists */}
                            <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 relative">
                                {item.image && <img src={item.image} alt={item.name} className="object-cover w-full h-full" />}
                            </div>

                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{item.name}</h4>
                                <p className="text-sm text-gray-500">${item.price.toLocaleString("es-AR")}</p>
                            </div>

                            <button className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cart Summary (Bottom) */}
            <div className="bg-white/50 backdrop-blur-xl rounded-3xl border border-white/40 p-5 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-500 font-medium">Total Pedido</span>
                    <span className="font-bold text-xl text-gray-900">${total.toLocaleString()}</span>
                </div>

                {cart.length > 0 ? (
                    <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
                        {cart.map(item => (
                            <div key={item.productId} className="flex justify-between text-sm">
                                <span className="text-gray-900">{item.quantity}x {item.name}</span>
                                <span className="text-gray-500">${(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-sm text-gray-400 mb-4 italic">Carrito vacío</div>
                )}

                <button
                    disabled={cart.length === 0}
                    className="w-full py-4 rounded-2xl bg-accent text-white font-semibold text-lg hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
                >
                    Cobrar Mesa
                </button>
            </div>
        </div>
    );
}

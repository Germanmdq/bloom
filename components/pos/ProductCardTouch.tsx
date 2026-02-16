import React, { useState } from 'react';
import Image from 'next/image';
import { Plus } from 'lucide-react';

interface ProductCardTouchProps {
    product: {
        id: string;
        name: string;
        price: number;
        image_url?: string;
        active: boolean;
    };
    onAdd: (product: any) => void;
}

export function ProductCardTouch({ product, onAdd }: ProductCardTouchProps) {
    const isActive = product.active !== false;

    // Fallback Image Logic if needed, but we focus on TEXT clarity first.

    return (
        <button
            onClick={() => isActive && onAdd(product)}
            className={`
                group relative flex flex-col justify-between text-left
                bg-white rounded-3xl p-5 shadow-sm border-2 border-transparent transition-all duration-150
                min-h-[160px] w-full
                ${isActive
                    ? 'hover:border-orange-500 hover:shadow-xl active:scale-95 cursor-pointer hover:bg-orange-50/10'
                    : 'opacity-50 grayscale cursor-not-allowed'
                }
            `}
        >
            {/* Background Image Accent (Optional low opacity) */}
            {product.image_url && (
                <div className="absolute inset-0 rounded-3xl overflow-hidden opacity-10 pointer-events-none">
                    <Image src={product.image_url} alt="" fill className="object-cover grayscale group-hover:grayscale-0" />
                </div>
            )}

            {/* Top: Name */}
            <div className="z-10 pr-2">
                <h3 className="font-extrabold text-xl text-gray-900 leading-tight mb-1 break-words">
                    {product.name}
                </h3>
            </div>

            {/* Bottom: Price & Action */}
            <div className="z-10 flex items-end justify-between mt-4">
                <span className="text-3xl font-black text-orange-600 tracking-tight">
                    ${product.price?.toLocaleString()}
                </span>

                <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-colors
                    ${isActive ? 'bg-orange-100 text-orange-600 group-hover:bg-orange-500 group-hover:text-white' : 'bg-gray-100 text-gray-400'}
                `}>
                    <Plus size={28} strokeWidth={4} />
                </div>
            </div>
        </button>
    );
}

import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface VariantOption {
    name: string;
    price?: number;
}

interface VariantGroup {
    id: string;
    name: string;
    min: number;
    max: number;
    options: VariantOption[];
}

interface VariantSelectorProps {
    product: any;
    isOpen: boolean;
    onClose: () => void;
    onAddToOrder: (product: any, selectedVariants: any[]) => void;
}


// MOCK DATA FOR DEMO - In real app, this comes from product.options
const MOCK_VARIANTS: Record<string, VariantGroup[]> = {
    'Milanesa': [
        {
            id: 'guarnicion',
            name: 'Elige tu Guarnición',
            min: 1,
            max: 1,
            options: [
                { name: 'Papas Fritas', price: 0 },
                { name: 'Puré de Papa', price: 0 },
                { name: 'Puré de Calabaza', price: 0 },
                { name: 'Ensalada Mixta', price: 0 },
                { name: 'Huevos Fritos (+Extra)', price: 1500 },
            ]
        },
        {
            id: 'coccion',
            name: 'Punto de Cocción',
            min: 1,
            max: 1,
            options: [
                { name: 'A Punto', price: 0 },
                { name: 'Cocido', price: 0 },
                { name: 'Jugoso', price: 0 }
            ]
        }
    ],
    'Hamburguesa': [
        {
            id: 'adicionales',
            name: 'Adicionales',
            min: 0,
            max: 5,
            options: [
                { name: 'Bacon Extra', price: 2000 },
                { name: 'Cebolla Caramelizada', price: 1000 },
                { name: 'Huevo Frito', price: 1200 },
                { name: 'Queso Cheddar', price: 1500 },
            ]
        }
    ],
    'Pizza': [
        {
            id: 'gustos',
            name: 'Gustos (Hasta 2)',
            min: 1,
            max: 2,
            options: [
                { name: 'Muzzarella', price: 0 },
                { name: 'Napolitana', price: 0 },
                { name: 'Fugazzeta', price: 0 },
                { name: 'Jamón y Morrones', price: 0 },
            ]
        }
    ],
    'Empanada': [
        {
            id: 'gusto_empanada',
            name: 'Elige el Gusto',
            min: 1,
            max: 12, // Permitir selección múltiple flexible
            options: [
                { name: 'Carne Suave', price: 0 },
                { name: 'Carne Picante', price: 0 },
                { name: 'Jamón y Queso', price: 0 },
                { name: 'Pollo', price: 0 },
                { name: 'Verdura', price: 0 },
                { name: 'Roquefort', price: 0 },
                { name: 'Humita', price: 0 },
                { name: 'Caprese', price: 0 },
            ]
        }
    ],
    'Pasta': [
        {
            id: 'salsa',
            name: 'Elige tu Salsa',
            min: 1,
            max: 1,
            options: [
                { name: 'Filetto (Roja)', price: 0 },
                { name: 'Crema', price: 0 },
                { name: 'Mixta (Rosa)', price: 0 },
                { name: 'Bolognesa', price: 1500 },
                { name: 'Parisienne', price: 1800 },
                { name: 'Pesto', price: 1200 },
            ]
        },
        {
            id: 'pasta_extra',
            name: 'Extra Queso',
            min: 0,
            max: 1,
            options: [
                { name: 'Queso Rallado Extra', price: 500 },
            ]
        }
    ]
};

// Helper to find variants based on name fuzzy matching
function getVariantsForProduct(product: any): VariantGroup[] {
    // Stricter check: DB options must be valid array of groups with options
    if (product.options && Array.isArray(product.options) && product.options.length > 0) {
        const firstGroup = product.options[0];
        if (firstGroup.options && Array.isArray(firstGroup.options)) {
            return product.options;
        }
    }
    // Fallback Mock Logic
    const name = product.name.toLowerCase();

    if (name.includes('milanesa') || name.includes('lomo') || name.includes('bife')) return MOCK_VARIANTS['Milanesa'];
    if (name.includes('hamburguesa') || name.includes('burger')) return MOCK_VARIANTS['Hamburguesa'];
    if (name.includes('pizza')) return MOCK_VARIANTS['Pizza'];

    // Logic for new categories
    if (name.includes('empanada')) return MOCK_VARIANTS['Empanada'];
    if (name.includes('sorrentinos') || name.includes('ravioles') || name.includes('noquis') || name.includes('ñoquis') || name.includes('tallarines') || name.includes('spaghetti')) return MOCK_VARIANTS['Pasta'];

    return [];
}


export function VariantSelector({ product, isOpen, onClose, onAddToOrder }: VariantSelectorProps) {
    const [selections, setSelections] = useState<Record<string, VariantOption[]>>({});

    if (!isOpen || !product) return null;

    const variantGroups = getVariantsForProduct(product);

    // If no variants found, auto-add and close (should be handled by parent, but safety check)
    if (variantGroups.length === 0) {
        // onAddToOrder(product, []); return null; // Avoid loop, handle in parent
    }

    const toggleOption = (groupId: string, option: VariantOption, group: VariantGroup) => {
        setSelections(prev => {
            const current = prev[groupId] || [];
            const isSelected = current.some(o => o.name === option.name);

            if (isSelected) {
                return { ...prev, [groupId]: current.filter(o => o.name !== option.name) };
            } else {
                // Check limits
                if (group.max === 1) {
                    return { ...prev, [groupId]: [option] }; // Radio behavior
                }
                if (current.length < group.max) {
                    return { ...prev, [groupId]: [...current, option] };
                }
                return prev; // Max reached
            }
        });
    };

    const isGroupSatisfied = (group: VariantGroup) => {
        const count = (selections[group.id] || []).length;
        return count >= group.min;
    };

    const canSubmit = variantGroups.every(g => isGroupSatisfied(g));

    const handleConfirm = () => {
        // Flatten selections
        const allSelected = Object.values(selections).flat();
        onAddToOrder(product, allSelected);
        setSelections({}); // Reset
    };

    const totalExtra = Object.values(selections).flat().reduce((acc, opt) => acc + (opt.price || 0), 0);

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">{product.name}</h2>
                        <p className="text-gray-500 font-medium">Personalizá tu pedido</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-900 shadow-sm border border-gray-200">
                        <X size={28} />
                    </button>
                </div>

                {/* Groups */}
                <div className="p-6 overflow-y-auto space-y-8 flex-1">
                    {variantGroups.map(group => (
                        <div key={group.id}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                                    {group.name}
                                    {isGroupSatisfied(group) && <Check size={18} className="text-green-500" strokeWidth={4} />}
                                </h3>
                                <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-md">
                                    {group.max === 1 ? 'Elegí 1' : `Elegí hasta ${group.max}`}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {group.options && Array.isArray(group.options) && group.options.map(option => {
                                    const isSelected = (selections[group.id] || []).some(o => o.name === option.name);
                                    return (
                                        <button
                                            key={option.name}
                                            onClick={() => toggleOption(group.id, option, group)}
                                            className={`
                                                p-4 rounded-xl border-2 text-left transition-all duration-200 flex justify-between items-center
                                                ${isSelected
                                                    ? 'border-orange-500 bg-orange-50/50 text-orange-700 shadow-sm relative overflow-hidden'
                                                    : 'border-gray-100 bg-white hover:bg-gray-50 text-gray-600'
                                                }
                                            `}
                                        >
                                            {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500" />}
                                            <span className="font-bold">{option.name}</span>
                                            {option.price ? (
                                                <span className="text-sm font-semibold bg-white/50 px-2 py-0.5 rounded text-gray-500">
                                                    +${option.price.toLocaleString()}
                                                </span>
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-white flex items-center justify-between gap-6">
                    <div className="text-right">
                        <div className="text-xs text-gray-400 uppercase font-bold">Total Extra</div>
                        <div className="text-2xl font-black text-orange-600">+${totalExtra.toLocaleString()}</div>
                    </div>

                    <button
                        onClick={handleConfirm}
                        disabled={!canSubmit}
                        className={`
                            flex-1 py-4 rounded-xl font-black text-xl shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2
                            ${canSubmit
                                ? 'bg-orange-500 text-white hover:bg-orange-600 hover:shadow-orange-500/30'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                            }
                        `}
                    >
                        {canSubmit ? 'CONFIRMAR Y AGREGAR' : 'COMPLETÁ LAS OPCIONES'}
                    </button>
                </div>
            </div>
        </div>
    );
}

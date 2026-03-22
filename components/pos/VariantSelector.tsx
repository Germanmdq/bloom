import React, { useState } from 'react';
import { X, Check, ChevronLeft } from 'lucide-react';

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

interface CheckoutInfo {
    name: string;
    phone: string;
    address: string;
    type: "delivery" | "retiro";
}

const PEDIDOS_YA_BLOOM_URL =
    "https://www.pedidosya.com.ar/restaurantes/mar-del-plata/bloom-mar-del-plata-5c1357e3-e095-476e-9eee-eeda4620b75e-menu";

interface VariantSelectorProps {
    product: any;
    isOpen: boolean;
    onClose: () => void;
    onAddToOrder: (product: any, selectedVariants: any[], observations?: string) => void;
    onAddAndCheckout?: (product: any, selectedVariants: any[], observations?: string, checkoutInfo?: CheckoutInfo) => void;
}

// MOCK DATA FOR DEMO - In real app, this comes from product.options
const MOCK_VARIANTS: Record<string, VariantGroup[]> = {
    'Milanesa': [
        {
            id: 'guarnicion', name: 'Elige tu Guarnición', min: 1, max: 1,
            options: [
                { name: 'Papas Fritas', price: 0 },
                { name: 'Puré de Papa', price: 0 },
                { name: 'Puré de Calabaza', price: 0 },
                { name: 'Ensalada Mixta', price: 0 },
                { name: 'Huevos Fritos (+Extra)', price: 1500 },
            ]
        },
        {
            id: 'coccion', name: 'Punto de Cocción', min: 1, max: 1,
            options: [
                { name: 'A Punto', price: 0 },
                { name: 'Cocido', price: 0 },
                { name: 'Jugoso', price: 0 },
            ]
        }
    ],
    'Hamburguesa': [
        {
            id: 'adicionales', name: 'Adicionales', min: 0, max: 5,
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
            id: 'gustos', name: 'Gustos (Hasta 2)', min: 1, max: 2,
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
            id: 'gusto_empanada', name: 'Elige el Gusto', min: 1, max: 12,
            options: [
                { name: 'Carne', price: 0 },
                { name: 'Jamón y Queso', price: 0 },
                { name: 'Choclo', price: 0 },
            ]
        }
    ],
    'Pasta': [
        {
            id: 'salsa', name: 'Elige tu Salsa', min: 1, max: 1,
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
            id: 'pasta_extra', name: 'Extra Queso', min: 0, max: 1,
            options: [{ name: 'Queso Rallado Extra', price: 500 }]
        }
    ],
    'Guarnicion': [
        {
            id: 'guarnicion', name: 'Elegí tu Guarnición', min: 1, max: 1,
            options: [
                { name: 'Papas Fritas', price: 0 },
                { name: 'Ensalada', price: 0 },
                { name: 'Puré', price: 0 },
            ]
        }
    ],
    'Filet': [
        {
            id: 'preparacion', name: 'Preparación', min: 1, max: 1,
            options: [
                { name: 'Empanado', price: 0 },
                { name: 'A la romana', price: 0 },
            ]
        },
        {
            id: 'guarnicion', name: 'Elegí tu Guarnición', min: 1, max: 1,
            options: [
                { name: 'Papas Fritas', price: 0 },
                { name: 'Ensalada', price: 0 },
                { name: 'Puré', price: 0 },
            ]
        }
    ]
};

function getVariantsForProduct(product: any): VariantGroup[] {
    if (product.options && Array.isArray(product.options) && product.options.length > 0) {
        const firstGroup = product.options[0];
        if (firstGroup.options && Array.isArray(firstGroup.options)) return product.options;
    }
    const name = product.name.toLowerCase();
    const isPlataDelDia = product.kind === 'plato_del_dia';
    const bebidaGroup: VariantGroup = {
        id: 'bebida', name: 'Bebida (incluída)', min: 0, max: 1,
        options: [
            { name: 'Agua mineral', price: 0 },
            { name: 'Gaseosa saborizada', price: 0 },
            { name: 'Sin bebida', price: 0 },
        ]
    };

    if (name.includes('milanesa') || name.includes('lomo') || name.includes('bife')) return isPlataDelDia ? [...MOCK_VARIANTS['Milanesa'], bebidaGroup] : MOCK_VARIANTS['Milanesa'];
    if (name.includes('hamburguesa') || name.includes('burger')) return isPlataDelDia ? [...MOCK_VARIANTS['Hamburguesa'], bebidaGroup] : MOCK_VARIANTS['Hamburguesa'];
    if (name.includes('pizza')) return isPlataDelDia ? [...MOCK_VARIANTS['Pizza'], bebidaGroup] : MOCK_VARIANTS['Pizza'];
    if (name.includes('empanada')) return MOCK_VARIANTS['Empanada'];
    if (name.includes('sorrentinos') || name.includes('ravioles') || name.includes('noquis') || name.includes('ñoquis') || name.includes('tallarines') || name.includes('spaghetti')) return isPlataDelDia ? [...MOCK_VARIANTS['Pasta'], bebidaGroup] : MOCK_VARIANTS['Pasta'];
    if (name.includes('filet')) return isPlataDelDia ? [...MOCK_VARIANTS['Filet'], bebidaGroup] : MOCK_VARIANTS['Filet'];
    if (name.includes('guarnición') || name.includes('guarnicion') || name.includes('pechuga') || name.includes('patamuslo')) return isPlataDelDia ? [...MOCK_VARIANTS['Guarnicion'], bebidaGroup] : MOCK_VARIANTS['Guarnicion'];
    if (isPlataDelDia) return [bebidaGroup];
    return [];
}

const EMPTY_CHECKOUT: CheckoutInfo = {
    name: "",
    phone: "",
    address: "",
    type: "delivery",
};

export function VariantSelector({ product, isOpen, onClose, onAddToOrder, onAddAndCheckout }: VariantSelectorProps) {
    const [selections, setSelections] = useState<Record<string, VariantOption[]>>({});
    const [observations, setObservations] = useState('');
    const [checkoutInfo, setCheckoutInfo] = useState<CheckoutInfo>(EMPTY_CHECKOUT);
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (!isOpen || !product) return null;

    const variantGroups = getVariantsForProduct(product);

    const toggleOption = (groupId: string, option: VariantOption, group: VariantGroup) => {
        setSelections(prev => {
            const current = prev[groupId] || [];
            const isSelected = current.some(o => o.name === option.name);
            if (isSelected) return { ...prev, [groupId]: current.filter(o => o.name !== option.name) };
            if (group.max === 1) return { ...prev, [groupId]: [option] };
            if (current.length < group.max) return { ...prev, [groupId]: [...current, option] };
            return prev;
        });
    };

    const isGroupSatisfied = (group: VariantGroup) => (selections[group.id] || []).length >= group.min;
    const canSubmit = variantGroups.every(g => isGroupSatisfied(g));
    const totalExtra = Object.values(selections).flat().reduce((acc, opt) => acc + (opt.price || 0), 0);

    const reset = () => {
        setSelections({});
        setObservations('');
        setCheckoutInfo(EMPTY_CHECKOUT);
        setErrors({});
    };

    const handleAddOnly = () => {
        if (!canSubmit) return;
        const allSelected = Object.values(selections).flat();
        onAddToOrder(product, allSelected, observations.trim());
        reset();
    };

    const validateAndCheckout = () => {
        if (!canSubmit || !onAddAndCheckout) return;
        const e: Record<string, string> = {};
        if (!checkoutInfo.name.trim()) e.name = 'Ingresá tu nombre';
        if (!checkoutInfo.phone.trim()) e.phone = 'Ingresá tu teléfono';
        if (checkoutInfo.type === "delivery" && !checkoutInfo.address.trim()) e.address = "Ingresá la dirección";
        setErrors(e);
        if (Object.keys(e).length > 0) return;
        const allSelected = Object.values(selections).flat();
        onAddAndCheckout(product, allSelected, observations.trim(), checkoutInfo);
        reset();
    };

    const ci = checkoutInfo;
    const setCi = (patch: Partial<CheckoutInfo>) => setCheckoutInfo(prev => ({ ...prev, ...patch }));

    return (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-end sm:items-center justify-center backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 leading-tight">{product.name}</h2>
                        <p className="text-gray-400 text-sm mt-0.5">
                            {onAddAndCheckout ? "Personalizá y elegí cómo recibir" : "Personalizá tu pedido"}
                        </p>
                    </div>
                    <button onClick={() => { reset(); onClose(); }} className="p-2 bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 shrink-0 ml-3">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

                    {/* Variantes */}
                    {variantGroups.map(group => (
                        <div key={group.id}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-black text-gray-800 text-sm uppercase tracking-wide flex items-center gap-2">
                                    {group.name}
                                    {isGroupSatisfied(group) && <Check size={15} className="text-green-500" strokeWidth={3} />}
                                </h3>
                                <span className="text-xs font-bold bg-gray-100 text-gray-400 px-2 py-0.5 rounded-md">
                                    {group.max === 1 ? 'Elegí 1' : `Hasta ${group.max}`}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {group.options.map(option => {
                                    const isSelected = (selections[group.id] || []).some(o => o.name === option.name);
                                    return (
                                        <button
                                            key={option.name}
                                            onClick={() => toggleOption(group.id, option, group)}
                                            className={`p-3 rounded-xl border-2 text-left text-sm transition-all flex justify-between items-center relative overflow-hidden ${isSelected ? 'border-bloom-500 bg-bloom-50 text-bloom-700' : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-bloom-200'}`}
                                        >
                                            {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-bloom-500" />}
                                            <span className="font-bold">{option.name}</span>
                                            {option.price ? <span className="text-xs text-gray-400">+${option.price.toLocaleString()}</span> : null}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Observaciones */}
                    <div>
                        <h3 className="font-black text-gray-700 text-sm uppercase tracking-wide mb-2">📝 Observaciones <span className="text-gray-300 font-normal normal-case">(opcional)</span></h3>
                        <textarea
                            value={observations}
                            onChange={e => setObservations(e.target.value)}
                            placeholder="Ej: sin cebolla, bien cocido, sin sal…"
                            rows={2}
                            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-bloom-300 resize-none text-sm font-medium"
                        />
                    </div>

                    {/* Datos de entrega (si onAddAndCheckout existe) */}
                    {onAddAndCheckout && (
                        <div className="space-y-4 border-t border-gray-100 pt-4">
                            <h3 className="font-black text-gray-800 text-sm uppercase tracking-wide">¿Cómo recibís el pedido?</h3>

                            {/* Tipo entrega */}
                            <div className="grid grid-cols-2 gap-2">
                                {([
                                    { id: "delivery" as const, label: "🛵 Delivery" },
                                    { id: "retiro" as const, label: "🏃 Retiro en local" },
                                ]).map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setCi({ type: t.id })}
                                        className={`py-2.5 rounded-xl font-bold text-xs transition-all ${ci.type === t.id ? "bg-bloom-600 text-white shadow-md" : "bg-gray-100 text-gray-500"}`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            <a
                                href={PEDIDOS_YA_BLOOM_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-bloom-600 py-3 text-center text-xs font-black text-white shadow-md transition-opacity hover:opacity-95"
                            >
                                A más de 250 m — pedí en PedidosYa
                            </a>

                            {/* Nombre */}
                            <input
                                type="text"
                                placeholder="Nombre completo *"
                                value={ci.name}
                                onChange={e => setCi({ name: e.target.value })}
                                className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-bloom-400'}`}
                            />
                            {errors.name && <p className="text-red-500 text-xs -mt-2">{errors.name}</p>}

                            {/* Teléfono */}
                            <input
                                type="tel"
                                placeholder="Teléfono / WhatsApp *"
                                value={ci.phone}
                                onChange={e => setCi({ phone: e.target.value })}
                                className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${errors.phone ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-bloom-400'}`}
                            />
                            {errors.phone && <p className="text-red-500 text-xs -mt-2">{errors.phone}</p>}

                            {/* Dirección delivery */}
                            {ci.type === 'delivery' && (
                                <div>
                                    <input
                                        type="text"
                                        placeholder="Dirección de entrega *"
                                        value={ci.address}
                                        onChange={e => setCi({ address: e.target.value })}
                                        className={`w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all ${errors.address ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-bloom-400'}`}
                                    />
                                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                                </div>
                            )}

                        </div>
                    )}
                </div>

                {/* Footer fijo */}
                <div className="px-5 pb-5 pt-4 border-t border-gray-100 bg-white space-y-2">
                    {totalExtra > 0 && (
                        <div className="flex justify-between text-sm px-1 mb-1">
                            <span className="text-gray-400 font-medium">Extra</span>
                            <span className="font-black text-bloom-600">+${totalExtra.toLocaleString()}</span>
                        </div>
                    )}

                    {!canSubmit ? (
                        <div className="w-full py-3.5 rounded-xl text-center text-sm font-bold bg-gray-100 text-gray-400">
                            Completá las opciones para continuar
                        </div>
                    ) : (
                        <>
                            {/* Confirmar pedido (con datos) */}
                            {onAddAndCheckout && (
                                <button
                                    type="button"
                                    onClick={validateAndCheckout}
                                    className="w-full rounded-xl bg-bloom-600 py-4 text-base font-black text-white shadow-lg transition-all hover:bg-bloom-700 active:scale-[0.98]"
                                >
                                    ✓ Confirmar Pedido
                                </button>
                            )}
                            {/* Agregar al carrito — bloom-600 (oliva marca) + texto blanco */}
                            <button
                                type="button"
                                onClick={handleAddOnly}
                                className="w-full rounded-xl bg-bloom-600 py-4 text-base font-black text-white shadow-lg transition-all hover:bg-bloom-700 active:scale-[0.98] sm:py-3.5 sm:text-sm"
                            >
                                {onAddAndCheckout ? "+ Agregar y seguir eligiendo" : "Agregar al pedido"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

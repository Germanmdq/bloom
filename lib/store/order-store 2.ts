
import { create } from 'zustand';

export interface CartItem {
    name: string;
    price: number;
    quantity: number;
    description?: string;
    // Add logic for modifiers later if needed
}

interface OrderState {
    tableId: string;
    setTableId: (id: string) => void;

    cart: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (index: number) => void;
    updateQuantity: (index: number, delta: number) => void;
    clearCart: () => void;

    paymentMethod: 'CASH' | 'CARD' | 'MERCADO_PAGO';
    setPaymentMethod: (method: 'CASH' | 'CARD' | 'MERCADO_PAGO') => void;

    notes: string;
    setNotes: (notes: string) => void;

    discount: number;
    setDiscount: (discount: number) => void;

    // Computed
    getTotal: () => number;
}

export const useOrderStore = create<OrderState>((set, get) => ({
    tableId: '1',
    setTableId: (id) => set({ tableId: id }),

    cart: [],
    addToCart: (item) => set((state) => {
        const existingIdx = state.cart.findIndex(i => i.name === item.name);
        if (existingIdx >= 0) {
            const newCart = [...state.cart];
            newCart[existingIdx].quantity += item.quantity;
            return { cart: newCart };
        }
        return { cart: [...state.cart, item] };
    }),
    removeFromCart: (index) => set((state) => ({
        cart: state.cart.filter((_, i) => i !== index)
    })),
    updateQuantity: (index, delta) => set((state) => {
        const newCart = [...state.cart];
        const item = newCart[index];
        const newQty = item.quantity + delta;

        if (newQty <= 0) {
            return { cart: state.cart.filter((_, i) => i !== index) };
        }

        newCart[index].quantity = newQty;
        return { cart: newCart };
    }),
    clearCart: () => set({ cart: [], notes: '', discount: 0, paymentMethod: 'CASH' }),

    paymentMethod: 'CASH',
    setPaymentMethod: (method) => set({ paymentMethod: method }),

    notes: '',
    setNotes: (notes) => set({ notes }),

    discount: 0,
    setDiscount: (discount) => set({ discount }),

    getTotal: () => {
        const state = get();
        const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        return subtotal * (1 - state.discount / 100);
    }
}));

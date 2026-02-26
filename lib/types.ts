export type Product = {
    id: string;
    name: string;
    description?: string;
    price: number;
    image?: string;
    category: string;
};

export type Category = {
    id: string;
    name: string;
    items: Product[];
};

export type Unit = 'kg' | 'g' | 'l' | 'ml' | 'unit';

export type Ingredient = {
    id: string;
    name: string;
    unit: Unit;
    stock: number;
    minStock: number;
    cost: number;
};

export type RecipeItem = {
    ingredientId: string;
    quantity: number;
};

export type ProductRecipe = {
    productId: string;
    ingredients: RecipeItem[];
};

export type TableStatus = 'FREE' | 'OCCUPIED';

export type Table = {
    id: number;
    status: TableStatus;
    total: number;
    order_type?: 'LOCAL' | 'DELIVERY';
    webOrderId?: string;  // ID original del pedido web
    clientName?: string;  // Nombre del cliente
};

export type PaymentMethod = 'CASH' | 'CARD' | 'MERCADO_PAGO';

export type OrderItem = {
    id?: string;
    product_id?: string;
    name: string;
    price: number;
    quantity: number;
    is_meta?: boolean;
    details?: Record<string, string>;
};

export type Order = {
    id: string;
    table_id: number;
    total: number;
    payment_method: PaymentMethod;
    created_at: string;
    created_by?: string;
    items?: OrderItem[];
};

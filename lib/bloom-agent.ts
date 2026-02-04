import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function validateStock(items: { product_id: string, quantity: number }[]) {
    const warnings: any[] = [];

    for (const item of items) {
        const { data: product } = await supabase
            .from('products')
            .select('*, category:categories(*)')
            .eq('id', item.product_id)
            .eq('kind', 'menu')
            .single();

        if (!product) {
            warnings.push({ product_id: item.product_id, error: 'Producto no encontrado' });
            continue;
        }

        const { data: recipe } = await supabase
            .from('recipes')
            .select('qty, raw_product_id')
            .eq('menu_product_id', item.product_id);

        if (!recipe || recipe.length === 0) continue;

        for (const ingredient of recipe) {
            const needed = ingredient.qty * item.quantity;

            const { data: rawProduct } = await supabase
                .from('products')
                .select('id, name, unit, price')
                .eq('id', ingredient.raw_product_id)
                .single();

            const { data: stockData } = await supabase
                .rpc('get_current_stock', { product_id: ingredient.raw_product_id });

            const currentStock = stockData || 0;

            if (currentStock < needed) {
                warnings.push({
                    product: product.name,
                    ingredient: rawProduct?.name,
                    needed,
                    available: currentStock,
                    missing: needed - currentStock,
                    unit: rawProduct?.unit,
                    warning: '⚠️ Stock insuficiente'
                });
            }
        }
    }

    return { available: true, warnings };
}

export async function processOrder(orderData: {
    table_id: number;
    items: { product_id: string; quantity: number; price: number; name: string }[];
    payment_method: string;
    waiter_id: string;
}) {
    const validation = await validateStock(
        orderData.items.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
    );

    const total = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            table_id: orderData.table_id,
            total,
            payment_method: orderData.payment_method,
            waiter_id: orderData.waiter_id,
            items: orderData.items,
            stock_applied: false
        })
        .select()
        .single();

    if (orderError) throw orderError;

    await applyStockDeduction(order.id, orderData.items);

    await supabase.from('orders').update({ stock_applied: true }).eq('id', order.id);

    return { ...order, stock_warnings: validation.warnings };
}

async function applyStockDeduction(
    orderId: string,
    items: { product_id: string; quantity: number; name: string }[]
) {
    for (const item of items) {
        const { data: recipe } = await supabase
            .from('recipes')
            .select('qty, raw_product_id')
            .eq('menu_product_id', item.product_id);

        if (!recipe || recipe.length === 0) continue;

        for (const ingredient of recipe) {
            const qtyToDeduct = ingredient.qty * item.quantity;

            await supabase.from('inventory_movements').insert({
                raw_product_id: ingredient.raw_product_id,
                qty: -qtyToDeduct,
                reason: 'sale',
                ref_table: 'orders',
                ref_id: orderId,
                note: `Venta: ${item.name} (${item.quantity} uni)`
            });
        }
    }
}

export async function calculateProductCost(productId: string, quantity: number = 1) {
    const { data: product } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('id', productId)
        .single();

    if (!product) throw new Error('Producto no encontrado');

    const { data: recipe } = await supabase
        .from('recipes')
        .select('qty, raw_product_id')
        .eq('menu_product_id', productId);

    if (!recipe || recipe.length === 0) {
        return {
            product: product.name,
            cost: 0,
            price: product.price,
            margin: product.price,
            margin_pct: 100,
            ingredients: []
        };
    }

    let totalCost = 0;
    const ingredients: any[] = [];

    for (const item of recipe) {
        const { data: rawProduct } = await supabase
            .from('products')
            .select('name, price, unit')
            .eq('id', item.raw_product_id)
            .single();

        if (rawProduct) {
            const itemCost = item.qty * rawProduct.price;
            totalCost += itemCost;

            ingredients.push({
                name: rawProduct.name,
                qty: item.qty,
                unit: rawProduct.unit,
                cost: itemCost
            });
        }
    }

    const finalCost = totalCost * quantity;
    const revenue = product.price * quantity;
    const margin = revenue - finalCost;
    const marginPct = finalCost > 0 ? ((margin / finalCost) * 100) : 0;

    return {
        product: product.name,
        quantity,
        cost: finalCost,
        price: revenue,
        margin,
        margin_pct: marginPct,
        ingredients
    };
}

export async function profitabilityReport() {
    const { data: products } = await supabase
        .from('products')
        .select('id, name, price, category:categories(name)')
        .eq('kind', 'menu')
        .eq('active', true);

    if (!products) return [];

    const report: any[] = [];

    for (const product of products) {
        try {
            const analysis = await calculateProductCost(product.id, 1);
            report.push({ category: product.category?.name, ...analysis });
        } catch (error) {
            console.warn(`Error: ${product.name}`, error);
        }
    }

    return report.sort((a, b) => b.margin - a.margin);
}

export async function addStock(rawProductId: string, quantity: number, note?: string) {
    const { data, error } = await supabase.from('inventory_movements').insert({
        raw_product_id: rawProductId,
        qty: quantity,
        reason: 'purchase',
        note: note || 'Compra de mercadería'
    }).select().single();

    if (error) throw error;
    return data;
}

export async function getCurrentStock() {
    const { data: rawProducts } = await supabase
        .from('products')
        .select('id, name, unit, min_stock')
        .eq('kind', 'raw')
        .eq('track_stock', true);

    if (!rawProducts) return [];

    const stockReport: any[] = [];

    for (const product of rawProducts) {
        const { data: stockData } = await supabase.rpc('get_current_stock', { product_id: product.id });

        const currentStock = stockData || 0;
        const status = currentStock < 0 ? 'NEGATIVE' :
            currentStock < product.min_stock ? 'CRITICAL' :
                currentStock < product.min_stock * 1.5 ? 'LOW' : 'OK';

        stockReport.push({
            id: product.id,
            name: product.name,
            current_stock: currentStock,
            min_stock: product.min_stock,
            unit: product.unit,
            status
        });
    }

    return stockReport;
}

export async function dailySalesReport(date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const { data: orders } = await supabase
        .from('orders')
        .select('id, total, items, created_at, payment_method')
        .gte('created_at', `${targetDate}T00:00:00`)
        .lt('created_at', `${targetDate}T23:59:59`);

    if (!orders || orders.length === 0) {
        return {
            date: targetDate,
            total_sales: 0,
            total_orders: 0,
            avg_ticket: 0,
            by_payment_method: {},
            top_products: []
        };
    }

    const totalSales = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = orders.length;
    const avgTicket = totalSales / totalOrders;

    const byPaymentMethod = orders.reduce((acc: any, o) => {
        const method = o.payment_method || 'unknown';
        acc[method] = (acc[method] || 0) + Number(o.total);
        return acc;
    }, {});

    const productCount: any = {};
    orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach((item: any) => {
                const key = item.name || item.product_id;
                if (!productCount[key]) {
                    productCount[key] = { name: key, quantity: 0, revenue: 0 };
                }
                productCount[key].quantity += item.quantity || 1;
                productCount[key].revenue += (item.price || 0) * (item.quantity || 1);
            });
        }
    });

    const topProducts = Object.values(productCount)
        .sort((a: any, b: any) => b.quantity - a.quantity)
        .slice(0, 10);

    return {
        date: targetDate,
        total_sales: totalSales,
        total_orders: totalOrders,
        avg_ticket: avgTicket,
        by_payment_method: byPaymentMethod,
        top_products: topProducts
    };
}

export const MERMA_FACTORS = {
    ESPINACA_HERVIDA: 3.8,
    PAPA_PURE: 1.87,
    TOMATE_PELADO: 2.7,
    MATAMBRE_HERVIDO: 1.5,
    POLLO_COCIDO: 1.3,
    PIONONO: 1.11
};

export function applyMerma(qty: number, mermaKey: keyof typeof MERMA_FACTORS): number {
    return qty * MERMA_FACTORS[mermaKey];
}

export const BloomAgent = {
    validateStock,
    processOrder,
    calculateProductCost,
    profitabilityReport,
    addStock,
    getCurrentStock,
    dailySalesReport,
    applyMerma,
    MERMA_FACTORS
};

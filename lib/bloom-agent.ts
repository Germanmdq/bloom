import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ============================================
// 1. VALIDAR STOCK (OPTIMIZED - PARALLEL & NON-BLOCKING)
// ============================================
export async function validateStock(items: { product_id: string, quantity: number }[]) {
    const warnings: any[] = [];

    // Use Promise.all to fetch/validate in parallel
    // This executes all product checks simultaneously instead of one by one
    await Promise.all(items.map(async (item) => {
        // 1. Fetch product info
        const { data: product } = await supabase
            .from('products')
            .select('*, category:categories(*)')
            .eq('id', item.product_id)
            .eq('kind', 'menu')
            .single();

        if (!product) {
            warnings.push({ product_id: item.product_id, error: 'Producto no encontrado' });
            return;
        }

        // 2. Fetch recipe
        const { data: recipe } = await supabase
            .from('recipes')
            .select(`
        qty,
        raw_product:products!recipes_raw_product_id_fkey(
          id,
          name,
          unit,
          price
        )
      `)
            .eq('menu_product_id', item.product_id);

        if (!recipe || recipe.length === 0) return;

        // 3. Check ingredients stock in parallel
        await Promise.all(recipe.map(async (ingredient) => {
            const needed = ingredient.qty * item.quantity;

            const { data: stockData } = await supabase
                .rpc('get_current_stock', {
                    product_id: ingredient.raw_product.id
                });

            const currentStock = stockData || 0;

            if (currentStock < needed) {
                warnings.push({
                    product: product.name,
                    ingredient: ingredient.raw_product.name,
                    needed: needed,
                    available: currentStock,
                    missing: needed - currentStock,
                    unit: ingredient.raw_product.unit,
                    warning: '⚠️ Stock insuficiente - se permitirá stock negativo'
                });
            }
        }));
    }));

    return {
        available: true, // SIEMPRE TRUE - NO BLOQUEA
        warnings
    };
}

// ============================================
// 2. PROCESAR VENTA (OPTIMIZED)
// ============================================
export async function processOrder(orderData: {
    table_id: number;
    items: { product_id: string; quantity: number; price: number; name: string }[];
    payment_method: string;
    waiter_id: string;
}) {
    console.time('Order Processing');

    // 1. Validar stock (Parallel)
    // We await this, but now it runs completely in parallel so it should be fast.
    const validation = await validateStock(
        orderData.items.map(i => ({ product_id: i.product_id, quantity: i.quantity }))
    );

    // 2. Calcular total
    const total = orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // 3. Crear orden
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            table_id: orderData.table_id,
            total: total,
            payment_method: orderData.payment_method,
            waiter_id: orderData.waiter_id,
            items: orderData.items,
            stock_applied: false
        })
        .select()
        .single();

    if (orderError) throw orderError;

    // 4. Descontar stock (Parallel)
    // We still await to ensure compilation, but the internal loop is parallelized.
    await applyStockDeduction(order.id, orderData.items);

    // 5. Marcar stock aplicado
    await supabase
        .from('orders')
        .update({ stock_applied: true })
        .eq('id', order.id);

    console.timeEnd('Order Processing');

    // Retornar orden con warnings
    return {
        ...order,
        stock_warnings: validation.warnings
    };
}

// ============================================
// 3. DESCONTAR STOCK (OPTIMIZED - PARALLEL & BATCH)
// ============================================
async function applyStockDeduction(
    orderId: string,
    items: { product_id: string; quantity: number; name: string }[]
) {
    // Process all items in parallel
    await Promise.all(items.map(async (item) => {
        const { data: recipe } = await supabase
            .from('recipes')
            .select(`
        qty,
        raw_product_id,
        raw_product:products!recipes_raw_product_id_fkey(
          id,
          name,
          unit
        )
      `)
            .eq('menu_product_id', item.product_id);

        if (!recipe || recipe.length === 0) return;

        // Prepare movements for this item's ingredients
        const movements = recipe.map(ingredient => {
            const qtyToDeduct = ingredient.qty * item.quantity;
            return {
                raw_product_id: ingredient.raw_product_id,
                qty: -qtyToDeduct,
                reason: 'sale',
                ref_table: 'orders',
                ref_id: orderId,
                note: `Venta: ${item.name} (${item.quantity} uni)`
            };
        });

        // Batch insert for this item's measurements
        if (movements.length > 0) {
            // Parallel insert is better than sequential
            await supabase.from('inventory_movements').insert(movements);
        }
    }));
}

// ============================================
// 4. CALCULAR COSTO DE PRODUCTO
// ============================================
export async function calculateProductCost(productId: string, quantity: number = 1) {
    const { data: product } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('id', productId)
        .single();

    if (!product) throw new Error('Producto no encontrado');

    const { data: recipe } = await supabase
        .from('recipes')
        .select(`
      qty,
      raw_product:products!recipes_raw_product_id_fkey(
        name,
        price,
        unit
      )
    `)
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
    const ingredients = [];

    for (const item of recipe) {
        const itemCost = item.qty * item.raw_product.price;
        totalCost += itemCost;

        ingredients.push({
            name: item.raw_product.name,
            qty: item.qty,
            unit: item.raw_product.unit,
            cost: itemCost
        });
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

// ============================================
// 5. REPORTE DE RENTABILIDAD
// ============================================
export async function profitabilityReport() {
    const { data: products } = await supabase
        .from('products')
        .select('id, name, price, category:categories(name)')
        .eq('kind', 'menu')
        .eq('active', true);

    if (!products) return [];

    const report = [];

    // Parallelize Cost Calculation too (Optional, but user asked for report speed maybe?)
    // User didn't ask for report speed. Keep it simple or safe parallelism.
    // We can stick to Promise.allSettled
    const results = await Promise.allSettled(products.map(p => calculateProductCost(p.id, 1)));

    // Map results
    results.forEach((res, index) => {
        if (res.status === 'fulfilled') {
            report.push({
                category: products[index].category?.name,
                ...res.value
            });
        } else {
            console.warn(`No se pudo calcular ${products[index].name}:`, res.reason);
        }
    });

    return report.sort((a: any, b: any) => b.margin - a.margin);
}

// ============================================
// 6. AGREGAR STOCK (COMPRAS)
// ============================================
export async function addStock(
    rawProductId: string,
    quantity: number,
    note?: string
) {
    const { data, error } = await supabase
        .from('inventory_movements')
        .insert({
            raw_product_id: rawProductId,
            qty: quantity,
            reason: 'purchase',
            note: note || 'Compra de mercadería'
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ============================================
// 7. OBTENER STOCK ACTUAL (INCLUYE NEGATIVOS)
// ============================================
export async function getCurrentStock() {
    const { data: rawProducts } = await supabase
        .from('products')
        .select('id, name, unit, min_stock')
        .eq('kind', 'raw')
        .eq('track_stock', true);

    if (!rawProducts) return [];

    const stockReport: any[] = [];

    // Parallelize Get Current Stock
    await Promise.all(rawProducts.map(async (product) => {
        const { data: stockData } = await supabase
            .rpc('get_current_stock', { product_id: product.id });

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
    }));

    return stockReport.sort((a, b) => a.name.localeCompare(b.name));
}

// ============================================
// 8. REPORTE DIARIO
// ============================================
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

// ============================================
// 9. FÓRMULAS DE MERMA
// ============================================
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

// ============================================
// EXPORTAR TODO
// ============================================
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

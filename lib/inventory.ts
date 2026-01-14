import { Ingredient, ProductRecipe } from "@/lib/types";

export const ingredients: Ingredient[] = [
    // Coffee & Dairy
    { id: "i_coffee_beans", name: "Granos de Café (Especialidad)", unit: "g", stock: 5000, minStock: 1000, cost: 2.5 },
    { id: "i_milk_whole", name: "Leche Entera", unit: "ml", stock: 20000, minStock: 5000, cost: 0.15 },
    { id: "i_chocolate_ganache", name: "Ganache Chocolate Amargo", unit: "g", stock: 2000, minStock: 500, cost: 3.0 },

    // Bakery
    { id: "i_croissant_frozen", name: "Croissant (Crudo)", unit: "unit", stock: 100, minStock: 20, cost: 400 },
    { id: "i_choc_croissant", name: "Pain au Chocolat (Crudo)", unit: "unit", stock: 80, minStock: 20, cost: 500 },
    { id: "i_sourdough", name: "Rebanada Masa Madre", unit: "unit", stock: 50, minStock: 10, cost: 100 },
    { id: "i_avocado", name: "Palta", unit: "unit", stock: 30, minStock: 5, cost: 800 },
    { id: "i_egg", name: "Huevo (Campo)", unit: "unit", stock: 120, minStock: 24, cost: 200 },
    { id: "i_lemon_loaf", name: "Rebanada Budín Limón", unit: "unit", stock: 20, minStock: 5, cost: 300 },

    // Kitchen / Lunch
    { id: "i_lettuce_romaine", name: "Lechuga Romana", unit: "g", stock: 2000, minStock: 500, cost: 0.5 },
    { id: "i_parmesan", name: "Queso Parmesano", unit: "g", stock: 1000, minStock: 200, cost: 2.0 },
    { id: "i_croutons", name: "Croutones", unit: "g", stock: 1000, minStock: 200, cost: 0.8 },
    { id: "i_caesar_dressing", name: "Aderezo César", unit: "ml", stock: 2000, minStock: 500, cost: 1.2 },
    { id: "i_burger_bun", name: "Pan Brioche", unit: "unit", stock: 60, minStock: 12, cost: 400 },
    { id: "i_beef_patty", name: "Medallón Carne Premium (180g)", unit: "unit", stock: 60, minStock: 12, cost: 1500 },
    { id: "i_cheddar", name: "Feta Cheddar", unit: "unit", stock: 200, minStock: 20, cost: 100 },
    { id: "i_tomato", name: "Tomate", unit: "g", stock: 3000, minStock: 500, cost: 0.3 },
    { id: "i_salmon", name: "Filete Salmón (200g)", unit: "unit", stock: 40, minStock: 5, cost: 3500 },
    { id: "i_veggies", name: "Mix Vegetales Asados", unit: "g", stock: 5000, minStock: 1000, cost: 0.9 },
];

export const recipes: ProductRecipe[] = [
    // Coffee
    {
        productId: "e1", // Espresso Perfetto
        ingredients: [
            { ingredientId: "i_coffee_beans", quantity: 18 } // 18g dose
        ]
    },
    {
        productId: "e2", // Velvet Latte
        ingredients: [
            { ingredientId: "i_coffee_beans", quantity: 18 },
            { ingredientId: "i_milk_whole", quantity: 250 } // 250ml (inc steaming loss)
        ]
    },
    {
        productId: "e3", // Royal Mocha
        ingredients: [
            { ingredientId: "i_coffee_beans", quantity: 18 },
            { ingredientId: "i_milk_whole", quantity: 200 },
            { ingredientId: "i_chocolate_ganache", quantity: 30 }
        ]
    },
    {
        productId: "e4", // Flat White
        ingredients: [
            { ingredientId: "i_coffee_beans", quantity: 18 },
            { ingredientId: "i_milk_whole", quantity: 180 }
        ]
    },
    {
        productId: "e5", // Cold Brew
        ingredients: [
            { ingredientId: "i_coffee_beans", quantity: 25 } // Higher dose for cold brew
        ]
    },

    // Bakery
    { productId: "b1", ingredients: [{ ingredientId: "i_croissant_frozen", quantity: 1 }] },
    { productId: "b2", ingredients: [{ ingredientId: "i_choc_croissant", quantity: 1 }] },
    {
        productId: "b3", // Avocado Toast
        ingredients: [
            { ingredientId: "i_sourdough", quantity: 1 },
            { ingredientId: "i_avocado", quantity: 0.5 }, // Half an avocado
            { ingredientId: "i_egg", quantity: 1 }
        ]
    },
    { productId: "b4", ingredients: [{ ingredientId: "i_lemon_loaf", quantity: 1 }] },

    // Lunch
    {
        productId: "p1", // Caesar Salad
        ingredients: [
            { ingredientId: "i_lettuce_romaine", quantity: 150 },
            { ingredientId: "i_parmesan", quantity: 20 },
            { ingredientId: "i_croutons", quantity: 30 },
            { ingredientId: "i_caesar_dressing", quantity: 40 }
        ]
    },
    {
        productId: "p2", // Bloom Burger
        ingredients: [
            { ingredientId: "i_burger_bun", quantity: 1 },
            { ingredientId: "i_beef_patty", quantity: 1 },
            { ingredientId: "i_cheddar", quantity: 1 },
            { ingredientId: "i_lettuce_romaine", quantity: 10 },
            { ingredientId: "i_tomato", quantity: 20 }
        ]
    },
    {
        productId: "p3", // Grilled Salmon
        ingredients: [
            { ingredientId: "i_salmon", quantity: 1 },
            { ingredientId: "i_veggies", quantity: 150 }
        ]
    },
];

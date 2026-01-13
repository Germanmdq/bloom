import { Category } from "@/lib/types";

export const menuData: Category[] = [
    {
        id: "specialty",
        name: "Specialty Coffee",
        items: [
            { id: "e1", category: "specialty", name: "Espresso Perfetto", description: "Single origin, double shot", price: 2300, image: "/images/espresso_explosion_1768310537479.png" },
            { id: "e2", category: "specialty", name: "Velvet Latte", description: "Silky steamed milk with espresso art", price: 4100, image: "/images/latte_swirl_1768310553394.png" },
            { id: "e3", category: "specialty", name: "Royal Mocha", description: "Dark chocolate ganache fusion", price: 6000, image: "/images/mocha_splash_1768310570273.png" },
            { id: "e4", category: "specialty", name: "Flat White", description: "Rich microfoam, strong body", price: 4300 },
            { id: "e5", category: "specialty", name: "Cold Brew", description: "24h extraction, smooth finish", price: 4500 },
        ]
    },
    {
        id: "bakery",
        name: "Bakery & Sweets",
        items: [
            { id: "b1", category: "bakery", name: "Croissant", description: "Butter layers, freshly baked", price: 2000 },
            { id: "b2", category: "bakery", name: "Pain au Chocolat", description: "Dark chocolate filling", price: 2500 },
            { id: "b3", category: "bakery", name: "Avocado Toast", description: "Poached niceness", price: 7400 },
            { id: "b4", category: "bakery", name: "Lemon Loaf", description: "Zesty glaze", price: 3900 },
        ]
    },
    {
        id: "plates",
        name: "Lunch & Dinner",
        items: [
            { id: "p1", category: "plates", name: "Caesar Salad", description: "Classic preparation", price: 7400 },
            { id: "p2", category: "plates", name: "Bloom Burger", description: "Premium beef, brioche bun", price: 10900 },
            { id: "p3", category: "plates", name: "Grilled Salmon", description: "With roasted vegetables", price: 13900 },
        ]
    }
];

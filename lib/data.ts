import { Category } from "@/lib/types";

export const menuData: Category[] = [
    {
        id: "specialty",
        name: "Café de Especialidad",
        items: [
            { id: "e1", category: "specialty", name: "Espresso Perfetto", description: "Origen único, doble shot", price: 2300, image: "/images/espresso_explosion_1768310537479.png" },
            { id: "e2", category: "specialty", name: "Velvet Latte", description: "Leche sedosa con arte latte", price: 4100, image: "/images/latte_swirl_1768310553394.png" },
            { id: "e3", category: "specialty", name: "Royal Mocha", description: "Fusión de ganache de chocolate amargo", price: 6000, image: "/images/mocha_splash_1768310570273.png" },
            { id: "e4", category: "specialty", name: "Flat White", description: "Microespuma rica, cuerpo intenso", price: 4300 },
            { id: "e5", category: "specialty", name: "Cold Brew", description: "Extracción de 24h, final suave", price: 4500 },
        ]
    },
    {
        id: "bakery",
        name: "Pastelería y Dulces",
        items: [
            { id: "b1", category: "bakery", name: "Croissant", description: "Capas de manteca, recién horneado", price: 2000 },
            { id: "b2", category: "bakery", name: "Pain au Chocolat", description: "Relleno de chocolate amargo", price: 2500 },
            { id: "b3", category: "bakery", name: "Tostada de Palta", description: "Huevo poché y semillas", price: 7400 },
            { id: "b4", category: "bakery", name: "Budín de Limón", description: "Glaseado cítrico", price: 3900 },
        ]
    },
    {
        id: "plates",
        name: "Almuerzo y Cena",
        items: [
            { id: "p1", category: "plates", name: "Ensalada César", description: "Preparación clásica con aderezo casero", price: 7400 },
            { id: "p2", category: "plates", name: "Hamburguesa Bloom", description: "Carne premium, pan brioche", price: 10900 },
            { id: "p3", category: "plates", name: "Salmón Grillado", description: "Con vegetales asados de estación", price: 13900 },
        ]
    }
];

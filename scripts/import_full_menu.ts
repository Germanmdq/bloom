
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://elvifblvjvcbwabhrlco.supabase.co";
const supabaseKey = "sb_publishable_lpgxFMUClqI3WP-QX2Pi3w_eK0NkH02";

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Category IDs verified from fetch_categories.ts
const CATEGORY_IDS = {
    CAFETERIA: 'fde35fc7-9d30-484b-9d52-422c9f612120',
    BEBIDAS: 'ea47ead6-1ffb-451e-8021-77cb2d11b7d7',
    POSTRES: 'e15beaf0-4134-40c0-a939-efa0c1d56d3b',
    PLATOS: '29d59ee4-8cd2-4fdf-907c-32743268a3c0', // Nuestros Platos Diarios
    EMPANADAS: 'a72cb6eb-80ff-409b-a0ac-32b705dd8e0b',
    PIZZAS: '11a1b0a0-8313-4750-8b36-33d4d99d4208',
    MILANESAS: 'f66c4b10-e050-432e-9f65-1c6d4292bb4f',
    HAMBURGUESAS: '2fc26aa5-7b1c-47c7-8e06-0d0a61ad3cdb',
    PASTAS: 'bc0c5709-185f-4385-9a5d-319e691ed27f',
    TORTILLA: '6e510ec2-3dd0-4941-9e4e-7f7beec8545c',
    ENSALADAS: 'b12a9958-34fd-4b2e-8295-80321ab245b2',
    PASTELERIA: '01878811-70cc-443a-8906-703eb060ff82',
    PANIFICADOS: 'af7e82d2-4177-4e39-a449-11814550bca9',
    JUGOS: '55ef8e79-bf33-4a5a-b27d-3f754511220e', // Jugos y licuados
    PROMOCIONES: 'bad28734-1842-4201-88d7-d3d55360d155',
    // DESAYUNO: Not strictly needed if mapped to others, but let's see. map to Promociones/Panificados?
    // Using IDs found.
};

// Raw content (truncated for brevity, pasting all user info)
const RAW_PRODUCTS = [
    { name: "CAFE / CORTADO / LAGRIMA", price: 3000, desc: "" },
    { name: "CAFE POCILLO", price: 2300, desc: "" },
    { name: "CAFE DOBLE / CORTADO DOBLE", price: 4300, desc: "" },
    { name: "CAFE CON CREMA", price: 4100, desc: "" },
    { name: "CAFE CON LECHE / LAGRIMA DOBLE", price: 4100, desc: "" },
    { name: "RISTRETTO", price: 1800, desc: "" },
    { name: "CORTADO", price: 2300, desc: "" },
    { name: "CORTADO DOBLE", price: 3200, desc: "" },
    { name: "LAGRIMA", price: 2300, desc: "" },
    { name: "IRLANDES", price: 6000, desc: "" },
    { name: "LAGRIMA DOBLE", price: 3200, desc: "" },
    { name: "CAPUCHINO", price: 6000, desc: "" },
    { name: "TE", price: 2200, desc: "" },
    { name: "TE SABORIZADO", price: 2200, desc: "" },
    { name: "TE CON LECHE / MATE COCIDO CON LECHE", price: 3200, desc: "" },
    { name: "SUBMARINO", price: 6000, desc: "" },
    { name: "CHOCOLATADA", price: 4500, desc: "" },
    { name: "CLASICO", price: 10500, desc: "Cafe con leche + 3 facturas + exprimido naranja" },
    { name: "SALUDABLE", price: 10500, desc: "Cafe con leche + 1/2 porcion de tostadas con queso + exprimido" },
    { name: "CONTINENTAL", price: 11900, desc: "Cafe con leche + 2 facturas + 1/2 Tostado + exprimido" },
    { name: "DESAYUNO BLOOM", price: 6500, desc: "Infusion + porcion individual de torta + exprimido" },
    { name: "Exprimido de Naranja", price: 5900, desc: "" },
    { name: "MEDIO EXPRIMIDO", price: 3900, desc: "" },
    { name: "NARANJADA", price: 0, desc: "Naranja" }, // Price "Sin proveedor", assume 0 or handle manually.
    { name: "LIMONADA", price: 0, desc: "Limon, jengibre y menta" },
    { name: "LICUADO", price: 6500, desc: "" },
    { name: "PORCION TOSTADAS", price: 3900, desc: "" },
    { name: "1/2 PORCION TOSTADAS", price: 2100, desc: "" },
    { name: "FACTURA", price: 1000, desc: "" },
    { name: "MEDIALUNA JAMON Y QUESO", price: 2000, desc: "" },
    { name: "TOSTADO DE MIGA", price: 5600, desc: "" },
    { name: "1/2 TOSTADO DE MIGA", price: 3200, desc: "" },
    { name: "TARTA DE COCO", price: 7900, desc: "" },
    { name: "BROWNIE SIN MERENGUE", price: 3800, desc: "" },
    { name: "LEMON PIE", price: 7900, desc: "" },
    { name: "CHOCOTORTA", price: 7500, desc: "" },
    { name: "BUDIN DE LIMON Y AMAPOLAS", price: 3900, desc: "" },
    { name: "ALFAJOR MASA SABLEE", price: 1900, desc: "" },
    { name: "ALFAJORES DE MAICENA", price: 3500, desc: "" },
    { name: "ALFAJOR DEGUIDO", price: 3500, desc: "" },
    { name: "MILANESA SOLA", price: 10900, desc: "" },
    { name: "MILANESA JAMON Y QUESO", price: 11900, desc: "" },
    { name: "MILANESA NAPO ESPECIAL", price: 14900, desc: "" },
    { name: "MILANESA COMPLETA", price: 13200, desc: "" },
    { name: "HAMB. SOLA", price: 10900, desc: "" },
    { name: "HAMB. CON JAMON Y QUESO", price: 11900, desc: "" },
    { name: "HAMB. COMPLETA", price: 13200, desc: "" },
    { name: "EMPANADA CARNE", price: 1600, desc: "" },
    { name: "EMPANADA JAMON Y QUESO", price: 1600, desc: "" },
    { name: "EMPANADA POLLO", price: 1600, desc: "" },
    { name: "EMPANADA CAPRESE", price: 1200, desc: "" },
    { name: "EMPANADA QUESO Y CEBOLLA", price: 1200, desc: "" },
    { name: "EMPANADAS VERDURA", price: 1200, desc: "" },
    { name: "TARTA JAMON Y QUESO", price: 6900, desc: "" },
    { name: "TARTA CAPRESSE", price: 6500, desc: "" },
    { name: "TARTA POLLO", price: 6900, desc: "" },
    { name: "TARTA ATUN", price: 7500, desc: "" },
    { name: "TARTA CALABAZA Y QUESO", price: 6900, desc: "" },
    { name: "TARTA DE VERDURA", price: 6900, desc: "" },
    { name: "PIZZA MUZZARELLA", price: 10900, desc: "" },
    { name: "PIZZA ESPECIAL", price: 11900, desc: "" },
    { name: "PIZZA NAPOLITANA", price: 11900, desc: "" },
    { name: "PIZZA RUCULA Y PARMESANO", price: 13900, desc: "" },
    { name: "ENSALADA CAESAR", price: 1, desc: "Pollo" }, // 1?
    { name: "ENSALADA BLOOM", price: 1, desc: "lechuga tomate zanahoria" },
    { name: "LIVIANA", price: 1, desc: "rucula parmesano" },
    { name: "CRIOLLA", price: 0, desc: "lechuga tomate y cebolla" },
    { name: "LECHUGA Y TOMATE", price: 6000, desc: "" },
    { name: "ZANAHORIA Y HUEVO", price: 6000, desc: "" },
    { name: "RUCULA Y PARMESANO", price: 6500, desc: "" },
    { name: "ZANAHORIA", price: 0, desc: "HUEVO CHOCLO Y LENTEJAS" },
    { name: "SPAGUETTI", price: 8900, desc: "" },
    { name: "RAVIOLES VERDURA", price: 9900, desc: "" },
    { name: "RAVIOLES DE CALABAZA Y RICOTA", price: 9900, desc: "" },
    { name: "SORRENTINOS JAMON Y QUESO", price: 9900, desc: "" },
    { name: "ÑOQUIS DE PAPA", price: 9900, desc: "" },
    { name: "COCA COLA 350 ML", price: 3900, desc: "" },
    { name: "COCA COLA ZERO 350 ML", price: 3900, desc: "" },
    { name: "SPRITE 350 ML", price: 3900, desc: "" },
    { name: "SPRITE ZERO 350 ML", price: 3900, desc: "" },
    { name: "FANTA 350 ML", price: 3900, desc: "" },
    { name: "SCHWEPPES POMELO 350 ML", price: 3900, desc: "" },
    { name: "SCHWEPPES TONICA 350 ML", price: 3900, desc: "" },
    { name: "AGUA SABORIZADA 500 ML", price: 3900, desc: "" },
    { name: "AGUA CON Y SIN GAS 500 ML", price: 2500, desc: "" },
    { name: "ALBONDIGAS CON PURE", price: 11900, desc: "" },
    { name: "PECHUGA GRILLE CON GUARNICION", price: 11900, desc: "" },
    { name: "SUPREMA CON GUARNICION", price: 8500, desc: "" },
    { name: "SUPREMA NAPOLITANA CON GUARNICION", price: 9900, desc: "" },
    { name: "BIFE DE COSTILLA CON GUARNICION", price: 13900, desc: "" },
    { name: "CANELONES CON SALSA", price: 9900, desc: "" },
    { name: "PASTEL DE PAPA", price: 11900, desc: "" },
    { name: "ARROZ CON POLLO", price: 11900, desc: "" },
    { name: "FILET DE MERLUZA CON GUARNICION", price: 12900, desc: "" },
    { name: "LENTEJAS A LA ESPAÑOLA", price: 13900, desc: "" },
    { name: "WOK DE VEGETALES SALTEADOS", price: 6500, desc: "" },
    { name: "MUZZA GRANDE + 2 GASEOSA 500 ML", price: 15900, desc: "" },
    { name: "DOC EMPANADAS+ 2 GASEOSA 500 ML", price: 19900, desc: "" },
    { name: "SANDWICH DE MILANESA", price: 8900, desc: "" },
    { name: "TE / TE SABORIZADO / MATE COCIDO", price: 2800, desc: "" },
    { name: "BUDIN DE PAN", price: 3500, desc: "" },
    { name: "FLAN CASERO", price: 3500, desc: "" },
    { name: "COCACOLA 1.5 LT", price: 6200, desc: "" },
    { name: "FANTA 1.5 LT", price: 6200, desc: "" },
    { name: "SPRITE 1.5 LT", price: 6200, desc: "" },
    { name: "CAFE C/ LECHE + 2 FACT.", price: 3500, desc: "" },
    { name: "JARRITO + 2 FACT.", price: 4000, desc: "" },
    { name: "JARRITO + 1 FACT.", price: 3600, desc: "" },
    { name: "TORTILLA DE PAPAS", price: 5500, desc: "" },
    { name: "CAFE DELIVERY", price: 2800, desc: "" },
    { name: "SANDWICH MILANESA COMPLETO", price: 10900, desc: "LECHUGA. TOMATE. JAMON Y QUESO" },
    { name: "CAFE P/ LLEVAR SOLO", price: 2100, desc: "" },
    { name: "CAFE P/ LLEVAR + 1 FACT.", price: 1900, desc: "" },
    { name: "CAFE P/ LLEVAR + 2 FACT.", price: 2400, desc: "" },
    { name: "Milanesa Napolitana", price: 12900, desc: "" },
    { name: "Cafe c/ 1 factura llevar", price: 3200, desc: "" },
    { name: "Cafe c/ 2 facturas llevar", price: 3600, desc: "" },
    { name: "CAFE C/ LECHE + 2 FACTURAS", price: 5500, desc: "" },
    { name: "PAPAS FRITAS CLASICAS", price: 5500, desc: "" },
    { name: "PIZZA IND MUZZARELLA", price: 4900, desc: "" },
    { name: "PIZZA IND ESPECIAL", price: 5900, desc: "" },
    { name: "PIZZA IND NAPOLITANA", price: 4000, desc: "" },
    { name: "TARTA MIXTA CALABAZA Y POLLO", price: 6500, desc: "" },
    { name: "TARTA DE FRUTILLA", price: 7500, desc: "" },
    { name: "OGHAM GOLDEN", price: 3000, desc: "" },
    { name: "OGHAM RED ALE", price: 3600, desc: "" },
    { name: "OGHAM HONEY", price: 3600, desc: "" },
    { name: "OGHAM IPA", price: 3700, desc: "" },
    { name: "OGHAM APA", price: 4500, desc: "" },
    { name: "OGHAM AMERICAN IPA", price: 6300, desc: "" },
    { name: "OGHAM PORTER", price: 3700, desc: "" },
    { name: "OGHAM BARLEY WINE", price: 4100, desc: "" },
    { name: "VINO EST. MENDOZA", price: 6900, desc: "" },
    { name: "VINO ESTIBA I", price: 8900, desc: "" },
    { name: "VINO UXMAL", price: 8500, desc: "" },
    { name: "CERVEZA ANDES 473 CC", price: 5900, desc: "" },
    { name: "CERVEZA 710 CC", price: 6900, desc: "" },
    { name: "CERVEZA CORONA PORRON", price: 6500, desc: "" },
    { name: "JARRITO C/ LECHE DE ALMENDRAS", price: 3500, desc: "" },
    { name: "DOBLE C/ LECHE ALMENDRAS", price: 4900, desc: "" },
    { name: "CAFE GRANDE P/ LLEVAR", price: 4000, desc: "" },
    { name: "EMP. DE CHOCLO Y QUESO", price: 1600, desc: "" },
    { name: "ENSALADA DE FRUTA", price: 4000, desc: "" },
    { name: "MILANESA A CABALLO", price: 11900, desc: "" },
    { name: "BROWNIE C/ MERENGUE", price: 7900, desc: "" },
    { name: "ADICIONAL HUEVO", price: 1000, desc: "" },
    { name: "CAFE CON LECHE + 2 MEDIALUNAS JYQ", price: 6200, desc: "" },
    { name: "TORTILLA PAPA HUEVO CEBOLLA Y MORRON", price: 7900, desc: "" },
    { name: "TORTILLA DE VERDURA", price: 5500, desc: "" },
    { name: "TORTILLA BLOOM", price: 8900, desc: "PAPA HUEVO CEBOLLA MORRON JAMON Y QUESO" },
    { name: "ADICIONAL DDL O CREMA", price: 500, desc: "" },
    { name: "CAFE C/ LECHE + 2 MEDIAL J Y Q", price: 6900, desc: "" },
    { name: "ADICIONAL TOMATE", price: 800, desc: "" },
    { name: "ROLLITOS JYQ X 3", price: 1500, desc: "" },
    { name: "VINO EST. MENDOZA CHICO", price: 4900, desc: "" },
    { name: "CINZANO", price: 4500, desc: "" },
    { name: "FERNET BRANCA", price: 4800, desc: "" },
    { name: "CAPUCHINO P/ LLEVAR", price: 4800, desc: "" },
    { name: "BIFE ANCHO C/ GUARNICION", price: 10900, desc: "" },
    { name: "MATE", price: 3500, desc: "" },
    { name: "EMPANADA DE PESCADO", price: 1500, desc: "" },
    { name: "EMPANADA GALLEGA", price: 3200, desc: "" },
    { name: "PICADA DE MARISCOS", price: 29900, desc: "" },
    { name: "PAELLA", price: 19900, desc: "" },
    { name: "RABAS", price: 14900, desc: "" },
    { name: "ALFAJOR MAICENA", price: 1900, desc: "" },
    { name: "RECARGA DE MATE", price: 1500, desc: "" },
    { name: "CERVEZA STELLA PORRON", price: 4900, desc: "" },
    { name: "MENU DEL DIA", price: 12900, desc: "" },
    { name: "SANDWICH TOMATE Y QUESO", price: 4900, desc: "" },
    { name: "cafe grande + 2 facturas", price: 4900, desc: "" },
    { name: "cafe grande +1 factura", price: 4600, desc: "" },
    { name: "COOKIES/ BARRITAS", price: 2500, desc: "" },
    { name: "TOSTADAS CON PALTA Y HUEVO REVUELTO", price: 7400, desc: "" },
    { name: "ALBERTO", price: 11000, desc: "" },
    { name: "BLOOM", price: 14900, desc: "INFUSION DOBLE + TOSTADAS C/ HUEVO Y PALTA + 1/2 EXPRIMIDO" },
    { name: "TOSTADO PAN ARABE", price: 5600, desc: "" },
    { name: "CAFE + TOSTADO ARABE", price: 6500, desc: "" },
    { name: "ÑOQUIS DEL DIA", price: 8900, desc: "MENU DEL DIA" },
    { name: "PORCIONES SIN TACC", price: 3900, desc: "" },
    { name: "SACRAMENTO JAMON Y QUESO", price: 4900, desc: "" },
    { name: "ADICIONAL PALTA", price: 1500, desc: "" },
    { name: "LATA QUILMES 1890", price: 4500, desc: "" },
    { name: "BARRITA DE CEREAL", price: 1200, desc: "" },
    { name: "YOGURTH", price: 3900, desc: "" },
    { name: "POSTRE HELADO", price: 4000, desc: "" },
    { name: "YOGURT CON FRUTAS Y GRANOLA", price: 4900, desc: "" },
    { name: "MALFATTI", price: 2900, desc: "" },
    { name: "TRAGO CLASICO", price: 6500, desc: "" },
    { name: "ARROZ AMARILLO C/ POLLO", price: 25500, desc: "" },
    { name: "WRAP", price: 6900, desc: "" },
    { name: "WRAPS", price: 6900, desc: "" },
    { name: "WRAPS CARNE", price: 8500, desc: "" },
    { name: "DESAYUNO CONTINENTAL", price: 10400, desc: "" },
    { name: "MENU DEL DIA: bife de costilla+ BEBIDA +POSTRE", price: 34900, desc: "" },
    { name: "CHORIZOS A LA POMAROLA", price: 26500, desc: "" },
    { name: "milanesa c/ guarnicion + bebida + postre", price: 31000, desc: "" },
    { name: "BIFE C/ FRITAS + BEBIDA + POSTRE", price: 34900, desc: "" },
    { name: "VASO DE LECHE", price: 3600, desc: "" },
    { name: "JARRON + TOSTADO ARABE", price: 6500, desc: "" },
    { name: "MUZZA + LATON", price: 14900, desc: "" },
    { name: "HUEVOS REVUELTOS", price: 3500, desc: "( 2 UNID )" },
    { name: "ROGEL", price: 7900, desc: "" },
    { name: "COOKIES XXL", price: 4900, desc: "" },
    { name: "BUDIN SIN TACC", price: 4900, desc: "" },
    { name: "VINO LATITUD 33", price: 10500, desc: "" },
    { name: "VINO NICASIA", price: 15500, desc: "" },
];

function determineCategory(name: string, desc: string | null | undefined) {
    const n = name.toUpperCase();

    // Exact Map / Keyword Priority
    if (n.includes('CAFE') || n.includes('CORTADO') || n.includes('TE ') || n.includes('SUBMARINO') || n.includes('CHOCOLATADA') || n.includes('RISTRETTO') || n.includes('IRLANDES') || n.includes('CAPUCHINO') || n.includes('MATE') || n.includes('LAGRIMA') || n.includes('VASO DE LECHE') || n.includes('JARRITO') || n.includes('JARRON')) return CATEGORY_IDS.CAFETERIA;

    if (n.includes('LICUADO') || n.includes('EXPRIMIDO') || n.includes('NARANJADA') || n.includes('LIMONADA')) return CATEGORY_IDS.JUGOS;

    // Promociones / Combos (Often has '+')
    if (n.includes('CLASICO') || n.includes('CONTINENTAL') || n.includes('SALUDABLE') || n.includes('BLOOM') || n.includes('DESAYUNO') || n.includes('+')) return CATEGORY_IDS.PROMOCIONES;

    if (n.includes('EMPANADA') || n.includes('EMP.')) return CATEGORY_IDS.EMPANADAS;
    if (n.includes('PIZZA')) return CATEGORY_IDS.PIZZAS;
    if (n.includes('MILANESA')) return CATEGORY_IDS.MILANESAS;
    if (n.includes('HAMB')) return CATEGORY_IDS.HAMBURGUESAS;
    if (n.includes('TARTA')) {
        if (n.includes('FRUTILLA') || n.includes('COCO')) return CATEGORY_IDS.PASTELERIA;
        return CATEGORY_IDS.PLATOS; // Tartas saladas -> Platos? Or custom. Putting in Platos for now or maybe create TARTAS? 
        // User didn't give Tartas category. Let's map to PLatos or verify. 'TARTA JAMON Y QUESO' is food. 
    }

    if (n.includes('PASTA') || n.includes('SPAGUETTI') || n.includes('RAVIOLES') || n.includes('ÑOQUIS') || n.includes('CANELONES') || n.includes('SORRENTINOS') || n.includes('MALFATTI')) return CATEGORY_IDS.PASTAS;

    if (n.includes('ENSALADA') || n.includes('LIVIANA') || n.includes('CRIOLLA') || n.includes('RUCULA Y PARMESANO')) {
        if (n.includes('FRUTA')) return CATEGORY_IDS.POSTRES;
        return CATEGORY_IDS.ENSALADAS;
    }

    if (n.includes('TORTILLA')) return CATEGORY_IDS.TORTILLA;

    if (n.includes('COCA') || n.includes('SPRITE') || n.includes('FANTA') || n.includes('AGUA') || n.includes('SCHWEPPES') || n.includes('OGHAM') || n.includes('VINO') || n.includes('CERVEZA') || n.includes('TRAGO') || n.includes('FERNET') || n.includes('CINZANO') || n.includes('LATON')) return CATEGORY_IDS.BEBIDAS;

    if (n.includes('ALFAJOR') || n.includes('BUDIN') || n.includes('BROWNIE') || n.includes('ROGEL') || n.includes('LEMON PIE') || n.includes('CHOCOTORTA') || n.includes('COOKIE') || n.includes('BARRITA')) return CATEGORY_IDS.PASTELERIA; // Or Postres? "Pastelería" fits better for baked goods.

    if (n.includes('FLAN') || n.includes('HELADO') || n.includes('YOGURT') || n.includes('YOGURTH')) return CATEGORY_IDS.POSTRES;

    if (n.includes('TOSTADA') || n.includes('FACTURA') || n.includes('MEDIALUNA') || n.includes('SANDWICH') || n.includes('SACRAMENTO') || n.includes('ROLLITOS') || n.includes('WRAP')) return CATEGORY_IDS.PANIFICADOS;

    // Remaining Food
    if (n.includes('ALBONDIGAS') || n.includes('SUPREMA') || n.includes('BIFE') || n.includes('ARROZ') || n.includes('FILET') || n.includes('LENTEJAS') || n.includes('WOK') || n.includes('CHORIZOS') || n.includes('PAPAS') || n.includes('ADICIONAL') || n.includes('ALBERTO') || n.includes('VARIOS')) return CATEGORY_IDS.PLATOS;

    return CATEGORY_IDS.PLATOS; // Default
}

async function syncMenu() {
    console.log(`Starting sync for ${RAW_PRODUCTS.length} products...`);

    for (const p of RAW_PRODUCTS as any[]) {
        const categoryId = determineCategory(p.name, p.desc);

        // 1. Check if exists
        const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('name', p.name)
            .maybeSingle(); // Use maybeSingle to avoid 406 or error if not found/multiple

        const productData = {
            name: p.name,
            description: p.desc || null,
            price: p.price,
            category_id: categoryId,
            // image_url: null (Preserve existing image if update?)
        };

        if (existing) {
            console.log(`Updating ${p.name}...`);
            const { error } = await supabase
                .from('products')
                .update(productData)
                .eq('id', existing.id);
            if (error) console.error(`Failed to update ${p.name}:`, error.message);
        } else {
            console.log(`Inserting ${p.name}...`);
            const { error } = await supabase
                .from('products')
                .insert([productData]);
            if (error) console.error(`Failed to insert ${p.name}:`, error.message);
        }
    }

    console.log('Sync complete!');
}

syncMenu();

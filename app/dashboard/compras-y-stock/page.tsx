"use client";

import { useState, useMemo } from "react";
import {
    useProveedores, useInsumos, useInsumosByProveedor,
    useRegistrarCompra, useGastosFijosPendientes, useGastosFijos,
    useMarcarGastoPagado, useCreateProveedor, useCreateInsumo,
    usePagarSaldoProveedor, useUpdateGastoFijo
} from "@/lib/hooks/use-compras-stock";
import {
    IconLoader2, IconAlertTriangle, IconCalendarDue, IconCash,
    IconCreditCard, IconPackage, IconShoppingCart, IconUsers,
    IconPlus, IconCheck, IconX, IconSearch, IconReceipt,
    IconBuildingStore, IconChevronDown, IconCoin, IconFileInvoice
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertasVencimientos } from "./AlertasVencimientos";
import { FormularioCompra } from "./FormularioCompra";
import { GestionPanel } from "./GestionPanel";

export default function ComprasYStockPage() {
    const { data: proveedores = [], isLoading: loadProv } = useProveedores();
    const { data: insumos = [], isLoading: loadIns } = useInsumos();
    const { data: gastosPendientes = [], isLoading: loadGastos } = useGastosFijosPendientes();
    const { data: gastosFijosTodos = [], isLoading: loadGastosTodos } = useGastosFijos();

    if (loadProv || loadIns || loadGastos || loadGastosTodos) {
        return (
            <div className="h-full flex items-center justify-center">
                <IconLoader2 className="animate-spin text-gray-300" size={64} />
            </div>
        );
    }

    return (
        <div className="pb-40">
            {/* HEADER */}
            <header className="mb-10">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-1 uppercase">
                    Compras & Stock
                </h1>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.3em]">
                    Proveedores · Insumos · Gastos Fijos
                </p>
            </header>

            {/* BLOQUE A: Alertas Vencimientos */}
            <AlertasVencimientos gastos={gastosPendientes} />

            {/* BLOQUE B: Formulario de Compra */}
            <FormularioCompra proveedores={proveedores} />

            {/* BLOQUE C: Gestión Insumos, Proveedores & Gastos Fijos */}
            <GestionPanel proveedores={proveedores} insumos={insumos} gastos={gastosFijosTodos} />
        </div>
    );
}

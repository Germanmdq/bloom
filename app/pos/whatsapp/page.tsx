'use client';

import { useWhatsAppPedidos } from '@/lib/hooks/useWhatsAppPedidos';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Clock, Package, X, Smartphone, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function WhatsAppPedidosPage() {
    const { pedidos, isLoading, cambiarEstado, isUpdating } = useWhatsAppPedidos();
    const [filter, setFilter] = useState<string>('todos');
    const [connectionStatus, setConnectionStatus] = useState<boolean>(false);

    useEffect(() => {
        // Verificar conexión del servicio WhatsApp
        const checkConnection = async () => {
            try {
                const res = await fetch('http://localhost:3001/api/status');
                const data = await res.json();
                setConnectionStatus(data.connected);
            } catch {
                setConnectionStatus(false);
            }
        };

        checkConnection();
        const interval = setInterval(checkConnection, 10000);
        return () => clearInterval(interval);
    }, []);

    const pedidosFiltrados = pedidos?.filter((p: any) =>
        filter === 'todos' || p.estado === filter
    ) || [];

    const getEstadoConfig = (estado: string) => {
        const configs: Record<string, { color: string; icon: any; label: string }> = {
            pendiente: { color: 'bg-yellow-500', icon: Bell, label: 'Pendiente' },
            confirmado: { color: 'bg-blue-500', icon: Check, label: 'Confirmado' },
            preparando: { color: 'bg-purple-500', icon: Clock, label: 'Preparando' },
            listo: { color: 'bg-green-500', icon: Package, label: 'Listo' },
            entregado: { color: 'bg-gray-500', icon: Check, label: 'Entregado' },
            cancelado: { color: 'bg-red-500', icon: X, label: 'Cancelado' }
        };
        return configs[estado] || configs.pendiente;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full"
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-lg p-6 mb-6"
                >
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-green-100 p-3 rounded-xl">
                                <Smartphone className="w-8 h-8 text-green-600" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 font-display">
                                    Pedidos WhatsApp
                                </h1>
                                <p className="text-gray-600">
                                    {pedidosFiltrados.length} pedidos
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${connectionStatus
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                <div className={`w-2 h-2 rounded-full ${connectionStatus ? 'bg-green-500' : 'bg-red-500'
                                    } animate-pulse`} />
                                {connectionStatus ? 'Conectado' : 'Desconectado'}
                            </div>
                        </div>
                    </div>

                    {/* Filtros */}
                    <div className="flex gap-2 mt-6 overflow-x-auto pb-2">
                        {['todos', 'pendiente', 'confirmado', 'preparando', 'listo', 'entregado'].map((estado) => (
                            <button
                                key={estado}
                                onClick={() => setFilter(estado)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${filter === estado
                                        ? 'bg-green-500 text-white shadow-lg scale-105'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {estado.charAt(0).toUpperCase() + estado.slice(1)}
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Lista de pedidos */}
                <AnimatePresence mode="popLayout">
                    <div className="grid gap-4">
                        {pedidosFiltrados.map((pedido: any, index: number) => {
                            const estadoConfig = getEstadoConfig(pedido.estado);
                            const Icon = estadoConfig.icon;

                            return (
                                <motion.div
                                    key={pedido.id}
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all"
                                >
                                    <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`${estadoConfig.color} p-3 rounded-xl`}>
                                                <Icon className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900">
                                                    Pedido #{pedido.id}
                                                </h3>
                                                <p className="text-gray-600 font-medium">
                                                    {pedido.nombre_cliente}
                                                </p>
                                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                                    <Smartphone className="w-3 h-3" /> +54 9 {pedido.numero_cliente}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {new Date(pedido.timestamp).toLocaleString('es-AR', {
                                                        dateStyle: 'short',
                                                        timeStyle: 'short'
                                                    })}
                                                </p>
                                            </div>
                                        </div>

                                        <span className={`${estadoConfig.color} text-white px-4 py-2 rounded-lg text-sm font-bold h-fit`}>
                                            {estadoConfig.label}
                                        </span>
                                    </div>

                                    {/* Mensaje original */}
                                    <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                                        <div className="flex items-center gap-2 mb-2 text-gray-400 text-xs uppercase tracking-wider font-bold">
                                            <MessageCircle className="w-3 h-3" /> Mensaje Original
                                        </div>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed italic">
                                            "{pedido.mensaje}"
                                        </p>
                                    </div>

                                    {/* Items parseados */}
                                    {pedido.items_parseados?.items && (
                                        <div className="mb-4 p-4 bg-green-50/50 rounded-xl border border-green-100">
                                            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-sm uppercase tracking-wider">
                                                <Package className="w-4 h-4 text-green-600" />
                                                Items detectados
                                            </h4>
                                            <ul className="space-y-2">
                                                {pedido.items_parseados.items.map((item: any, idx: number) => (
                                                    <li key={idx} className="flex items-center justify-between border-b border-green-100 pb-2 last:border-0 last:pb-0">
                                                        <span className="text-gray-700">
                                                            <span className="font-bold text-green-600 mr-2">{item.cantidad}x</span>
                                                            {item.nombre}
                                                        </span>
                                                        {item.notas && (
                                                            <span className="text-xs text-gray-500 italic bg-white px-2 py-1 rounded-md">
                                                                {item.notas}
                                                            </span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Acciones */}
                                    <div className="flex gap-2 flex-wrap">
                                        {pedido.estado === 'pendiente' && (
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => cambiarEstado({ id: pedido.id, estado: 'confirmado' })}
                                                disabled={isUpdating}
                                                className="flex-1 bg-blue-500 text-white px-6 py-3 rounded-xl hover:bg-blue-600 transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50 min-w-[150px]"
                                            >
                                                <Check className="w-5 h-5" />
                                                Confirmar
                                            </motion.button>
                                        )}
                                        {pedido.estado === 'confirmado' && (
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => cambiarEstado({ id: pedido.id, estado: 'preparando' })}
                                                className="flex-1 bg-purple-500 text-white px-6 py-3 rounded-xl hover:bg-purple-600 transition-colors font-bold flex items-center justify-center gap-2 min-w-[150px]"
                                            >
                                                <Clock className="w-5 h-5" />
                                                En preparación
                                            </motion.button>
                                        )}
                                        {pedido.estado === 'preparando' && (
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => cambiarEstado({ id: pedido.id, estado: 'listo' })}
                                                className="flex-1 bg-green-500 text-white px-6 py-3 rounded-xl hover:bg-green-600 transition-colors font-bold flex items-center justify-center gap-2 min-w-[150px]"
                                            >
                                                <Package className="w-5 h-5" />
                                                Marcar listo
                                            </motion.button>
                                        )}
                                        {pedido.estado === 'listo' && (
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => cambiarEstado({ id: pedido.id, estado: 'entregado' })}
                                                className="flex-1 bg-gray-500 text-white px-6 py-3 rounded-xl hover:bg-gray-600 transition-colors font-bold min-w-[150px]"
                                            >
                                                Entregado
                                            </motion.button>
                                        )}
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => cambiarEstado({ id: pedido.id, estado: 'cancelado' })}
                                            className="bg-red-50 text-red-600 px-4 py-3 rounded-xl hover:bg-red-100 transition-colors ml-auto"
                                            title="Cancelar Pedido"
                                        >
                                            <X className="w-5 h-5" />
                                        </motion.button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </AnimatePresence>

                {pedidosFiltrados.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                    >
                        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">
                            No hay pedidos {filter !== 'todos' ? `en estado "${filter}"` : ''}
                        </p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

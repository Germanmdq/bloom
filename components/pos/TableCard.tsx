import React from 'react';
import { Users, Bike, ShoppingBag, Clock } from 'lucide-react';

interface TableCardProps {
    table: {
        id: number;
        status: 'FREE' | 'OCCUPIED';
        total: number;
        order_type: 'LOCAL' | 'DELIVERY' | 'RETIRO';
        updated_at: string;
    };
    onClick: (tableId: number) => void;
}

export function TableCard({ table, onClick }: TableCardProps) {
    const isFree = table.status === 'FREE';

    // Configuración de estilos ALTO CONTRASTE
    const getStyles = () => {
        if (!isFree) {
            // OCUPADA: Naranja vibrante
            return {
                container: 'bg-orange-50 border-2 border-orange-500 shadow-lg',
                badge: 'bg-orange-500 text-white',
                number: 'text-orange-900',
                dot: 'bg-orange-600 animate-pulse',
                total: 'text-orange-700'
            };
        }
        // LIBRE: Blanco limpio
        return {
            container: 'bg-white border-2 border-slate-200 hover:border-slate-400 hover:shadow-md',
            badge: 'bg-slate-100 text-slate-600',
            number: 'text-slate-700',
            dot: 'bg-emerald-500',
            total: 'text-slate-400'
        };
    };

    const styles = getStyles();

    // Icono y Texto Badges
    const getBadgeContent = () => {
        // Usamos el ID para determinar el tipo visualmente si el order_type falla, o ambos.
        // Pero idealmente confiamos en table.order_type o el rango.
        // Range logic fallback:
        let type = table.order_type;
        if (table.id >= 50 && table.id < 100) type = 'DELIVERY';
        if (table.id >= 100) type = 'RETIRO';
        if (table.id < 50) type = 'LOCAL';

        switch (type) {
            case 'DELIVERY': return { icon: <Bike size={12} />, label: 'DELIVERY' };
            case 'RETIRO': return { icon: <ShoppingBag size={12} />, label: 'RETIRO' };
            default: return { icon: <Users size={12} />, label: 'LOCAL' };
        }
    };

    const badge = getBadgeContent();

    // Tiempo transcurrido mock
    const getTimeElapsed = () => {
        if (isFree) return '';
        const start = new Date(table.updated_at).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / 60000);
        if (isNaN(diff)) return '0m';
        if (diff < 60) return `${diff}m`;
        return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    };

    return (
        <div
            onClick={() => onClick(table.id)}
            className={`
                relative h-44 rounded-2xl p-4 cursor-pointer flex flex-col justify-between transition-all duration-200 hover:scale-[1.02]
                ${styles.container}
            `}
        >
            {/* Header: Badge & Status Dot */}
            <div className="flex justify-between items-start">
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${styles.badge}`}>
                    {badge.icon}
                    {badge.label}
                </span>
                <div className={`w-3 h-3 rounded-full shadow-sm ${styles.dot}`} />
            </div>

            {/* Center: Table ID */}
            <div className="flex-1 flex flex-col items-center justify-center -mt-2">
                <span className={`text-5xl font-black ${styles.number}`}>
                    {table.id}
                </span>
                {isFree && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest mt-2 border border-emerald-100">
                        Libre
                    </span>
                )}
            </div>

            {/* Footer: Details (Occupied Only) */}
            {!isFree && (
                <div className="mt-auto pt-3 border-t border-orange-200/50 flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-orange-800/60 uppercase tracking-wider mb-0.5">
                            <Clock size={12} />
                            <span>{getTimeElapsed()}</span>
                        </div>
                        <div className={`text-2xl font-black heading-tighter ${styles.total}`}>
                            ${table.total?.toLocaleString() || '0'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

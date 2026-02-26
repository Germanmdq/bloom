import React from 'react';

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

    const getTypeLabel = () => {
        if (table.id >= 100) return 'Retiro';
        if (table.id >= 40) return 'Delivery';
        return 'Local';
    };

    const getTimeElapsed = () => {
        if (isFree) return { text: '', minutes: 0 };
        const diff = Math.floor((Date.now() - new Date(table.updated_at).getTime()) / 60000);
        if (isNaN(diff)) return { text: '0m', minutes: 0 };
        return {
            text: diff < 60 ? `${diff}m` : `${Math.floor(diff / 60)}h ${diff % 60}m`,
            minutes: diff
        };
    };

    const { text: timeText, minutes } = getTimeElapsed();
    // Progress bar: 0 = just opened, 100 = 90+ min
    const timeProgress = Math.min((minutes / 90) * 100, 100);
    const barColor = minutes > 60 ? 'bg-red-400' : minutes > 30 ? 'bg-amber-300' : 'bg-white/60';

    return (
        <div
            onClick={() => onClick(table.id)}
            className={`
                relative h-44 rounded-2xl p-4 cursor-pointer flex flex-col justify-between
                transition-all duration-200 hover:scale-[1.02] select-none overflow-hidden
                ${isFree
                    ? 'bg-white border-2 border-slate-200 hover:border-slate-300 hover:shadow-md shadow-sm'
                    : 'bg-gradient-to-br from-amber-400 to-orange-500 border-0 shadow-lg hover:shadow-xl'
                }
            `}
        >
            {/* Header */}
            <div className="flex justify-between items-start">
                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${isFree ? 'bg-slate-100 text-slate-500' : 'bg-white/20 text-white'}`}>
                    {getTypeLabel()}
                </span>
                {isFree
                    ? <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1" />
                    : <span className="text-[10px] font-black text-white/80">{timeText}</span>
                }
            </div>

            {/* Center: number */}
            <div className="flex-1 flex items-center justify-center -my-1">
                <span className={`text-5xl font-black tracking-tighter leading-none ${isFree ? 'text-slate-700' : 'text-white'}`}>
                    {table.id}
                </span>
            </div>

            {/* Footer */}
            {isFree ? (
                <div className="text-center">
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-100">
                        Libre
                    </span>
                </div>
            ) : (
                <div>
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-2xl font-black text-white tracking-tight leading-none">
                            ${table.total?.toLocaleString() || '0'}
                        </span>
                    </div>
                    {/* Time progress bar */}
                    <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${timeProgress}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

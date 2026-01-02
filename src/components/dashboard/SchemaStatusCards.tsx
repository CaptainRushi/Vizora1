
import { Table, Columns, Share2, History } from 'lucide-react';

interface Props {
    tables: number;
    columns: number;
    relationships: number;
    versions: number;
}

export function SchemaStatusCards({ tables, columns, relationships, versions }: Props) {
    const stats = [
        { label: 'Tables', value: tables, icon: Table },
        { label: 'Columns', value: columns, icon: Columns },
        { label: 'Relationships', value: relationships, icon: Share2 },
        { label: 'Schema Versions', value: versions, icon: History },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
                <div key={stat.label} className="bg-white border border-gray-100 p-6 rounded-2xl flex flex-col gap-1 transition-all">
                    <div className="flex items-center justify-between mb-2">
                        <stat.icon className="h-4 w-4 text-gray-400" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">SNAPSHOT</span>
                    </div>
                    <p className="text-3xl font-black text-gray-900">{stat.value}</p>
                    <p className="text-xs font-bold text-gray-500">{stat.label}</p>
                </div>
            ))}
        </div>
    );
}

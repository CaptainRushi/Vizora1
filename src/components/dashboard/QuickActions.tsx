
import { Share2, Search, Sparkles, FileText, History, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
    projectId: string;
}

export function QuickActions({ projectId }: Props) {
    const navigate = useNavigate();

    const actions = [
        { label: 'ER Diagram', icon: Share2, path: `/workspace/${projectId}/er-diagram`, color: 'text-indigo-600', bg: 'bg-indigo-50', desc: 'Visual relationship mapping' },
        { label: 'Schema Explorer', icon: Search, path: `/workspace/${projectId}/explorer`, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Direct code inspection' },
        { label: 'AI Explanations', icon: Sparkles, path: `/workspace/${projectId}/explanations`, color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Deep logical insights' },
        { label: 'Auto Documentation', icon: FileText, path: `/workspace/${projectId}/docs`, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Self-updating specifications' },
        { label: 'Version History', icon: History, path: `/workspace/${projectId}/versions`, color: 'text-orange-600', bg: 'bg-orange-50', desc: 'Immutable timeline' },
        { label: 'Tribal Knowledge', icon: MessageSquare, path: `/workspace/${projectId}/comments`, color: 'text-rose-600', bg: 'bg-rose-50', desc: 'Architectural discussions' },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {actions.map((action) => (
                <button
                    key={action.label}
                    onClick={() => navigate(action.path)}
                    className="flex flex-col gap-4 p-6 bg-white border border-gray-100 rounded-3xl hover:border-gray-200 hover:shadow-xl hover:shadow-gray-50 transition-all text-left active:scale-95 group"
                >
                    <div className={`w-fit p-3 rounded-2xl ${action.bg} ${action.color} group-hover:scale-110 transition-transform`}>
                        <action.icon className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-gray-900 tracking-tight">{action.label}</h4>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-[0.1em] leading-tight">{action.desc}</p>
                    </div>
                </button>
            ))}
        </div>
    );
}

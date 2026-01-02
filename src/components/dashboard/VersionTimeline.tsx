
import { ChevronRight } from 'lucide-react';

interface Version {
    version: number;
    created_at: string;
}

interface Props {
    versions: Version[];
    onVersionClick: (v: number) => void;
}

export function VersionTimeline({ versions, onVersionClick }: Props) {
    return (
        <div className="bg-white border border-gray-100 rounded-3xl p-6">
            <h3 className="text-sm font-black text-gray-900 tracking-tight mb-6">Evolution Timeline</h3>

            <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-100 before:to-transparent">
                {versions.length === 0 ? (
                    <p className="text-xs font-medium text-gray-400 text-center italic">No version history yet.</p>
                ) : (
                    versions.map((v, idx) => (
                        <div key={v.version} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            {/* Icon */}
                            <div className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-100 bg-white group-hover:bg-indigo-600 transition-colors shadow-sm z-10 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                <span className={`text-[9px] font-black group-hover:text-white ${idx === 0 ? 'text-indigo-600' : 'text-gray-400'}`}>v{v.version}</span>
                            </div>

                            {/* Card */}
                            <div className="w-[calc(100%-3.5rem)] md:w-[calc(50%-2rem)] p-3 rounded-xl bg-gray-50/50 hover:bg-white border border-transparent hover:border-gray-100 transition-all cursor-pointer group-hover:shadow-lg group-hover:shadow-gray-100/50" onClick={() => onVersionClick(v.version)}>
                                <div className="flex items-center justify-between mb-0.5">
                                    <time className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{new Date(v.created_at).toLocaleDateString()}</time>
                                    <ChevronRight className="h-3 w-3 text-gray-300 group-hover:text-indigo-600 transition-colors" />
                                </div>
                                <div className="text-[11px] font-bold text-gray-900 truncate">Version {v.version} Capture</div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <button
                onClick={() => onVersionClick(-1)}
                className="mt-6 w-full py-2.5 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] hover:text-indigo-600 transition-colors border-t border-gray-50 pt-6"
            >
                Full History
            </button>
        </div>
    );
}

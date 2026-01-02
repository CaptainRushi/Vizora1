
import { Database, FileText, Share2, Plus } from 'lucide-react';

interface Props {
    projectName: string;
    schemaType: string;
    version: string;
    lastUpdated: string;
    onPasteNew: () => void;
    onViewDiagram: () => void;
    onExportDocs: () => void;
}

export function DashboardHeader({
    projectName,
    schemaType,
    version,
    lastUpdated,
    onPasteNew,
    onViewDiagram,
    onExportDocs
}: Props) {
    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gray-100">
            <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">{projectName}</h1>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 font-medium">
                    <span className="flex items-center gap-1.5">
                        <Database className="h-4 w-4" />
                        Type: <span className="text-gray-900 font-bold uppercase">{schemaType}</span>
                    </span>
                    <span className="h-1 w-1 rounded-full bg-gray-300" />
                    <span>
                        Current: <span className="text-gray-900 font-bold uppercase">{version}</span>
                    </span>
                    <span className="h-1 w-1 rounded-full bg-gray-300" />
                    <span>
                        Updated {lastUpdated}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={onPasteNew}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-xs font-black rounded-xl hover:bg-black transition-all active:scale-95"
                >
                    <Plus className="h-4 w-4" />
                    Paste New Schema
                </button>
                <button
                    onClick={onViewDiagram}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-900 text-xs font-black rounded-xl hover:bg-gray-50 transition-all active:scale-95"
                >
                    <Share2 className="h-4 w-4" />
                    View ER Diagram
                </button>
                <button
                    onClick={onExportDocs}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-900 text-xs font-black rounded-xl hover:bg-gray-50 transition-all active:scale-95"
                >
                    <FileText className="h-4 w-4" />
                    Export Docs
                </button>
            </div>
        </div>
    );
}

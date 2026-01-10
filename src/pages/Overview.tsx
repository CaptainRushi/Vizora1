
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../hooks/useProject';
import { useNavigate } from 'react-router-dom';
import { LoadingSection } from '../components/LoadingSection';
import { api } from '../lib/api';

// New Components
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { SchemaStatusCards } from '../components/dashboard/SchemaStatusCards';
import { RecentChanges } from '../components/dashboard/RecentChanges';
import { QuickActions } from '../components/dashboard/QuickActions';
import { DocumentationStatus } from '../components/dashboard/DocumentationStatus';
import { VersionTimeline } from '../components/dashboard/VersionTimeline';
import { QuickPasteModal } from '../components/QuickPasteModal';
import { FolderPlus, ArrowRight, PlusSquare } from 'lucide-react';

interface Stats {
    tablesCount: number;
    columnsCount: number;
    relationsCount: number;
    version: number;
    versionsTotal: number;
    lastUpdated: string;
}

interface Change {
    id: string;
    change_type: string;
    entity_name: string;
}

export function Overview() {
    const { projectId, project, loading: projectLoading } = useProject();
    const navigate = useNavigate();

    // State
    const [stats, setStats] = useState<Stats | null>(null);
    const [changes, setChanges] = useState<Change[]>([]);
    const [docStatus, setDocStatus] = useState<any>(null);
    const [versions, setVersions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
    const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);

    const fetchData = async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            // 1. Fetch Latest Version & Basic Stats
            const { data: latestVer } = await supabase
                .from('schema_versions')
                .select('version, normalized_schema, created_at')
                .eq('project_id', projectId)
                .order('version', { ascending: false })
                .limit(1)
                .maybeSingle();

            // 2. Fetch Total Versions Count
            const { count: vCount } = await supabase
                .from('schema_versions')
                .select('*', { count: 'exact', head: true })
                .eq('project_id', projectId);

            if (latestVer) {
                const schema = latestVer.normalized_schema as any;
                const tables = schema?.tables || {};
                const tablesCount = Object.keys(tables).length;
                let columnsCount = 0;
                let relationsCount = 0;

                Object.values(tables).forEach((t: any) => {
                    columnsCount += (t.columns || []).length;
                    relationsCount += (t.relations || []).length;
                });

                setStats({
                    tablesCount,
                    columnsCount,
                    relationsCount,
                    version: latestVer.version,
                    versionsTotal: vCount || 0,
                    lastUpdated: new Date(latestVer.created_at).toLocaleString()
                });

                // 3. Fetch Recent Changes for this version
                const { data: changesData } = await supabase
                    .from('schema_changes')
                    .select('id, change_type, entity_name')
                    .eq('project_id', projectId)
                    .eq('to_version', latestVer.version)
                    .limit(5);
                setChanges(changesData || []);

                // 5. Fetch Documentation Status
                const { data: docData } = await supabase
                    .from('documentation_outputs')
                    .select('created_at, pdf_url')
                    .eq('project_id', projectId)
                    .eq('version', latestVer.version)
                    .maybeSingle();
                setDocStatus(docData);
            }

            // 6. Fetch Versions for Timeline
            const { data: vList } = await supabase
                .from('schema_versions')
                .select('version, created_at')
                .eq('project_id', projectId)
                .order('version', { ascending: false })
                .limit(5);
            setVersions(vList || []);


        } catch (err) {
            console.error("Dashboard fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!projectLoading && projectId) {
            fetchData();
        } else if (!projectLoading && !projectId) {
            setLoading(false);
        }
    }, [projectId, projectLoading]);

    const handleRegenerateDocs = async () => {
        if (!projectId || !stats) return;
        setIsGeneratingDocs(true);
        try {
            await api.generateDocs(projectId, stats.version);
            // Polling is better but for now let's just refresh after a bit or rely on the user seeing it later
            setTimeout(fetchData, 2000);
        } catch (err) {
            console.error(err);
        } finally {
            setIsGeneratingDocs(false);
        }
    };


    if (projectLoading || loading) {
        return <LoadingSection title="Analyzing schema intelligence..." />;
    }

    if (!projectId) {
        return (
            <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center space-y-8 py-20">
                <div className="h-24 w-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center shadow-inner">
                    <FolderPlus className="h-12 w-12 text-indigo-400" />
                </div>
                <div className="space-y-4">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">No Active Project</h2>
                    <p className="text-gray-500 font-medium leading-relaxed">
                        Select a project from the sidebar to view your schema dashboard.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/projects')}
                    className="flex items-center gap-3 rounded-2xl bg-gray-900 px-10 py-4 text-sm font-black text-white hover:bg-black shadow-2xl shadow-gray-900/20 transition-all active:scale-95"
                >
                    Go to Projects
                    <ArrowRight className="h-4 w-4" />
                </button>
            </div>
        );
    }

    const isFirstTime = !stats;

    if (isFirstTime) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
                <div className="h-20 w-20 bg-indigo-50 rounded-2xl flex items-center justify-center">
                    <PlusSquare className="h-10 w-10 text-indigo-400" />
                </div>
                <div className="max-w-md space-y-2">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Zero Truth Detected</h3>
                    <p className="text-gray-500 font-medium">Paste your schema as SQL or Prisma to generate diagrams and documentation instantly.</p>
                </div>
                <button
                    onClick={() => navigate('schema-input')}
                    className="flex items-center gap-3 rounded-2xl bg-indigo-600 px-10 py-4 text-sm font-black text-white hover:bg-indigo-700 shadow-2xl shadow-indigo-600/20 transition-all active:scale-95"
                >
                    Paste Your First Schema
                    <ArrowRight className="h-4 w-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-[1280px] mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
            {/* Header */}
            <DashboardHeader
                projectName={project?.name || 'Project Name'}
                schemaType={project?.schema_type || 'SQL'}
                version={`v${stats.version}`}
                lastUpdated={stats.lastUpdated}
                onPasteNew={() => setIsPasteModalOpen(true)}
                onViewDiagram={() => navigate(`/workspace/${projectId}/er-diagram`)}
                onExportDocs={() => navigate(`/workspace/${projectId}/docs`)}
            />

            {/* Quick Paste Modal */}
            <QuickPasteModal
                projectId={projectId}
                isOpen={isPasteModalOpen}
                onClose={() => setIsPasteModalOpen(false)}
                onSuccess={() => fetchData()}
            />

            {/* Status Grid */}
            <SchemaStatusCards
                tables={stats.tablesCount}
                columns={stats.columnsCount}
                relationships={stats.relationsCount}
                versions={stats.versionsTotal}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Left/Main Column */}
                <div className="lg:col-span-2 space-y-12">
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2 outline-none">Knowledge Access</h4>
                        <QuickActions projectId={projectId} />
                    </div>

                    <div className="pt-4">
                        <RecentChanges
                            changes={changes}
                            onViewHistory={() => navigate(`/workspace/${projectId}/versions`)}
                            onCompare={() => navigate(`/workspace/${projectId}/compare`)}
                        />
                    </div>
                </div>

                {/* Right/Side Column */}
                <div className="space-y-6">
                    <DocumentationStatus
                        version={`v${stats.version}`}
                        lastGenerated={docStatus ? new Date(docStatus.created_at).toLocaleString() : null}
                        isGenerating={isGeneratingDocs}
                        onRegenerate={handleRegenerateDocs}
                    />

                    <VersionTimeline
                        versions={versions}
                        onVersionClick={(v) => v === -1 ? navigate(`/workspace/${projectId}/versions`) : navigate(`/workspace/${projectId}/explorer?v=${v}`)}
                    />
                </div>
            </div>
        </div>
    );
}

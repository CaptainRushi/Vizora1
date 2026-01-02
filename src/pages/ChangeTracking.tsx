import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../hooks/useProject';
import { GitCompare, Plus, Minus, Edit2, ArrowRight } from 'lucide-react';
import { LoadingSection } from '../components/LoadingSection';

interface SchemaChange {
    id: string;
    from_version: number;
    to_version: number;
    change_type: string;
    entity_name: string;
    details: any;
    created_at: string;
}

export function ChangeTracking() {
    const { projectId, loading: projectLoading } = useProject();
    const [changes, setChanges] = useState<SchemaChange[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (projectLoading) return;
        if (!projectId) {
            setLoading(false);
            return;
        }

        const fetchChanges = async () => {
            try {
                const { data } = await supabase
                    .from('schema_changes')
                    .select('*')
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false }); // Newest first

                if (data) setChanges(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchChanges();
    }, [projectId, projectLoading]);

    if (projectLoading) {
        return null;
    }

    // Group by version transition
    const versions = [...new Set(changes.map(c => `v${c.from_version} → v${c.to_version}`))];

    return (
        <div className="mx-auto max-w-4xl space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <GitCompare className="h-6 w-6 text-indigo-600" />
                    Change Tracking
                </h2>
                <p className="mt-1 text-gray-500">
                    Granular diffs between schema versions.
                </p>
            </div>

            <div className="space-y-8">
                {versions.length === 0 ? (
                    <div className="p-12 text-center rounded-xl bg-gray-50 border border-dashed border-gray-300">
                        <p className="text-gray-500 font-medium">No schema changes detected yet.</p>
                        <p className="text-sm text-gray-400 mt-1">Changes will appear here when you update your schema.</p>
                    </div>
                ) : (
                    versions.map(vKey => {
                        const verChanges = changes.filter(c => `v${c.from_version} → v${c.to_version}` === vKey);
                        const [from, to] = vKey.split(' → ');

                        return (
                            <div key={vKey} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                                <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center gap-3">
                                    <span className="font-mono text-sm font-semibold text-gray-500">{from}</span>
                                    <ArrowRight className="h-4 w-4 text-gray-400" />
                                    <span className="font-mono text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{to}</span>
                                    <span className="ml-auto text-xs text-gray-400">
                                        {new Date(verChanges[0].created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {verChanges.map(change => {
                                        let Icon = Edit2;
                                        let colorClass = 'text-blue-600 bg-blue-50';

                                        if (change.change_type.includes('added')) {
                                            Icon = Plus;
                                            colorClass = 'text-green-600 bg-green-50';
                                        } else if (change.change_type.includes('removed')) {
                                            Icon = Minus;
                                            colorClass = 'text-red-600 bg-red-50';
                                        }

                                        return (
                                            <div key={change.id} className="p-4 flex items-center gap-4 hover:bg-gray-50/50">
                                                <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${colorClass}`}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0 flex-auto">
                                                    <p className="text-sm font-medium text-gray-900">
                                                        <span className="font-mono">{change.entity_name}</span>
                                                        <span className="ml-2 font-normal text-gray-500">
                                                            {change.change_type.replace(/_/g, ' ')}
                                                        </span>
                                                    </p>
                                                    {change.details && (
                                                        <pre className="mt-1 text-xs text-gray-400 font-mono overflow-hidden text-ellipsis">
                                                            {JSON.stringify(change.details)}
                                                        </pre>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}


import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../hooks/useProject';
import { MessageSquare, Trash2, Send, Database, Table, Columns, Layers } from 'lucide-react';
import { LoadingSection } from '../components/LoadingSection';

interface SchemaComment {
    id: string;
    content: string;
    entity_type: string;
    entity_name: string;
    created_at: string;
    version_number: number;
}

export function Comments() {
    const { projectId, project, loading: projectLoading } = useProject();
    const [comments, setComments] = useState<SchemaComment[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [content, setContent] = useState('');
    const [entityType, setEntityType] = useState('table');
    const [entityName, setEntityName] = useState('');
    const [version, setVersion] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchLatestVersion = async () => {
        if (!projectId) return;
        const { data } = await supabase
            .from('schema_versions')
            .select('version')
            .eq('project_id', projectId)
            .order('version', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (data) setVersion(data.version);
    };

    const fetchComments = async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            const { data } = await supabase
                .from('schema_comments')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });
            if (data) setComments(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectLoading) return;
        if (!projectId) {
            setLoading(false);
            return;
        }
        fetchComments();
        fetchLatestVersion();
    }, [projectId, projectLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !entityName.trim() || !projectId) return;

        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.from('schema_comments').insert({
                project_id: projectId,
                version_number: version,
                entity_type: entityType,
                entity_name: entityName,
                content: content.trim()
            }).select().single();

            if (error) throw error;
            if (data) setComments([data, ...comments]);

            setContent('');
            setEntityName('');
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this tribal knowledge?")) return;
        try {
            await supabase.from('schema_comments').delete().eq('id', id);
            setComments(comments.filter(c => c.id !== id));
        } catch (e) { console.error(e); }
    };

    if (projectLoading || loading) {
        return <LoadingSection title="Syncing workspace discussions..." />;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-12 py-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-gray-100">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <MessageSquare className="h-8 w-8 text-indigo-600" />
                        Tribal Knowledge
                    </h1>
                    <p className="text-sm font-medium text-gray-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Versioned Discussions for {project?.name}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Comment Form */}
                <div className="lg:col-span-1">
                    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm sticky top-12">
                        <h3 className="text-lg font-black text-gray-900 mb-6">Add Insight</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Scope</label>
                                <select
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                                    value={entityType}
                                    onChange={(e) => setEntityType(e.target.value)}
                                >
                                    <option value="table">Table</option>
                                    <option value="column">Column</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Entity Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. users, id, email"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                                    value={entityName}
                                    onChange={(e) => setEntityName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Insight Content</label>
                                <textarea
                                    placeholder="Explain the logic or business context..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium outline-none h-32 resize-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting || !content.trim() || !entityName.trim()}
                                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-4 rounded-xl text-xs font-black hover:bg-black transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-gray-900/10"
                            >
                                <Send className="h-4 w-4" />
                                Post Insight (v{version})
                            </button>
                        </form>
                    </div>
                </div>

                {/* Comment List */}
                <div className="lg:col-span-2 space-y-6">
                    {comments.length === 0 ? (
                        <div className="bg-gray-50 border-4 border-dashed border-gray-100 rounded-[3rem] p-20 text-center">
                            <MessageSquare className="h-16 w-16 text-gray-200 mx-auto mb-6" />
                            <h3 className="text-xl font-black text-gray-900">No Discussions Yet</h3>
                            <p className="text-sm font-medium text-gray-400 mt-2">Start documenting architecture tribal knowledge.</p>
                        </div>
                    ) : (
                        comments.map((comment) => (
                            <div key={comment.id} className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm hover:shadow-md transition-all group relative">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-gray-100 text-gray-900 text-[10px] font-black px-2 py-1 rounded-lg">
                                            v{comment.version_number}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                            {comment.entity_type === 'table' ? <Table className="h-3 w-3" /> : <Columns className="h-3 w-3" />}
                                            {comment.entity_name}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(comment.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <p className="text-gray-700 font-medium leading-relaxed">
                                    {comment.content}
                                </p>
                                <div className="mt-6 pt-6 border-t border-gray-50 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    <Database className="h-3 w-3" />
                                    Snapshot Insight • {new Date(comment.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

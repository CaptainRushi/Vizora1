import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { DiffEditor, loader } from '@monaco-editor/react';
import { supabase } from '../../lib/supabase';
import { SchemaVersion, Workspace } from './types';
import {
    ArrowLeft,
    GitCompare,
    ChevronDown,
    ArrowLeftRight,
    Check,
    FileCode,
    Plus,
    Minus,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Define One Dark Pro theme for Monaco Editor (same as WorkspaceEditor)
loader.init().then(monaco => {
    monaco.editor.defineTheme('one-dark-pro', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'comment', foreground: '5c6370', fontStyle: 'italic' },
            { token: 'keyword', foreground: 'c678dd' },
            { token: 'string', foreground: '98c379' },
            { token: 'number', foreground: 'd19a66' },
            { token: 'type', foreground: 'e5c07b' },
            { token: 'function', foreground: '61afef' },
            { token: 'variable', foreground: 'e06c75' },
            { token: 'operator', foreground: '56b6c2' },
        ],
        colors: {
            'editor.background': '#282c34',
            'editor.foreground': '#abb2bf',
            'editor.lineHighlightBackground': '#2c313c',
            'editor.selectionBackground': '#3e4451',
            'editorCursor.foreground': '#528bff',
            'editorLineNumber.foreground': '#495162',
            'editorLineNumber.activeForeground': '#abb2bf',
        }
    });
});

export function WorkspaceVersionCompare() {
    const { workspaceId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [versions, setVersions] = useState<SchemaVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [leftVersion, setLeftVersion] = useState<SchemaVersion | null>(null);
    const [rightVersion, setRightVersion] = useState<SchemaVersion | null>(null);
    const [showLeftDropdown, setShowLeftDropdown] = useState(false);
    const [showRightDropdown, setShowRightDropdown] = useState(false);
    const [sideBySide, setSideBySide] = useState(true);
    const [diffStats, setDiffStats] = useState({ added: 0, removed: 0 });

    useEffect(() => {
        if (!workspaceId) return;

        const loadData = async () => {
            try {
                setLoading(true);

                // Fetch workspace
                const { data: ws } = await supabase
                    .from('workspaces')
                    .select('*')
                    .eq('id', workspaceId)
                    .single();

                if (ws) setWorkspace(ws);

                // Fetch all versions
                const { data: vers } = await supabase
                    .from('schema_versions')
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .order('version_number', { ascending: false });

                if (vers && vers.length > 0) {
                    setVersions(vers);

                    // Check URL params for pre-selected versions
                    const leftParam = searchParams.get('left');
                    const rightParam = searchParams.get('right');

                    if (leftParam && rightParam) {
                        const left = vers.find(v => v.version_number === parseInt(leftParam));
                        const right = vers.find(v => v.version_number === parseInt(rightParam));
                        if (left) setLeftVersion(left);
                        if (right) setRightVersion(right);
                    } else if (vers.length >= 2) {
                        // Default: compare latest two versions
                        setLeftVersion(vers[1]);
                        setRightVersion(vers[0]);
                    } else if (vers.length === 1) {
                        setRightVersion(vers[0]);
                    }
                }

            } catch (err) {
                console.error(err);
                toast.error('Failed to load versions');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [workspaceId]);

    // Calculate diff stats
    useEffect(() => {
        if (!leftVersion || !rightVersion) {
            setDiffStats({ added: 0, removed: 0 });
            return;
        }

        const leftLines = (leftVersion.code || leftVersion.raw_schema || '').split('\n');
        const rightLines = (rightVersion.code || rightVersion.raw_schema || '').split('\n');

        const leftSet = new Set(leftLines);
        const rightSet = new Set(rightLines);

        let added = 0;
        let removed = 0;

        for (const line of rightLines) {
            if (!leftSet.has(line) && line.trim()) added++;
        }
        for (const line of leftLines) {
            if (!rightSet.has(line) && line.trim()) removed++;
        }

        setDiffStats({ added, removed });
    }, [leftVersion, rightVersion]);

    const formatTimestamp = (ts: string) => {
        const date = new Date(ts);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const swapVersions = () => {
        const temp = leftVersion;
        setLeftVersion(rightVersion);
        setRightVersion(temp);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
                    <p className="text-sm text-slate-400">Loading versions...</p>
                </div>
            </div>
        );
    }

    if (versions.length < 2) {
        return (
            <div className="min-h-screen bg-[#1e1e1e] flex flex-col">
                <header className="h-14 bg-[#252526] border-b border-[#3c3c3c] flex items-center px-4 shrink-0">
                    <button
                        onClick={() => navigate(`/workspaces/${workspaceId}`)}
                        className="p-2 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-white"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h1 className="ml-4 text-sm font-bold text-white flex items-center gap-2">
                        <GitCompare className="w-4 h-4 text-indigo-400" />
                        Compare Versions
                    </h1>
                </header>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <GitCompare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h2 className="text-lg font-bold text-white mb-2">Not Enough Versions</h2>
                        <p className="text-sm text-slate-400 mb-4">
                            You need at least 2 versions to compare.
                        </p>
                        <button
                            onClick={() => navigate(`/workspaces/${workspaceId}`)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium"
                        >
                            Back to Editor
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#1e1e1e] flex flex-col">
            {/* Header */}
            <header className="h-16 bg-[#252526] border-b border-[#3c3c3c] flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(`/workspaces/${workspaceId}`)}
                        className="p-2 hover:bg-[#37373d] rounded-md text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-white">
                            <GitCompare className="w-5 h-5 text-indigo-400" />
                            <span className="font-bold">Compare Versions</span>
                        </div>
                        <span className="text-slate-500">•</span>
                        <span className="text-sm text-slate-400">{workspace?.name}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Diff Stats */}
                    <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-green-400">
                            <Plus className="w-3.5 h-3.5" />
                            {diffStats.added} added
                        </span>
                        <span className="flex items-center gap-1 text-red-400">
                            <Minus className="w-3.5 h-3.5" />
                            {diffStats.removed} removed
                        </span>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex bg-[#37373d] rounded-md p-0.5 border border-[#4b4b4b]">
                        <button
                            onClick={() => setSideBySide(true)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all ${sideBySide ? 'bg-[#505050] text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Side by Side
                        </button>
                        <button
                            onClick={() => setSideBySide(false)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all ${!sideBySide ? 'bg-[#505050] text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Inline
                        </button>
                    </div>
                </div>
            </header>

            {/* Version Selector Bar */}
            <div className="bg-[#2d2d2d] border-b border-[#3c3c3c] px-4 py-3 flex items-center justify-center gap-4">
                {/* Left Version Selector */}
                <div className="relative">
                    <button
                        onClick={() => { setShowLeftDropdown(!showLeftDropdown); setShowRightDropdown(false); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#37373d] hover:bg-[#404040] border border-[#4b4b4b] rounded-lg text-sm transition-colors min-w-[200px]"
                    >
                        <div className="w-6 h-6 rounded bg-red-900/30 flex items-center justify-center text-red-400">
                            <FileCode className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-bold text-red-400">
                                {leftVersion ? `v${leftVersion.version_number}` : 'Select version'}
                            </div>
                            {leftVersion && (
                                <div className="text-[10px] text-slate-500">
                                    {formatTimestamp(leftVersion.created_at)}
                                </div>
                            )}
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>

                    {showLeftDropdown && (
                        <div className="absolute top-full mt-1 left-0 w-64 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl z-20 max-h-80 overflow-y-auto">
                            {versions.map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => { setLeftVersion(v); setShowLeftDropdown(false); }}
                                    disabled={v.id === rightVersion?.id}
                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-[#37373d] flex items-center gap-3 ${v.id === leftVersion?.id ? 'bg-[#37373d]' : ''} ${v.id === rightVersion?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span className="font-bold text-red-400">v{v.version_number}</span>
                                    <span className="text-[10px] text-slate-500 flex-1">{formatTimestamp(v.created_at)}</span>
                                    {v.id === leftVersion?.id && <Check className="w-4 h-4 text-green-400" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Swap Button */}
                <button
                    onClick={swapVersions}
                    className="p-2 hover:bg-[#37373d] rounded-lg text-slate-400 hover:text-white transition-colors"
                    title="Swap versions"
                >
                    <ArrowLeftRight className="w-5 h-5" />
                </button>

                {/* Right Version Selector */}
                <div className="relative">
                    <button
                        onClick={() => { setShowRightDropdown(!showRightDropdown); setShowLeftDropdown(false); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#37373d] hover:bg-[#404040] border border-[#4b4b4b] rounded-lg text-sm transition-colors min-w-[200px]"
                    >
                        <div className="w-6 h-6 rounded bg-green-900/30 flex items-center justify-center text-green-400">
                            <FileCode className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-bold text-green-400">
                                {rightVersion ? `v${rightVersion.version_number}` : 'Select version'}
                            </div>
                            {rightVersion && (
                                <div className="text-[10px] text-slate-500">
                                    {formatTimestamp(rightVersion.created_at)}
                                </div>
                            )}
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>

                    {showRightDropdown && (
                        <div className="absolute top-full mt-1 left-0 w-64 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl z-20 max-h-80 overflow-y-auto">
                            {versions.map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => { setRightVersion(v); setShowRightDropdown(false); }}
                                    disabled={v.id === leftVersion?.id}
                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-[#37373d] flex items-center gap-3 ${v.id === rightVersion?.id ? 'bg-[#37373d]' : ''} ${v.id === leftVersion?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span className="font-bold text-green-400">v{v.version_number}</span>
                                    <span className="text-[10px] text-slate-500 flex-1">{formatTimestamp(v.created_at)}</span>
                                    {v.id === rightVersion?.id && <Check className="w-4 h-4 text-green-400" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Diff Editor */}
            <div className="flex-1">
                {leftVersion && rightVersion ? (
                    <DiffEditor
                        height="100%"
                        theme="one-dark-pro"
                        language="sql"
                        original={leftVersion.code || leftVersion.raw_schema || ''}
                        modified={rightVersion.code || rightVersion.raw_schema || ''}
                        options={{
                            readOnly: true,
                            renderSideBySide: sideBySide,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 14,
                            fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', Consolas, monospace",
                            fontLigatures: true,
                            lineHeight: 1.6,
                            renderIndicators: true,
                            ignoreTrimWhitespace: false,
                        }}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">
                        <div className="text-center">
                            <GitCompare className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            <p>Select two versions to compare</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

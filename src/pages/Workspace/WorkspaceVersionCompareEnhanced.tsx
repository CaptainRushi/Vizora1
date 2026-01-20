import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getUserColorClass } from '../../utils/userColors';
import { supabase } from '../../lib/supabase';
import { SchemaVersion, Workspace, VersionDiffBlock } from './types';
import {
    ArrowLeft,
    GitCompare,
    ChevronDown,
    ArrowLeftRight,
    Check,
    FileCode,
    Plus,
    Minus,
    Edit3,
    User,
    ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { computeDiffBlocks, computeDiffStats, DiffBlock } from '../../utils/versionDiff';

// Change type badge colors
const CHANGE_TYPE_STYLES = {
    added: {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-400',
        label: 'ADDED',
        icon: Plus,
    },
    modified: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        label: 'MODIFIED',
        icon: Edit3,
    },
    removed: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        label: 'REMOVED',
        icon: Minus,
    },
};

/**
 * DiffBlockDisplay - Renders a single diff block with attribution
 * Shows the change type, line range, content, and "edited by @username"
 */
function DiffBlockDisplay({ block }: { block: DiffBlock }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const style = CHANGE_TYPE_STYLES[block.changeType];
    const Icon = style.icon;

    const lineCount = block.changeType === 'removed'
        ? block.beforeText?.split('\n').length || 0
        : block.afterText?.split('\n').length || 0;

    // Ensure display name has a single leading '@' and a sensible fallback
    const displayName = block.editedByUsername
        ? (block.editedByUsername.startsWith('@') ? block.editedByUsername : `@${block.editedByUsername}`)
        : '@unknown';

    return (
        <div className={`border rounded-lg overflow-hidden ${style.border} ${style.bg}`}>
            {/* Block Header */}
            <div
                className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    {/* Change Type Badge */}
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold tracking-wider ${style.bg} ${style.text} border ${style.border}`}>
                        <Icon className="w-3 h-3" />
                        {style.label}
                    </div>

                    {/* Line Range */}
                    <span className="text-xs text-slate-500 font-mono">
                        {block.blockStart === block.blockEnd
                            ? `Line ${block.blockStart}`
                            : `Lines ${block.blockStart}–${block.blockEnd}`
                        }
                    </span>

                    {/* Line Count */}
                    <span className="text-[10px] text-slate-600">
                        ({lineCount} {lineCount === 1 ? 'line' : 'lines'})
                    </span>
                </div>

                {/* Expand/Collapse */}
                <button className="p-1 hover:bg-white/10 rounded text-slate-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
            </div>

            {/* Block Content */}
            {isExpanded && (
                <div className="border-t border-[#3c3c3c]">
                    {/* Code Changes */}
                    <div className="p-0 font-mono text-sm bg-[#1e1e1e]">
                        {/* Removed lines (for modified/removed) */}
                        {block.beforeText && (
                            <div className="bg-red-950/30">
                                {block.beforeText.split('\n').map((line, i) => (
                                    <div
                                        key={`before-${i}`}
                                        className="flex"
                                    >
                                        <span className="w-12 shrink-0 text-right pr-3 text-red-400/60 text-xs py-0.5 select-none bg-red-950/50">
                                            −
                                        </span>
                                        <pre className="flex-1 py-0.5 px-2 text-red-300/80 overflow-x-auto">
                                            {line || ' '}
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Added lines (for modified/added) */}
                        {block.afterText && (
                            <div className="bg-green-950/30">
                                {block.afterText.split('\n').map((line, i) => (
                                    <div
                                        key={`after-${i}`}
                                        className="flex"
                                    >
                                        <span className="w-12 shrink-0 text-right pr-3 text-green-400/60 text-xs py-0.5 select-none bg-green-950/50">
                                            +
                                        </span>
                                        <pre className="flex-1 py-0.5 px-2 text-green-300/80 overflow-x-auto">
                                            {line || ' '}
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Attribution - Inline ASCII style at end of code block (Unique color per user) */}
                        <div className="flex border-t border-[#2a2a2a]">
                            <span className="w-12 shrink-0 text-right pr-3 text-slate-600 text-xs py-2 select-none bg-[#1e1e1e]">
                            </span>
                            <div className="flex-1 py-2 px-2 bg-[#1e1e1e]">
                                <span className="font-mono text-xs text-slate-500">
                                    └── edited by{' '}
                                    <span className={`${getUserColorClass(block.editedByUsername)} font-medium`}>
                                        {displayName}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * WorkspaceVersionCompareEnhanced
 * Version comparison with "edited by" attribution per change block
 * 
 * This answers three questions:
 * 1. What changed between versions?
 * 2. Who made each change?
 * 3. Which version introduced the change?
 */
export function WorkspaceVersionCompareEnhanced() {
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
    const [viewMode, setViewMode] = useState<'blocks' | 'raw'>('blocks');
    const [storedDiffBlocks, setStoredDiffBlocks] = useState<VersionDiffBlock[]>([]);

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

                // Fetch all versions with snapshotted usernames and author fallback
                const { data: vers } = await supabase
                    .from('schema_versions')
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .order('version_number', { ascending: false });

                // Enrich with author info if created_by_username is missing
                if (vers && vers.length > 0) {
                    // Get unique author IDs that need username lookup
                    const missingUsernames = vers.filter(v => !v.created_by_username && v.created_by);
                    const userIds = [...new Set(missingUsernames.map(v => v.created_by))];

                    let userMap = new Map();
                    if (userIds.length > 0) {
                        const { data: users } = await supabase
                            .from('users')
                            .select('id, email, username, display_name')
                            .in('id', userIds);

                        if (users) {
                            users.forEach(u => userMap.set(u.id, u));
                        }
                    }

                    // Enrich versions with author info
                    const enrichedVersions = vers.map(v => ({
                        ...v,
                        author: userMap.get(v.created_by) || null,
                        // Set a fallback created_by_username if not present
                        created_by_username: v.created_by_username ||
                            userMap.get(v.created_by)?.username ||
                            userMap.get(v.created_by)?.email?.split('@')[0] ||
                            null
                    }));

                    setVersions(enrichedVersions);

                    // Check URL params for pre-selected versions
                    const leftParam = searchParams.get('left');
                    const rightParam = searchParams.get('right');

                    if (leftParam && rightParam) {
                        const left = enrichedVersions.find(v => v.version_number === parseInt(leftParam));
                        const right = enrichedVersions.find(v => v.version_number === parseInt(rightParam));
                        if (left) setLeftVersion(left);
                        if (right) setRightVersion(right);
                    } else if (enrichedVersions.length >= 2) {
                        // Default: compare latest two versions
                        setLeftVersion(enrichedVersions[1]);
                        setRightVersion(enrichedVersions[0]);
                    } else if (enrichedVersions.length === 1) {
                        setRightVersion(enrichedVersions[0]);
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

    // Fetch stored diff blocks when versions change
    useEffect(() => {
        if (!workspaceId || !leftVersion || !rightVersion) {
            setStoredDiffBlocks([]);
            return;
        }

        const fetchDiffBlocks = async () => {
            const { data } = await supabase
                .from('schema_version_diffs')
                .select('*')
                .eq('workspace_id', workspaceId)
                .eq('from_version', leftVersion.version_number)
                .eq('to_version', rightVersion.version_number)
                .order('block_index', { ascending: true });

            if (data) {
                setStoredDiffBlocks(data as VersionDiffBlock[]);
            }
        };

        fetchDiffBlocks();
    }, [workspaceId, leftVersion?.version_number, rightVersion?.version_number]);

    // Compute diff blocks (use stored or compute on-the-fly)
    const diffBlocks = useMemo((): DiffBlock[] => {
        if (!leftVersion || !rightVersion) return [];

        // If we have stored blocks, use them
        if (storedDiffBlocks.length > 0) {
            return storedDiffBlocks.map(b => ({
                blockIndex: b.block_index,
                blockStart: b.block_start,
                blockEnd: b.block_end,
                changeType: b.change_type as 'added' | 'modified' | 'removed',
                beforeText: b.before_text,
                afterText: b.after_text,
                editedByUserId: b.edited_by_user_id,
                editedByUsername: b.edited_by_username,
            }));
        }

        // Fallback: compute on-the-fly (for versions saved before attribution was added)
        const leftCode = leftVersion.code || leftVersion.raw_schema || '';
        const rightCode = rightVersion.code || rightVersion.raw_schema || '';

        // Use the snapshotted username from the version, or fall back
        const authorUsername = rightVersion.created_by_username ||
            rightVersion.author?.username ||
            'Unknown';

        return computeDiffBlocks(
            leftCode,
            rightCode,
            rightVersion.created_by,
            authorUsername
        );
    }, [leftVersion, rightVersion, storedDiffBlocks]);

    const diffStats = useMemo(() => {
        return computeDiffStats(diffBlocks);
    }, [diffBlocks]);

    const formatTimestamp = (ts: string) => {
        const date = new Date(ts);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const swapVersions = () => {
        const temp = leftVersion;
        setLeftVersion(rightVersion);
        setRightVersion(temp);
    };

    // Get author display for version
    const getVersionAuthor = (ver: SchemaVersion) => {
        return ver.created_by_username || ver.author?.username || 'Unknown';
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
                        <span className="flex items-center gap-1 text-amber-400">
                            <Edit3 className="w-3.5 h-3.5" />
                            {diffStats.modified} modified
                        </span>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex bg-[#37373d] rounded-md p-0.5 border border-[#4b4b4b]">
                        <button
                            onClick={() => setViewMode('blocks')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all ${viewMode === 'blocks' ? 'bg-[#505050] text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Block View
                        </button>
                        <button
                            onClick={() => setViewMode('raw')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all ${viewMode === 'raw' ? 'bg-[#505050] text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Raw Diff
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
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#37373d] hover:bg-[#404040] border border-[#4b4b4b] rounded-lg text-sm transition-colors min-w-[240px]"
                    >
                        <div className="w-6 h-6 rounded bg-red-900/30 flex items-center justify-center text-red-400">
                            <FileCode className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-bold text-red-400">
                                {leftVersion ? `v${leftVersion.version_number}` : 'Select version'}
                            </div>
                            {leftVersion && (
                                <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                    <span>{formatTimestamp(leftVersion.created_at)}</span>
                                    <span>•</span>
                                    <span className="text-slate-400">@{getVersionAuthor(leftVersion)}</span>
                                </div>
                            )}
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>

                    {showLeftDropdown && (
                        <div className="absolute top-full mt-1 left-0 w-72 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl z-20 max-h-80 overflow-y-auto">
                            {versions.map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => { setLeftVersion(v); setShowLeftDropdown(false); }}
                                    disabled={v.id === rightVersion?.id}
                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-[#37373d] flex items-center gap-3 ${v.id === leftVersion?.id ? 'bg-[#37373d]' : ''} ${v.id === rightVersion?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span className="font-bold text-red-400">v{v.version_number}</span>
                                    <span className="text-[10px] text-slate-500 flex-1">
                                        {formatTimestamp(v.created_at)}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                        @{getVersionAuthor(v)}
                                    </span>
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
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#37373d] hover:bg-[#404040] border border-[#4b4b4b] rounded-lg text-sm transition-colors min-w-[240px]"
                    >
                        <div className="w-6 h-6 rounded bg-green-900/30 flex items-center justify-center text-green-400">
                            <FileCode className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-bold text-green-400">
                                {rightVersion ? `v${rightVersion.version_number}` : 'Select version'}
                            </div>
                            {rightVersion && (
                                <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                                    <span>{formatTimestamp(rightVersion.created_at)}</span>
                                    <span>•</span>
                                    <span className="text-slate-400">@{getVersionAuthor(rightVersion)}</span>
                                </div>
                            )}
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>

                    {showRightDropdown && (
                        <div className="absolute top-full mt-1 left-0 w-72 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl z-20 max-h-80 overflow-y-auto">
                            {versions.map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => { setRightVersion(v); setShowRightDropdown(false); }}
                                    disabled={v.id === leftVersion?.id}
                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-[#37373d] flex items-center gap-3 ${v.id === rightVersion?.id ? 'bg-[#37373d]' : ''} ${v.id === leftVersion?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <span className="font-bold text-green-400">v{v.version_number}</span>
                                    <span className="text-[10px] text-slate-500 flex-1">
                                        {formatTimestamp(v.created_at)}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                        @{getVersionAuthor(v)}
                                    </span>
                                    {v.id === rightVersion?.id && <Check className="w-4 h-4 text-green-400" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Diff Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {leftVersion && rightVersion ? (
                    viewMode === 'blocks' ? (
                        <div className="max-w-4xl mx-auto space-y-4">
                            {/* Version Summary */}
                            <div className="bg-[#252526] rounded-lg p-4 border border-[#3c3c3c] mb-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-slate-400">Comparing</span>
                                        <span className="font-bold text-red-400">v{leftVersion.version_number}</span>
                                        <ArrowLeftRight className="w-4 h-4 text-slate-600" />
                                        <span className="font-bold text-green-400">v{rightVersion.version_number}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <User className="w-3.5 h-3.5" />
                                        <span>Version by @{getVersionAuthor(rightVersion)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Diff Blocks */}
                            {diffBlocks.length > 0 ? (
                                diffBlocks.map((block, idx) => (
                                    <DiffBlockDisplay key={idx} block={block} />
                                ))
                            ) : (
                                <div className="text-center py-12">
                                    <GitCompare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400">No changes between these versions</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Raw Diff View - Use existing Monaco DiffEditor */
                        <div className="h-full">
                            <div className="text-center py-8 text-sm text-slate-400">
                                <p>Raw diff view is available in the main editor.</p>
                                <button
                                    onClick={() => navigate(`/workspaces/${workspaceId}`)}
                                    className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm"
                                >
                                    Open in Editor
                                </button>
                            </div>
                        </div>
                    )
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

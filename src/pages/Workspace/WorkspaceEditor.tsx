import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getUserColorClass } from '../../utils/userColors';
import { useParams, useNavigate } from 'react-router-dom';
import Editor, { DiffEditor } from '@monaco-editor/react';
import { supabase } from '../../lib/supabase';
import { SchemaVersion, Workspace, getPermissions, WorkspaceRole } from './types';
import {
    Save,
    History,
    Users,
    GitCompare,
    Eye,
    ArrowLeft,
    Clock,
    X,
    FileCode,
    RotateCcw,
    AlertCircle,
    Shield,
    Edit3,
    Keyboard,
    Copy,
    Trash2,
    Power,
    AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useCollaboration } from '../../hooks/useCollaboration';
import { PresencePanel } from '../../components/collaboration/PresencePanel';
import { useCollaborationContext } from '../../context/CollaborationContext';
// import { useBlockOwnership } from '../../hooks/useBlockOwnership';
import { loader } from '@monaco-editor/react';

// Define One Dark Pro theme for Monaco Editor
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
            { token: 'class', foreground: 'e5c07b' },
            { token: 'function', foreground: '61afef' },
            { token: 'variable', foreground: 'e06c75' },
            { token: 'operator', foreground: '56b6c2' },
            { token: 'constant', foreground: 'd19a66' },
            { token: 'parameter', foreground: 'e06c75' },
            { token: 'punctuation', foreground: 'abb2bf' },
        ],
        colors: {
            'editor.background': '#282c34',
            'editor.foreground': '#abb2bf',
            'editor.lineHighlightBackground': '#2c313c',
            'editor.selectionBackground': '#3e4451',
            'editor.inactiveSelectionBackground': '#3a3f4b',
            'editorCursor.foreground': '#528bff',
            'editorWhitespace.foreground': '#3b4048',
            'editorIndentGuide.background': '#3b4048',
            'editorIndentGuide.activeBackground': '#c8c8c859',
            'editor.selectionHighlightBackground': '#3a3f4b',
            'editorBracketMatch.background': '#515a6b',
            'editorBracketMatch.border': '#515a6b',
            'editorGutter.background': '#282c34',
            'editorLineNumber.foreground': '#495162',
            'editorLineNumber.activeForeground': '#abb2bf',
            'scrollbar.shadow': '#00000000',
            'scrollbarSlider.background': '#4b5263aa',
            'scrollbarSlider.hoverBackground': '#5c6370',
            'scrollbarSlider.activeBackground': '#747d91',
        }
    });
});

// Placeholder text for new workspaces
const PLACEHOLDER_CODE = `-- Welcome to your Workspace
-- Start defining your schema here...

-- Example: Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example: Posts table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Paste or write your schema code here.
-- Every save creates a new version.
`;

export function WorkspaceEditor() {
    const { workspaceId } = useParams();
    const navigate = useNavigate();
    const { user, identity } = useAuth();
    const { setCurrentContext, activeHighlightRange } = useCollaborationContext();

    // State
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [currentCode, setCurrentCode] = useState('');
    const [lastSavedCode, setLastSavedCode] = useState('');
    const [versions, setVersions] = useState<SchemaVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [viewMode, setViewMode] = useState<'editor' | 'diff' | 'readonly'>('editor');
    const [compareVersions, setCompareVersions] = useState<{ left: SchemaVersion | null; right: SchemaVersion | null }>({ left: null, right: null });
    const [viewingVersion, setViewingVersion] = useState<SchemaVersion | null>(null);
    const [userRole, setUserRole] = useState<WorkspaceRole>('viewer');
    const [saveMessage, setSaveMessage] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [schemaType, setSchemaType] = useState<'sql' | 'prisma'>('sql');
    const [isRemoteUpdate, setIsRemoteUpdate] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [projectId, setProjectId] = useState<string | null>(null); // New Project Context
    const editorRef = useRef<any>(null);
    const decorationsRef = useRef<string[]>([]);
    const cursorDecorationsRef = useRef<string[]>([]);

    const permissions = getPermissions(userRole);

    const editorOptions = useMemo(() => ({
        readOnly: !permissions.canEdit,
        minimap: { enabled: true, scale: 0.8 },
        fontSize: 14,
        fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', Consolas, monospace",
        fontLigatures: true,
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: 'smooth' as const,
        cursorSmoothCaretAnimation: 'on' as const,
        lineHeight: 1.6,
        padding: { top: 16, bottom: 16 },
        renderLineHighlight: 'all' as const,
        bracketPairColorization: { enabled: true },
        formatOnPaste: true,
        wordWrap: 'on' as const,
    }), [permissions.canEdit]);

    // Handle highlighting from chat
    useEffect(() => {
        if (!editorRef.current || !activeHighlightRange) {
            if (editorRef.current) {
                // Clear decorations
                decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current || [], []);
            }
            return;
        }

        const [start, end] = activeHighlightRange;

        // Scroll to and highlight
        editorRef.current.revealLineInCenter(start);
        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current || [], [
            {
                range: { startLineNumber: start, startColumn: 1, endLineNumber: end, endColumn: 200 },
                options: {
                    isWholeLine: true,
                    className: 'bg-indigo-500/10 border-l-4 border-indigo-500',
                    marginClassName: 'bg-indigo-500/20'
                }
            }
        ]);

    }, [activeHighlightRange]);

    // Live collaboration hook
    const collaboration = useCollaboration({
        workspaceId: workspaceId || '',
        onContentChange: (content, userId, _username, changes) => {
            // Only apply if it's from another user
            if (userId !== user?.id) {
                setIsRemoteUpdate(true);

                if (editorRef.current) {
                    const model = editorRef.current.getModel();
                    if (!model) return;

                    if (changes && Array.isArray(changes) && changes.length > 0) {
                        // Apply Delta Updates (Key to preventing jitter)
                        // Map specific changes to edits ensuring we don't mess up cursor
                        const edits = changes.map((change: any) => ({
                            range: change.range, // Monaco range object
                            text: change.text,
                            forceMoveMarkers: true
                        }));

                        // We use the 'api' source to verify later? No, just apply.
                        // We apply edits without capturing cursor state because 
                        // remote cursors are handled separately now.
                        // However, we MUST ensure the LOCAL cursor stays put relative to text.
                        // transformPosition functionality is built-in to Model behavior for many cases,
                        // but if inserting before cursor, cursor should shift.
                        // executeEdits handles marker movement if forceMoveMarkers is true.

                        editorRef.current.executeEdits('remote-update', edits);

                        // Update currentCode state to match model without triggering re-render loop
                        setCurrentCode(model.getValue());
                    } else if (content) {
                        // Fallback: Full Content Replacement
                        const fullRange = model.getFullModelRange();
                        if (model.getValue() !== content) {
                            editorRef.current.executeEdits('remote-update', [{
                                range: fullRange,
                                text: content,
                                forceMoveMarkers: true
                            }]);
                            setCurrentCode(content);
                        }
                    }
                }

                setTimeout(() => setIsRemoteUpdate(false), 100);
            }
        },
        onVersionSaved: (version, savedBy) => {
            toast.success(`Version v${version} saved by ${savedBy}`);
            fetchHistory();
        }
    });

    // Handle editor mount - attach listeners
    const handleEditorDidMount = (editor: any, _monaco: any) => {
        editorRef.current = editor;

        // 1. Text Changes Listener (Deltas)
        editor.onDidChangeModelContent((e: any) => {
            if (!isRemoteUpdate && permissions.canEdit) {
                // Send granular changes
                // e.changes is array of { range, rangeLength, rangeOffset, text }
                if (e.changes.length > 0) {
                    collaboration.sendChange(e.changes);

                    // Also update local state
                    setCurrentCode(editor.getValue());
                }
            }
        });

        // 2. Cursor Position Listener
        editor.onDidChangeCursorPosition((e: any) => {
            if (permissions.canEdit) {
                collaboration.sendCursor(e.position, editor.getSelection());
            }
        });

        // 3. Selection Listener (Context Tracking)
        editor.onDidChangeCursorSelection((e: any) => {
            const selection = e.selection;
            if (selection.isEmpty()) {
                setCurrentContext(null);
                return;
            }

            // Extract simple table name if possible
            const model = editor.getModel();
            if (!model) return;
            const text = model.getValueInRange(selection);
            let table = null;
            const tableMatch = text.match(/(?:CREATE TABLE|model)\s+([a-zA-Z0-9_]+)/i);
            if (tableMatch) table = tableMatch[1];

            setCurrentContext({
                schema_version: versions.length > 0 ? versions[0].version_number : 1,
                table: table || undefined,
                line_range: [selection.startLineNumber, selection.endLineNumber]
            });
        });
    };

    // Render Remote Cursors
    useEffect(() => {
        if (!editorRef.current || !collaboration.users) return;

        // Filter valid remote users with cursor positions
        const remoteUsers = collaboration.users.filter(u => u.id !== user?.id && u.cursor);

        // Generate decorations and styles
        const newDecorations: any[] = [];

        remoteUsers.forEach(u => {
            if (!u.cursor) return;

            // 1. Inject Dynamic Style for this user if missing
            const color = u.color || '#6366f1';
            const safeColor = color.replace('#', '');
            const styleId = `cursor-style-${safeColor}`;

            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.innerHTML = `
                    .cursor-${safeColor} { border-left-color: ${color} !important; }
                    .selection-${safeColor} { background-color: ${color} !important; opacity: 0.2; }
                `;
                document.head.appendChild(style);
            }

            // 2. Add Cursor Decoration
            newDecorations.push({
                range: {
                    startLineNumber: u.cursor.lineNumber,
                    startColumn: u.cursor.column,
                    endLineNumber: u.cursor.lineNumber,
                    endColumn: u.cursor.column
                },
                options: {
                    className: `remote-cursor cursor-${safeColor}`,
                    hoverMessage: { value: `${u.username}` }
                }
            });

            // 3. Add Selection Decoration (if exists)
            if (u.selection && u.selection.startLineNumber) {
                newDecorations.push({
                    range: u.selection,
                    options: {
                        className: `remote-selection selection-${safeColor}`,
                        hoverMessage: { value: `${u.username}` }
                    }
                });
            }
        });

        // Apply decorations using dedicated ref
        cursorDecorationsRef.current = editorRef.current.deltaDecorations(cursorDecorationsRef.current, newDecorations);

    }, [collaboration.users]);

    // Memoized change handler - purely for state sync coming from standard onChange if needed
    // But we are handling updates in onDidChangeModelContent now.
    // We keep this just to ensure parent state stays in sync if something else triggers it.
    const handleEditorChange = useCallback((val: string | undefined) => {
        // No-op for broadcasting. Broadcasting is done in onDidChangeModelContent.
        // Just update local state if safe.
        if (!isRemoteUpdate && val !== undefined) {
            setCurrentCode(val);
        }
    }, [isRemoteUpdate]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (hasUnsavedChanges && permissions.canEdit) {
                    handleSave();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentCode, lastSavedCode, permissions.canEdit]);

    // Load Workspace Data
    useEffect(() => {
        if (!workspaceId || !user) return;

        const loadData = async () => {
            try {
                setLoading(true);

                // 1. Fetch Workspace Details
                const { data: ws, error: wsError } = await supabase
                    .from('workspaces')
                    .select('*')
                    .eq('id', workspaceId)
                    .single();

                if (wsError) throw wsError;
                setWorkspace(ws);

                // 1.5 Fetch Associated Project (Strict Hierarchy Support)
                // We default to the first active project in this workspace
                const { data: projects } = await supabase
                    .from('projects')
                    .select('id')
                    .eq('workspace_id', workspaceId)
                    .eq('status', 'active')
                    .limit(1);

                let activeProjectId = null;
                if (projects && projects.length > 0) {
                    activeProjectId = projects[0].id;
                    setProjectId(activeProjectId);
                }

                // 2. Determine user role
                if (ws.owner_id === user.id) {
                    setUserRole('owner');
                } else {
                    const { data: membership } = await supabase
                        .from('workspace_members')
                        .select('role')
                        .eq('workspace_id', workspaceId)
                        .eq('user_id', user.id)
                        .single();

                    if (membership) {
                        setUserRole(membership.role as WorkspaceRole);
                    }
                }

                // 3. Fetch Latest Version
                // If we have a project ID, prefer it. fallback to workspace_id query for legacy data.
                let versionQuery = supabase
                    .from('schema_versions')
                    .select('*')
                    .eq('workspace_id', workspaceId);

                if (activeProjectId) {
                    // If we have a project, scope to it (conceptually cleaner)
                    // But strictly speaking, workspace_id filter is enough if they match.
                    // We'll stick to workspace_id for broad fetch to see legacy versions too.
                }

                const { data: latestVer } = await versionQuery
                    .order('version_number', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (latestVer) {
                    const code = latestVer.code || latestVer.raw_schema || '';
                    setCurrentCode(code);
                    setLastSavedCode(code);
                    // Explicitly update editor in uncontrolled mode
                    if (editorRef.current) {
                        editorRef.current.setValue(code);
                    }
                    // Detect schema type
                    if (code.includes('model ') && code.includes('@')) {
                        setSchemaType('prisma');
                    }
                } else {
                    const emptyCode = PLACEHOLDER_CODE;
                    setCurrentCode(emptyCode);
                    setLastSavedCode('');
                    if (editorRef.current) {
                        editorRef.current.setValue(emptyCode);
                    }
                }

                // 4. Fetch History
                fetchHistory();

            } catch (err) {
                console.error('Error loading workspace:', err);
                toast.error('Failed to load workspace');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [workspaceId, user]);

    const fetchHistory = async () => {
        if (!workspaceId) return;

        console.log('[WorkspaceEditor] Fetching version history for workspace:', workspaceId);

        // 1. Fetch versions
        const { data: hist, error } = await supabase
            .from('schema_versions')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('version_number', { ascending: false })
            .limit(50);

        if (error) {
            console.error('[WorkspaceEditor] Error fetching history:', error);
            return;
        }

        if (!hist) {
            console.warn('[WorkspaceEditor] No history data returned');
            return;
        }

        console.log(`[WorkspaceEditor] Found ${hist.length} versions`);

        // 2. Extract unique author IDs
        const userIds = [...new Set(hist.map(v => v.created_by).filter(Boolean))];

        // 3. Fetch author details manually
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

        // 4. Merge data
        const enrichedHistory = hist.map(v => ({
            ...v,
            author: userMap.get(v.created_by) || { email: 'Unknown', username: 'Unknown' }
        }));

        console.log('[WorkspaceEditor] Setting versions:', enrichedHistory);
        setVersions(enrichedHistory);
    };

    const hasUnsavedChanges = currentCode !== lastSavedCode;

    const handleSave = async (message?: string) => {
        if (!workspaceId || !user || !permissions.canCreateVersions) return;

        // Strict Check: Must have a project context
        if (!projectId) {
            toast.error("No active project found in this workspace. Please create a project first.");
            return;
        }

        if (currentCode === lastSavedCode) {
            toast('No changes to save');
            return;
        }

        setSaving(true);
        try {
            const previousVersion = versions.length > 0 ? versions[0] : null;
            const nextVersion = (previousVersion?.version_number ?? 0) + 1;
            const previousCode = previousVersion?.code || previousVersion?.raw_schema || '';

            // Snapshot username at save time (not mutable reference)
            const snapshotUsername = identity?.username || user?.email?.split('@')[0] || 'Unknown';

            console.log('[WorkspaceEditor] Saving version with attribution...', {
                workspaceId,
                projectId,
                nextVersion,
                snapshotUsername,
                hasPreviousVersion: !!previousVersion
            });

            // Step 1: Insert new version with snapshotted username
            const { error } = await supabase
                .from('schema_versions')
                .insert({
                    workspace_id: workspaceId,
                    project_id: projectId, // CRITICAL FIX: ADDED PROJECT ID
                    version_number: nextVersion,
                    code: currentCode,
                    raw_schema: currentCode,
                    normalized_schema: {}, // Empty object to satisfy NOT NULL constraint
                    created_by: user.id,
                    created_by_username: snapshotUsername, // Snapshotted at save time
                    message: message || undefined,
                });

            if (error) throw error;

            // Step 2: Compute diff blocks for attribution
            // Import dynamically to avoid circular dependencies
            const { computeDiffBlocks, formatBlocksForStorage } = await import('../../utils/versionDiff');

            if (previousVersion) {
                const diffBlocks = computeDiffBlocks(
                    previousCode,
                    currentCode,
                    user.id,
                    snapshotUsername
                );

                // Step 3: Store diff blocks with attribution
                if (diffBlocks.length > 0) {
                    const storageBlocks = formatBlocksForStorage(
                        diffBlocks,
                        workspaceId,
                        previousVersion.version_number,
                        nextVersion
                    );

                    const { error: diffError } = await supabase
                        .from('schema_version_diffs')
                        .insert(storageBlocks);

                    if (diffError) {
                        console.warn('[WorkspaceEditor] Failed to store diff blocks:', diffError);
                        // Non-critical, continue
                    } else {
                        console.log(`[WorkspaceEditor] Stored ${diffBlocks.length} diff blocks with attribution`);
                    }
                }
            }

            toast.success(`Version ${nextVersion} saved!`);
            setLastSavedCode(currentCode);

            // Commit attribution for the semantic block being edited (real-time feature)
            const editor = editorRef.current;
            const model = editor?.getModel();
            const selection = editor?.getSelection();

            if (model && selection) {
                const currentLine = selection.startLineNumber;
                let blockId = `line-${currentLine}`; // Fallback
                let startLine = currentLine;
                let endLine = currentLine;

                // Simple semantic block detection (Prisma/SQL focus)
                const lines = model.getLinesContent();

                // Find start of block (upwards scan)
                for (let i = currentLine - 1; i >= 0; i--) {
                    const line = lines[i].trim();
                    if (line.match(/^(model|table|enum|type|datasource|generator|schema)\s+/i)) {
                        const match = line.match(/^(model|table|enum|type|datasource|generator|schema)\s+([a-zA-Z0-9_]+)/i);
                        if (match) {
                            blockId = `${match[1].toLowerCase()}:${match[2]}`;
                        }
                        startLine = i + 1;
                        break;
                    }
                    if (line === '' && i < currentLine - 5) break; // Don't scan too far
                }

                // Find end of block (downwards scan for closing brace)
                for (let i = currentLine - 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line.includes('}') || line.endsWith(');')) {
                        endLine = i + 1;
                        break;
                    }
                    if (line === '' && i > currentLine + 10) break; // Don't scan too far
                }

                collaboration.commitAttribution({
                    blockId, // Use semantic ID instead of line numbers
                    start: startLine,
                    end: endLine
                });

                console.log(`[WorkspaceEditor] Committed attribution for semantic block: ${blockId} (${startLine}-${endLine})`);
            }

            // Refresh version history from database to ensure we have correct data
            await fetchHistory();

            setShowSaveModal(false);
            setSaveMessage('');
        } catch (err: any) {
            console.error('[WorkspaceEditor] Save error:', err);
            console.error('[WorkspaceEditor] Error details:', {
                message: err.message,
                code: err.code,
                details: err.details,
                hint: err.hint
            });
            toast.error(err.message || 'Failed to save version');
        } finally {
            setSaving(false);
        }
    };

    // View a specific version (read-only)
    const handleViewVersion = (ver: SchemaVersion) => {
        setViewingVersion(ver);
        setViewMode('readonly');
    };

    // Restore/load a version into editor
    const handleRestoreVersion = async (version: SchemaVersion) => {
        try {
            const confirmed = window.confirm(`Are you sure you want to restore v${version.version_number}? This will overwrite your current editor content.`);
            if (!confirmed) return;

            const code = version.code || version.raw_schema || '';
            setCurrentCode(code);
            setLastSavedCode(code);
            collaboration.sendUpdate(code);
            toast.success(`Restored to v${version.version_number}`);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const handleDeleteWorkspace = async () => {
        if (!workspaceId || !user) return;
        setIsDeleting(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/workspace/${workspaceId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ requesterId: user.id }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete workspace');
            }

            toast.success('Workspace deleted successfully');
            navigate('/projects');
        } catch (err: any) {
            console.error('[Delete Workspace] Error:', err);
            toast.error(err.message || 'Failed to delete workspace');
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };
    // Compare two versions
    const handleCompare = (v1: SchemaVersion, v2: SchemaVersion) => {
        const older = v1.version_number < v2.version_number ? v1 : v2;
        const newer = v1.version_number > v2.version_number ? v1 : v2;
        setCompareVersions({ left: older, right: newer });
        setViewMode('diff');
    };

    // Exit compare/readonly mode
    const handleExitMode = () => {
        setViewMode('editor');
        setViewingVersion(null);
        setCompareVersions({ left: null, right: null });
    };

    // Get formatted timestamp
    const formatTimestamp = (ts: string) => {
        const date = new Date(ts);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = diff / (1000 * 60 * 60);
        const days = diff / (1000 * 60 * 60 * 24);

        if (hours < 1) return 'Just now';
        if (hours < 24) return `${Math.floor(hours)} hours ago`;
        if (days < 7) return `${Math.floor(days)} days ago`;
        return date.toLocaleDateString();
    };

    // Get author display name - prioritize snapshotted username (source of truth)
    const getAuthorName = (ver: SchemaVersion) => {
        // Snapshotted username is the source of truth for attribution
        if (ver.created_by_username) {
            return `@${ver.created_by_username}`;
        }
        if (ver.author?.username) {
            return `@${ver.author.username}`;
        }
        if (ver.author?.display_name) {
            return ver.author.display_name;
        }
        if (ver.author?.email) {
            return ver.author.email.split('@')[0];
        }
        if (ver.created_by?.length > 8) {
            return `User ${ver.created_by.slice(0, 4)}`;
        }
        return 'Unknown';
    };

    // Delete a specific version
    const handleDeleteVersion = async (versionId: string) => {
        console.log('[Delete Version] Attempting to delete:', versionId);
        console.log('[Delete Version] Permissions:', { canEdit: permissions.canEdit, workspaceId });

        if (!workspaceId || !permissions.canEdit) {
            console.error('[Delete Version] Missing workspaceId or permissions');
            toast.error('You do not have permission to delete versions');
            return;
        }

        const confirmDelete = window.confirm('Are you sure you want to delete this version? This action cannot be undone.');
        if (!confirmDelete) {
            console.log('[Delete Version] User cancelled');
            return;
        }

        try {
            console.log('[Delete Version] Sending delete request...');
            const { error, count } = await supabase
                .from('schema_versions')
                .delete()
                .eq('id', versionId)
                .eq('workspace_id', workspaceId);

            if (error) {
                console.error('[Delete Version] Supabase error:', error);
                throw error;
            }

            console.log('[Delete Version] Success, deleted count:', count);
            toast.success('Version deleted');
            fetchHistory(); // Refresh list
        } catch (err: any) {
            console.error('[Delete Version] Error:', err);
            toast.error(err.message || 'Failed to delete version');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#1e1e1e]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 editor-loading-spinner" />
                    <p className="text-sm font-medium text-slate-400">Loading Workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-[#1e1e1e] text-slate-300 overflow-hidden min-h-screen">
            {/* Header */}
            <header className="h-14 bg-[#252526] border-b border-[#3c3c3c] flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/projects')}
                        className="p-2 hover:bg-[#37373d] rounded-md transition-colors text-slate-400 hover:text-white"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <FileCode className="w-4 h-4 text-indigo-400" />
                            <h1 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                                {workspace?.name}
                                {hasUnsavedChanges && (
                                    <span className="w-2 h-2 rounded-full bg-yellow-500 unsaved-indicator" title="Unsaved changes" />
                                )}
                            </h1>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="font-mono">
                                {versions.length > 0 ? `v${versions[0].version_number}` : 'Draft'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                            <span className="capitalize">{workspace?.type}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                            <span className="flex items-center gap-1 capitalize">
                                <Shield className="w-2.5 h-2.5" />
                                {userRole}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Live Collaboration Presence */}
                    {collaboration.isConnected && (
                        <PresencePanel
                            users={collaboration.users}
                            currentUserId={user?.id}
                            isConnected={collaboration.isConnected}
                            isCompact={true}
                        />
                    )}

                    {/* Mode indicator */}
                    {viewMode !== 'editor' && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-900/30 border border-amber-600/30 rounded-md">
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs font-medium text-amber-300">
                                {viewMode === 'readonly'
                                    ? `Viewing v${viewingVersion?.version_number} (read-only)`
                                    : `Comparing v${compareVersions.left?.version_number} ↔ v${compareVersions.right?.version_number}`
                                }
                            </span>
                            <button
                                onClick={handleExitMode}
                                className="ml-2 p-1 hover:bg-amber-800/50 rounded"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}

                    {/* View mode toggle */}
                    <div className="flex bg-[#37373d] rounded-md p-0.5 border border-[#4b4b4b]">
                        <button
                            className={`px-3 py-1.5 text-xs font-medium rounded-sm flex items-center gap-2 transition-all ${viewMode === 'editor' ? 'bg-[#505050] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            onClick={handleExitMode}
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                            Editor
                        </button>
                        <button
                            className={`px-3 py-1.5 text-xs font-medium rounded-sm flex items-center gap-2 transition-all ${viewMode === 'diff' ? 'bg-[#505050] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                            onClick={() => {
                                if (versions.length >= 2) {
                                    handleCompare(versions[1], versions[0]);
                                } else {
                                    toast('Need at least 2 versions to compare');
                                }
                            }}
                        >
                            <GitCompare className="w-3.5 h-3.5" />
                            Diff
                        </button>
                    </div>

                    <div className="h-4 w-px bg-[#4b4b4b]" />

                    {/* Copy Code */}
                    <button
                        onClick={async () => {
                            const codeToCopy = viewMode === 'readonly' && viewingVersion
                                ? (viewingVersion.code || viewingVersion.raw_schema || '')
                                : currentCode;
                            await navigator.clipboard.writeText(codeToCopy);
                            toast.success('Code copied to clipboard!');
                        }}
                        className="p-2 hover:bg-[#37373d] text-slate-400 hover:text-white rounded-md transition-colors"
                        title="Copy Code"
                    >
                        <Copy className="w-4 h-4" />
                    </button>

                    {/* History toggle */}
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`p-2 rounded-md transition-colors flex items-center gap-2 ${showHistory ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'hover:bg-[#37373d] text-slate-400'}`}
                        title="Version History"
                    >
                        <History className="w-4 h-4" />
                        <span className="text-xs font-medium hidden md:inline">History</span>
                    </button>

                    {/* Team */}
                    <button
                        onClick={() => navigate(`/workspaces/${workspaceId}/team`)}
                        className="p-2 hover:bg-[#37373d] text-slate-400 hover:text-white rounded-md transition-colors"
                        title="Team Members"
                    >
                        <Users className="w-4 h-4" />
                    </button>

                    {/* Save button */}
                    {permissions.canEdit && (
                        <button
                            onClick={() => setShowSaveModal(true)}
                            disabled={!hasUnsavedChanges || saving}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all
                                ${hasUnsavedChanges
                                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white save-btn-ready'
                                    : 'bg-[#37373d] text-slate-500 cursor-not-allowed'}
                            `}
                        >
                            <Save className="w-3.5 h-3.5" />
                            {saving ? 'Saving...' : 'Save Version'}
                        </button>
                    )}

                    <div className="h-4 w-px bg-[#4b4b4b]" />

                    {/* Exit/Terminate Session */}
                    <button
                        onClick={() => navigate('/projects')}
                        className="flex items-center gap-2 px-3 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 text-red-400 hover:text-red-300 rounded-lg text-xs font-bold transition-all"
                        title="Terminate Session / Exit to Projects"
                    >
                        <Power className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Terminate</span>
                    </button>

                    {/* Delete Workspace (Owner only) */}
                    {permissions.canDeleteWorkspace && (
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="p-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/50 text-red-500 rounded-md transition-all"
                            title="Delete Workspace (Permanent)"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <div className="flex h-[calc(100vh-56px)]">
                {/* Editor Area */}
                <div className="flex-1 min-w-0 relative h-full overflow-hidden">
                    {/* Read-only banner for viewers */}
                    {!permissions.canEdit && viewMode === 'editor' && (
                        <div className="absolute top-0 left-0 right-0 z-10 bg-amber-900/80 backdrop-blur-sm px-4 py-2 flex items-center justify-center gap-2 text-amber-200 text-xs border-b border-amber-600/30">
                            <AlertCircle className="w-4 h-4" />
                            You have read-only access to this workspace
                        </div>
                    )}

                    {viewMode === 'diff' && compareVersions.left && compareVersions.right ? (
                        <div className="h-full flex flex-col diff-pane-enter">
                            {/* Version comparison header */}
                            <div className="bg-[#252526] border-b border-[#3c3c3c] flex shrink-0">
                                {/* Left (older) version label - centered */}
                                <div className="flex-1 flex items-center justify-center gap-2 py-2 border-r border-[#3c3c3c]">
                                    <div className="w-3 h-3 rounded-full bg-red-500/30 border border-red-500/50" />
                                    <span className="text-xs font-bold text-red-400">
                                        v{compareVersions.left.version_number}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium">(older)</span>
                                    {compareVersions.left.message && (
                                        <span className="text-[10px] text-slate-500 italic truncate max-w-[150px]">
                                            — "{compareVersions.left.message}"
                                        </span>
                                    )}
                                </div>
                                {/* Right (newer) version label - centered */}
                                <div className="flex-1 flex items-center justify-center gap-2 py-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500/30 border border-green-500/50" />
                                    <span className="text-xs font-bold text-green-400">
                                        v{compareVersions.right.version_number}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium">(newer)</span>
                                    {compareVersions.right.message && (
                                        <span className="text-[10px] text-slate-500 italic truncate max-w-[150px]">
                                            — "{compareVersions.right.message}"
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1">
                                <DiffEditor
                                    height="100%"
                                    theme="one-dark-pro"
                                    language={schemaType === 'prisma' ? 'prisma' : 'sql'}
                                    original={compareVersions.left.code || compareVersions.left.raw_schema || ''}
                                    modified={compareVersions.right.code || compareVersions.right.raw_schema || ''}
                                    options={{
                                        readOnly: true,
                                        renderSideBySide: true,
                                        minimap: { enabled: false },
                                        scrollBeyondLastLine: false,
                                        fontSize: 14,
                                        fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', Consolas, monospace",
                                        fontLigatures: true,
                                        lineHeight: 1.6,
                                    }}
                                />
                            </div>
                            {/* Attribution Footer */}
                            <div className="bg-[#1e1e1e] border-t border-[#3c3c3c] px-4 py-3 shrink-0">
                                <span className="font-mono text-xs text-slate-500">
                                    └── edited by{' '}
                                    <span className={`${getUserColorClass(compareVersions.right?.created_by_username || compareVersions.right?.author?.username)} font-medium`}>
                                        {getAuthorName(compareVersions.right)}
                                    </span>
                                </span>
                            </div>
                        </div>
                    ) : viewMode === 'readonly' && viewingVersion ? (
                        <Editor
                            height="100%"
                            theme="one-dark-pro"
                            language={schemaType === 'prisma' ? 'prisma' : 'sql'}
                            value={viewingVersion.code || viewingVersion.raw_schema || ''}
                            options={{
                                readOnly: true,
                                minimap: { enabled: true },
                                fontSize: 14,
                                fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', Consolas, monospace",
                                fontLigatures: true,
                                scrollBeyondLastLine: false,
                                smoothScrolling: true,
                                lineHeight: 1.6,
                                padding: { top: 16, bottom: 16 },
                            }}
                        />
                    ) : (
                        <Editor
                            height="100%"
                            theme="one-dark-pro"
                            language={schemaType === 'prisma' ? 'prisma' : 'sql'}
                            defaultValue={currentCode}
                            onChange={handleEditorChange}
                            onMount={handleEditorDidMount}
                            options={editorOptions}
                            loading={
                                <div className="flex items-center gap-2 text-slate-400">
                                    <div className="w-4 h-4 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 editor-loading-spinner" />
                                    <span className="text-sm">Loading...</span>
                                </div>
                            }
                        />
                    )}

                    {/* Keyboard shortcut hint */}
                    {hasUnsavedChanges && permissions.canEdit && viewMode === 'editor' && (
                        <div className="absolute bottom-20 right-4 flex items-center gap-2 px-3 py-2 bg-[#252526]/95 backdrop-blur-sm border border-[#4b4b4b] rounded-lg text-xs text-slate-400 shadow-xl z-10 shortcut-hint">
                            <Keyboard className="w-3.5 h-3.5" />
                            <span>Press</span>
                            <kbd className="px-1.5 py-0.5 bg-[#37373d] rounded text-slate-300 font-mono text-[10px]">Ctrl</kbd>
                            <span>+</span>
                            <kbd className="px-1.5 py-0.5 bg-[#37373d] rounded text-slate-300 font-mono text-[10px]">S</kbd>
                            <span>to save</span>
                        </div>
                    )}
                </div>

                {/* Right Panel: Version History */}
                {showHistory && (
                    <div className="w-80 h-full bg-[#252526] border-l border-[#3c3c3c] flex flex-col shrink-0 panel-slide-in">
                        <div className="p-4 border-b border-[#3c3c3c] flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                                <History className="w-3.5 h-3.5 text-indigo-400" />
                                Version History
                            </h3>
                            <span className="text-[10px] text-slate-500 bg-[#37373d] px-2 py-0.5 rounded">
                                {versions.length} versions
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                            {versions.length === 0 ? (
                                <div className="p-6 text-center">
                                    <div className="w-12 h-12 rounded-full bg-[#37373d] flex items-center justify-center mx-auto mb-3">
                                        <History className="w-5 h-5 text-slate-500" />
                                    </div>
                                    <p className="text-xs text-slate-400 mb-1">No versions yet</p>
                                    <p className="text-[10px] text-slate-500">Save your code to create the first version.</p>
                                </div>
                            ) : (
                                versions.map((ver, idx) => (
                                    <div
                                        key={ver.id}
                                        className={`
                                            version-card group bg-[#2d2d2d] hover:bg-[#333333] border border-[#3c3c3c] hover:border-indigo-500/30 rounded-lg p-3 cursor-pointer transition-all
                                            ${viewingVersion?.id === ver.id || compareVersions.left?.id === ver.id || compareVersions.right?.id === ver.id
                                                ? 'border-indigo-500 ring-1 ring-indigo-500/20 bg-indigo-900/10'
                                                : ''}
                                        `}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-indigo-400">v{ver.version_number}</span>
                                                {idx === 0 && (
                                                    <span className="text-[9px] px-1.5 py-0.5 bg-green-900/30 text-green-400 rounded font-medium version-badge-new">
                                                        LATEST
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5" />
                                                {formatTimestamp(ver.created_at)}
                                            </span>
                                        </div>

                                        {/* Attribution - ASCII Style (Unique color per user) */}
                                        <div className="mb-3">
                                            <span className="font-mono text-[10px] text-slate-500">
                                                └── edited by{' '}
                                                <span className={getUserColorClass(ver.created_by_username || ver.author?.username)}>{getAuthorName(ver)}</span>
                                            </span>
                                        </div>

                                        {ver.message && (
                                            <p className="text-[10px] text-slate-400 mb-3 line-clamp-2 italic">
                                                "{ver.message}"
                                            </p>
                                        )}

                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                className="flex-1 py-1.5 text-[10px] font-medium bg-[#37373d] hover:bg-indigo-600 text-slate-300 hover:text-white rounded flex items-center justify-center gap-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleViewVersion(ver);
                                                }}
                                            >
                                                <Eye className="w-3 h-3" />
                                                View
                                            </button>
                                            {idx > 0 && (
                                                <button
                                                    className="flex-1 py-1.5 text-[10px] font-medium bg-[#37373d] hover:bg-purple-600 text-slate-300 hover:text-white rounded flex items-center justify-center gap-1"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCompare(ver, versions[0]);
                                                    }}
                                                >
                                                    <GitCompare className="w-3 h-3" />
                                                    Compare
                                                </button>
                                            )}
                                            {idx > 0 && permissions.canEdit && (
                                                <button
                                                    className="flex-1 py-1.5 text-[10px] font-medium bg-[#37373d] hover:bg-slate-600 text-slate-300 hover:text-white rounded flex items-center justify-center gap-1"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRestoreVersion(ver);
                                                    }}
                                                >
                                                    <RotateCcw className="w-3 h-3" />
                                                    Restore
                                                </button>
                                            )}
                                            {permissions.canEdit && idx > 0 && (
                                                <button
                                                    className="p-1.5 text-[10px] bg-[#37373d] hover:bg-red-900/50 text-slate-400 hover:text-red-400 rounded flex items-center justify-center transition-colors"
                                                    title="Delete Version"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteVersion(ver.id);
                                                    }}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Save Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 modal-backdrop-premium">
                    <div className="w-full max-w-md bg-[#252526] border border-[#3c3c3c] rounded-xl shadow-2xl overflow-hidden modal-content-premium">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-white mb-2">Save New Version</h3>
                            <p className="text-sm text-slate-400 mb-4">
                                Briefly describe the changes you've made. This helps your team track the schema evolution.
                            </p>

                            <textarea
                                value={saveMessage}
                                onChange={(e) => setSaveMessage(e.target.value)}
                                placeholder="e.g., Added users table, fixed relationship... (max 100 chars)"
                                maxLength={100}
                                className="w-full h-24 bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg p-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                                autoFocus
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#2d2d2d] border-t border-[#3c3c3c]">
                            <button
                                onClick={() => setShowSaveModal(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleSave(saveMessage)}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-indigo-600/20"
                            >
                                {saving ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                Save Version
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Workspace Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 modal-backdrop-premium">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-red-100 dark:border-red-900/30 modal-content-premium">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-400">
                                <AlertTriangle size={32} />
                            </div>

                            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">
                                Delete Workspace?
                            </h2>

                            <p className="text-sm text-gray-500 dark:text-slate-400 mb-8 leading-relaxed">
                                You are about to permanently delete <span className="font-black text-red-500">"{workspace?.name}"</span>.
                                This action <span className="underline decoration-wavy decoration-red-500">cannot be undone</span>.
                                All versions, chat history, and team access will be lost forever.
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={handleDeleteWorkspace}
                                    disabled={isDeleting}
                                    className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black rounded-xl shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isDeleting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Trash2 className="w-5 h-5" />
                                    )}
                                    YES, PERMANENTLY DELETE
                                </button>

                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={isDeleting}
                                    className="w-full py-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 font-bold transition-colors"
                                >
                                    Cancel, keep it
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

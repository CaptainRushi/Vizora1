import { useCallback, useState, useEffect, useRef } from 'react';
import dagre from 'dagre';
import ReactFlow, {
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    ReactFlowProvider,
    useReactFlow,
    useKeyPress,
    XYPosition,
    BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
    Undo2,
    Redo2,
    Search,
    Layout,
    FileCode,
    Clock,
    RefreshCw,
    Copy,
    Check,
    Edit3,
    Plus,
    X,
    Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command as CommandPalette, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from 'cmdk';
import { useProject } from '../hooks/useProject';
import { ToolRail, CanvasTool } from '../components/schema-designer/ToolRail';
import { PropertiesPanel } from '../components/schema-designer/PropertiesPanel';
import { EdgePropertiesPanel } from '../components/schema-designer/EdgePropertiesPanel';
import { HistoryPanel } from '../components/schema-designer/HistoryPanel';
import { Cursor } from '../components/schema-designer/Cursor';
import { ContextMenu } from '../components/schema-designer/ContextMenu';
import { UnifiedSchema, UnifiedColumn } from '../lib/schema-types';
import { supabase } from '../lib/supabase';
import { generateSql } from '../lib/generators';
import { TableNode } from '../components/schema-designer/TableNode';
import { SchemaEdge } from '../components/schema-designer/SchemaEdge';
import { LoadingSection } from '../components/LoadingSection';

const nodeTypes = {
    table: TableNode,
};

const edgeTypes = {
    schema: SchemaEdge,
};

function SchemaDesignerContent() {
    const { projectId, loading: projectLoading } = useProject();
    const { fitView, getNodes, screenToFlowPosition, setViewport, getViewport } = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [schema, setSchema] = useState<UnifiedSchema>({ tables: {} });
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [presenceCursors, setPresenceCursors] = useState<Record<string, { x: number, y: number, initials: string, color: string }>>({});
    const [presenceChannel, setPresenceChannel] = useState<any>(null);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [activeTool, setActiveTool] = useState<CanvasTool>('select');
    const [showGrid, setShowGrid] = useState(true);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [isCodeViewerOpen, setIsCodeViewerOpen] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
    const [layoutRegistry, setLayoutRegistry] = useState<Record<string, { x: number; y: number }>>({});
    const [copied, setCopied] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: 'node' | 'pane', id?: string } | null>(null);
    const [history, setHistory] = useState<UnifiedSchema[]>([]);
    const [redoStack, setRedoStack] = useState<UnifiedSchema[]>([]);

    const mouseDownPos = useRef<{ x: number, y: number } | null>(null);
    const spacePressed = useKeyPress('Space');
    const isPanActive = activeTool === 'pan' || spacePressed;

    // --- REFINED SYNC LOGIC ---
    useEffect(() => {
        setEdges(eds => eds.map(edge => {
            const rel = schema.tables[edge.source]?.relations.find(r => r.from === edge.sourceHandle?.split('.')[1] && r.to === `${edge.target}.${edge.targetHandle?.split('.')[1]}`);

            let mStart: any = 'crowfoot-one';
            let mEnd: any = 'crowfoot-one';
            if (rel?.type === 'many_to_one') { mStart = 'crowfoot-many'; mEnd = 'crowfoot-one'; }
            else if (rel?.type === 'one_to_many') { mStart = 'crowfoot-one'; mEnd = 'crowfoot-many'; }
            else if (rel?.type === 'many_to_many') { mStart = 'crowfoot-many'; mEnd = 'crowfoot-many'; }

            return {
                ...edge,
                markerStart: mStart,
                markerEnd: mEnd,
                style: {
                    ...edge.style,
                    stroke: edge.id === selectedEdgeId ? '#4f46e5' : '#94a3b8',
                    strokeWidth: edge.id === selectedEdgeId ? 3 : 2
                }
            };
        }));
    }, [selectedEdgeId, schema, setEdges]);

    const addToHistory = useCallback((newSchema: UnifiedSchema) => {
        setHistory(prev => [...prev.slice(-19), schema]);
        setRedoStack([]);
        setSchema(newSchema);
    }, [schema]);

    const updateRelation = useCallback((sTable: string, rIdx: number, data: any) => {
        const next = JSON.parse(JSON.stringify(schema));
        next.tables[sTable].relations[rIdx] = data;
        addToHistory(next);
    }, [schema, addToHistory]);

    const undo = useCallback(() => {
        if (history.length === 0) return;
        const previous = history[history.length - 1];
        setRedoStack(prev => [...prev, schema]);
        setHistory(prev => prev.slice(0, -1));
        setSchema(previous);
    }, [history, schema]);

    const redo = useCallback(() => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        setHistory(prev => [...prev, schema]);
        setRedoStack(prev => prev.slice(0, -1));
        setSchema(next);
    }, [redoStack, schema]);

    const deleteTable = useCallback((tableName: string) => {
        const next = JSON.parse(JSON.stringify(schema));
        delete next.tables[tableName];
        addToHistory(next);
        if (selectedNodeId === tableName) setSelectedNodeId(null);
    }, [schema, addToHistory, selectedNodeId]);

    const updateTable = useCallback((oldName: string, newName: string) => {
        if (!newName || oldName === newName) return;
        const nextSchema = JSON.parse(JSON.stringify(schema));
        const tableData = nextSchema.tables[oldName];
        delete nextSchema.tables[oldName];
        nextSchema.tables[newName] = tableData;

        Object.values(nextSchema.tables).forEach((t: any) => {
            t.relations.forEach((r: any) => {
                if (r.to.startsWith(oldName + '.')) r.to = r.to.replace(oldName + '.', newName + '.');
            });
        });

        addToHistory(nextSchema);
        setLayoutRegistry(prev => {
            const next = { ...prev };
            if (next[oldName]) {
                next[newName] = next[oldName];
                delete next[oldName];
            }
            return next;
        });
        if (selectedNodeId === oldName) setSelectedNodeId(newName);
    }, [schema, addToHistory, selectedNodeId]);

    const updateColumnName = useCallback((tName: string, oldCol: string, newCol: string) => {
        if (!newCol || oldCol === newCol) return;
        const next = JSON.parse(JSON.stringify(schema));
        if (!next.tables[tName]) return;
        const colData = next.tables[tName].columns[oldCol];
        delete next.tables[tName].columns[oldCol];
        next.tables[tName].columns[newCol] = colData;

        Object.values(next.tables).forEach((t: any) => {
            t.relations.forEach((r: any) => {
                if (r.from === oldCol && tName === t.name) r.from = newCol;
                if (r.to === `${tName}.${oldCol}`) r.to = `${tName}.${newCol}`;
            });
        });

        addToHistory(next);
    }, [schema, addToHistory]);

    const onAddColumn = useCallback((tableName: string) => {
        const next = JSON.parse(JSON.stringify(schema));
        if (!next.tables[tableName]) return;
        const id = `col_${Date.now().toString().slice(-4)}`;
        next.tables[tableName].columns[id] = { type: 'varchar' };
        addToHistory(next);
    }, [schema, addToHistory]);



    useEffect(() => {
        const flowNodes = Object.entries(schema.tables).map(([name, table], idx) => {
            const pos = layoutRegistry[name] || { x: idx * 300, y: 100 };
            return {
                id: name,
                type: 'table',
                position: pos,
                data: {
                    label: name,
                    columns: table.columns,
                    onAddColumn,
                    onDeleteTable: deleteTable,
                    onUpdateTableName: updateTable,
                    onUpdateColumnName: updateColumnName
                },
                selected: name === selectedNodeId,
                draggable: activeTool === 'select'
            };
        });
        setNodes(flowNodes);
    }, [schema, layoutRegistry, onAddColumn, deleteTable, updateTable, updateColumnName, selectedNodeId, activeTool, setNodes]);

    useEffect(() => {
        if (!projectId) return;
        const channel = supabase.channel(`designer:${projectId}`, {
            config: { presence: { key: (Math.random() * 1000).toFixed(0) } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                setCollaborators(Object.values(state).flat());
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    setPresenceChannel(channel);
                    const { data: { user } } = await supabase.auth.getUser();
                    const initials = user?.email?.substring(0, 2).toUpperCase() || '??';
                    const color = `hsl(${Math.random() * 360}, 70%, 50%)`;
                    await channel.track({ user_id: user?.id, email: user?.email, initials, color });
                }
            });

        channel.on('broadcast', { event: 'cursor' }, ({ payload, from }) => {
            const collab = collaborators.find(c => c.presence_ref === from);
            setPresenceCursors(prev => ({
                ...prev,
                [from]: {
                    ...payload,
                    initials: collab?.initials || '??',
                    color: collab?.color || '#6366f1'
                }
            }));
        });

        return () => { channel.unsubscribe(); };
    }, [projectId, collaborators]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (presenceChannel && activeTool === 'select') {
            const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
            presenceChannel.send({ type: 'broadcast', event: 'cursor', payload: { x: flowPos.x, y: flowPos.y } });
        }
    }, [presenceChannel, screenToFlowPosition, activeTool]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (e.shiftKey) redo(); else undo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setIsSearchOpen(true); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    const loadSchema = useCallback(async () => {
        if (!projectId) return;
        try {
            const [dResult, vResult] = await Promise.all([
                supabase.from('diagram_states').select('diagram_json').eq('project_id', projectId).maybeSingle(),
                supabase.from('schema_versions').select('normalized_schema').eq('project_id', projectId).order('version', { ascending: false }).limit(1).maybeSingle()
            ]);

            if (dResult.data?.diagram_json) {
                const { nodes: savedNodes, edges: savedEdges } = dResult.data.diagram_json as any;
                const registry: Record<string, { x: number; y: number }> = {};
                if (savedNodes && Array.isArray(savedNodes)) {
                    savedNodes.forEach((n: any) => { if (n.id && n.position) registry[n.id] = n.position; });
                }
                setLayoutRegistry(registry);
                setEdges(savedEdges || []);
            }
            if (vResult.data) setSchema(vResult.data.normalized_schema as UnifiedSchema);
        } catch (err) { console.error("Designer Load Error", err); }
    }, [projectId, setEdges]);

    useEffect(() => { loadSchema(); }, [loadSchema]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (!projectId || nodes.length === 0) return;
            await supabase.from('diagram_states').upsert({
                project_id: projectId,
                diagram_json: { nodes: getNodes(), edges },
                updated_at: new Date().toISOString()
            }, { onConflict: 'project_id' });
        }, 5000);
        return () => clearTimeout(timer);
    }, [nodes, edges, projectId, getNodes]);

    const onConnect = useCallback((params: Connection) => {
        if (!params.source || !params.target || !params.sourceHandle || !params.targetHandle) return;
        const sCol = params.sourceHandle.split('.')[1];
        const tCol = params.targetHandle.split('.')[1];
        const nextSchema = JSON.parse(JSON.stringify(schema));
        nextSchema.tables[params.source].columns[sCol].foreign_key = `${params.target}.${tCol}`;
        nextSchema.tables[params.source].relations.push({ from: sCol, to: `${params.target}.${tCol}`, type: 'many_to_one' });
        addToHistory(nextSchema);
        setEdges(eds => addEdge({ ...params, type: 'schema', animated: true, style: { stroke: '#4f46e5', strokeWidth: 2 } }, eds));
    }, [schema, addToHistory, setEdges]);

    const onEdgesDelete = useCallback((deleted: any[]) => {
        const nextSchema = JSON.parse(JSON.stringify(schema));
        deleted.forEach(edge => {
            const table = nextSchema.tables[edge.source];
            if (table) {
                const sCol = edge.sourceHandle?.split('.')[1];
                if (sCol) {
                    table.relations = table.relations.filter((r: any) => !(r.from === sCol && r.to.startsWith(edge.target + '.')));
                    if (table.columns[sCol]) delete table.columns[sCol].foreign_key;
                }
            }
        });
        addToHistory(nextSchema);
    }, [schema, addToHistory]);

    const performAutoLayout = useCallback(() => {
        const dagreGraph = new dagre.graphlib.Graph();
        dagreGraph.setDefaultEdgeLabel(() => ({}));
        dagreGraph.setGraph({ rankdir: 'LR', nodesep: 80, ranksep: 120 });
        const currentNodes = getNodes();
        currentNodes.forEach((node) => dagreGraph.setNode(node.id, { width: 260, height: 200 }));
        edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
        dagre.layout(dagreGraph);
        const registry: Record<string, { x: number, y: number }> = {};
        const layoutedNodes = currentNodes.map((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            const pos = { x: nodeWithPosition.x - 130, y: nodeWithPosition.y - 100 };
            registry[node.id] = pos;
            return { ...node, position: pos };
        });
        setLayoutRegistry(registry);
        setNodes(layoutedNodes);
        setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 100);
    }, [edges, getNodes, setNodes, fitView]);

    const createTable = useCallback((pos: XYPosition) => {
        const name = `table_${Date.now().toString().slice(-4)}`;
        const nextSchema = JSON.parse(JSON.stringify(schema));
        nextSchema.tables[name] = { columns: { id: { type: 'uuid', primary: true } }, relations: [] };
        addToHistory(nextSchema);
        setLayoutRegistry(prev => ({ ...prev, [name]: pos }));
        setSelectedNodeId(name);
        setActiveTool('select');
    }, [schema, addToHistory]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => { mouseDownPos.current = { x: e.clientX, y: e.clientY }; }, []);
    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        if (!mouseDownPos.current) return;
        if (Math.abs(mouseDownPos.current.x - e.clientX) < 5 && Math.abs(mouseDownPos.current.y - e.clientY) < 5) {
            const target = e.target as HTMLElement;
            if (target.classList.contains('react-flow__pane')) {
                if (activeTool === 'add_table') createTable(screenToFlowPosition({ x: e.clientX, y: e.clientY }));
                else setSelectedNodeId(null);
            }
        }
        mouseDownPos.current = null;
    }, [activeTool, createTable, screenToFlowPosition]);

    if (projectLoading) {
        return (
            <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
                <LoadingSection title="Initalizing Designer..." subtitle="Preparing your visual schema workspace and collaborator sync." />
            </div>
        );
    }

    return (
        <div className="relative h-[calc(100vh-2rem)] w-full overflow-hidden bg-[#fafafa] font-sans">
            <div className="absolute top-6 left-6 z-40 flex items-center gap-4">
                <div className="bg-white/80 backdrop-blur-md border border-slate-200 px-4 py-2 rounded-2xl shadow-sm flex items-center gap-3">
                    <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-500 flex items-center justify-center text-[10px] font-black text-white">RB</div>
                    </div>
                    <div className="h-4 w-px bg-slate-200" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live Editor</span>
                </div>
            </div>

            <div className="absolute top-6 right-6 z-40 flex items-center gap-2">
                <div className="flex bg-white/80 backdrop-blur-md border border-slate-200 p-1.5 rounded-2xl shadow-sm">
                    <button onClick={undo} disabled={history.length === 0} className="p-2 hover:bg-slate-100 rounded-xl disabled:opacity-30 transition-colors"><Undo2 className="h-4 w-4 text-slate-600" /></button>
                    <button onClick={redo} disabled={redoStack.length === 0} className="p-2 hover:bg-slate-100 rounded-xl disabled:opacity-30 transition-colors"><Redo2 className="h-4 w-4 text-slate-600" /></button>
                </div>
                <div className="flex -space-x-2 mr-2">
                    {collaborators.map((c, i) => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-indigo-500 flex items-center justify-center text-[10px] font-black text-white shadow-sm ring-2 ring-transparent hover:ring-indigo-200 transition-all cursor-help" title={c.email}>
                            {c.initials}
                        </div>
                    ))}
                    {collaborators.length === 0 && <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-300 shadow-sm" />}
                </div>
                <button onClick={() => setIsSearchOpen(true)} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all group">
                    <Search className="h-4 w-4 text-slate-600 group-hover:scale-110 transition-transform" />
                </button>
                <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all font-black text-[10px] uppercase tracking-widest text-slate-600">
                    <Clock className="h-4 w-4" /> History
                </button>
                <button onClick={() => { setGeneratedCode(generateSql(schema as any)); setIsCodeViewerOpen(true); }} className="px-5 py-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all flex items-center gap-2">
                    <FileCode className="h-4 w-4" /> Export SQL
                </button>
            </div>

            <ToolRail
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                onAction={(a) => {
                    if (a === 'fit-view') fitView({ padding: 0.4, duration: 800 });
                    if (a === 'grid') setShowGrid(!showGrid);
                    if (a === 'snap') setSnapToGrid(!snapToGrid);
                    if (a === 'delete' && selectedNodeId) deleteTable(selectedNodeId);
                    if (a === 'auto-layout') performAutoLayout();
                }}
                isDarkMode={false}
                showGrid={showGrid}
                snapToGrid={snapToGrid}
            />

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                onEdgesDelete={onEdgesDelete}
                onEdgeClick={(_, edge) => { setSelectedEdgeId(edge.id); setSelectedNodeId(null); }}
                onNodeClick={(_, node) => { setSelectedNodeId(node.id); setSelectedEdgeId(null); }}
                onNodeContextMenu={(e, node) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'node', id: node.id }); }}
                onPaneContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, type: 'pane' }); }}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                panOnDrag={isPanActive}
                selectionOnDrag={activeTool === 'select' && !spacePressed}
                nodesDraggable={activeTool === 'select'}
                panOnScroll={true}
                zoomOnScroll={true}
                fitView
                snapToGrid={snapToGrid}
                snapGrid={[20, 20]}
                className="w-full h-full"
                onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
            >
                <svg style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0 }}>
                    <defs>
                        <marker id="crowfoot-many" markerWidth="15" markerHeight="15" refX="15" refY="7.5" orient="auto" markerUnits="userSpaceOnUse">
                            <path d="M 0 0 L 15 7.5 L 0 15 M 15 0 L 15 15" fill="none" stroke="#4f46e5" strokeWidth="2" />
                        </marker>
                        <marker id="crowfoot-one" markerWidth="15" markerHeight="15" refX="15" refY="7.5" orient="auto" markerUnits="userSpaceOnUse">
                            <path d="M 15 0 L 15 15" fill="none" stroke="#4f46e5" strokeWidth="2" />
                        </marker>
                    </defs>
                </svg>
                {showGrid && <Background variant={BackgroundVariant.Dots} color="#cbd5e1" gap={24} size={1} />}
                <Controls position="bottom-right" className="!bg-white !border-slate-200 !shadow-sm !rounded-xl overflow-hidden" />
                {Object.entries(presenceCursors).map(([id, pos]) => {
                    const viewport = getViewport();
                    const screenX = pos.x * viewport.zoom + viewport.x;
                    const screenY = pos.y * viewport.zoom + viewport.y;
                    return <Cursor key={id} x={screenX} y={screenY} label={pos.initials} color={pos.color} />;
                })}
            </ReactFlow>

            <AnimatePresence>
                {selectedNodeId && (
                    <PropertiesPanel
                        selectedNodeId={selectedNodeId}
                        schema={schema}
                        onUpdateTable={updateTable}
                        onAddColumn={onAddColumn}
                        onUpdateColumn={(t: string, o: string, n: string, d: UnifiedColumn) => {
                            const next = JSON.parse(JSON.stringify(schema));
                            delete next.tables[t].columns[o];
                            next.tables[t].columns[n] = d;
                            addToHistory(next);
                        }}
                        onDeleteColumn={(t: string, c: string) => {
                            const next = JSON.parse(JSON.stringify(schema));
                            delete next.tables[t].columns[c];
                            addToHistory(next);
                        }}
                        onDeleteTable={deleteTable}
                        onClose={() => setSelectedNodeId(null)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {selectedEdgeId && (
                    <EdgePropertiesPanel
                        edge={edges.find(e => e.id === selectedEdgeId)}
                        schema={schema}
                        onUpdateRelation={updateRelation}
                        onDelete={(id) => {
                            setEdges(eds => eds.filter(e => e.id !== id));
                            onEdgesDelete([edges.find(e => e.id === id)]);
                            setSelectedEdgeId(null);
                        }}
                        onClose={() => setSelectedEdgeId(null)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isHistoryOpen && (
                    <HistoryPanel
                        history={history}
                        currentSchema={schema}
                        onRestore={(s) => { addToHistory(s); setIsHistoryOpen(false); }}
                        onClose={() => setIsHistoryOpen(false)}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {contextMenu && (
                    <ContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        onClose={() => setContextMenu(null)}
                        items={contextMenu.type === 'node' ? [
                            { label: 'Add Column', icon: Plus, onClick: () => onAddColumn(contextMenu.id!) },
                            { label: 'Edit Properties', icon: Edit3, onClick: () => setSelectedNodeId(contextMenu.id!) },
                            {
                                label: 'Duplicate Table', icon: Copy, onClick: () => {
                                    const table = schema.tables[contextMenu.id!];
                                    const newName = `${contextMenu.id!}_copy`;
                                    const next = JSON.parse(JSON.stringify(schema));
                                    next.tables[newName] = JSON.parse(JSON.stringify(table));
                                    addToHistory(next);
                                }
                            },
                            { label: 'Delete Table', icon: Trash2, onClick: () => deleteTable(contextMenu.id!), variant: 'danger' },
                        ] : [
                            { label: 'Add New Table', icon: Plus, onClick: () => createTable(screenToFlowPosition({ x: contextMenu.x, y: contextMenu.y })) },
                            { label: 'Auto organize', icon: RefreshCw, onClick: () => performAutoLayout() },
                            { label: 'Zoom to fit', icon: Layout, onClick: () => fitView({ padding: 0.4, duration: 800 }) },
                        ]}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isSearchOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsSearchOpen(false)}>
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
                            <CommandPalette className="bg-white">
                                <span className="absolute top-4 left-4 h-5 w-5 pointer-events-none flex items-center justify-center"><Search className="h-5 w-5 text-slate-400" /></span>
                                <CommandInput placeholder="Search tables or run commands..." className="w-full h-14 pl-12 pr-4 border-none focus:ring-0 text-sm font-medium border-b border-slate-100" />
                                <CommandList className="max-h-[300px] overflow-y-auto p-2">
                                    <CommandEmpty className="p-4 text-center text-xs text-slate-400">No results found.</CommandEmpty>
                                    <CommandGroup heading="Tables" className="p-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {Object.keys(schema.tables).map(t => (
                                            <CommandItem key={t} onSelect={() => { setSelectedNodeId(t); setIsSearchOpen(false); const node = nodes.find(n => n.id === t); if (node) { const { x, y } = node.position; const v = getViewport(); setViewport({ x: -x * v.zoom + window.innerWidth / 2, y: -y * v.zoom + window.innerHeight / 2, zoom: v.zoom }, { duration: 800 }); } }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                                                <Layout className="h-4 w-4 text-indigo-500" /> <span className="text-sm font-bold text-slate-700">{t}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </CommandPalette>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isCodeViewerOpen && (
                    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6 md:p-12">
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[2rem] shadow-2xl w-full h-full max-w-5xl flex flex-col overflow-hidden border border-white/20">
                            <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                                <div className="flex items-center gap-6">
                                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100"><FileCode className="h-6 w-6 text-white" /></div>
                                    <div><h3 className="font-black text-slate-800 uppercase tracking-widest text-[11px]">Schema Export</h3><p className="text-xs text-slate-500 font-medium">Production-ready SQL DDL</p></div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => { navigator.clipboard.writeText(generatedCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${copied ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'}`}>
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy Code'}
                                    </button>
                                    <button className="p-2.5 bg-slate-100 text-slate-400 hover:text-slate-600 rounded-2xl transition-colors" onClick={() => setIsCodeViewerOpen(false)}><X className="h-5 w-5" /></button>
                                </div>
                            </div>
                            <div className="flex-1 bg-slate-900 p-8 overflow-auto font-mono text-[13px] leading-relaxed text-indigo-100 selection:bg-indigo-500 selection:text-white"><pre>{generatedCode}</pre></div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}

export function SchemaDesigner() {
    return (
        <ReactFlowProvider>
            <SchemaDesignerContent />
        </ReactFlowProvider>
    );
}

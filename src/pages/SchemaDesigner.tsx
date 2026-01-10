
import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
    Background,
    Controls,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    Node,
    Handle,
    Position,
    NodeProps,
    ReactFlowProvider,
    useReactFlow,
    MarkerType,
    useKeyPress,
    XYPosition,
    BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
    Save,
    RefreshCw,
    Key,
    MoreVertical,
    AlertCircle,
    Copy,
    Check
} from 'lucide-react';
import { useProject } from '../hooks/useProject';
import { ToolRail, CanvasTool } from '../components/schema-designer/ToolRail';
import { PropertiesPanel } from '../components/schema-designer/PropertiesPanel';
import { UnifiedSchema, UnifiedColumn, UnifiedTable } from '../lib/schema-types';
import { supabase } from '../lib/supabase';
import { generateSql, generatePrisma, generateDrizzle, type NormalizedSchema } from '../lib/generators';
import { api } from '../lib/api';
import { BillingGate } from '../components/BillingGate';


// --- CUSTOM NODE COMPONENT ---

const TableNode = ({ id, data, selected }: NodeProps) => {
    // data contains: label, columns, relationsCount, onColumnClick, isConnectable
    return (
        <div
            className={`bg-white rounded-lg shadow-sm min-w-[240px] border transition-shadow duration-200 
                ${selected ? 'ring-2 ring-indigo-500 border-indigo-500 shadow-xl' : 'border-slate-200 hover:shadow-md'}
            `}
        >
            {/* Header */}
            <div className={`px-4 py-3 border-b flex items-center justify-between rounded-t-lg
                ${selected ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-100'}
            `}>
                <span className="font-bold text-slate-900 text-sm tracking-tight">{data.label}</span>
                <MoreVertical className="h-4 w-4 text-slate-400" />
            </div>

            {/* Body */}
            <div className="py-2 bg-white flex flex-col">
                {Object.entries(data.columns as Record<string, UnifiedColumn>).map(([name, col]) => {
                    return (
                        <div
                            key={name}
                            onClick={(e) => {
                                e.stopPropagation();
                                data.onColumnClick?.(id, name);
                            }}
                            className={`
                                relative flex items-center justify-between px-4 py-2 hover:bg-slate-50 group/col text-xs transition-colors cursor-pointer
                            `}
                        >
                            <Handle
                                type="target"
                                position={Position.Left}
                                id={`${data.label}.${name}.target`}
                                isConnectable={data.isConnectable}
                                className={`w-3 h-3 border-2 border-white transition-all
                                    ${data.isConnectable ? '!bg-indigo-500 opacity-100' : '!bg-slate-300 opacity-0'}
                                `}
                                style={{ left: -6 }}
                            />

                            <div className="flex items-center gap-3 min-w-0 pr-4 w-full">
                                {col.primary && <Key className="h-3 w-3 text-amber-500 shrink-0" />}
                                <span className={`truncate font-medium ${col.primary ? 'text-slate-900' : 'text-slate-600'}`}>
                                    {name}
                                </span>
                                <div className="flex-1" />
                                <span className="text-[10px] text-slate-400 font-mono uppercase truncate">{col.type}</span>
                            </div>

                            <Handle
                                type="source"
                                position={Position.Right}
                                id={`${data.label}.${name}.source`}
                                isConnectable={data.isConnectable}
                                className={`w-3 h-3 border-2 border-white transition-all 
                                    ${data.isConnectable ? '!bg-indigo-500 opacity-100' : '!bg-indigo-400 opacity-0'}
                                `}
                                style={{ right: -6 }}
                            />
                        </div>
                    );
                })}
                {Object.keys(data.columns).length === 0 && (
                    <div className="px-4 py-2 text-[10px] text-slate-400 italic">No columns</div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex justify-between items-center rounded-b-lg">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    {data.relationsCount || 0} Relationships
                </span>
            </div>
        </div>
    );
};

const nodeTypes = {
    table: TableNode,
};

function SchemaDesignerContent() {
    const { projectId } = useProject();
    const { fitView, project, getNodes, screenToFlowPosition } = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [schema, setSchema] = useState<UnifiedSchema>({ tables: {} });
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // --- 1. SINGLE TOOL STATE ---
    const [activeTool, setActiveTool] = useState<CanvasTool>('select');

    // Relation Draft removed in favor of Drag & Drop

    // Utils
    const [isSaving, setIsSaving] = useState(false);
    const [showGrid, setShowGrid] = useState(true);
    const [snapToGrid, setSnapToGrid] = useState(true);
    const [isCodeViewerOpen, setIsCodeViewerOpen] = useState(false);
    const [generatedCode, setGeneratedCode] = useState('');
    const [exportFormat] = useState<'sql' | 'prisma' | 'drizzle'>('sql');
    const [layoutRegistry, setLayoutRegistry] = useState<Record<string, { x: number; y: number }>>({});
    const [billing, setBilling] = useState<any>(null);
    const [billingLoading, setBillingLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    // Mouse Tracking
    const mouseDownPos = useRef<{ x: number, y: number } | null>(null);

    // Pan Logic
    const spacePressed = useKeyPress('Space');
    const isPanActive = activeTool === 'pan' || spacePressed;

    // --- CURSOR MAPPING ---
    const cursor = useMemo(() => {
        if (activeTool === 'pan' || spacePressed) return 'grab';
        if (activeTool === 'add_relation') return 'crosshair';
        if (activeTool === 'add_table') return 'crosshair';
        if (activeTool === 'add_column') return 'copy';
        return 'default';
    }, [activeTool, spacePressed]);

    // --- LOAD SCHEMA ---
    // CRITICAL: ACTIVE VERSION ONLY RULE
    // This function ALWAYS loads ONLY the latest schema version.
    // Previous versions exist in history but are NEVER displayed by default.
    // This prevents confusion, stale visuals, and mixed schemas.
    const loadSchema = useCallback(async () => {
        if (!projectId) return;
        try {
            // Optimization: Fetch all initial designer data in parallel 
            // This reduces initial load time by eliminating sequential round-trips
            const [dResult, vResult, bResult] = await Promise.all([
                supabase.from('diagram_states')
                    .select('diagram_json')
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
                supabase.from('schema_versions')
                    .select('normalized_schema')
                    .eq('project_id', projectId)
                    .order('version', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
                api.getBilling(projectId)
            ]);

            const { data: dData } = dResult;
            const { data: vData } = vResult;

            // Handle Diagram State
            const registry: Record<string, { x: number; y: number }> = {};
            if (dData && dData.diagram_json) {
                const { nodes: savedNodes } = dData.diagram_json as any;
                if (savedNodes && Array.isArray(savedNodes)) {
                    savedNodes.forEach((n: any) => { if (n.id && n.position) registry[n.id] = n.position; });
                }
                setLayoutRegistry(registry);
                if (dData.diagram_json.edges) setEdges(dData.diagram_json.edges);
            }

            // Handle Normalized Schema
            if (vData) setSchema(vData.normalized_schema as UnifiedSchema);

            // Handle Billing Info
            if (bResult) setBilling(bResult);

        } catch (err) {
            console.error("Designer Parallel Load Error", err);
        } finally {
            setBillingLoading(false);
        }
    }, [projectId, setEdges]);

    useEffect(() => {
        if (projectId) {
            loadSchema();
        } else {
            setBillingLoading(false);
        }
    }, [loadSchema, projectId]);

    // --- ACTION HANDLERS ---

    // NATIVE CONNECTION HANDLER
    const onConnect = useCallback((params: Connection) => {
        // params: source, sourceHandle, target, targetHandle
        if (!params.source || !params.target || !params.sourceHandle || !params.targetHandle) return;

        const sourceId = params.source;
        const targetId = params.target;

        // Handle ID format: "TableName.ColumnName.source"
        const sourceCol = params.sourceHandle.split('.')[1];
        const targetCol = params.targetHandle.split('.')[1];

        if (sourceId === targetId && sourceCol === targetCol) return;

        // Validate Duplicate
        const edgeId = `e-${sourceId}.${sourceCol}-${targetId}.${targetCol}`;
        if (edges.some(e => e.id === edgeId)) {
            console.warn('Relation already exists');
            setActiveTool('select');
            return;
        }

        const newEdge = {
            ...params,
            id: edgeId,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
        };
        setEdges(eds => addEdge(newEdge, eds));

        setSchema(prev => {
            const newTables = { ...prev.tables };
            const sourceTable = newTables[sourceId];
            if (sourceTable) {
                const newCols = { ...sourceTable.columns };
                if (newCols[sourceCol]) {
                    newCols[sourceCol] = { ...newCols[sourceCol], foreign_key: `${targetId}.${targetCol}` };
                }
                newTables[sourceId] = {
                    ...sourceTable,
                    columns: newCols,
                    relations: [
                        ...sourceTable.relations,
                        {
                            from: sourceCol,
                            to: `${targetId}.${targetCol}`,
                            type: 'many_to_one'
                        }
                    ]
                };
            }
            return { ...prev, tables: newTables };
        });

        setActiveTool('select');
    }, [edges, setEdges]);

    const createTable = useCallback((position: XYPosition) => {
        console.log('Creating Table at:', position);
        const name = `table_${Date.now()}`;
        const newTable: UnifiedTable = {
            columns: { id: { type: 'uuid', primary: true, nullable: false, unique: true } },
            relations: []
        };
        setSchema(prev => ({ ...prev, tables: { ...prev.tables, [name]: newTable } }));
        setLayoutRegistry(prev => ({ ...prev, [name]: position }));

        setActiveTool('select');
        setSelectedNodeId(name);
    }, []);


    // --- EVENT MODEL IMPLEMENTATION ---

    const isClick = (start: { x: number, y: number }, end: { x: number, y: number }) => {
        const dx = Math.abs(start.x - end.x);
        const dy = Math.abs(start.y - end.y);
        return dx < 5 && dy < 5;
    };

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        mouseDownPos.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseMove = useCallback((_: React.MouseEvent) => {
        // We could implement "Virtual Relation Wire" here if needed
    }, []);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        const upPos = { x: e.clientX, y: e.clientY };

        // Ensure we had a down event
        if (!mouseDownPos.current) return;

        if (isClick(mouseDownPos.current, upPos)) {
            const target = e.target as HTMLElement;
            const isPane = target.classList.contains('react-flow__pane');

            if (isPane && activeTool === 'add_table') {
                const flowPos = screenToFlowPosition ? screenToFlowPosition(upPos) : project(upPos);
                createTable(flowPos);
            }
            else if (isPane && activeTool === 'select') {
                setSelectedNodeId(null);
            }
        }
        mouseDownPos.current = null;
    }, [activeTool, createTable, screenToFlowPosition, project]);


    // Columns Click Handler (Click Only)
    const handleColumnClick = useCallback((nodeId: string, _: string) => {
        // Pure selection logic, relation logic moved to Drag & Drop
        if (activeTool === 'select') {
            setSelectedNodeId(nodeId);
        }
    }, [activeTool]);


    // Properties Panel Helpers
    const addColumn = useCallback((tName: string) => {
        const colName = `col_${Date.now().toString().slice(-4)}`;
        setSchema(prev => {
            if (!prev.tables[tName]) return prev;
            const table = prev.tables[tName];
            const newCols = { ...table.columns, [colName]: { type: 'text' } as UnifiedColumn };
            return { ...prev, tables: { ...prev.tables, [tName]: { ...table, columns: newCols } } };
        });
    }, []);

    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        if (activeTool === 'add_column') {
            addColumn(node.id);
            setActiveTool('select');
            return;
        }
        if (activeTool === 'select') {
            setSelectedNodeId(node.id);
        }
    }, [activeTool, addColumn]);

    // --- SYNC NODES ---
    // Pass isConnectable to Nodes
    useEffect(() => {
        setNodes((prevNodes) => {
            const nodeMap = new Map(prevNodes.map(n => [n.id, n]));

            return Object.entries(schema.tables).map(([name, table], index) => {
                const existing = nodeMap.get(name);
                const position = existing?.position || layoutRegistry[name] || { x: index * 350 + 50, y: 100 };

                return {
                    id: name,
                    type: 'table',
                    position,
                    data: {
                        label: name,
                        columns: table.columns,
                        relationsCount: table.relations.length,
                        onColumnClick: handleColumnClick,
                        isConnectable: activeTool === 'add_relation' // Only connectable if tool active
                    },
                    selected: name === selectedNodeId,
                    draggable: activeTool === 'select'
                };
            });
        });
    }, [schema, layoutRegistry, selectedNodeId, handleColumnClick, activeTool, setNodes]);

    // ... Update functions ...
    const updateTable = useCallback((oldName: string, newName: string) => {
        if (oldName === newName) return;
        setSchema(prev => {
            const tables = { ...prev.tables };
            if (!tables[oldName]) return prev;
            const tableData = tables[oldName];
            delete tables[oldName];
            tables[newName] = tableData;
            return { ...prev, tables };
        });
        setLayoutRegistry(prev => {
            const val = prev[oldName];
            const newReg = { ...prev };
            if (val) { delete newReg[oldName]; newReg[newName] = val; }
            return newReg;
        });
        setSelectedNodeId(newName);
    }, []);

    const updateColumn = useCallback((tName: string, oldCol: string, newCol: string, colData: UnifiedColumn) => {
        setSchema(prev => {
            const table = prev.tables[tName];
            if (!table) return prev;
            const newCols = { ...table.columns };
            if (oldCol !== newCol) delete newCols[oldCol];
            newCols[newCol] = colData;
            return { ...prev, tables: { ...prev.tables, [tName]: { ...table, columns: newCols } } };
        });
    }, []);

    const deleteColumn = useCallback((tName: string, cName: string) => {
        setSchema(prev => {
            const table = prev.tables[tName];
            if (!table) return prev;
            const newCols = { ...table.columns };
            delete newCols[cName];
            return { ...prev, tables: { ...prev.tables, [tName]: { ...table, columns: newCols } } };
        });
    }, []);

    const deleteTable = useCallback((tName: string) => {
        setSchema(prev => {
            const t = { ...prev.tables };
            delete t[tName];
            return { ...prev, tables: t };
        });
        setSelectedNodeId(null);
    }, []);

    const saveAndGenerate = async () => {
        setIsSaving(true);
        try {
            let versionNum = 1;
            if (projectId) {
                const { data: lv } = await supabase.from('schema_versions').select('version').eq('project_id', projectId).order('version', { ascending: false }).limit(1).maybeSingle();
                versionNum = (lv?.version || 0) + 1;
                await supabase.from('diagram_states').insert({ project_id: projectId, version_number: versionNum, diagram_json: { nodes: getNodes(), edges } });
                await supabase.from('schema_versions').update({ normalized_schema: schema }).eq('project_id', projectId);
            }
            const normalized: NormalizedSchema = schema as NormalizedSchema;
            let code = '';
            if (exportFormat === 'sql') code = generateSql(normalized);
            else if (exportFormat === 'prisma') code = generatePrisma(normalized);
            else if (exportFormat === 'drizzle') code = generateDrizzle(normalized);
            setGeneratedCode(code);
            setIsCodeViewerOpen(true);
        } catch (e) { console.error(e); }
        finally { setIsSaving(false); }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (billingLoading) return null;

    if (billing && !billing.plan.designer_enabled) {
        return (
            <div className="h-[calc(100vh-8rem)] flex items-center justify-center p-12 overflow-hidden">
                <BillingGate
                    featureName="Schema Designer & SQL Generator"
                    description="The visual designer allows you to build schemas graphically and instantly generate SQL, Prisma, or Drizzle code. Unlock Pro to enable."
                />
            </div>
        );
    }

    return (
        <div className="relative h-[calc(100vh-2rem)] w-full overflow-hidden bg-[#fafafa]">
            <ToolRail
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                onAction={(a) => {
                    if (a === 'fit-view') fitView({ padding: 0.4 });
                    if (a === 'grid') setShowGrid(!showGrid);
                    if (a === 'snap') setSnapToGrid(!snapToGrid);
                    if (a === 'delete' && selectedNodeId) deleteTable(selectedNodeId);
                }}
                isDarkMode={false}
                showGrid={showGrid}
                snapToGrid={snapToGrid}
            />

            <div
                className="w-full h-full relative"
                style={{ cursor }}
            >
                <div className={`absolute top-4 z-30 flex gap-2 transition-all duration-300 ${selectedNodeId ? 'right-[380px]' : 'right-6'}`}>
                    <button
                        onClick={saveAndGenerate}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        {isSaving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        {projectId ? 'Save & Gen' : 'Generate Code'}
                    </button>
                    {!projectId && (
                        <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg text-[10px] font-black text-amber-700 uppercase flex items-center gap-2">
                            <AlertCircle className="h-3 w-3" />
                            Sandbox Mode: Select a project to save
                        </div>
                    )}
                </div>

                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    // Mouse Events
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    onNodeClick={onNodeClick}

                    // Controlled Interactions
                    panOnDrag={isPanActive}
                    selectionOnDrag={activeTool === 'select' && !spacePressed}
                    nodesDraggable={activeTool === 'select'}
                    panOnScroll={true}
                    zoomOnScroll={true}

                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.4 }}
                    snapToGrid={snapToGrid}
                    snapGrid={[20, 20]}
                    minZoom={0.1}
                    maxZoom={4}
                    proOptions={{ hideAttribution: true }}
                    className="w-full h-full"
                >
                    {showGrid && <Background variant={BackgroundVariant.Dots} color="#cbd5e1" gap={20} size={2} />}
                    <Controls position="bottom-left" showInteractive={false} />
                </ReactFlow>
            </div>

            {selectedNodeId && (
                <PropertiesPanel
                    selectedNodeId={selectedNodeId}
                    schema={schema}
                    onUpdateTable={updateTable}
                    onAddColumn={addColumn}
                    onUpdateColumn={updateColumn}
                    onDeleteColumn={deleteColumn}
                    onDeleteTable={deleteTable}
                    onClose={() => setSelectedNodeId(null)}
                />
            )}

            {isCodeViewerOpen && (
                <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-20 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-4xl flex flex-col overflow-hidden animate-in zoom-in-95">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-4">
                                <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs">Generated {exportFormat}</h3>
                                <button
                                    onClick={handleCopy}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${copied ? 'bg-green-100 text-green-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                    {copied ? 'Copied' : 'Copy Code'}
                                </button>
                            </div>
                            <button className="text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setIsCodeViewerOpen(false)}>
                                <span className="text-2xl font-light">&times;</span>
                            </button>
                        </div>
                        <pre className="flex-1 p-6 overflow-auto font-mono text-xs bg-slate-900 text-indigo-100">{generatedCode}</pre>
                    </div>
                </div>
            )}
        </div>
    );
}

export function SchemaDesigner() {
    return (
        <ReactFlowProvider>
            <SchemaDesignerContent />
        </ReactFlowProvider>
    );
}

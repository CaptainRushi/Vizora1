
import { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Handle,
    Position,
    NodeProps,
    ReactFlowProvider,
    useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Download, Sun, Moon, Maximize, Eye, EyeOff, Share2, RefreshCw, Key } from 'lucide-react';
import { useProject } from '../hooks/useProject';
import { MacDots } from '../components/MacDots';
import { supabase } from '../lib/supabase';

// --- CUSTOM COMPONENTS ---

const TableNode = ({ data }: NodeProps) => {
    return (
        <div className="bg-white border-2 border-slate-200 rounded-xl shadow-md min-w-[200px] overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm tracking-tight">{data.label}</span>
            </div>
            <div className="py-2">
                {Object.entries(data.columns as any || {}).map(([name, col]: [string, any]) => (
                    <div key={name} className="relative flex items-center justify-between px-4 py-1.5 text-xs">
                        <Handle
                            type="target"
                            position={Position.Left}
                            id={`${data.label}.${name}.target`}
                            className="w-1.5 h-1.5 !bg-slate-300 border-white"
                        />

                        <div className="flex items-center gap-2 min-w-0 pr-4">
                            {col.primary && <Key className="h-3 w-3 text-amber-500 shrink-0" />}
                            <span className={`truncate font-medium ${col.primary ? 'text-slate-900' : 'text-slate-600'}`}>{name}</span>
                            <span className="text-[10px] text-slate-400 font-mono uppercase truncate">{col.type}</span>
                        </div>

                        <Handle
                            type="source"
                            position={Position.Right}
                            id={`${data.label}.${name}.source`}
                            className="w-1.5 h-1.5 !bg-indigo-400 border-white"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

const nodeTypes = {
    table: TableNode,
};

function ERDiagramsContent() {
    const { projectId } = useProject();
    const { fitView } = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [showLabels, setShowLabels] = useState(true);

    // CRITICAL: ACTIVE VERSION ONLY RULE
    // This function ALWAYS loads ONLY the latest schema version.
    // Previous versions exist in history but are NEVER displayed by default.
    // New paste = new truth. Old diagram disappears. History remains.
    const loadDiagram = useCallback(async () => {
        if (!projectId) return;
        setLoading(true);

        // IMPORTANT: Clear existing diagram first to prevent stale data
        setNodes([]);
        setEdges([]);

        try {
            // 1. Try to fetch the saved diagram layout (LATEST ONLY)
            const { data: dData } = await supabase
                .from('diagram_states')
                .select('diagram_json')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })
                .limit(1) // CRITICAL: Only latest diagram state
                .maybeSingle();

            if (dData && dData.diagram_json) {
                const { nodes: savedNodes, edges: savedEdges } = dData.diagram_json as any;
                if (savedNodes) setNodes(savedNodes);
                if (savedEdges) setEdges(savedEdges);
                setLoading(false);
                return;
            }

            // 2. Fallback: Generate from latest normalized schema (LATEST ONLY)
            const { data: vData } = await supabase
                .from('schema_versions')
                .select('normalized_schema')
                .eq('project_id', projectId)
                .order('version', { ascending: false })
                .limit(1) // CRITICAL: Only latest schema version
                .maybeSingle();

            if (vData) {
                const schema = vData.normalized_schema as any;

                // Generate nodes
                const flowNodes = Object.entries(schema.tables).map(([name, table]: [string, any], i: number) => ({
                    id: name,
                    type: 'table',
                    position: { x: i * 250 + 50, y: 100 },
                    data: {
                        label: name,
                        columns: table.columns
                    }
                }));

                // Generate edges from relations
                const flowEdges: any[] = [];
                Object.entries(schema.tables).forEach(([_, table]: [string, any]) => {
                    if (table.relations && Array.isArray(table.relations)) {
                        table.relations.forEach((rel: any) => {
                            // Only create edge for many_to_one to avoid duplicates
                            if (rel.type === 'many_to_one' && rel.from && rel.to) {
                                const [fromTable, fromCol] = rel.from.split('.');
                                const [toTable, toCol] = rel.to.split('.');

                                if (fromTable && toTable && fromCol && toCol) {
                                    flowEdges.push({
                                        id: `${rel.from}-${rel.to}`,
                                        source: fromTable,
                                        target: toTable,
                                        sourceHandle: `${fromTable}.${fromCol}.source`,
                                        targetHandle: `${toTable}.${toCol}.target`,
                                        type: 'smoothstep',
                                        animated: true,
                                        style: { stroke: '#6366f1', strokeWidth: 2 },
                                        label: fromCol,
                                        labelStyle: { fontSize: 10, fill: '#64748b' }
                                    });
                                }
                            }
                        });
                    }
                });

                setNodes(flowNodes);
                setEdges(flowEdges);
            }
        } catch (err) {
            console.error("Failed to load diagram:", err);
        } finally {
            setLoading(false);
        }
    }, [projectId, setNodes, setEdges]);

    // Auto-load diagram on mount and when projectId changes
    // This ensures fresh data every time user navigates to this page
    useEffect(() => {
        loadDiagram();
    }, [loadDiagram]);

    return (
        <div className={`h-[calc(100vh-8rem)] relative ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'} border border-slate-200 rounded-3xl overflow-hidden transition-colors duration-300 font-sans`}>
            <div className="absolute top-4 left-20 z-10 flex gap-2 items-center">
                <div className="bg-white/80 backdrop-blur-md border border-slate-200 px-4 py-2 rounded-xl shadow-sm text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Share2 className="h-3.5 w-3.5" />
                    Read-Only ER Diagram
                </div>
                <button
                    onClick={loadDiagram}
                    disabled={loading}
                    className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
                >
                    <RefreshCw className={`h-4 w-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
            >
                <Background color={isDarkMode ? '#334155' : '#cbd5e1'} gap={24} />
                <Controls />
                <MiniMap />
            </ReactFlow>

            {/* Mac-style Three Dots - Top Left */}
            <div className="absolute top-4 left-4 z-[20]">
                <MacDots
                    type="diagram"
                    actions={[
                        { label: 'Fit to Screen', onClick: () => fitView(), icon: <Maximize className="h-4 w-4" /> },
                        { label: showLabels ? 'Hide Labels' : 'Show Labels', onClick: () => setShowLabels(!showLabels), icon: showLabels ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" /> },
                        { label: isDarkMode ? 'Switch to Light' : 'Switch to Dark', onClick: () => setIsDarkMode(!isDarkMode), icon: isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" /> },
                        { label: 'Export Diagram (PNG)', onClick: () => alert('Exporting diagram...'), icon: <Download className="h-4 w-4" /> },
                        { label: 'Reset Zoom', onClick: () => fitView({ duration: 800 }), icon: <RefreshCw className="h-4 w-4" /> },
                    ]}
                />
            </div>
        </div>
    );
}

export function ERDiagrams() {
    return (
        <ReactFlowProvider>
            <ERDiagramsContent />
        </ReactFlowProvider>
    );
}

// Explicit default export for better module resolution
export default ERDiagrams;

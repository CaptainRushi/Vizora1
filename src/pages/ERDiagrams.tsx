
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
import { Download, Sun, Moon, Maximize, Eye, EyeOff, Share2, RefreshCw, Key, Link as LinkIcon, Info } from 'lucide-react';
import dagre from 'dagre';
import { useProjectContext } from '../context/ProjectContext';
import { MacDots } from '../components/MacDots';
import { LoadingSection } from '../components/LoadingSection';
import { supabase } from '../lib/supabase';
import { FeedbackNudge } from '../components/beta/FeedbackNudge';

// --- CUSTOM COMPONENTS ---

const TableNode = ({ data, selected }: NodeProps) => {
    return (
        <div className={`bg-white border-2 ${selected ? 'border-indigo-500 ring-4 ring-indigo-50' : 'border-slate-200'} rounded-xl shadow-lg min-w-[220px] overflow-hidden transition-all duration-200`}>
            {/* Header */}
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="font-black text-slate-800 text-xs uppercase tracking-tight">{data.label}</span>
                </div>
                {data.isHovered && <Info className="h-3 w-3 text-indigo-400 animate-pulse" />}
            </div>

            {/* Columns */}
            <div className="py-2">
                {Object.entries(data.columns as any || {}).map(([name, col]: [string, any]) => (
                    <div
                        key={name}
                        onMouseEnter={() => data.onColumnMouseEnter?.(name)}
                        onMouseLeave={() => data.onColumnMouseLeave?.()}
                        className={`relative flex items-center justify-between px-4 py-2 text-[11px] transition-colors group/row ${data.hoveredColumn === name ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                            }`}
                    >
                        <Handle
                            type="target"
                            position={Position.Left}
                            id={`${data.label}.${name}.target`}
                            className={`w-2 h-2 !bg-slate-300 border-2 border-white transition-transform ${data.hoveredColumn === name ? 'scale-125 !bg-indigo-500' : ''
                                }`}
                        />

                        <div className="flex items-center gap-2 min-w-0 pr-4 flex-1">
                            {col.primary ? (
                                <Key className="h-3 w-3 text-amber-500 shrink-0" />
                            ) : col.references ? (
                                <LinkIcon className="h-3 w-3 text-indigo-400 shrink-0" />
                            ) : (
                                <div className="w-3" />
                            )}
                            <span className={`truncate font-bold ${col.primary ? 'text-slate-900' : 'text-slate-600'}`}>{name}</span>
                            <span className="text-[9px] text-slate-400 font-mono uppercase truncate ml-auto italic opacity-60">{col.type}</span>
                        </div>

                        <Handle
                            type="source"
                            position={Position.Right}
                            id={`${data.label}.${name}.source`}
                            className={`w-2 h-2 !bg-indigo-400 border-2 border-white transition-transform ${data.hoveredColumn === name ? 'scale-125 !bg-indigo-600' : ''
                                }`}
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

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 240;
const nodeHeight = 300; // Average height, will be dynamic if possible

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 120 });

    nodes.forEach((node) => {
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    nodes.forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        node.targetPosition = isHorizontal ? Position.Left : Position.Top;
        node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

        // We are shifting the dagre node position (which is center-based) to top-left
        node.position = {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
        };

        return node;
    });

    return { nodes, edges };
};

const ERDiagramsContent = () => {
    const { projectId, billing } = useProjectContext();
    const { fitView, getEdges } = useReactFlow();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [showLabels, setShowLabels] = useState(true);

    // Handle Column Hover
    const onColumnMouseEnter = useCallback((tableName: string, columnName: string) => {
        setEdges((eds) => eds.map((edge) => {
            const isRelevant = (edge.source === tableName && edge.data?.fromCol === columnName) ||
                (edge.target === tableName && edge.data?.toCol === columnName);

            return {
                ...edge,
                animated: isRelevant,
                style: {
                    ...edge.style,
                    stroke: isRelevant ? '#4f46e5' : '#cbd5e1',
                    strokeWidth: isRelevant ? 4 : 1,
                    opacity: isRelevant ? 1 : 0.05
                }
            };
        }));

        const currentEdges = getEdges(); // Safe access without dependency

        setNodes((nds) => nds.map((n) => {
            if (n.id === tableName) {
                return { ...n, data: { ...n.data, hoveredColumn: columnName } };
            }
            // Also highlight the target/source table's column if it's a direct link
            const connectedEdge = currentEdges.find(e =>
                (e.source === tableName && e.data?.fromCol === columnName && e.target === n.id) ||
                (e.target === tableName && e.data?.toCol === columnName && e.source === n.id)
            );

            if (connectedEdge) {
                const targetCol = connectedEdge.source === n.id ? connectedEdge.data?.fromCol : connectedEdge.data?.toCol;
                return { ...n, data: { ...n.data, hoveredColumn: targetCol } };
            }

            return n;
        }));
    }, [setEdges, setNodes, getEdges]); // Removed 'edges' dependency

    const onColumnMouseLeave = useCallback(() => {
        setEdges((eds) => eds.map((edge) => ({
            ...edge,
            animated: true,
            style: {
                ...edge.style,
                stroke: '#4f46e5',
                strokeWidth: 2,
                opacity: 0.6
            }
        })));

        setNodes((nds) => nds.map((n) => ({
            ...n,
            data: { ...n.data, isHovered: false, hoveredColumn: null }
        })));
    }, [setEdges, setNodes]);

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
            // Parallel fetch both the saved layout and the raw schema to minimize latency
            const [layoutResponse, schemaResponse] = await Promise.all([
                supabase
                    .from('diagram_states')
                    .select('diagram_json')
                    .eq('project_id', projectId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle(),
                supabase
                    .from('schema_versions')
                    .select('normalized_schema')
                    .eq('project_id', projectId)
                    .order('version', { ascending: false })
                    .limit(1)
                    .maybeSingle()
            ]);

            const dData = layoutResponse.data;
            const vData = schemaResponse.data;

            if (dData && dData.diagram_json) {
                const { nodes: savedNodes, edges: savedEdges } = dData.diagram_json as any;
                // Inject handlers into saved nodes
                const nodesWithHandlers = savedNodes.map((n: any) => ({
                    ...n,
                    data: {
                        ...n.data,
                        onColumnMouseEnter: (col: string) => onColumnMouseEnter(n.id, col),
                        onColumnMouseLeave
                    }
                }));
                setNodes(nodesWithHandlers);
                setEdges(savedEdges);
                setLoading(false);
                setTimeout(() => fitView({ duration: 800 }), 100);
                return;
            }

            if (vData) {
                const schema = vData.normalized_schema as any;

                // Generate nodes
                const initialNodes = Object.entries(schema.tables).map(([name, table]: [string, any]) => ({
                    id: name,
                    type: 'table',
                    position: { x: 0, y: 0 }, // Will be set by dagre
                    data: {
                        label: name,
                        columns: table.columns,
                        onColumnMouseEnter: (col: string) => onColumnMouseEnter(name, col),
                        onColumnMouseLeave
                    }
                }));

                // Generate edges from relations
                const initialEdges: any[] = [];
                Object.entries(schema.tables).forEach(([_, table]: [string, any]) => {
                    if (table.relations && Array.isArray(table.relations)) {
                        table.relations.forEach((rel: any) => {
                            // Only create edge for many_to_one to avoid duplicates
                            if (rel.type === 'many_to_one' && rel.from && rel.to) {
                                const [fromTable, fromCol] = rel.from.split('.');
                                const [toTable, toCol] = rel.to.split('.');

                                if (fromTable && toTable && fromCol && toCol) {
                                    initialEdges.push({
                                        id: `${rel.from}-${rel.to}`,
                                        source: fromTable,
                                        target: toTable,
                                        sourceHandle: `${fromTable}.${fromCol}.source`,
                                        targetHandle: `${toTable}.${toCol}.target`,
                                        type: 'smoothstep',
                                        animated: true,
                                        style: { stroke: '#4f46e5', strokeWidth: 2, opacity: 0.6 },
                                        interactionWidth: 20,
                                        label: showLabels ? fromCol : '',
                                        labelStyle: { fontSize: 10, fill: '#6366f1', fontWeight: 'bold' },
                                        data: { fromCol, toCol } // Column level info
                                    });
                                }
                            }
                        });
                    }
                });

                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);

                setNodes([...layoutedNodes]);
                setEdges([...layoutedEdges]);
                setTimeout(() => fitView({ duration: 800 }), 100);
            }
        } catch (err) {
            console.error("Failed to load diagram:", err);
        } finally {
            setLoading(false);
        }
    }, [projectId, setNodes, setEdges, showLabels, fitView, onColumnMouseEnter, onColumnMouseLeave]);

    // Handle Hover Interaction
    const onNodeMouseEnter = useCallback((_: any, node: any) => {
        // 1. Highlight connected edges
        setEdges((eds) => eds.map((edge) => {
            const isConnected = edge.source === node.id || edge.target === node.id;
            return {
                ...edge,
                animated: isConnected,
                style: {
                    ...edge.style,
                    stroke: isConnected ? '#4f46e5' : '#cbd5e1',
                    strokeWidth: isConnected ? 3 : 1,
                    opacity: isConnected ? 1 : 0.1
                }
            };
        }));

        // 2. Highlight the node itself and dim others
        setNodes((nds) => nds.map((n) => ({
            ...n,
            data: { ...n.data, isHovered: n.id === node.id }
        })));
    }, [setEdges, setNodes]);

    const onNodeMouseLeave = useCallback(() => {
        setEdges((eds) => eds.map((edge) => ({
            ...edge,
            animated: true,
            style: {
                ...edge.style,
                stroke: '#4f46e5',
                strokeWidth: 2,
                opacity: 0.6
            }
        })));

        setNodes((nds) => nds.map((n) => ({
            ...n,
            data: { ...n.data, isHovered: false }
        })));
    }, [setEdges, setNodes]);

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
                onNodeMouseEnter={onNodeMouseEnter}
                onNodeMouseLeave={onNodeMouseLeave}
                nodeTypes={nodeTypes}
                snapToGrid
                snapGrid={[20, 20]}
                fitView
            >
                <Background color={isDarkMode ? '#334155' : '#cbd5e1'} gap={24} />
                <Controls />
                <MiniMap />
            </ReactFlow>

            {loading && (
                <div className="absolute inset-0 z-[100] bg-white/50 backdrop-blur-sm flex items-center justify-center">
                    <LoadingSection title="Visualizing Blueprint..." subtitle="Generating graph nodes and relationships." variant="full" />
                </div>
            )}

            {/* Mac-style Three Dots - Top Left */}
            <div className="absolute top-4 left-4 z-[20]">
                <MacDots
                    type="diagram"
                    actions={[
                        { label: 'Fit to Screen', onClick: () => fitView(), icon: <Maximize className="h-4 w-4" /> },
                        { label: showLabels ? 'Hide Labels' : 'Show Labels', onClick: () => setShowLabels(!showLabels), icon: showLabels ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" /> },
                        { label: isDarkMode ? 'Switch to Light' : 'Switch to Dark', onClick: () => setIsDarkMode(!isDarkMode), icon: isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" /> },
                        {
                            label: 'Export Diagram (PNG)', onClick: () => {
                                if (!billing?.plan.export_enabled) {
                                    alert("Unlock Pro to export diagrams.");
                                    return;
                                }
                                alert('Exporting diagram...');
                            }, icon: <Download className="h-4 w-4" />
                        },
                        { label: 'Reset Zoom', onClick: () => fitView({ duration: 800 }), icon: <RefreshCw className="h-4 w-4" /> },
                    ]}
                />
            </div>

            {!loading && nodes.length > 0 && (
                <FeedbackNudge context="diagram" delay={5000} />
            )}
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

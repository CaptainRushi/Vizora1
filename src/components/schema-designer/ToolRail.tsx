

import {
    MousePointer,
    Hand,
    Maximize,
    PlusSquare,
    Columns,
    Link,
    Trash2,
    Grid,
    Magnet,
} from 'lucide-react';

export type CanvasTool = 'select' | 'pan' | 'add_table' | 'add_column' | 'add_relation';

interface ToolRailProps {
    activeTool: CanvasTool;
    setActiveTool: (t: CanvasTool) => void;
    onAction: (action: string) => void;
    isDarkMode: boolean;
    showGrid: boolean;
    snapToGrid: boolean;
}

export function ToolRail({
    activeTool,
    setActiveTool,
    onAction,
    showGrid,
    snapToGrid
}: ToolRailProps) {

    const ToolButton = ({
        mode,
        icon: Icon,
        label,
        action
    }: {
        mode?: CanvasTool,
        icon: any,
        label: string,
        action?: string
    }) => {
        const isActive = mode ? activeTool === mode : false;

        let activeStyle = false;
        if (mode) activeStyle = isActive;
        if (action === 'grid') activeStyle = showGrid;
        if (action === 'snap') activeStyle = snapToGrid;

        return (
            <button
                onClick={() => mode ? setActiveTool(mode) : action && onAction(action)}
                className={`
                    p-3 rounded-xl flex items-center justify-center transition-all duration-200
                    ${activeStyle
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    }
                `}
                title={label}
            >
                <Icon className="h-5 w-5" />
            </button>
        );
    };

    return (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md border border-slate-200 px-6 py-2.5 rounded-[2rem] flex items-center gap-6 z-30 shadow-2xl shadow-slate-200/50">
            {/* GROUP 1: SELECTION */}
            <div className="flex items-center gap-1.5">
                <ToolButton mode="select" icon={MousePointer} label="Select" />
                <ToolButton mode="pan" icon={Hand} label="Pan Tool (Space)" />
                <ToolButton action="fit-view" icon={Maximize} label="Zoom to Fit" />
            </div>

            <div className="w-px h-6 bg-slate-200" />

            {/* GROUP 2: SCHEMA */}
            <div className="flex items-center gap-1.5">
                <ToolButton mode="add_table" icon={PlusSquare} label="Add Table" />
                <ToolButton mode="add_column" icon={Columns} label="Add Column" />
                <ToolButton mode="add_relation" icon={Link} label="Add Relationship" />
            </div>

            <div className="w-px h-6 bg-slate-200" />

            {/* GROUP 3: EDITING */}
            <div className="flex items-center gap-1.5">
                <ToolButton action="delete" icon={Trash2} label="Delete Selected" />
            </div>

            <div className="w-px h-6 bg-slate-200" />

            {/* GROUP 4: VIEW */}
            <div className="flex items-center gap-1.5">
                <ToolButton action="grid" icon={Grid} label="Toggle Grid" />
                <ToolButton action="snap" icon={Magnet} label="Snap to Grid" />
            </div>
        </div>
    );
}


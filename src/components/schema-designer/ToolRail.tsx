

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
        <div className="w-[64px] h-full bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-6 z-20 shrink-0">
            {/* GROUP 1: SELECTION */}
            <div className="flex flex-col gap-2">
                <ToolButton mode="select" icon={MousePointer} label="Select" />
                <ToolButton mode="pan" icon={Hand} label="Pan Tool (Space)" />
                <ToolButton action="fit-view" icon={Maximize} label="Zoom to Fit" />
            </div>

            <div className="w-8 h-px bg-slate-100" />

            {/* GROUP 2: SCHEMA */}
            <div className="flex flex-col gap-2">
                <ToolButton mode="add_table" icon={PlusSquare} label="Add Table" />
                <ToolButton mode="add_column" icon={Columns} label="Add Column" />
                <ToolButton mode="add_relation" icon={Link} label="Add Relationship" />
            </div>

            <div className="w-8 h-px bg-slate-100" />

            {/* GROUP 3: EDITING */}
            <div className="flex flex-col gap-2">
                <ToolButton action="delete" icon={Trash2} label="Delete Selected" />
            </div>

            <div className="mt-auto flex flex-col gap-2">
                <div className="w-8 h-px bg-slate-100 my-2" />
                {/* GROUP 4: VIEW */}
                <ToolButton action="grid" icon={Grid} label="Toggle Grid" />
                <ToolButton action="snap" icon={Magnet} label="Snap to Grid" />
            </div>
        </div>
    );
}


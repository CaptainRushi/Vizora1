
import { BaseEdge, EdgeProps, getSmoothStepPath } from 'reactflow';

export function SchemaEdge({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    markerStart,
}: EdgeProps) {
    const [edgePath] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} markerStart={markerStart} style={{ ...style, strokeWidth: 2 }} />
            {/* We can add cardinality labels here if we want */}
        </>
    );
}

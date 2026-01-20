
import { EdgeProps, getSmoothStepPath } from 'reactflow';
import { useId } from 'react';

export function SchemaEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    markerStart,
    selected,
}: EdgeProps) {
    const gradientId = useId();

    const [edgePath] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 16,
    });

    // Calculate animation duration based on path length
    const pathLength = Math.sqrt(
        Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2)
    );
    const animDuration = Math.max(2, Math.min(4, pathLength / 100));

    return (
        <>
            {/* Animated gradient definition */}
            <defs>
                <linearGradient
                    id={`gradient-${gradientId}`}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                >
                    <stop offset="0%" stopColor={selected ? '#818cf8' : '#94a3b8'}>
                        <animate
                            attributeName="stop-color"
                            values={selected ? '#818cf8;#c084fc;#818cf8' : '#94a3b8;#64748b;#94a3b8'}
                            dur="3s"
                            repeatCount="indefinite"
                        />
                    </stop>
                    <stop offset="50%" stopColor={selected ? '#a78bfa' : '#64748b'}>
                        <animate
                            attributeName="stop-color"
                            values={selected ? '#a78bfa;#818cf8;#a78bfa' : '#64748b;#94a3b8;#64748b'}
                            dur="3s"
                            repeatCount="indefinite"
                        />
                    </stop>
                    <stop offset="100%" stopColor={selected ? '#c084fc' : '#94a3b8'}>
                        <animate
                            attributeName="stop-color"
                            values={selected ? '#c084fc;#818cf8;#c084fc' : '#94a3b8;#64748b;#94a3b8'}
                            dur="3s"
                            repeatCount="indefinite"
                        />
                    </stop>
                </linearGradient>

                {/* Glow filter */}
                <filter id={`glow-${gradientId}`} x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation={selected ? '3' : '1.5'} result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Outer glow layer */}
            {selected && (
                <path
                    d={edgePath}
                    fill="none"
                    stroke="#a78bfa"
                    strokeWidth={8}
                    strokeOpacity={0.3}
                    strokeLinecap="round"
                    style={{ filter: 'blur(6px)' }}
                />
            )}

            {/* Main animated gradient path */}
            <path
                id={id}
                d={edgePath}
                fill="none"
                stroke={`url(#gradient-${gradientId})`}
                strokeWidth={selected ? 3 : 2}
                strokeLinecap="round"
                markerEnd={markerEnd}
                markerStart={markerStart}
                filter={`url(#glow-${gradientId})`}
                style={{
                    transition: 'stroke-width 0.3s ease',
                    ...style,
                }}
            />

            {/* Energy pulse traveling along path */}
            <circle r={selected ? 5 : 4} fill={selected ? '#a78bfa' : '#64748b'}>
                <animateMotion
                    dur={`${animDuration}s`}
                    repeatCount="indefinite"
                    path={edgePath}
                />
                <animate
                    attributeName="opacity"
                    values="0.8;1;0.8"
                    dur="0.8s"
                    repeatCount="indefinite"
                />
                <animate
                    attributeName="r"
                    values={selected ? '4;6;4' : '3;5;3'}
                    dur="0.8s"
                    repeatCount="indefinite"
                />
            </circle>

            {/* Second pulse with offset */}
            <circle r={selected ? 4 : 3} fill={selected ? '#818cf8' : '#94a3b8'} opacity="0.6">
                <animateMotion
                    dur={`${animDuration}s`}
                    repeatCount="indefinite"
                    path={edgePath}
                    begin={`${animDuration / 2}s`}
                />
                <animate
                    attributeName="opacity"
                    values="0.4;0.7;0.4"
                    dur="1s"
                    repeatCount="indefinite"
                />
            </circle>

            {/* Invisible wider path for easier selection */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                className="cursor-pointer"
            />
        </>
    );
}

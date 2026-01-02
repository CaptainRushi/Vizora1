
interface LogoProps {
    size?: number;
    className?: string;
    animated?: boolean;
}

export function Logo({ size = 24, className = "", animated = false }: LogoProps) {
    const dotSize = size * 0.25; // Scale dots relative to container
    const gapSize = size * 0.15; // Scale gap relative to container

    if (animated) {
        return (
            <div
                className={`grid grid-cols-2 gap-[var(--gap)] ${className}`}
                style={{
                    '--gap': `${gapSize}px`,
                    width: size,
                    height: size
                } as any}
            >
                {/* Top Left - Solid -> Faint */}
                <div
                    className="rounded-full bg-[#0F172A] animate-pulse-tl"
                    style={{ width: dotSize, height: dotSize }}
                />
                {/* Top Right - Faint -> Solid */}
                <div
                    className="rounded-full bg-[#0F172A] animate-pulse-tr"
                    style={{ width: dotSize, height: dotSize }}
                />
                {/* Bottom Left - Faint -> Solid */}
                <div
                    className="rounded-full bg-[#0F172A] animate-pulse-bl"
                    style={{ width: dotSize, height: dotSize }}
                />
                {/* Bottom Right - Solid -> Faint */}
                <div
                    className="rounded-full bg-[#0F172A] animate-pulse-br"
                    style={{ width: dotSize, height: dotSize }}
                />
            </div>
        );
    }

    return (
        <div
            className={`grid grid-cols-2 gap-[var(--gap)] ${className}`}
            style={{
                '--gap': `${gapSize}px`,
                width: size,
                height: size
            } as any}
        >
            {/* Top Left: Solid */}
            <div
                className="rounded-full bg-[#0F172A]"
                style={{ width: dotSize, height: dotSize }}
            />
            {/* Top Right: Faint */}
            <div
                className="rounded-full bg-[#0F172A]/20"
                style={{ width: dotSize, height: dotSize }}
            />
            {/* Bottom Left: Faint */}
            <div
                className="rounded-full bg-[#0F172A]/20"
                style={{ width: dotSize, height: dotSize }}
            />
            {/* Bottom Right: Solid */}
            <div
                className="rounded-full bg-[#0F172A]"
                style={{ width: dotSize, height: dotSize }}
            />
        </div>
    );
}

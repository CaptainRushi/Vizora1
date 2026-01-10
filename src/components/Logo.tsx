import React from 'react';

interface LogoProps {
    size?: number;
    animated?: boolean;
    withBackground?: boolean;
    className?: string;
}

export function Logo({ size = 24, animated = false, withBackground = false, className = '' }: LogoProps) {
    const imageSize = size;

    const content = (
        <img
            src="/vizora-logo.png"
            alt="Vizora Logo"
            width={imageSize}
            height={imageSize}
            className={`object-contain ${className}`}
            style={{ width: imageSize, height: imageSize }}
        />
    );

    // Simply return the image without any wrapper or background
    return content;
}

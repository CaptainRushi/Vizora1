/**
 * ConnectionStatus - Shows real-time connection status indicator
 */

interface ConnectionStatusProps {
    isConnected: boolean;
    isReconnecting?: boolean;
    error?: string | null;
}

export function ConnectionStatus({ isConnected, isReconnecting, error }: ConnectionStatusProps) {
    if (error) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[10px] font-medium text-red-400">{error}</span>
            </div>
        );
    }

    if (isReconnecting) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full animate-pulse">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-[10px] font-medium text-amber-400">Reconnecting...</span>
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-500/10 border border-slate-500/20 rounded-full">
                <div className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-[10px] font-medium text-slate-400">Offline</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-medium text-green-400">Live</span>
        </div>
    );
}

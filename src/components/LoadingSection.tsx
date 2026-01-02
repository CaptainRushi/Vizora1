// LoadingSection component for premium feel
interface LoadingSectionProps {
    title?: string;
}

export function LoadingSection({ title = "Loading data..." }: LoadingSectionProps) {
    return (
        <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
            <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-indigo-100" />
                <div className="absolute top-0 h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
            <div className="text-center">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                <p className="text-xs text-gray-500">Preparing your database clarity...</p>
            </div>
        </div>
    );
}

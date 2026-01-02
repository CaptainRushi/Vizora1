
import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-screen w-screen flex-col items-center justify-center bg-red-50 p-4 text-red-900">
                    <h1 className="text-2xl font-bold">Something went wrong</h1>
                    <pre className="mt-4 max-w-2xl overflow-auto rounded bg-red-100 p-4 text-sm text-red-800">
                        {this.state.error?.message}
                    </pre>
                    <button
                        className="mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                        onClick={() => window.location.reload()}
                    >
                        Reload Page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

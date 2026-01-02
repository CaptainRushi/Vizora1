
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
    title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
    return (
        <div className="flex h-[50vh] flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-center">
            <div className="mb-4 rounded-full bg-gray-100 p-4">
                <Construction className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-500">
                This feature is currently under development. <br />
                Check back soon for updates.
            </p>
        </div>
    );
}

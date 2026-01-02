
import { Settings, Terminal } from 'lucide-react';

export function GlobalSettings() {
    return (
        <div className="p-12 max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-4 mb-8">
                <div className="h-16 w-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-600">
                    <Settings className="h-8 w-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-gray-900">Global Settings</h1>
                    <p className="text-gray-500 font-medium">Preferences across all projects</p>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden">
                <div className="p-8 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Input Preferences</h3>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-gray-700">Default Schema Type</p>
                            <p className="text-sm text-gray-400">Selected by default when creating projects</p>
                        </div>
                        <select className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-bold text-gray-700 outline-none">
                            <option>SQL (PostgreSQL)</option>
                            <option>Prisma Schema</option>
                            <option>Drizzle ORM</option>
                        </select>
                    </div>
                </div>

                <div className="p-8 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Appearance</h3>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="font-bold text-gray-700">Theme Mode</p>
                            <p className="text-sm text-gray-400">Toggle light/dark interface</p>
                        </div>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button className="px-4 py-1.5 bg-white shadow-sm rounded-md text-xs font-bold text-gray-900">Light</button>
                            <button className="px-4 py-1.5 text-xs font-bold text-gray-500">Dark</button>
                            <button className="px-4 py-1.5 text-xs font-bold text-gray-500">System</button>
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-gray-50">
                    <div className="flex items-center gap-3 text-gray-400 text-sm font-medium">
                        <Terminal className="h-4 w-4" />
                        <span>Vizora Client v1.0.0</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

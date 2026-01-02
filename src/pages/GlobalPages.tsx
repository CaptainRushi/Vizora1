
import { CreditCard, Settings, Terminal, Shield } from 'lucide-react';

export function Billing() {
    return (
        <div className="p-12 max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-4 mb-8">
                <div className="h-16 w-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                    <CreditCard className="h-8 w-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-gray-900">Billing & Usage</h1>
                    <p className="text-gray-500 font-medium">Manage your subscription and limits</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">Current Plan</span>
                            <h2 className="text-2xl font-black text-gray-900 mt-2">Free Tier</h2>
                        </div>
                        <h3 className="text-3xl font-black text-gray-900">$0<span className="text-sm text-gray-400 font-medium">/mo</span></h3>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="flex justify-between text-sm font-bold text-gray-500">
                            <span>Projects</span>
                            <span>2 / 5</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full w-[40%] bg-indigo-600 rounded-full" />
                        </div>

                        <div className="flex justify-between text-sm font-bold text-gray-500 mt-4">
                            <span>Storage</span>
                            <span>15%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full w-[15%] bg-indigo-600 rounded-full" />
                        </div>
                    </div>

                    <button className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors">
                        Upgrade to Pro
                    </button>
                </div>

                <div className="bg-gradient-to-br from-indigo-900 to-purple-900 p-8 rounded-3xl text-white shadow-xl shadow-indigo-900/20 relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-2xl font-black mb-4">Enterprise</h2>
                        <ul className="space-y-3 mb-8 text-indigo-100 font-medium text-sm">
                            <li className="flex items-center gap-2"><Shield className="h-4 w-4" /> Unlimited Projects</li>
                            <li className="flex items-center gap-2"><Shield className="h-4 w-4" /> SSO Authentication</li>
                            <li className="flex items-center gap-2"><Shield className="h-4 w-4" /> Priority Support</li>
                            <li className="flex items-center gap-2"><Shield className="h-4 w-4" /> Custom Export Formats</li>
                        </ul>
                        <button className="w-full py-4 bg-white text-indigo-900 rounded-xl font-bold hover:bg-gray-50 transition-colors">
                            Contact Sales
                        </button>
                    </div>
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 bg-indigo-500 rounded-full blur-3xl opacity-20" />
                </div>
            </div>
        </div>
    );
}

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

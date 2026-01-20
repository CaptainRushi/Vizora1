import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    BookOpen,
    Zap,
    Database,
    Share2,
    FileText,
    GitBranch,
    CreditCard,
    ChevronRight,
    Users,
    Shield,
    HelpCircle,
    Mail,
    Search,
    Keyboard,
    MessageSquare,
    Download,
    Eye,
    Code,
    Layers,
    MousePointer,
    Check,
    ArrowRight,
    Sparkles,
    RefreshCw,
    Clock,
    AlertTriangle,
    ExternalLink
} from 'lucide-react';

interface Section {
    id: string;
    title: string;
    icon: React.ElementType;
    content: React.ReactNode;
    badge?: string;
}

export function Help() {
    const [searchParams] = useSearchParams();
    const sectionFromUrl = searchParams.get('section');
    const [activeSection, setActiveSection] = useState(sectionFromUrl || 'getting-started');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (sectionFromUrl) {
            setActiveSection(sectionFromUrl);
        }
    }, [sectionFromUrl]);

    const sections: Section[] = [
        {
            id: 'getting-started',
            title: 'Getting Started',
            icon: Zap,
            content: <GettingStarted />
        },
        {
            id: 'workspaces',
            title: 'Workspaces',
            icon: Layers,
            content: <WorkspacesGuide />,
            badge: 'New'
        },
        {
            id: 'schema-input',
            title: 'Schema Input',
            icon: Database,
            content: <SchemaInputGuide />
        },
        {
            id: 'visual-designer',
            title: 'Visual Designer',
            icon: MousePointer,
            content: <VisualDesigner />
        },
        {
            id: 'er-diagrams',
            title: 'ER Diagrams',
            icon: Share2,
            content: <ERDiagramsGuide />
        },
        {
            id: 'collaboration',
            title: 'Live Collaboration',
            icon: Users,
            content: <LiveCollaboration />,
            badge: 'Updated'
        },
        {
            id: 'chat',
            title: 'Workspace Chat',
            icon: MessageSquare,
            content: <WorkspaceChat />,
            badge: 'New'
        },
        {
            id: 'documentation',
            title: 'Documentation & AI',
            icon: FileText,
            content: <DocumentationExports />
        },
        {
            id: 'exports',
            title: 'Exports & Downloads',
            icon: Download,
            content: <ExportsGuide />,
            badge: 'Updated'
        },
        {
            id: 'versioning',
            title: 'Version Control',
            icon: GitBranch,
            content: <VersioningChanges />
        },
        {
            id: 'shortcuts',
            title: 'Keyboard Shortcuts',
            icon: Keyboard,
            content: <KeyboardShortcuts />
        },
        {
            id: 'beta',
            title: 'Private Beta',
            icon: CreditCard,
            content: <PrivateBetaInfo />
        },
        {
            id: 'security',
            title: 'Security & Privacy',
            icon: Shield,
            content: <SecurityData />
        },
        {
            id: 'faq',
            title: 'FAQ',
            icon: HelpCircle,
            content: <FAQ />
        },
        {
            id: 'contact',
            title: 'Contact & Support',
            icon: Mail,
            content: <ContactSupport />
        }
    ];

    const filteredSections = sections.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeContent = sections.find(s => s.id === activeSection);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
            <div className="flex h-screen">
                {/* Sidebar */}
                <aside className="w-72 bg-white border-r border-slate-100 overflow-y-auto flex flex-col">
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-slate-900 rounded-xl">
                                <BookOpen className="w-5 h-5 text-slate-300" />
                            </div>
                            <div>
                                <h1 className="text-lg font-black text-slate-900 tracking-tight">Help Center</h1>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Documentation & Guides</p>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                            <input
                                type="text"
                                placeholder="Search docs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                            />
                        </div>
                    </div>

                    <nav className="flex-1 p-3 overflow-y-auto custom-scrollbar">
                        {filteredSections.map((section) => {
                            const Icon = section.icon;
                            const isActive = activeSection === section.id;
                            return (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all mb-1 group ${isActive
                                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-900 shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                    <span className="flex-1 text-left">{section.title}</span>
                                    {section.badge && (
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${section.badge === 'New' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                            }`}>
                                            {section.badge}
                                        </span>
                                    )}
                                    {isActive && <ChevronRight className="w-4 h-4 text-indigo-500" />}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-slate-100">
                        <div className="p-4 bg-slate-900 rounded-2xl text-white">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Need help?</p>
                            <p className="text-xs font-medium opacity-90">Contact our support team anytime</p>
                            <a href="mailto:vizoraofficial9@gmail.com" className="mt-3 flex items-center gap-2 text-xs font-bold hover:underline">
                                <Mail className="w-3.5 h-3.5" />
                                vizoraofficial9@gmail.com
                            </a>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto px-8 py-12">
                        {activeContent && (
                            <>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-slate-100 rounded-2xl">
                                        {activeContent.icon && <activeContent.icon className="w-6 h-6 text-indigo-600" />}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{activeContent.title}</h2>
                                        {activeContent.badge && (
                                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${activeContent.badge === 'New' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {activeContent.badge}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="prose prose-slate prose-p:text-slate-600 prose-headings:text-slate-900 max-w-none">
                                    {activeContent.content}
                                </div>
                            </>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

// ============== SECTION COMPONENTS ==============

function GettingStarted() {
    return (
        <div className="space-y-8">
            {/* Hero */}
            <div className="relative overflow-hidden bg-slate-900 rounded-3xl p-8 text-white">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest opacity-80">Welcome to Vizora</span>
                    </div>
                    <h3 className="text-2xl font-black mb-3">Transform Your Database Schema Into Living Documentation</h3>
                    <p className="text-indigo-100 leading-relaxed max-w-2xl">
                        Vizora is a schema-first platform that generates interactive ER diagrams, AI-powered explanations,
                        and beautiful documentation—all without connecting to your production database.
                    </p>
                </div>
                <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            </div>

            {/* Quick Start Steps */}
            <div>
                <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    Quick Start Guide
                </h3>
                <div className="grid gap-4">
                    {[
                        { step: '1', title: 'Create a Workspace', desc: 'Click "New Workspace" from the sidebar to create your first project space.', icon: Layers },
                        { step: '2', title: 'Paste Your Schema', desc: 'Open the Workspace Editor and paste your SQL DDL, Prisma, or Drizzle schema.', icon: Code },
                        { step: '3', title: 'Save a Version', desc: 'Click "Save Version" to create an immutable snapshot. This triggers AI analysis.', icon: GitBranch },
                        { step: '4', title: 'Explore & Export', desc: 'View ER Diagrams, read AI explanations, and download documentation.', icon: Download },
                    ].map((s) => (
                        <div key={s.step} className="flex gap-4 p-5 bg-white border border-slate-100 rounded-2xl hover:shadow-lg hover:shadow-slate-100/50 transition-all group">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shrink-0 group-hover:scale-110 transition-transform">
                                {s.step}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                    {s.title}
                                    <s.icon className="w-4 h-4 text-slate-300" />
                                </h4>
                                <p className="text-sm text-slate-500 mt-1">{s.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* What You Get */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { title: 'ER Diagrams', desc: 'Auto-generated interactive relationship diagrams', icon: Share2, color: 'indigo' },
                    { title: 'AI Explanations', desc: 'GPT-powered schema analysis and documentation', icon: Sparkles, color: 'purple' },
                    { title: 'Live Collaboration', desc: 'Real-time editing with your team', icon: Users, color: 'pink' },
                ].map((item) => (
                    <div key={item.title} className={`p-6 rounded-2xl bg-${item.color}-50 border border-${item.color}-100`}>
                        <item.icon className={`w-8 h-8 text-${item.color}-500 mb-4`} />
                        <h4 className="font-bold text-slate-900 mb-1">{item.title}</h4>
                        <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function WorkspacesGuide() {
    return (
        <div className="space-y-8">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 className="font-black text-slate-900 mb-2">What is a Workspace?</h3>
                <p className="text-slate-700 leading-relaxed">
                    A Workspace is your project container. It holds your schema code, version history, team members, and all generated artifacts like diagrams and documentation.
                </p>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900">Workspace Features</h3>

                <div className="grid gap-4">
                    <FeatureCard
                        icon={Code}
                        title="Schema Editor"
                        description="A Monaco-powered code editor with syntax highlighting for SQL, Prisma, and Drizzle. Supports live collaboration with real-time cursor tracking."
                    />
                    <FeatureCard
                        icon={GitBranch}
                        title="Version History"
                        description="Every save creates an immutable version. Compare any two versions side-by-side with our diff viewer. Roll back with one click."
                    />
                    <FeatureCard
                        icon={Users}
                        title="Team Management"
                        description="Invite team members as Admin, Member, or Viewer. Control who can edit and who can only view your schema."
                    />
                    <FeatureCard
                        icon={MessageSquare}
                        title="Live Chat"
                        description="Built-in workspace chat for discussing changes with your team. Messages are ephemeral and tied to the session."
                    />
                </div>
            </div>

            <div className="p-6 bg-slate-900 rounded-2xl text-white">
                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-4">Pro Tip</h4>
                <p className="text-slate-300 leading-relaxed">
                    Use <kbd className="px-2 py-1 bg-slate-800 rounded text-xs font-mono">Ctrl + S</kbd> to quickly save a new version while in the editor.
                    The version modal will appear for you to add a commit message.
                </p>
            </div>
        </div>
    );
}

function SchemaInputGuide() {
    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-black text-slate-900 mb-4">Supported Formats</h3>
                <div className="flex flex-wrap gap-2">
                    {['PostgreSQL', 'MySQL', 'SQLite', 'Prisma', 'Drizzle', 'DuckDB'].map(t => (
                        <span key={t} className="px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl text-sm font-bold text-slate-700 border border-slate-200">
                            {t}
                        </span>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900">Best Practices</h3>

                <div className="grid gap-3">
                    <div className="flex items-start gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-emerald-900">Include FOREIGN KEY constraints</p>
                            <p className="text-sm text-emerald-700 mt-1">This is how Vizora automatically builds the relationship graph between your tables.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                        <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-emerald-900">Define PRIMARY KEYs explicitly</p>
                            <p className="text-sm text-emerald-700 mt-1">Every table needs a unique identifier. We use this for entity mapping and diagram generation.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-100 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold text-red-900">Avoid INSERT statements or data</p>
                            <p className="text-sm text-red-700 mt-1">We only need your schema structure (DDL). Business data is never required or stored.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-slate-900 rounded-2xl">
                <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Example SQL Schema</h4>
                <pre className="text-sm font-mono text-slate-300 overflow-x-auto leading-relaxed">
                    {`CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);`}
                </pre>
            </div>
        </div>
    );
}

function VisualDesigner() {
    return (
        <div className="space-y-8">
            <p className="text-slate-600 leading-relaxed">
                The Visual Schema Designer is a collaborative canvas for designing and editing your database structure.
                Make changes visually and export clean SQL code.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FeatureCard
                    icon={MousePointer}
                    title="Drag & Drop Tables"
                    description="Reposition tables anywhere on the canvas. Layouts are auto-saved and synced across your team."
                />
                <FeatureCard
                    icon={Layers}
                    title="Add Tables & Columns"
                    description="Use the floating toolbar to add new tables. Click on a table to add columns with the property panel."
                />
                <FeatureCard
                    icon={Share2}
                    title="Create Relationships"
                    description="Drag from one column handle to another to create foreign key relationships with proper cardinality markers."
                />
                <FeatureCard
                    icon={Code}
                    title="Export to SQL"
                    description="Click 'Export SQL' to generate production-ready DDL code from your visual design."
                />
            </div>

            <div className="p-6 bg-slate-900 rounded-2xl text-white">
                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-4">Toolbar Quick Reference</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-3">
                        <kbd className="px-2 py-1 bg-slate-800 rounded text-xs">Select</kbd>
                        <span className="text-slate-300">Click and drag to select tables</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <kbd className="px-2 py-1 bg-slate-800 rounded text-xs">Pan</kbd>
                        <span className="text-slate-300">Hold Space + drag to pan</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <kbd className="px-2 py-1 bg-slate-800 rounded text-xs">Add Table</kbd>
                        <span className="text-slate-300">Click on canvas to place</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <kbd className="px-2 py-1 bg-slate-800 rounded text-xs">Auto Layout</kbd>
                        <span className="text-slate-300">Reorganize tables automatically</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ERDiagramsGuide() {
    return (
        <div className="space-y-8">
            <p className="text-slate-600 leading-relaxed">
                ER Diagrams provide a read-only visualization of your schema relationships.
                Perfect for documentation, presentations, and understanding complex schemas at a glance.
            </p>

            <div className="grid gap-4">
                <FeatureCard
                    icon={Eye}
                    title="Interactive Exploration"
                    description="Hover over tables to highlight relationships. Click on columns to see connected foreign keys across the diagram."
                />
                <FeatureCard
                    icon={Download}
                    title="Export as Image"
                    description="Download your diagram as PNG or JPG. A file picker lets you choose where to save (Chrome/Edge)."
                />
                <FeatureCard
                    icon={RefreshCw}
                    title="Auto-Refresh"
                    description="Diagrams automatically update when you save a new schema version. Always shows the latest structure."
                />
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-2">Relationship Notation</h4>
                <p className="text-slate-700 text-sm mb-4">Our diagrams use Crow's Foot notation to indicate cardinality:</p>
                <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-indigo-600">──||</span>
                        <span className="text-slate-700">One (mandatory)</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-indigo-600">──&lt;</span>
                        <span className="text-slate-700">Many</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function LiveCollaboration() {
    return (
        <div className="space-y-8">
            <div className="flex items-center gap-6 p-8 bg-slate-900 rounded-3xl text-white">
                <div className="p-5 bg-slate-800 rounded-2xl">
                    <Users className="w-10 h-10 text-white" />
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Real-Time Multiplayer</h3>
                    <p className="text-indigo-200/70 text-sm font-medium mt-1">Design your database together, with instant sync across all clients.</p>
                </div>
            </div>

            <div className="space-y-4">
                <FeatureCard
                    icon={Eye}
                    title="Live Cursors & Selections"
                    description="See where your teammates are editing in real-time. Each collaborator gets a unique color for their cursor and selections."
                />
                <FeatureCard
                    icon={Code}
                    title="Instant Code Sync"
                    description="Changes appear within 50ms across all connected clients. No need to refresh or manually sync."
                />
                <FeatureCard
                    icon={Users}
                    title="Presence Indicators"
                    description="The presence panel shows who's currently online in your workspace with live status updates."
                />
                <FeatureCard
                    icon={GitBranch}
                    title="Edit Attribution"
                    description="Every line of code is attributed to the user who wrote it. See '└── @username editing' annotations in real-time."
                />
            </div>

            <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl">
                <h4 className="font-bold text-amber-900 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Connection Tips
                </h4>
                <ul className="text-sm text-amber-800 space-y-1">
                    <li>• Collaboration requires an active internet connection</li>
                    <li>• If disconnected, your changes are preserved locally</li>
                    <li>• The presence panel shows connection status</li>
                </ul>
            </div>
        </div>
    );
}

function WorkspaceChat() {
    return (
        <div className="space-y-8">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3 mb-3">
                    <MessageSquare className="w-6 h-6 text-indigo-600" />
                    <h3 className="font-black text-slate-900">Ephemeral Team Chat</h3>
                </div>
                <p className="text-slate-700 leading-relaxed">
                    The workspace chat is a session-based communication tool. Messages are tied to your editing session and disappear when everyone leaves.
                </p>
            </div>

            <div className="space-y-4">
                <FeatureCard
                    icon={MessageSquare}
                    title="Floating Chat Window"
                    description="A draggable, resizable chat window that floats over your workspace. Minimize it when you need more screen space."
                />
                <FeatureCard
                    icon={Users}
                    title="Typing Indicators"
                    description="See when teammates are typing with real-time typing indicators. Shows up to 3 users typing simultaneously."
                />
                <FeatureCard
                    icon={Zap}
                    title="Sound Notifications"
                    description="Get audio alerts when new messages arrive. Perfect for staying in the loop while focused on code."
                />
            </div>

            <div className="p-6 bg-slate-900 rounded-2xl text-white">
                <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-4">Chat Features</h4>
                <ul className="space-y-3 text-sm text-slate-300">
                    <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-emerald-400" />
                        Emoji picker for quick reactions
                    </li>
                    <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-emerald-400" />
                        Timestamps for each message
                    </li>
                    <li className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-emerald-400" />
                        Viewer role can read but not send messages
                    </li>
                </ul>
            </div>
        </div>
    );
}

function DocumentationExports() {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 bg-white border border-slate-200 rounded-2xl">
                    <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl w-fit mb-4 font-black text-[10px] uppercase tracking-widest">AI-Powered</div>
                    <h4 className="text-lg font-black text-slate-900 mb-2">Schema Explanations</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        GPT-powered analysis of your database structure. Explains table purposes, relationships, and architectural patterns.
                    </p>
                </div>
                <div className="p-6 bg-white border border-slate-200 rounded-2xl">
                    <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl w-fit mb-4 font-black text-[10px] uppercase tracking-widest">Auto-Generated</div>
                    <h4 className="text-lg font-black text-slate-900 mb-2">Onboarding Guide</h4>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        A comprehensive technical walkthrough designed to onboard new team members to your database architecture.
                    </p>
                </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-900 mb-4">AI Analysis Includes:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>Database overview</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>Table-by-table explanations</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>Relationship analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>Data integrity patterns</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ExportsGuide() {
    return (
        <div className="space-y-8">
            <p className="text-slate-600 leading-relaxed">
                Vizora supports multiple export formats for different use cases. From high-resolution images to production-ready code.
            </p>

            <div className="space-y-4">
                <FeatureCard
                    icon={Download}
                    title="Diagram Exports (PNG/JPG)"
                    description="Export ER diagrams and visual designs as high-quality images. A file picker dialog lets you choose where to save (in Chrome/Edge)."
                />
                <FeatureCard
                    icon={FileText}
                    title="Documentation PDFs"
                    description="Print or export the Onboarding Guide and Schema Explanations as PDFs. Chat windows are automatically hidden in exports."
                />
                <FeatureCard
                    icon={Code}
                    title="SQL/Prisma/Drizzle Code"
                    description="Generate production-ready schema code from the Visual Designer. Copy to clipboard or download as a file."
                />
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Save As Dialog (Chrome/Edge)
                </h4>
                <p className="text-slate-700 text-sm">
                    When exporting diagrams, you'll get a native file picker to choose your download location.
                    This uses the modern File System Access API for a better experience.
                </p>
            </div>
        </div>
    );
}

function VersioningChanges() {
    return (
        <div className="space-y-8">
            <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 rounded-full" />
                <div className="space-y-8 relative">
                    {[
                        { title: 'Immutable Snapshots', content: 'Every time you save, we create a complete, immutable snapshot of your schema. Nothing is ever lost.' },
                        { title: 'Semantic Diff Engine', content: 'Our diff engine identifies exactly what changed—added columns, renamed tables, modified types—and highlights them visually.' },
                        { title: 'Version Comparison', content: 'Compare any two versions side-by-side with our Monaco-powered diff viewer. See additions, deletions, and modifications clearly.' },
                        { title: 'One-Click Rollback', content: 'Restoring a previous version is as simple as clicking "Restore". The entire project state resets, including diagrams.' }
                    ].map((v, i) => (
                        <div key={i} className="flex gap-6 items-start">
                            <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-black shrink-0 shadow-lg border-4 border-white">
                                {i + 1}
                            </div>
                            <div className="pt-2">
                                <h4 className="text-base font-black text-slate-900 mb-2">{v.title}</h4>
                                <p className="text-sm leading-relaxed text-slate-500">{v.content}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function KeyboardShortcuts() {
    const shortcuts = [
        {
            category: 'Editor', items: [
                { keys: 'Ctrl + S', action: 'Save version' },
                { keys: 'Ctrl + Z', action: 'Undo' },
                { keys: 'Ctrl + Shift + Z', action: 'Redo' },
                { keys: 'Ctrl + F', action: 'Find' },
                { keys: 'Ctrl + H', action: 'Find and Replace' },
            ]
        },
        {
            category: 'Designer', items: [
                { keys: 'Space + Drag', action: 'Pan canvas' },
                { keys: 'Ctrl + K', action: 'Open command palette' },
                { keys: 'Delete', action: 'Delete selected item' },
                { keys: 'Ctrl + Z', action: 'Undo change' },
            ]
        },
        {
            category: 'Navigation', items: [
                { keys: 'Ctrl + Click', action: 'Open link in new tab' },
                { keys: 'Esc', action: 'Close modal/panel' },
            ]
        },
    ];

    return (
        <div className="space-y-8">
            <p className="text-slate-600 leading-relaxed">
                Master these keyboard shortcuts to work faster in Vizora.
            </p>

            {shortcuts.map((section) => (
                <div key={section.category} className="space-y-3">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">{section.category}</h4>
                    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                        {section.items.map((item, i) => (
                            <div key={i} className={`flex items-center justify-between p-4 ${i !== section.items.length - 1 ? 'border-b border-slate-50' : ''}`}>
                                <span className="text-sm text-slate-600">{item.action}</span>
                                <kbd className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-mono font-bold text-slate-700">{item.keys}</kbd>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function PrivateBetaInfo() {
    return (
        <div className="space-y-8">
            <div className="p-8 bg-slate-900 rounded-3xl text-white relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest opacity-80">Private Beta</span>
                    </div>
                    <h3 className="text-2xl font-black mb-3">You're an Early Adopter!</h3>
                    <p className="text-indigo-100 leading-relaxed max-w-lg">
                        During the Private Beta, all core features—including AI analysis and exports—are unlocked at no cost.
                        Help us shape the future of schema documentation.
                    </p>
                </div>
                <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white border border-slate-100 rounded-2xl">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Beta Limits</h4>
                    <ul className="space-y-3">
                        <li className="text-sm font-bold text-slate-700 flex items-center justify-between">
                            Total Projects <span className="text-indigo-600">2</span>
                        </li>
                        <li className="text-sm font-bold text-slate-700 flex items-center justify-between">
                            Schema Versions per Project <span className="text-indigo-600">4</span>
                        </li>
                        <li className="text-sm font-bold text-slate-700 flex items-center justify-between">
                            Team Members <span className="text-indigo-600">3</span>
                        </li>
                    </ul>
                </div>
                <div className="p-6 bg-white border border-slate-100 rounded-2xl">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Coming Soon</h4>
                    <ul className="space-y-2">
                        <li className="text-sm text-slate-600 flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> GitHub Integration</li>
                        <li className="text-sm text-slate-600 flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> Advanced RBAC Permissions</li>
                        <li className="text-sm text-slate-600 flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> Schema Migration Generation</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

function SecurityData() {
    return (
        <div className="space-y-8">
            <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-6">
                <div className="p-4 bg-white rounded-2xl shadow-sm">
                    <Shield className="w-8 h-8 text-emerald-500" />
                </div>
                <div>
                    <h4 className="font-black text-emerald-900">Zero-Trust Architecture</h4>
                    <p className="text-sm text-emerald-700 mt-1">We only process schema structure—never your actual data or credentials.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">What We Store</h3>
                    <div className="p-5 border border-slate-100 rounded-2xl bg-white space-y-3">
                        <p className="text-sm text-slate-600 flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Schema structure (DDL)</p>
                        <p className="text-sm text-slate-600 flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Version history</p>
                        <p className="text-sm text-slate-600 flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> AI-generated explanations</p>
                        <p className="text-sm text-slate-600 flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Diagram layouts</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">What We Never Touch</h3>
                    <div className="p-5 border border-red-100 rounded-2xl bg-red-50/50 space-y-3">
                        <p className="text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Business data / rows</p>
                        <p className="text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Connection strings</p>
                        <p className="text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Production credentials</p>
                        <p className="text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Live database access</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FAQ() {
    const faqs = [
        { q: 'Is my production database safe?', a: 'Absolutely. We never connect to your live infrastructure. You only paste schema definitions—no credentials or data involved.' },
        { q: 'What formats are supported?', a: 'PostgreSQL, MySQL, SQLite, Prisma, and Drizzle are fully supported. We parse CREATE TABLE statements and model definitions.' },
        { q: 'How many people can collaborate?', a: 'During beta, you can invite up to 10 teammates per workspace. All members see real-time changes and cursors.' },
        { q: 'Do you support dark mode?', a: 'Yes! The Workspace Editor, Schema Designer, and ER Diagrams all support dark mode themes.' },
        { q: 'Can I delete my data permanently?', a: 'Yes. You can delete individual workspaces or your entire account from Settings. All data is permanently removed.' },
        { q: 'How does version control work?', a: 'Every save creates an immutable snapshot. You can compare any two versions and roll back with one click.' },
        { q: 'Is there an API?', a: 'Not yet, but a REST API for programmatic access is on our roadmap. Stay tuned!' },
    ];

    return (
        <div className="space-y-4">
            {faqs.map((faq, index) => (
                <div key={index} className="border border-slate-100 rounded-2xl p-6 bg-white hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-50 transition-all">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-indigo-500" />
                        {faq.q}
                    </h4>
                    <p className="text-slate-500 text-sm leading-relaxed pl-6">{faq.a}</p>
                </div>
            ))}
        </div>
    );
}

function ContactSupport() {
    return (
        <div className="space-y-8">
            <div className="bg-slate-900 rounded-3xl p-10 text-white relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                    <div className="p-6 bg-slate-800 rounded-3xl">
                        <Mail className="w-10 h-10 text-white" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black mb-2">Get in Touch</h3>
                        <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-sm mb-4">
                            Need help with something? Our team is here to assist you.
                        </p>
                        <a href="mailto:vizoraofficial9@gmail.com" className="inline-flex items-center gap-2 text-lg font-bold text-white hover:text-indigo-400 transition-colors">
                            vizoraofficial9@gmail.com
                            <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <a href="https://github.com/CaptainRushi/Vizora1/issues" target="_blank" className="p-6 border border-slate-100 rounded-2xl bg-white hover:border-indigo-200 hover:shadow-lg transition-all group">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                        Report a Bug
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    </h4>
                    <p className="text-sm text-slate-500">Found an issue? Open a bug report on our GitHub Issues page.</p>
                </a>
                <a href="https://github.com/CaptainRushi/Vizora1/issues" target="_blank" className="p-6 border border-slate-100 rounded-2xl bg-white hover:border-purple-200 hover:shadow-lg transition-all group">
                    <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                        Request a Feature
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-purple-500 transition-colors" />
                    </h4>
                    <p className="text-sm text-slate-500">Have an idea for a new feature? We'd love to hear from you.</p>
                </a>
            </div>
        </div>
    );
}

// ============== HELPER COMPONENTS ==============

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) {
    return (
        <div className="flex gap-4 p-5 bg-white border border-slate-100 rounded-2xl hover:shadow-lg hover:shadow-slate-100/50 transition-all">
            <div className="p-3 bg-slate-100 rounded-xl shrink-0">
                <Icon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
                <h4 className="font-bold text-slate-900 mb-1">{title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

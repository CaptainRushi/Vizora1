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
    Shield,
    HelpCircle,
    Mail,
    ChevronRight
} from 'lucide-react';

interface Section {
    id: string;
    title: string;
    icon: React.ElementType;
    content: React.ReactNode;
}

export function Help() {
    const [searchParams] = useSearchParams();
    const sectionFromUrl = searchParams.get('section');
    const [activeSection, setActiveSection] = useState(sectionFromUrl || 'getting-started');

    // Handle section query parameter changes
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
            id: 'using-platform',
            title: 'Using the Platform',
            icon: BookOpen,
            content: <UsingPlatform />
        },
        {
            id: 'schema-input',
            title: 'Schema Input Guide',
            icon: Database,
            content: <SchemaInputGuide />
        },
        {
            id: 'diagrams',
            title: 'Diagrams & Explorer',
            icon: Share2,
            content: <DiagramsExplorer />
        },
        {
            id: 'documentation',
            title: 'Documentation & Exports',
            icon: FileText,
            content: <DocumentationExports />
        },
        {
            id: 'versioning',
            title: 'Versioning & Changes',
            icon: GitBranch,
            content: <VersioningChanges />
        },
        {
            id: 'beta',
            title: 'Private Beta',
            icon: CreditCard,
            content: <PrivateBetaInfo />
        },
        {
            id: 'security',
            title: 'Security & Data',
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

    const activeContent = sections.find(s => s.id === activeSection);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex h-screen">
                {/* Sidebar */}
                <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
                    <div className="p-6 border-b border-gray-200">
                        <h1 className="text-lg font-bold text-gray-900">Help & Docs</h1>
                        <p className="text-xs text-gray-500 mt-1">Technical documentation</p>
                    </div>
                    <nav className="p-4">
                        {sections.map((section) => {
                            const Icon = section.icon;
                            const isActive = activeSection === section.id;
                            return (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${isActive
                                        ? 'bg-indigo-50 text-indigo-900'
                                        : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                                    <span className="flex-1 text-left">{section.title}</span>
                                    {isActive && <ChevronRight className="w-4 h-4 text-indigo-600" />}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-3xl mx-auto px-8 py-12">
                        {activeContent && (
                            <>
                                <div className="flex items-center gap-3 mb-6">
                                    {activeContent.icon && <activeContent.icon className="w-6 h-6 text-indigo-600" />}
                                    <h2 className="text-2xl font-bold text-gray-900">{activeContent.title}</h2>
                                </div>
                                <div className="prose prose-sm max-w-none">
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

// Section Components

function GettingStarted() {
    return (
        <div className="space-y-6 text-gray-700">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Purpose</h3>
                <p>
                    This platform converts database schemas into visual diagrams and documentation.
                    Paste your schema code, generate diagrams, and export documentation. No database
                    connection required.
                </p>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">What You Need</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Database schema code (SQL DDL or Prisma)</li>
                    <li>No database credentials</li>
                    <li>No production access</li>
                </ul>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">What You Get</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Auto-generated ER diagrams</li>
                    <li>AI-powered explanations</li>
                    <li>Markdown documentation</li>
                    <li>Version history and change tracking</li>
                </ul>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Start</h3>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>Create a project</li>
                    <li>Paste your database schema</li>
                    <li>Generate diagrams and documentation</li>
                    <li>Export or share</li>
                </ol>
                <p className="mt-4 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <strong>Note:</strong> First diagram generation takes under 5 minutes.
                </p>
            </div>
        </div>
    );
}

function UsingPlatform() {
    return (
        <div className="space-y-6 text-gray-700">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Core Workflow</h3>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Projects contain schema history</li>
                    <li>Every schema paste creates a new version</li>
                    <li>All features derive from the pasted schema</li>
                    <li>No manual diagram editing required</li>
                </ul>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Concepts</h3>
                <div className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-gray-900">Schema Version</h4>
                        <p>Each schema paste creates an immutable version with timestamp and metadata.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900">Normalized Schema</h4>
                        <p>Your schema is parsed and normalized for consistent processing across all features.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900">Change Detection</h4>
                        <p>Platform automatically detects table, column, and relationship changes between versions.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900">Documentation Generation</h4>
                        <p>Markdown docs are auto-generated from schema structure and AI analysis.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SchemaInputGuide() {
    return (
        <div className="space-y-6 text-gray-700">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Supported Inputs</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li>SQL DDL (CREATE TABLE, ALTER TABLE)</li>
                    <li>Prisma schema files</li>
                    <li>Schema-only database dumps</li>
                </ul>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Best Practices</h3>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Paste schema only, not data or INSERT statements</li>
                    <li>Keep one logical database per project</li>
                    <li>Re-paste schema when structure changes</li>
                    <li>Include foreign key constraints for relationship detection</li>
                </ul>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">What Happens After Pasting</h3>
                <ol className="list-decimal pl-5 space-y-1">
                    <li>Schema is parsed and validated</li>
                    <li>Relationships are automatically detected</li>
                    <li>Version history is created</li>
                    <li>Diagrams and documentation are updated</li>
                </ol>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Common Errors</h3>
                <div className="space-y-3">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-semibold text-red-900">Invalid SQL</h4>
                        <p className="text-sm text-red-700 mt-1">
                            Fix: Ensure syntax matches PostgreSQL, MySQL, or SQLite standards.
                        </p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-semibold text-red-900">Missing Primary Keys</h4>
                        <p className="text-sm text-red-700 mt-1">
                            Fix: Add PRIMARY KEY constraints to all tables.
                        </p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-semibold text-red-900">Unsupported Syntax</h4>
                        <p className="text-sm text-red-700 mt-1">
                            Fix: Remove vendor-specific extensions or stored procedures.
                        </p>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Example: Valid SQL Input</h3>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                    {`CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  total DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);`}
                </pre>
            </div>
        </div>
    );
}

function DiagramsExplorer() {
    return (
        <div className="space-y-6 text-gray-700">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">ER Diagrams</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Auto-generated from schema</li>
                    <li>Always reflects the latest version</li>
                    <li>Shows tables and relationships</li>
                    <li>Read-only visualizations</li>
                </ul>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">How to Use</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Zoom and pan to navigate large schemas</li>
                    <li>Search tables by name</li>
                    <li>Click table to inspect columns and relationships</li>
                    <li>Export as PNG or SVG</li>
                </ul>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Schema Explorer</h3>
                <p>Interactive table browser with:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Complete table list</li>
                    <li>Column details (type, constraints, defaults)</li>
                    <li>Relationships per table</li>
                    <li>Quick search and filtering</li>
                </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                    <strong>Note:</strong> Diagrams are generated visualizations, not manual drawings.
                    To modify the diagram, update your schema and re-paste.
                </p>
            </div>
        </div>
    );
}

function DocumentationExports() {
    return (
        <div className="space-y-6 text-gray-700">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Auto Documentation</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Generated in Markdown format</li>
                    <li>Includes tables, columns, and relationships</li>
                    <li>Version-aware</li>
                    <li>AI-enhanced descriptions</li>
                </ul>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Export Options</h3>
                <div className="space-y-3">
                    <div>
                        <h4 className="font-semibold text-gray-900">Markdown</h4>
                        <p>Copy to GitHub, Notion, Confluence, or any Markdown editor.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-gray-900">PNG / SVG Diagrams</h4>
                        <p>High-resolution exports for presentations and documentation.</p>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Usage Examples</h3>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Onboarding:</strong> Share schema docs with new developers</li>
                    <li><strong>Internal Wiki:</strong> Maintain up-to-date database documentation</li>
                    <li><strong>Client Handover:</strong> Deliver professional documentation</li>
                    <li><strong>PR Documentation:</strong> Include schema changes in pull requests</li>
                </ul>
            </div>
        </div>
    );
}

function VersioningChanges() {
    return (
        <div className="space-y-6 text-gray-700">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Version History</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Every schema paste creates a version</li>
                    <li>Versions are immutable</li>
                    <li>Timestamped and labeled</li>
                    <li>Rollback to any previous version</li>
                </ul>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Change Tracking</h3>
                <p>Automatic detection of:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Tables added or removed</li>
                    <li>Columns added, removed, or modified</li>
                    <li>Relationship changes</li>
                    <li>Constraint updates</li>
                </ul>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Why This Matters</h3>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Safer Refactors:</strong> Track what changed and when</li>
                    <li><strong>Better Onboarding:</strong> Show schema evolution over time</li>
                    <li><strong>Clear Audit Trail:</strong> Compliance and debugging</li>
                </ul>
            </div>
        </div>
    );
}

function PrivateBetaInfo() {
    return (
        <div className="space-y-6 text-gray-700">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Early Access Period</h3>
                <p>
                    Vizora is currently in a private beta phase. During this time, the platform is free to use for all invited participants as we refine our features and scale our infrastructure.
                </p>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Beta Limits</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Maximum 3 projects per workspace</li>
                    <li>Up to 10 schema versions per project</li>
                    <li>Full access to AI and export features</li>
                </ul>
                <p className="mt-2 text-sm italic text-gray-400">
                    *These limits ensure stability and performance during the testing phase.
                </p>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Post-Beta</h3>
                <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-green-900">Projects Preserved</h4>
                        <p className="text-sm text-green-700 mt-1">All your work, projects, and schema history will be preserved when we transition out of beta.</p>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                        <h4 className="font-semibold text-indigo-900">Future Pricing</h4>
                        <p className="text-sm text-indigo-700 mt-1">Pricing details will be announced near our official launch. Early beta users will receive a special thank-you for their contributions.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SecurityData() {
    return (
        <div className="space-y-6 text-gray-700">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">What We Store</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Schema text (structure only)</li>
                    <li>Generated metadata</li>
                    <li>Documentation artifacts</li>
                    <li>User account information</li>
                </ul>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">What We Do NOT Store</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Database credentials</li>
                    <li>Production data</li>
                    <li>Row-level data</li>
                    <li>Connection strings</li>
                </ul>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Security Notes</h3>
                <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-green-900">Schema-Only Processing</h4>
                        <p className="text-sm text-green-700 mt-1">
                            We only process database structure, never actual data.
                        </p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-green-900">No Live Database Access</h4>
                        <p className="text-sm text-green-700 mt-1">
                            Platform never connects to your production databases.
                        </p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-green-900">No Write Access</h4>
                        <p className="text-sm text-green-700 mt-1">
                            We cannot modify your database or systems.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FAQ() {
    const faqs = [
        {
            q: 'Is my production database accessed?',
            a: 'No. You paste schema code only. We never connect to your database.'
        },
        {
            q: 'Can I use this for client projects?',
            a: 'Yes. Generate documentation for any project you have schema access to.'
        },
        {
            q: 'Is Vizora free during beta?',
            a: 'Yes. All invited users have full access to current features at no cost during the private beta period.'
        },
        {
            q: 'Can I delete a project?',
            a: 'Yes. Project deletion is permanent and removes all associated data.'
        },
        {
            q: 'Is schema data shared with third parties?',
            a: 'Never. Your schema data is private and never shared.'
        },
        {
            q: 'Do you support all SQL dialects?',
            a: 'We support PostgreSQL, MySQL, SQLite, and Prisma. Most standard SQL works.'
        },
        {
            q: 'Can I export diagrams?',
            a: 'Yes. Export as PNG, SVG, or Markdown documentation.'
        },
        {
            q: 'How does AI explanation work?',
            a: 'AI analyzes schema structure only. No business data is accessed.'
        }
    ];

    return (
        <div className="space-y-4">
            {faqs.map((faq, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <h4 className="font-semibold text-gray-900 mb-2">{faq.q}</h4>
                    <p className="text-gray-700 text-sm">{faq.a}</p>
                </div>
            ))}
        </div>
    );
}

function ContactSupport() {
    return (
        <div className="space-y-6 text-gray-700">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Get in Touch</h3>
                <div className="space-y-4">
                    <div className="border border-indigo-100 rounded-xl p-6 bg-white shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-indigo-50 rounded-lg">
                                <Mail className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Official Support</h4>
                                <p className="text-sm text-gray-500">For all inquiries, support, and feedback</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <a
                                href="mailto:vizoraofficial9@gmail.com"
                                className="block w-full p-3 bg-gray-50 rounded-lg text-center font-medium text-indigo-600 hover:bg-gray-100 transition-colors"
                            >
                                vizoraofficial9@gmail.com
                            </a>
                            <p className="text-xs text-center text-gray-400">Response time: usually within 24 hours</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <a
                            href="https://github.com/CaptainRushi/Vizora1/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block border border-gray-100 rounded-xl p-5 bg-white hover:border-red-200 hover:bg-red-50/30 transition-colors group"
                        >
                            <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-red-700">🐛 Report a Bug</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Found an issue? Report it on our GitHub Issues page and we'll fix it ASAP.
                            </p>
                            <p className="text-xs text-indigo-600 mt-2 font-medium">Open GitHub Issues →</p>
                        </a>
                        <a
                            href="https://github.com/CaptainRushi/Vizora1/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block border border-gray-100 rounded-xl p-5 bg-white hover:border-purple-200 hover:bg-purple-50/30 transition-colors group"
                        >
                            <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-purple-700">✨ Request Feature</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Want to see a new feature? Submit your ideas on our GitHub Issues page.
                            </p>
                            <p className="text-xs text-indigo-600 mt-2 font-medium">Open GitHub Issues →</p>
                        </a>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Filing a Request</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                    <li>Include schema samples (sanitized if needed)</li>
                    <li>Describe expected vs actual behavior</li>
                    <li>Mention browser and OS version</li>
                    <li>Include screenshots for UI issues</li>
                </ul>
            </div>

            <div className="bg-indigo-900 rounded-xl p-6 text-white overflow-hidden relative">
                <div className="relative z-10">
                    <h4 className="font-bold mb-2">Security & Privacy</h4>
                    <p className="text-sm text-indigo-100 opacity-90 leading-relaxed">
                        For security concerns or data privacy inquiries, please contact our official email directly with "SECURITY" in the subject line.
                    </p>
                </div>
                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
            </div>
        </div>
    );
}

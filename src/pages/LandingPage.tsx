import { useNavigate } from 'react-router-dom';
import {
    Share2,
    CheckCircle2,
    Users,
    Database,
    Lock,
    BookOpen,
    GitBranch,
    Sparkles,
    AlertTriangle
} from 'lucide-react';
import { Hero } from '../components/Hero';
import { useAuth } from '../context/AuthContext';
import { Button, Card } from '../components/ui';
import { Logo } from '../components/VizoraLogo';

export function LandingPage() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleCtaClick = () => {
        if (user) {
            navigate('/projects');
        } else {
            navigate('/auth/signin');
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans selection:bg-indigo-100 selection:text-indigo-900 dark:selection:bg-indigo-900 dark:selection:text-indigo-100">
            {/* 1. HERO SECTION (Includes Navigation and Ambient Floating Cards) */}
            <Hero />

            <main>
                {/* 2. TRUST & SAFETY STRIP */}
                <section className="border-y border-slate-100 bg-slate-50/50">
                    <div className="app-container py-12">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                            {[
                                { icon: Lock, text: "No database credentials required" },
                                { icon: Database, text: "Schema-only analysis (read-only)" },
                                { icon: Sparkles, text: "AI answers backed by schema evidence" },
                                { icon: Users, text: "Built for backend engineers" }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 text-slate-500 hover:text-slate-900 transition-colors">
                                    <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                                        <item.icon className="w-5 h-5 text-indigo-500 opacity-90" />
                                    </div>
                                    <span className="text-sm font-bold tracking-tight leading-tight">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 3. PROBLEM STATEMENT */}
                <section className="app-section bg-white relative overflow-hidden">
                    <div className="app-container">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 className="mb-8">
                                    Database understanding breaks as systems grow
                                </h2>
                                <div className="space-y-6 mb-10">
                                    {[
                                        "Documentation drifts from the real schema",
                                        "Schema knowledge lives in senior engineers’ heads",
                                        "Legacy databases are hard to reason about",
                                        "AI tools give answers that are “almost right”",
                                        "Onboarding new developers is slow and interrupt-heavy"
                                    ].map((text, i) => (
                                        <div key={i} className="flex items-start gap-4">
                                            <div className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                            <p className="text-lg text-slate-600 leading-snug font-medium">{text}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl">
                                    <p className="text-indigo-900 font-bold leading-relaxed">
                                        Vizora exists to turn implicit schema knowledge into explicit, trusted intelligence.
                                    </p>
                                </div>
                            </div>
                            <div className="relative">
                                <Card className="bg-slate-50 border-slate-200 aspect-square flex flex-col items-center justify-center p-12 overflow-hidden group">
                                    <div className="w-full space-y-6 opacity-40 group-hover:opacity-100 transition-all duration-700">
                                        <div className="h-4 w-3/4 bg-slate-200 rounded-full" />
                                        <div className="h-4 w-full bg-slate-200 rounded-full" />
                                        <div className="h-4 w-5/6 bg-slate-200 rounded-full" />
                                        <div className="space-y-3 pt-4">
                                            <div className="h-px w-full bg-slate-200" />
                                            <div className="flex justify-between">
                                                <div className="h-3 w-20 bg-slate-100 rounded" />
                                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                            </div>
                                        </div>
                                        <div className="h-32 w-full border-2 border-dashed border-slate-200 rounded-2xl mt-4 flex items-center justify-center">
                                            <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Documentation Drift</div>
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </Card>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. WHAT VIZORA DOES (CORE VALUE) */}
                <section className="app-section bg-slate-900 text-white relative">
                    <div className="app-container text-center">
                        <h2 className="text-lg font-bold text-indigo-400 uppercase tracking-[0.2em] mb-6 text-indigo-400">How it works</h2>
                        <h3 className="text-white text-3xl sm:text-5xl font-extrabold tracking-tight mb-8">
                            Schema is the source of truth.
                        </h3>
                        <p className="text-xl text-slate-400 mb-16 leading-relaxed max-w-2xl mx-auto">
                            You paste your schema (SQL / Prisma / DDL), and Vizora handles the rest. No live DB access. No infra changes.
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            {[
                                "Generates ER diagrams",
                                "Reviews schema quality",
                                "Explains tables & relations",
                                "Produces versioned docs",
                                "Detects design risks",
                                "Answers with proof"
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl text-left">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                                    <span className="text-slate-200 font-semibold text-sm">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 5. CORE FEATURES */}
                <section id="features" className="app-section bg-white border-y border-slate-100">
                    <div className="app-container">
                        <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-center mb-32">
                            <div>
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                                    <Share2 className="w-6 h-6 text-indigo-600" />
                                </div>
                                <h3 className="mb-4 text-slate-900">Auto ER Diagrams</h3>
                                <p className="text-lg text-slate-500 mb-6 leading-relaxed">
                                    Generate accurate ER diagrams directly from your schema. Always up-to-date. No manual drawing.
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 shadow-inner">
                                <div className="aspect-video bg-white rounded-xl border border-slate-200 shadow-sm relative overflow-hidden flex items-center justify-center p-8">
                                    <div className="grid grid-cols-2 gap-8 w-full">
                                        <div className="h-20 bg-slate-50 border border-slate-100 rounded-lg flex flex-col justify-center p-3">
                                            <div className="h-2 w-12 bg-indigo-100 rounded mb-2" />
                                            <div className="h-1.5 w-16 bg-slate-100 rounded" />
                                        </div>
                                        <div className="h-20 bg-slate-50 border border-slate-100 rounded-lg flex flex-col justify-center p-3">
                                            <div className="h-2 w-12 bg-indigo-100 rounded mb-2" />
                                            <div className="h-1.5 w-16 bg-slate-100 rounded" />
                                        </div>
                                    </div>
                                    <svg className="absolute inset-0 w-full h-full opacity-30">
                                        <path d="M100 80 C 150 80, 200 120, 250 120" stroke="indigo" strokeWidth="2" fill="none" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-center mb-32 flex-row-reverse md:flex-row">
                            <div className="md:order-2">
                                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-6">
                                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                                </div>
                                <h3 className="mb-4 text-slate-900">Schema Review & Risk Insights</h3>
                                <p className="text-lg text-slate-500 mb-8 leading-relaxed">
                                    Detect issues early: Missing indexes, risky relationships, design smells, and scalability concerns.
                                    Think of it as a senior backend review for your schema.
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 md:order-1">
                                <div className="space-y-4">
                                    {[
                                        { t: "Missing unique index", s: "HIGH", c: "text-red-600 bg-red-50" },
                                        { t: "Large text field in primary key", s: "MED", c: "text-amber-600 bg-amber-50" },
                                        { t: "Potential circular dependency", s: "HIGH", c: "text-red-600 bg-red-50" }
                                    ].map((risk, i) => (
                                        <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm">
                                            <span className="font-bold text-slate-700 text-sm">{risk.t}</span>
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${risk.c}`}>{risk.s}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-16">
                            <Card className="p-10 hover:border-indigo-200 transition-colors">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-200">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="mb-4 text-slate-900">Ask Your Schema (Verified AI)</h3>
                                <p className="text-slate-500 mb-8 font-medium leading-relaxed">
                                    Ask questions like "Which tables affect billing?" and get answers with schema versioning, referenced tables, and exact relationships. No guessing. No hallucinations.
                                </p>
                                <div className="bg-slate-900 rounded-xl p-4 font-mono text-[11px] text-indigo-300">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                        <span>orders.user_id → users.id</span>
                                    </div>
                                    <div className="text-slate-500">Evidence: Foreign Key constraint in v12</div>
                                </div>
                            </Card>

                            <Card className="p-10 hover:border-emerald-200 transition-colors">
                                <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-100">
                                    <BookOpen className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="mb-4 text-slate-900">Auto Onboarding Guide</h3>
                                <p className="text-slate-500 mb-8 font-medium leading-relaxed">
                                    Generate a guide that explains core tables, key relationships, and data flow. Perfect for onboarding new engineers in minutes, not weeks.
                                </p>
                                <div className="space-y-2">
                                    <div className="h-2 w-full bg-slate-100 rounded" />
                                    <div className="h-2 w-3/4 bg-slate-100 rounded" />
                                    <div className="h-2 w-5/6 bg-slate-100 rounded" />
                                </div>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* 6. HOW IT WORKS (STEPS) */}
                <section className="app-section bg-slate-50">
                    <div className="app-container">
                        <div className="text-center mb-20">
                            <h2 className="text-slate-900">The implementation is instant</h2>
                        </div>
                        <div className="grid md:grid-cols-3 gap-16 relative">
                            {/* Connector line */}
                            <div className="hidden md:block absolute top-12 left-10 right-10 h-px bg-slate-200 z-0" />

                            {[
                                { step: "1", title: "Paste your schema", desc: "SQL / Prisma / DDL - no database connection needed." },
                                { step: "2", title: "Vizora Analyzes", desc: "We map structure, relationships, and hidden intent." },
                                { step: "3", title: "Get Insight", desc: "Diagrams, reviews, docs, and verified answers instantly." }
                            ].map((item, i) => (
                                <div key={i} className="relative z-10 flex flex-col items-center text-center">
                                    <div className="w-24 h-24 bg-white border border-slate-200 rounded-full flex items-center justify-center text-2xl font-black text-indigo-600 mb-6 shadow-sm">
                                        {item.step}
                                    </div>
                                    <h3 className="mb-3 text-slate-900">{item.title}</h3>
                                    <p className="text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 7. PRIVATE BETA STATUS */}
                <section id="pricing" className="app-section bg-white">
                    <div className="app-container">
                        <div className="max-w-4xl mx-auto bg-slate-50 border border-slate-100 rounded-[3rem] p-12 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12">
                                <Sparkles size={120} />
                            </div>
                            <h2 className="mb-6 text-slate-900">Open Private Beta</h2>
                            <p className="text-xl text-slate-500 font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
                                Vizora is currently in an invite-only private beta phase. We are collaborating with early users to refine our AI and diagramming capabilities.
                            </p>
                            <div className="flex flex-col items-center gap-6">
                                <div className="bg-white px-8 py-4 rounded-2xl border border-slate-100 shadow-sm">
                                    <p className="text-slate-900 font-black text-lg italic">
                                        "Currently free for all early access users. Billing will be announced post-beta."
                                    </p>
                                </div>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                                    Want to help shape our pricing? <a href="mailto:vizoraofficial9@gmail.com" className="text-indigo-600 underline">Get in touch →</a>
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 8. WHO IT'S FOR */}
                <section className="app-section bg-slate-50 border-y border-slate-100">
                    <div className="app-container">
                        <h2 className="text-center mb-16 text-slate-900">Built for scale</h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { type: "Backend Engineers", desc: "Understand complex legacy schemas faster." },
                                { type: "Solo Developers", desc: "Generate diagrams and docs without manual effort." },
                                { type: "Startups", desc: "Onboard engineers without tribal knowledge." },
                                { type: "Agencies", desc: "Explain and share client schemas clearly." }
                            ].map((item, i) => (
                                <Card key={i} className="p-8 bg-white hover:border-indigo-100 group transition-all text-center">
                                    <h4 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors tracking-tight">{item.type}</h4>
                                    <p className="text-sm text-slate-500 leading-relaxed font-medium">{item.desc}</p>
                                </Card>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 9. WHY VIZORA IS DIFFERENT */}
                <section className="app-section bg-white">
                    <div className="app-container">
                        <div className="grid md:grid-cols-2 gap-16">
                            <div className="space-y-6">
                                <h2 className="mb-8 text-slate-900">What we don't do</h2>
                                {[
                                    "No live database connections",
                                    "No unsafe AI guesses",
                                    "No outdated documentation"
                                ].map((text, i) => (
                                    <div key={i} className="flex items-center gap-4 text-slate-400">
                                        <div className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-xs font-black shrink-0">✕</div>
                                        <span className="text-lg font-medium">{text}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-6">
                                <h2 className="mb-8 text-slate-900">The Vizora Way</h2>
                                {[
                                    "Schema-first approach",
                                    "Evidence-based AI",
                                    "Versioned understanding",
                                    "Built for long-lived systems"
                                ].map((text, i) => (
                                    <div key={i} className="flex items-center gap-4 text-emerald-600">
                                        <div className="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-[10px] shrink-0">✅</div>
                                        <span className="text-lg font-bold">{text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 10. EVOLVING PRODUCT */}
                <section className="app-section bg-indigo-600 text-white rounded-[2rem] mx-4 sm:mx-8 mb-24 overflow-hidden relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)]" />
                    <div className="app-container text-center relative z-10">
                        <p className="text-xl sm:text-3xl font-bold leading-relaxed mb-10 italic">
                            "Vizora is currently in private beta, built in public with early feedback from backend engineers and teams."
                        </p>
                        <div className="flex flex-wrap justify-center gap-6 opacity-80">
                            {["Schema Review Rules", "AI Answer Quality", "Team Workflows"].map((item, i) => (
                                <div key={i} className="px-4 py-2 bg-white/10 rounded-full text-sm font-bold border border-white/20 uppercase tracking-widest">
                                    Shaping: {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 11. FINAL CTA */}
                <section className="app-section bg-white relative">
                    <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]"
                        style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '32px 32px' }}
                    />
                    <div className="app-container text-center relative z-10">
                        <h2 className="mb-10 lg:px-24 text-slate-900">
                            Start understanding your schema today
                        </h2>
                        <Button size="lg" onClick={handleCtaClick} className="h-16 px-16 text-xl shadow-2xl shadow-indigo-100">
                            Join Private Beta
                        </Button>
                        <div className="mt-10 flex flex-wrap justify-center gap-8 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                            <span>No DB credentials</span>
                            <span className="w-1 h-1 bg-slate-200 rounded-full mt-1.5" />
                            <span>No infra changes</span>
                            <span className="w-1 h-1 bg-slate-200 rounded-full mt-1.5" />
                            <span>No vendor lock-in</span>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-100 bg-white py-16 px-6">
                <div className="app-container">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-12 mb-16">
                        <div className="space-y-6 max-w-sm">
                            <div className="flex items-center gap-3">
                                <Logo size={32} animated={false} withBackground={true} />
                                <span className="vizora-brand text-2xl font-bold text-slate-900 tracking-tight">Vizora</span>
                            </div>
                            <p className="text-slate-500 font-medium leading-relaxed">
                                Vizora turns database schemas into diagrams, documentation, and verifiable AI answers — without connecting to your database.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-12 md:gap-24">
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-widest">Product</h4>
                                <ul className="space-y-3 text-sm text-slate-500 font-medium">
                                    <li><a href="#features" className="hover:text-indigo-600 transition-colors">Features</a></li>
                                    <li><a href="#" className="hover:text-indigo-600 transition-colors">Documentation</a></li>
                                </ul>
                            </div>
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-widest">Company</h4>
                                <ul className="space-y-3 text-sm text-slate-500 font-medium">
                                    <li><a href="mailto:vizoraofficial9@gmail.com" className="hover:text-indigo-600 transition-colors">Support</a></li>
                                    <li><a href="#" className="hover:text-indigo-600 transition-colors">Privacy</a></li>
                                    <li><a href="#" className="hover:text-indigo-600 transition-colors">Terms</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">© 2026 Vizora. All rights reserved.</p>
                        <div className="flex items-center gap-6">
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                                <Share2 className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                                <GitBranch className="w-4 h-4 text-slate-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

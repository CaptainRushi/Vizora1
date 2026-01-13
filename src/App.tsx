import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { MainLayout } from './layouts/MainLayout';
import { ProjectLayout } from './layouts/ProjectLayout';
import { useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import { BetaWatermark } from './components/BetaWatermark';
import { ProjectProvider } from './context/ProjectContext';

// Lazy load pages for code splitting
const ERDiagrams = lazy(() => import('./pages/ERDiagrams').then(m => ({ default: m.ERDiagrams })));
const SchemaInput = lazy(() => import('./pages/SchemaInput').then(m => ({ default: m.SchemaInput })));
const AiExplanations = lazy(() => import('./pages/AiExplanations').then(m => ({ default: m.AiExplanations })));
const AutoDocs = lazy(() => import('./pages/AutoDocs').then(m => ({ default: m.AutoDocs })));
const VersionHistory = lazy(() => import('./pages/VersionHistory').then(m => ({ default: m.VersionHistory })));
const ChangeTracking = lazy(() => import('./pages/ChangeTracking').then(m => ({ default: m.ChangeTracking })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Projects = lazy(() => import('./pages/Projects').then(m => ({ default: m.Projects })));
const SchemaDesigner = lazy(() => import('./pages/SchemaDesigner').then(m => ({ default: m.SchemaDesigner })));
const Billing = lazy(() => import('./pages/Billing').then(m => ({ default: m.Billing })));
const GlobalSettings = lazy(() => import('./pages/GlobalPages').then(m => ({ default: m.GlobalSettings })));
const Overview = lazy(() => import('./pages/Overview').then(m => ({ default: m.Overview })));
const SchemaExplorer = lazy(() => import('./pages/SchemaExplorer').then(m => ({ default: m.SchemaExplorer })));
const VersionCompare = lazy(() => import('./pages/VersionCompare').then(m => ({ default: m.VersionCompare })));
const Comments = lazy(() => import('./pages/Comments').then(m => ({ default: m.Comments })));
const UserDashboard = lazy(() => import('./pages/UserDashboard').then(m => ({ default: m.UserDashboard })));
const OnboardingForm = lazy(() => import('./pages/OnboardingForm').then(m => ({ default: m.OnboardingForm })));
const TeamMembers = lazy(() => import('./pages/TeamMembers').then(m => ({ default: m.TeamMembers })));
const InviteAccept = lazy(() => import('./pages/InviteAccept').then(m => ({ default: m.InviteAccept })));
const Help = lazy(() => import('./pages/Help').then(m => ({ default: m.Help })));
const SignInPage = lazy(() => import('./pages/auth/SignInPage').then(m => ({ default: m.SignInPage })));
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));

// Intelligence Features
const SchemaReview = lazy(() => import('./pages/Intelligence/SchemaReview'));
const OnboardingGuide = lazy(() => import('./pages/Intelligence/OnboardingGuide'));
const AskSchema = lazy(() => import('./pages/Intelligence/AskSchema'));

// Loading component
function PageLoader() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-500 font-medium">Loading...</p>
            </div>
        </div>
    );
}

/**
 * Guards routes that require authentication
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const [isInternalLoading, setIsInternalLoading] = useState(true);
    const [hasUser, setHasUser] = useState(false);

    useEffect(() => {
        if (!loading) {
            setHasUser(!!user);
            setIsInternalLoading(false);
        }
    }, [user, loading]);

    if (loading || isInternalLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!hasUser) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}

/**
 * Handles redirection after sign in or if already signed in
 */
function AuthRedirect() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => {
        if (!loading && user && !isRedirecting) {
            setIsRedirecting(true);

            // Check if user needs onboarding
            const checkOnboarding = async () => {
                try {
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('onboarded')
                        .eq('id', user.id)
                        .maybeSingle();

                    if (profileError) {
                        navigate('/onboarding', { replace: true });
                        return;
                    }

                    // If no profile or not onboarded, redirect to onboarding
                    if (!profile || !profile.onboarded) {
                        navigate('/onboarding', { replace: true });
                        return;
                    }

                    // Check for existing projects
                    const { data: projects, error: projectsError } = await supabase
                        .from('projects')
                        .select('id')
                        .order('created_at', { ascending: false })
                        .limit(1);

                    if (projectsError) {
                        navigate('/projects', { replace: true });
                        return;
                    }

                    if (projects && projects.length > 0) {
                        navigate(`/workspace/${projects[0].id}/overview`, { replace: true });
                    } else {
                        navigate('/projects', { replace: true });
                    }
                } catch (err) {
                    navigate('/onboarding', { replace: true });
                }
            };

            checkOnboarding();
        }
    }, [user, loading, navigate, isRedirecting]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return <SignInPage />;
}

function App() {
    return (
        <Router>
            <BetaWatermark />
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* Public Landing Page - Accessible to everyone */}
                    <Route path="/" element={<LandingPage />} />

                    {/* Authentication Page */}
                    <Route path="/auth/signin" element={<AuthRedirect />} />

                    {/* Onboarding - Protected */}
                    <Route path="/onboarding" element={
                        <AuthGuard>
                            <OnboardingForm />
                        </AuthGuard>
                    } />

                    {/* Public Invite Accept */}
                    <Route path="/join" element={<InviteAccept />} />

                    {/* WORKSPACE ROUTES - Protected */}
                    <Route path="/workspace/:projectId/*" element={
                        <AuthGuard>
                            <ProjectProvider>
                                <ProjectLayout>
                                    <Routes>
                                        <Route path="overview" element={<Overview />} />
                                        <Route path="team" element={<TeamMembers />} />
                                        <Route path="schema-input" element={<SchemaInput />} />
                                        <Route path="er-diagram" element={<ERDiagrams />} />
                                        <Route path="schema-designer" element={<SchemaDesigner />} />
                                        <Route path="explorer" element={<SchemaExplorer />} />
                                        <Route path="compare" element={<VersionCompare />} />
                                        <Route path="explanations" element={<AiExplanations />} />
                                        <Route path="docs" element={<AutoDocs />} />
                                        <Route path="versions" element={<VersionHistory />} />
                                        <Route path="changes" element={<ChangeTracking />} />
                                        <Route path="settings" element={<Settings />} />
                                        <Route path="comments" element={<Comments />} />

                                        {/* Intelligence Section */}
                                        <Route path="intelligence/review" element={<SchemaReview />} />
                                        <Route path="intelligence/onboarding" element={<OnboardingGuide />} />
                                        <Route path="intelligence/ask" element={<AskSchema />} />

                                        <Route path="*" element={<Navigate to="overview" replace />} />
                                    </Routes>
                                </ProjectLayout>
                            </ProjectProvider>
                        </AuthGuard>
                    } />

                    {/* Main Application - Protected */}
                    <Route path="/*" element={
                        <AuthGuard>
                            <MainLayout>
                                <Routes>
                                    <Route path="/dashboard" element={<Navigate to="/projects" replace />} />
                                    <Route path="/dashboard/account" element={<UserDashboard />} />
                                    <Route path="/projects" element={<Projects />} />
                                    <Route path="/account" element={<UserDashboard />} />
                                    <Route path="/designer" element={<SchemaDesigner />} />
                                    <Route path="/billing" element={<Billing />} />
                                    <Route path="/settings" element={<GlobalSettings />} />
                                    <Route path="/help" element={<Help />} />
                                    <Route path="*" element={<Navigate to="/projects" replace />} />
                                </Routes>
                            </MainLayout>
                        </AuthGuard>
                    } />
                </Routes>
            </Suspense>
        </Router>
    );
}

export default App;

import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MainLayout } from './layouts/MainLayout';
import { ProjectLayout } from './layouts/ProjectLayout';
import {
    ERDiagrams,
    SchemaInput,
    PlaceholderPage,
    AiExplanations,
    AutoDocs,
    VersionHistory,
    ChangeTracking,
    Settings,
    Projects,
    SchemaDesigner,
    Billing,
    GlobalSettings,
    Overview,
    SchemaExplorer,
    VersionCompare,
    Comments,
    UserDashboard,
    OnboardingForm,
    TeamMembers,
    InviteAccept
} from './pages';
import { SignInPage } from './pages/auth/SignInPage';
import { useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import { Hero } from './components/Hero';

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
            <Routes>
                {/* Public Landing Page - Accessible to everyone */}
                <Route path="/" element={<Hero />} />

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
                                <Route path="*" element={<Navigate to="overview" replace />} />
                            </Routes>
                        </ProjectLayout>
                    </AuthGuard>
                } />

                {/* Main Application - Protected */}
                <Route path="/*" element={
                    <AuthGuard>
                        <MainLayout>
                            <Routes>
                                <Route path="/dashboard" element={<Navigate to="/projects" replace />} />
                                <Route path="/projects" element={<Projects />} />
                                <Route path="/account" element={<UserDashboard />} />
                                <Route path="/designer" element={<SchemaDesigner />} />
                                <Route path="/billing" element={<Billing />} />
                                <Route path="/settings" element={<GlobalSettings />} />
                                <Route path="/help" element={<PlaceholderPage title="Help / Docs" />} />
                                <Route path="*" element={<Navigate to="/projects" replace />} />
                            </Routes>
                        </MainLayout>
                    </AuthGuard>
                } />
            </Routes>
        </Router>
    );
}

export default App;

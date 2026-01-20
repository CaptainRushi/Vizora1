import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { MainLayout } from './layouts/MainLayout';
import { ProjectLayout } from './layouts/ProjectLayout';
import { useAuth } from './context/AuthContext';
import { BetaWatermark } from './components/BetaWatermark';
import { ProjectProvider } from './context/ProjectContext';
import { LoadingSection } from './components/LoadingSection';
import { TabTransitionLoader } from './components/TabTransitionLoader';

// Lazy load pages for code splitting
const ERDiagrams = lazy(() => import('./pages/ERDiagrams').then(m => ({ default: m.ERDiagrams })));
const SchemaInput = lazy(() => import('./pages/SchemaInput').then(m => ({ default: m.SchemaInput })));
const AiExplanations = lazy(() => import('./pages/AiExplanations').then(m => ({ default: m.AiExplanations })));
const AutoDocs = lazy(() => import('./pages/AutoDocs').then(m => ({ default: m.AutoDocs })));
const VersionHistory = lazy(() => import('./pages/VersionHistory').then(m => ({ default: m.VersionHistory })));
const ChangeTracking = lazy(() => import('./pages/ChangeTracking').then(m => ({ default: m.ChangeTracking })));
const Projects = lazy(() => import('./pages/Projects').then(m => ({ default: m.Projects })));
const SchemaDesigner = lazy(() => import('./pages/SchemaDesigner').then(m => ({ default: m.SchemaDesigner })));
const GlobalSettings = lazy(() => import('./pages/GlobalPages').then(m => ({ default: m.GlobalSettings })));
const Overview = lazy(() => import('./pages/Overview').then(m => ({ default: m.Overview })));
const SchemaExplorer = lazy(() => import('./pages/SchemaExplorer').then(m => ({ default: m.SchemaExplorer })));
const VersionCompare = lazy(() => import('./pages/VersionCompare').then(m => ({ default: m.VersionCompare })));
const Comments = lazy(() => import('./pages/Comments').then(m => ({ default: m.Comments })));
const UserDashboard = lazy(() => import('./pages/UserDashboard').then(m => ({ default: m.UserDashboard })));
const TeamMembers = lazy(() => import('./pages/TeamMembers').then(m => ({ default: m.TeamMembers })));
const InviteAccept = lazy(() => import('./pages/InviteAccept').then(m => ({ default: m.InviteAccept })));
const JoinTeam = lazy(() => import('./pages/JoinTeam').then(m => ({ default: m.JoinTeam })));
const ProjectSettings = lazy(() => import('./pages/ProjectSettings').then(m => ({ default: m.ProjectSettings })));
const Help = lazy(() => import('./pages/Help').then(m => ({ default: m.Help })));
const SignInPage = lazy(() => import('./pages/auth/SignInPage').then(m => ({ default: m.SignInPage })));
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));

// Intelligence Features
const SchemaReview = lazy(() => import('./pages/Intelligence/SchemaReview'));
const OnboardingGuide = lazy(() => import('./pages/Intelligence/OnboardingGuide'));
const AskSchema = lazy(() => import('./pages/Intelligence/AskSchema'));

const WorkspaceEditor = lazy(() => import('./pages/Workspace/WorkspaceEditor').then(m => ({ default: m.WorkspaceEditor })));
const CreateWorkspace = lazy(() => import('./pages/Workspace/CreateWorkspace').then(m => ({ default: m.CreateWorkspace })));
const WorkspaceTeam = lazy(() => import('./pages/Workspace/WorkspaceTeam').then(m => ({ default: m.WorkspaceTeam })));
const WorkspaceVersionHistory = lazy(() => import('./pages/Workspace/WorkspaceVersionHistory').then(m => ({ default: m.WorkspaceVersionHistory })));
const WorkspaceVersionCompare = lazy(() => import('./pages/Workspace/WorkspaceVersionCompareEnhanced').then(m => ({ default: m.WorkspaceVersionCompareEnhanced })));

// Loading component
function PageLoader() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <LoadingSection title="Vizora is thinking..." subtitle="Preparing a premium intelligence experience for you." />
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
                <LoadingSection title="Authenticating..." subtitle="Securing your schema data." variant="inline" />
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
/**
 * Handles redirection after sign in or if already signed in
 */
function AuthRedirect() {
    const { user, identity, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Wait for both user AND identity (if user exists)
        if (!loading && user) {
            if (!identity) {
                // Identity still fetching...
                return;
            }

            // Universal Identity Check
            if (!identity.has_completed_profile) {
                // Redirect to profile setup
                navigate('/account?setup=true', { replace: true });
            } else {
                // Normal flow: Go to Dashboard/Projects
                navigate('/projects', { replace: true });
            }
        }
    }, [user, identity, loading, navigate]);

    // Show loader while Auth OR Identity is loading
    if (loading || (user && !identity)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <LoadingSection title="Verifying Identity..." subtitle="Connecting to Universal ID system." variant="inline" />
            </div>
        );
    }

    // If no user and not loading, show Sign In
    if (!user) {
        return <SignInPage />;
    }

    return null;
}

import { Toaster } from 'react-hot-toast';

function App() {
    return (
        <Router>
            <Toaster position="bottom-right" toastOptions={{
                style: {
                    background: '#334155',
                    color: '#fff',
                    borderRadius: '12px',
                    fontSize: '14px',
                    padding: '12px 20px',
                },
            }} />
            <BetaWatermark />
            <TabTransitionLoader />
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* Public Landing Page - Accessible to everyone */}
                    <Route path="/" element={<LandingPage />} />

                    {/* Authentication Page */}
                    <Route path="/auth/signin" element={<AuthRedirect />} />


                    {/* Public Invite Accept (Legacy) */}
                    <Route path="/join" element={<InviteAccept />} />

                    {/* Team Join Link (New secure flow) */}
                    <Route path="/join/team" element={<JoinTeam />} />

                    {/* WORKSPACE V2 ROUTES - Protected */}
                    <Route path="/workspaces/create" element={
                        <AuthGuard>
                            <MainLayout>
                                <CreateWorkspace />
                            </MainLayout>
                        </AuthGuard>
                    } />
                    <Route path="/workspaces/:workspaceId" element={
                        <AuthGuard>
                            <MainLayout>
                                <WorkspaceEditor />
                            </MainLayout>
                        </AuthGuard>
                    } />
                    <Route path="/workspaces/:workspaceId/team" element={
                        <AuthGuard>
                            <MainLayout>
                                <WorkspaceTeam />
                            </MainLayout>
                        </AuthGuard>
                    } />
                    <Route path="/workspaces/:workspaceId/history" element={
                        <AuthGuard>
                            <MainLayout>
                                <WorkspaceVersionHistory />
                            </MainLayout>
                        </AuthGuard>
                    } />
                    <Route path="/workspaces/:workspaceId/compare" element={
                        <AuthGuard>
                            <MainLayout>
                                <WorkspaceVersionCompare />
                            </MainLayout>
                        </AuthGuard>
                    } />

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
                                        <Route path="settings" element={<ProjectSettings />} />
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
                                    <Route path="/billing" element={<Navigate to="/projects" replace />} />
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

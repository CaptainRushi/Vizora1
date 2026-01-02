import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
    UserDashboard
} from './pages';
import { TeamMembers } from './pages/TeamMembers';
import { InviteAccept } from './pages/InviteAccept';

import { Hero } from './components/Hero';

function App() {
    return (
        <Router>
            <Routes>
                {/* Public Landing Page - No Layout */}
                <Route path="/" element={<Hero />} />

                {/* Public Invite Accept - No Layout */}
                <Route path="/invite/accept" element={<InviteAccept />} />

                {/* WORKSPACE ROUTES - Strictly Scoped - Standalone ProjectLayout */}
                <Route path="/workspace/:projectId/*" element={
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
                            {/* Default redirect within workspace */}
                            <Route path="*" element={<Navigate to="overview" replace />} />
                        </Routes>
                    </ProjectLayout>
                } />

                {/* Main Application - Wrapped in Layout */}
                <Route path="/*" element={
                    <MainLayout>
                        <Routes>
                            {/* Redirect root of /app to projects if needed, but here we just map direct paths */}
                            <Route path="/projects" element={<Projects />} />
                            <Route path="/account" element={<UserDashboard />} />
                            <Route path="/designer" element={<SchemaDesigner />} />
                            <Route path="/billing" element={<Billing />} />
                            <Route path="/settings" element={<GlobalSettings />} />
                            <Route path="/help" element={<PlaceholderPage title="Help / Docs" />} />

                            {/* Catch-all: If user is logged in, redirect unknown paths to projects */}
                            <Route path="*" element={<Navigate to="/projects" replace />} />
                        </Routes>
                    </MainLayout>
                } />
            </Routes>
        </Router>
    );
}

export default App;


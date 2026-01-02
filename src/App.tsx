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

function App() {
    return (
        <Router>
            <MainLayout>
                <Routes>
                    {/* GLOBAL ROUTES - Standard Navigation */}
                    <Route path="/" element={<Navigate to="/projects" replace />} />
                    <Route path="/projects" element={<Projects />} />
                    <Route path="/account" element={<UserDashboard />} />
                    <Route path="/designer" element={<SchemaDesigner />} />
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/settings" element={<GlobalSettings />} />
                    <Route path="/help" element={<PlaceholderPage title="Help / Docs" />} />

                    {/* WORKSPACE ROUTES - Strictly Scoped */}
                    <Route path="/workspace/:projectId/*" element={
                        <ProjectLayout>
                            {/* We use Routes here to nest, or we could use Outlet pattern if we refactor ProjectLayout.
                                But since ProjectLayout just renders children, we can use Routes inside it.
                                Actually V6 allows nested Routes cleanly.
                            */}
                            <Routes>
                                <Route path="overview" element={<Overview />} />
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

                    {/* Catch-all redirect to projects */}
                    <Route path="*" element={<Navigate to="/projects" replace />} />
                </Routes>
            </MainLayout>
        </Router>
    );
}

export default App;


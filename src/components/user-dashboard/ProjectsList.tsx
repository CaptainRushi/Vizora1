import { useState } from 'react';
import { Folder, ExternalLink, Edit2, Trash2, FolderPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Project {
    id: string;
    name: string;
    schema_type: 'SQL' | 'Prisma';
    updated_at: string;
    version_count: number;
}

export function ProjectsList() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([
        { id: '1', name: 'E-commerce Database', schema_type: 'SQL', updated_at: '2024-01-15', version_count: 12 },
        { id: '2', name: 'Analytics Schema', schema_type: 'Prisma', updated_at: '2024-01-10', version_count: 8 },
    ]);

    const handleDelete = (id: string) => {
        if (!confirm('Delete this project? This action cannot be undone.')) return;
        setProjects(projects.filter(p => p.id !== id));
    };

    const handleOpen = (id: string) => {
        navigate(`/workspace/${id}/overview`);
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Projects</h2>
                    <p className="text-sm font-medium text-gray-500 mt-2">
                        All schema projects in your workspace.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/projects')}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-black rounded-xl hover:bg-black transition-all active:scale-95"
                >
                    <FolderPlus className="h-4 w-4" />
                    New Project
                </button>
            </div>

            {projects.length === 0 ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center">
                    <Folder className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-gray-900 mb-2">No projects yet</h3>
                    <p className="text-sm font-medium text-gray-500 mb-6">
                        Create your first schema project to begin exploring.
                    </p>
                    <button
                        onClick={() => navigate('/projects')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-black rounded-xl hover:bg-black transition-all active:scale-95"
                    >
                        <FolderPlus className="h-4 w-4" />
                        Create Project
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-gray-300 hover:shadow-lg hover:shadow-gray-100 transition-all group"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                        <Folder className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-sm font-black text-gray-900">{project.name}</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs font-bold text-gray-500">
                                                {project.schema_type}
                                            </span>
                                            <span className="h-1 w-1 rounded-full bg-gray-300" />
                                            <span className="text-xs font-medium text-gray-400">
                                                {project.version_count} versions
                                            </span>
                                            <span className="h-1 w-1 rounded-full bg-gray-300" />
                                            <span className="text-xs font-medium text-gray-400">
                                                Updated {new Date(project.updated_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleOpen(project.id)}
                                        className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                        title="Open Project"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                    </button>
                                    <button
                                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                        title="Rename"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(project.id)}
                                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

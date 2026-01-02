import { useState } from 'react';
import { User, Building, Users, Folder, Settings, CreditCard } from 'lucide-react';
import { ProfileForm } from '../components/user-dashboard/ProfileForm';
import { CompanyForm } from '../components/user-dashboard/CompanyForm';
import { TeamMembers } from '../components/user-dashboard/TeamMembers';
import { ProjectsList } from '../components/user-dashboard/ProjectsList';
import { Preferences } from '../components/user-dashboard/Preferences';
import { Billing } from '../components/user-dashboard/Billing';

type Section = 'profile' | 'company' | 'team' | 'projects' | 'preferences' | 'billing';

export function UserDashboard() {
    const [activeSection, setActiveSection] = useState<Section>('profile');

    const sections = [
        { id: 'profile' as Section, label: 'Profile', icon: User },
        { id: 'company' as Section, label: 'Company', icon: Building },
        { id: 'team' as Section, label: 'Team Members', icon: Users },
        { id: 'projects' as Section, label: 'Projects', icon: Folder },
        { id: 'preferences' as Section, label: 'Preferences', icon: Settings },
        { id: 'billing' as Section, label: 'Billing', icon: CreditCard },
    ];

    const renderContent = () => {
        switch (activeSection) {
            case 'profile':
                return <ProfileForm />;
            case 'company':
                return <CompanyForm />;
            case 'team':
                return <TeamMembers />;
            case 'projects':
                return <ProjectsList />;
            case 'preferences':
                return <Preferences />;
            case 'billing':
                return <Billing />;
            default:
                return <ProfileForm />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
                <div className="p-6">
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">Account</h1>
                    <p className="text-xs font-medium text-gray-400 mt-1 uppercase tracking-wider">Workspace Management</p>
                </div>

                <nav className="px-3 space-y-1">
                    {sections.map((section) => {
                        const Icon = section.icon;
                        const isActive = activeSection === section.id;

                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${isActive
                                        ? 'bg-gray-900 text-white'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <Icon className="h-5 w-5" />
                                {section.label}
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-4xl mx-auto py-12 px-8">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}

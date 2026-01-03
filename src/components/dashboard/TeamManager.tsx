import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';

export function TeamManager() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-400">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Team Management Moved</h2>
            <p className="max-w-md mx-auto mb-6 text-slate-500">
                Team management is now handled at the Workspace level.
                Please visit your User Dashboard to invite members and manage your team.
            </p>
            <Link
                to="/account"
                className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors"
            >
                Go to Dashboard
            </Link>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle, ArrowRight, Loader2 } from 'lucide-react';

export function InviteAccept() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [error, setError] = useState('');
    const [projectId, setProjectId] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setError('Missing invitation token.');
            return;
        }

        const acceptInvite = async () => {
            try {
                const { data } = await axios.post('http://localhost:3001/team/invite/accept', { token });
                if (data.success) {
                    setStatus('success');
                    setProjectId(data.projectId);
                }
            } catch (err: any) {
                setStatus('error');
                setError(err.response?.data?.error || 'Failed to accept invitation.');
            }
        };

        // Small delay for UX
        setTimeout(acceptInvite, 1000);
    }, [token]);

    const handleContinue = () => {
        navigate(projectId ? `/workspace/${projectId}/overview` : '/projects');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 text-center border border-slate-100">

                {status === 'verifying' && (
                    <div className="py-8">
                        <Loader2 className="w-12 h-12 text-indigo-600 mx-auto animate-spin mb-4" />
                        <h2 className="text-xl font-bold text-slate-900">Verifying Invitation...</h2>
                        <p className="text-slate-500 mt-2">Please wait while we secure your access.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="py-8 animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900">Welcome to the Team!</h2>
                        <p className="text-slate-500 mt-2 mb-8">You have successfully joined the project.</p>

                        <button
                            onClick={handleContinue}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 group"
                        >
                            Go to Dashboard
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="py-8 animate-in shake duration-300">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Invitation Failed</h2>
                        <p className="text-slate-500 mt-2 mb-8">{error}</p>

                        <a
                            href="/"
                            className="inline-block text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                            Back to Home
                        </a>
                    </div>
                )}
            </div>

            <div className="mt-8 text-center text-slate-400 text-xs text-balance">
                Vizora Secure Team Access
            </div>
        </div>
    );
}

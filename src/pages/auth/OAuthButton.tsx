
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface OAuthButtonProps {
    provider: 'google' | 'github';
    icon: React.ReactNode;
    label: string;
    className?: string;
}

export const OAuthButton: React.FC<OAuthButtonProps> = ({ provider, icon, label, className }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignIn = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const redirectUrl = window.location.origin + '/';

            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: false,
                },
            });

            if (error) {
                console.error(`[OAuth] Error:`, error);
                setError(error.message || 'Failed to sign in. Please try again.');
                setIsLoading(false);
            }

        } catch (err) {
            console.error('[OAuth] Exception:', err);
            setError('An unexpected error occurred. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-2">
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    handleSignIn();
                }}
                disabled={isLoading}
                className={`flex items-center justify-center gap-3 w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 border disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            >
                {isLoading ? (
                    <>
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Connecting...</span>
                    </>
                ) : (
                    <>
                        {icon}
                        <span>{label}</span>
                    </>
                )}
            </button>
            {error && (
                <p className="text-xs text-red-600 text-center">{error}</p>
            )}
        </div>
    );
};

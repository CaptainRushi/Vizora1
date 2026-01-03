
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const initializationStarted = useRef(false);

    useEffect(() => {
        // Prevent multiple simultaneous initializations
        if (initializationStarted.current) return;
        initializationStarted.current = true;

        const handleAuth = async () => {

            // 1. Listen for auth changes FIRST so we don't miss any events during async check
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, currentSession: Session | null) => {

                setSession(currentSession);
                setUser(currentSession?.user ?? null);

                // If we get a session, we're definitely done loading
                if (currentSession) {
                    setLoading(false);
                }
            });

            // 2. Initial manual check
            try {
                const hash = window.location.hash;
                const search = window.location.search;
                const hasAuthParams = hash.includes('access_token') || search.includes('code=');

                if (hasAuthParams) {
                    // Longer wait for PKCE exchange
                    await new Promise(resolve => setTimeout(resolve, 2500));
                }

                const { data: { session: initialSession } } = await supabase.auth.getSession();

                if (initialSession) {
                    setSession(initialSession);
                    setUser(initialSession.user);
                    setLoading(false);
                } else if (!hasAuthParams) {
                    // Only finish loading if we're not expecting a redirect/callback
                    setLoading(false);
                } else {
                    // If we have params but no session, wait a bit longer for the event listener
                    setTimeout(() => setLoading(false), 3000);
                }
            } catch (err) {
                console.error('[AuthContext] Session check error:', err);
                setLoading(false);
            }

            return subscription;
        };

        let activeSubscription: { unsubscribe: () => void } | null = null;
        handleAuth().then(sub => {
            activeSubscription = sub;
        });

        return () => {
            if (activeSubscription) activeSubscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        try {
            setLoading(true);
            await supabase.auth.signOut();
        } finally {
            setSession(null);
            setUser(null);
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

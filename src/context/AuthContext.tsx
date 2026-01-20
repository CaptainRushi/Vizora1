
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

export interface UserIdentity {
    universal_id: string;
    username: string | null;
    display_name: string | null;
    email: string;
    workspace_name: string | null;
    has_completed_profile: boolean;
    // Compatibility fields
    role?: string | null;
    workspace_id?: string | null;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    identity: UserIdentity | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshIdentity: (userId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [identity, setIdentity] = useState<UserIdentity | null>(null);
    const [loading, setLoading] = useState(true);
    const initializationStarted = useRef(false);

    const refreshIdentity = async (userId?: string) => {
        const id = userId || user?.id;
        if (!id) {
            setIdentity(null);
            return;
        }

        try {
            // Fetch from authoritative backend endpoint
            const response = await fetch(`${API_URL}/api/me`, {
                headers: {
                    'x-user-id': id
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch identity');
            }

            const data = await response.json();
            setIdentity(data);
        } catch (err) {
            console.error('[AuthContext] Identity fetch error:', err);
            // Even on error, we don't use fallbacks. Truth is absolute.
        }
    };

    useEffect(() => {
        if (user?.id) {
            refreshIdentity(user.id);
        }
    }, [user?.id]);

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
            setIdentity(null);
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ session, user, identity, loading, signOut, refreshIdentity }}>
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

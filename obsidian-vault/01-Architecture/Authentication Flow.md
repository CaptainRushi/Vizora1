# 🔒 Authentication Flow

> Complete authentication system using Supabase Auth

---

## 📊 Auth Overview

```mermaid
graph TB
    subgraph Providers["Auth Providers"]
        Email[Email/Password]
        Google[Google OAuth]
        GitHub[GitHub OAuth]
    end
    
    subgraph Supabase["Supabase Auth"]
        Auth[Auth Service]
        JWT[JWT Token]
        Session[Session Management]
    end
    
    subgraph App["Application"]
        Context[AuthContext]
        Guards[Route Guards]
        API[API Calls]
    end
    
    Providers --> Supabase
    Supabase --> App
```

---

## 🔄 Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant S as Supabase Auth
    participant DB as Database
    
    U->>F: Click Sign In
    F->>S: signInWithOAuth (Google/GitHub)
    S->>U: Redirect to Provider
    U->>S: Authorize
    S->>F: Return with Session
    
    F->>DB: Check Profile
    alt No Profile
        F->>U: Redirect to Onboarding
        U->>F: Complete Onboarding
        F->>DB: Create Profile
        F->>DB: Create Workspace
    else Has Profile
        F->>DB: Check Projects
        alt Has Projects
            F->>U: Redirect to Workspace
        else No Projects
            F->>U: Redirect to Projects
        end
    end
```

---

## 🔧 Implementation

### AuthContext Provider

```tsx
// src/context/AuthContext.tsx
interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithGitHub: () => Promise<void>;
    signOut: () => Promise<void>;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });
        
        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setUser(session?.user ?? null);
            }
        );
        
        return () => subscription.unsubscribe();
    }, []);
    
    const signInWithGoogle = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/signin` }
        });
    };
    
    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
```

### Route Guards

```tsx
// AuthGuard - Protects authenticated routes
function AuthGuard({ children }) {
    const { user, loading } = useAuth();
    
    if (loading) return <LoadingSpinner />;
    if (!user) return <Navigate to="/" />;
    
    return <>{children}</>;
}

// Usage in App.tsx
<Route path="/projects" element={
    <AuthGuard>
        <Projects />
    </AuthGuard>
} />
```

### Onboarding Check

```tsx
// AuthRedirect - Handles post-login routing
function AuthRedirect() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    
    useEffect(() => {
        if (!loading && user) {
            checkOnboarding();
        }
    }, [user, loading]);
    
    const checkOnboarding = async () => {
        const { data: profile } = await supabase
            .from('profiles')
            .select('onboarded')
            .eq('id', user.id)
            .maybeSingle();
        
        if (!profile || !profile.onboarded) {
            navigate('/onboarding');
        } else {
            navigate('/projects');
        }
    };
}
```

---

## 📋 Onboarding Flow

```mermaid
stateDiagram-v2
    [*] --> AuthComplete: OAuth Success
    AuthComplete --> CheckProfile
    
    CheckProfile --> CreateProfile: No Profile
    CheckProfile --> CheckOnboarded: Profile Exists
    
    CreateProfile --> OnboardingForm
    CheckOnboarded --> OnboardingForm: Not Onboarded
    CheckOnboarded --> Dashboard: Onboarded
    
    OnboardingForm --> SetUsername
    SetUsername --> SetRoleTitle
    SetRoleTitle --> CreateWorkspace
    CreateWorkspace --> Dashboard
    
    Dashboard --> [*]
```

---

## 🔐 Security Considerations

### JWT Token Handling
- Tokens stored in browser (Supabase SDK handles)
- Auto-refresh before expiry
- Secure by default (HTTPOnly cookies optional)

### RLS Integration
```sql
-- Example RLS policy using auth.uid()
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (id = auth.uid());
```

---

## 📁 Related Notes

- [[System Architecture]]
- [[Database Schema Overview]]
- [[Profiles Table]]

---

#authentication #security #supabase #oauth

# 📐 Complete System Diagram

> Comprehensive platform architecture visualizations

---

## 🏗️ Full System Architecture

```mermaid
graph TB
    subgraph Users["👥 Users"]
        Web[Web Browser]
    end
    
    subgraph Frontend["🖥️ Frontend Layer"]
        subgraph React["React SPA"]
            Router[React Router]
            Auth[Auth Context]
            Project[Project Context]
        end
        
        subgraph Pages["Pages"]
            Landing[Landing]
            Dashboard[Dashboard]
            Workspace[Workspace]
            Designer[Designer]
        end
        
        subgraph Components["Components"]
            Sidebar[Sidebar]
            ER[ER Diagram]
            Docs[Docs Viewer]
        end
    end
    
    subgraph Backend["⚙️ Backend Layer"]
        subgraph Express["Express Server"]
            API[REST API]
            Middleware[Middleware]
        end
        
        subgraph Services["Services"]
            Parser[Schema Parser]
            AIEngine[AI Engine]
            DocGen[Doc Generator]
            Billing[Billing Service]
        end
    end
    
    subgraph Data["💾 Data Layer"]
        subgraph Supabase["Supabase"]
            PG[(PostgreSQL)]
            AuthDB[Auth]
            Storage[Storage]
        end
    end
    
    subgraph External["🌐 External"]
        OpenRouter[OpenRouter/GPT]
        Razorpay[Razorpay]
    end
    
    Web --> React
    React --> Pages
    Pages --> Components
    Components --> Express
    Express --> Services
    Services --> Supabase
    Services --> External
```

---

## 🗄️ Complete Database ERD

```mermaid
erDiagram
    %% User Management
    profiles ||--o{ workspaces : owns
    profiles ||--o{ workspace_members : "belongs to"
    
    %% Workspaces
    workspaces ||--o{ workspace_members : has
    workspaces ||--o{ workspace_invites : creates
    workspaces ||--o{ projects : contains
    workspaces ||--|| workspace_billing : has
    workspaces ||--|| workspace_usage : tracks
    workspaces ||--o{ payments : logs
    workspaces ||--o{ activity_logs : records
    
    %% Projects
    projects ||--o{ schema_versions : "has versions"
    projects ||--o{ diagram_states : stores
    projects ||--o{ schema_explanations : generates
    projects ||--o{ documentation_outputs : produces
    projects ||--o{ schema_changes : tracks
    projects ||--o{ schema_reviews : analyzes
    projects ||--o{ onboarding_guides : creates
    projects ||--o{ schema_comments : has
    projects ||--o{ ask_schema_logs : logs
    projects ||--|| project_settings : configures
    
    %% Billing
    billing_plans ||--o{ workspace_billing : defines
    billing_plans ||--o{ payments : "charged for"
    
    %% Beta
    profiles ||--|| beta_usage : tracks
    profiles ||--o{ user_feedback : submits

    %% Entities with columns
    profiles {
        uuid id PK
        text username UK
        text role_title
        boolean onboarded
        uuid default_workspace_id FK
    }
    
    workspaces {
        uuid id PK
        text name
        text type
        uuid owner_id FK
    }
    
    projects {
        uuid id PK
        text name
        text schema_type
        text current_step
        uuid workspace_id FK
        uuid owner_id FK
    }
    
    schema_versions {
        uuid id PK
        uuid project_id FK
        int version
        text raw_schema
        jsonb normalized_schema
        text schema_hash
    }
    
    billing_plans {
        text id PK
        int price_inr
        int project_limit
        int version_limit
        text ai_level
    }
```

---

## 🔄 Data Flow Diagram

```mermaid
flowchart TB
    subgraph Input["📥 Input"]
        SQL[SQL Schema]
        Prisma[Prisma Schema]
        Drizzle[Drizzle Schema]
    end
    
    subgraph Parser["🔄 Parser"]
        Parse[Schema Parser]
        Normalize[Normalizer]
    end
    
    subgraph Storage["💾 Storage"]
        Versions[(Schema Versions)]
        Changes[(Schema Changes)]
    end
    
    subgraph AI["🤖 AI Engine"]
        Explain[Explanations]
        Review[Review]
        Ask[Ask Schema]
        Guide[Onboarding]
    end
    
    subgraph Output["📤 Output"]
        ER[ER Diagram]
        Docs[Documentation]
        Code[Generated Code]
        PDF[PDF Export]
    end
    
    Input --> Parser
    Parser --> Storage
    Storage --> AI
    Storage --> Output
    AI --> Output
```

---

## 👤 User Journey

```mermaid
journey
    title User Journey in Vizora
    section Discovery
        Visit Landing: 5: User
        View Features: 4: User
        Sign Up: 5: User
    section Onboarding
        Create Profile: 3: User
        Create Workspace: 3: User
    section First Project
        Create Project: 4: User
        Paste Schema: 5: User
        View ER Diagram: 5: User
        Read AI Explanations: 5: User
    section Advanced Usage
        Generate Docs: 4: User
        Compare Versions: 4: User
        Invite Team: 3: User
        Ask Questions: 5: User
    section Upgrade
        Hit Limits: 2: User
        View Plans: 3: User
        Upgrade to Pro: 5: User
```

---

## 🔐 Authentication Flow

```mermaid
stateDiagram-v2
    [*] --> Landing
    Landing --> SignIn: Click Sign In
    SignIn --> OAuth: Choose Provider
    OAuth --> Callback: Authorize
    
    Callback --> CheckProfile: Success
    
    CheckProfile --> Onboarding: No Profile
    CheckProfile --> HasProjects: Profile Exists
    
    Onboarding --> CreateWorkspace: Complete Form
    CreateWorkspace --> Projects: Done
    
    HasProjects --> Projects: No Projects
    HasProjects --> Workspace: Has Projects
    
    Projects --> CreateProject: New Project
    CreateProject --> Workspace: Created
    
    Workspace --> [*]: Sign Out
```

---

## 🔄 Schema Processing Pipeline

```mermaid
graph LR
    A[Raw Schema] --> B[Detect Type]
    B --> C{Type?}
    C -->|SQL| D[parseSqlDeterministic]
    C -->|Prisma| E[parsePrisma]
    C -->|Drizzle| F[parseDrizzle]
    D & E & F --> G[Normalized JSON]
    G --> H[Compute Hash]
    H --> I{Changed?}
    I -->|No| J[Return Existing]
    I -->|Yes| K[Create Version]
    K --> L[Track Changes]
    L --> M[Trigger AI]
    M --> N[Generate Docs]
```

---

## 📁 Related Notes

- [[System Architecture]]
- [[Database Schema Overview]]
- [[Feature Index]]

---

#diagrams #architecture #visualization

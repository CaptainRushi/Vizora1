# 🏗️ System Architecture

> Complete architectural overview of the Vizora platform

---

## 📐 High-Level Architecture

```mermaid
graph TB
    subgraph Client["🌐 Client Layer"]
        Browser[Web Browser]
    end
    
    subgraph Frontend["🖥️ Frontend - React SPA"]
        Vite[Vite Dev Server<br/>Port: 5173]
        Router[React Router v6]
        Context[Auth & Project Context]
        Components[Component Library]
    end
    
    subgraph Backend["⚙️ Backend - Express Server"]
        Express[Express.js<br/>Port: 3001]
        Middleware[Middleware Layer]
        Routes[API Routes]
        Services[Service Layer]
    end
    
    subgraph Data["🗄️ Data Layer"]
        Supabase[(Supabase PostgreSQL)]
        Storage[Supabase Storage]
    end
    
    subgraph AI["🤖 AI Services"]
        OpenRouter[OpenRouter API]
        GPT[GPT-4o-mini]
    end
    
    subgraph Payments["💳 Payments"]
        Razorpay[Razorpay Gateway]
    end
    
    Browser --> Vite
    Vite --> Router
    Router --> Context
    Context --> Components
    Components --> Express
    Express --> Middleware
    Middleware --> Routes
    Routes --> Services
    Services --> Supabase
    Services --> Storage
    Services --> OpenRouter
    OpenRouter --> GPT
    Services --> Razorpay
```

---

## 📁 Project Structure

```
Vizora1/
├── 📁 src/                      # Frontend React application
│   ├── 📁 components/           # Reusable UI components
│   │   ├── 📁 dashboard/        # Dashboard-specific components
│   │   ├── 📁 beta/             # Beta features
│   │   ├── 📁 schema-designer/  # Schema designer components
│   │   └── 📁 user-dashboard/   # User account components
│   ├── 📁 pages/                # Page components (views)
│   │   ├── 📁 Intelligence/     # AI features
│   │   ├── 📁 auth/             # Authentication pages
│   │   └── 📁 account/          # Account settings
│   ├── 📁 layouts/              # Layout wrappers
│   ├── 📁 context/              # React Context providers
│   ├── 📁 hooks/                # Custom React hooks
│   └── 📁 lib/                  # Utilities and API client
├── 📁 server/                   # Backend Node.js API
│   ├── 📄 index.ts              # Main Express server
│   ├── 📄 billing.ts            # Billing logic
│   ├── 📄 razorpay.ts           # Payment integration
│   ├── 📄 parser.ts             # Schema parsing engine
│   └── 📁 src/routes/           # API route modules
├── 📁 supabase/                 # Database
│   └── 📄 schema.sql            # Complete database schema
└── 📁 public/                   # Static assets
```

---

## 🔄 Data Flow Diagram

```mermaid
flowchart LR
    subgraph User["👤 User Actions"]
        A[Paste Schema]
        B[View Diagram]
        C[Generate Docs]
        D[Ask Questions]
    end
    
    subgraph Parser["📝 Schema Parser"]
        P1[SQL Parser]
        P2[Prisma Parser]
        P3[Drizzle Parser]
        P4[Normalized Schema]
    end
    
    subgraph Storage["💾 Storage"]
        DB[(PostgreSQL)]
        S3[Supabase Storage]
    end
    
    subgraph AI["🤖 AI Engine"]
        E1[Schema Explanations]
        E2[Schema Review]
        E3[Ask Schema]
        E4[Onboarding Guide]
    end
    
    subgraph Output["📤 Outputs"]
        O1[ER Diagram]
        O2[Markdown Docs]
        O3[PDF Export]
        O4[Code Generation]
    end
    
    A --> P1 & P2 & P3
    P1 & P2 & P3 --> P4
    P4 --> DB
    P4 --> E1 & E2 & E3 & E4
    E1 --> O2
    B --> O1
    C --> O2 & O3
    D --> E3
```

---

## 🔐 Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant S as Supabase Auth
    participant DB as Database
    
    U->>F: Click Sign In
    F->>S: OAuth Request (Google/GitHub)
    S->>U: Redirect to Provider
    U->>S: Authorize
    S->>F: Return with Token
    F->>DB: Check Profile
    alt New User
        DB-->>F: No Profile Found
        F->>U: Redirect to Onboarding
        U->>F: Complete Onboarding
        F->>DB: Create Profile & Workspace
    else Existing User
        DB-->>F: Profile Found
        F->>U: Redirect to Dashboard
    end
```

---

## 🛠️ Tech Stack Details

### Frontend Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI Framework | 18.x |
| **TypeScript** | Type Safety | 5.x |
| **Vite** | Build Tool | 5.x |
| **TailwindCSS** | Styling | 3.x |
| **React Router** | Navigation | 6.x |
| **ReactFlow** | Diagram Canvas | 11.x |
| **Lucide React** | Icons | Latest |

### Backend Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime | 18+ |
| **Express** | Web Framework | 4.x |
| **TypeScript** | Type Safety | 5.x |
| **Supabase** | Database & Auth | Latest |
| **OpenAI SDK** | AI Integration | 4.x |
| **Puppeteer** | PDF Generation | Latest |

---

## 📊 Component Architecture

```mermaid
graph TB
    subgraph Layouts["📐 Layouts"]
        MainLayout[MainLayout]
        ProjectLayout[ProjectLayout]
    end
    
    subgraph Contexts["🔄 Contexts"]
        AuthContext[AuthContext]
        ProjectContext[ProjectContext]
    end
    
    subgraph Pages["📄 Pages"]
        LandingPage
        Projects
        Overview
        ERDiagrams
        SchemaDesigner
        AiExplanations
        AutoDocs
        Intelligence[Intelligence/*]
    end
    
    subgraph SharedComponents["🧩 Shared Components"]
        Sidebar
        GlobalSidebar
        BetaWatermark
        BillingGate
    end
    
    MainLayout --> GlobalSidebar
    ProjectLayout --> Sidebar
    Contexts --> Pages
    Layouts --> Pages
```

---

## 🔗 Related Notes

- [[API Reference]]
- [[Database Schema Overview]]
- [[Frontend Structure]]
- [[Backend Services]]

---

#architecture #system-design #vizora

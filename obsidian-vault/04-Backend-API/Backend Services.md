# ⚙️ Backend Services

> Backend service architecture and implementation details

---

## 📊 Service Architecture

```mermaid
graph TB
    subgraph Server["Express Server"]
        App[index.ts]
        Middleware[Middleware Layer]
    end
    
    subgraph Services["Core Services"]
        Parser[Schema Parser]
        AI[AI Engine]
        Docs[Documentation Engine]
        Billing[Billing Service]
    end
    
    subgraph Routes["Route Modules"]
        R1[schemaReview.ts]
        R2[onboardingGuide.ts]
        R3[askSchema.ts]
        R4[dashboard.ts]
        R5[team.ts]
    end
    
    subgraph External["External Services"]
        OpenRouter[OpenRouter API]
        Razorpay[Razorpay]
        Supabase[Supabase]
    end
    
    App --> Middleware
    Middleware --> Services
    Services --> Routes
    Services --> External
```

---

## 📁 File Structure

```
server/
├── index.ts           # Main Express server (1957 lines)
├── parser.ts          # Schema parsing engine (710 lines)
├── billing.ts         # Billing logic (161 lines)
├── razorpay.ts        # Payment integration (7594 bytes)
└── src/
    └── routes/
        ├── schemaReview.ts
        ├── onboardingGuide.ts
        ├── askSchema.ts
        ├── dashboard.ts
        └── team.ts
```

---

## 🔧 Core Services

### 1. Schema Parser

```mermaid
graph LR
    Input[Raw Schema] --> Detect{Detect Type}
    Detect -->|SQL| SQL[parseSqlDeterministic]
    Detect -->|Prisma| Prisma[parsePrisma]
    Detect -->|Drizzle| Drizzle[parseDrizzle]
    SQL & Prisma & Drizzle --> Output[NormalizedSchema]
```

**Key Functions:**
- `parseSqlDeterministc()` - Parse SQL DDL
- `parsePrisma()` - Parse Prisma schema
- `parseDrizzle()` - Parse Drizzle ORM
- `generateSql()` - Generate SQL from normalized
- `generatePrisma()` - Generate Prisma from normalized
- `compareSchemas()` - Diff two versions

### 2. AI Engine

```mermaid
graph TB
    subgraph AIEngine["AI Engine"]
        Gen[generateAndSaveExplanations]
        
        subgraph Levels["AI Levels"]
            L1[DB Level]
            L2[Table Level]
            L3[Relation Level]
        end
    end
    
    Gen --> Levels
    Levels --> OpenRouter[OpenRouter/GPT-4o-mini]
```

**Configuration:**
- Model: `openai/gpt-4o-mini`
- Temperature: `0.2`
- Provider: OpenRouter

### 3. Documentation Engine

```mermaid
graph LR
    subgraph Docs["Auto Docs"]
        MD[Markdown Generator]
        PDF[PDF Generator]
    end
    
    MD --> PDF
    PDF --> Puppeteer[Puppeteer]
    PDF --> Storage[Supabase Storage]
```

---

## 🔒 Middleware

### Project Context Middleware

```typescript
const requireProjectContext = async (req, res, next) => {
    const projectId = req.params.id;
    
    if (!projectId) {
        return res.status(400).json({
            error: "Project context required"
        });
    }
    
    // Verify project exists
    const { data: project, error } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .single();
    
    if (error || !project) {
        return res.status(404).json({
            error: "Project not found"
        });
    }
    
    next();
};
```

### Request Logging

```typescript
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`[Request Body Keys]: ${Object.keys(req.body).join(', ')}`);
    }
    next();
});
```

---

## 📡 External Integrations

### OpenRouter/OpenAI

```typescript
const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": process.env.SITE_URL || "https://vizora.app",
        "X-Title": "Vizora Schema Intelligence",
    },
});
```

### Supabase

```typescript
const supabase = createClient(supabaseUrl, supabaseKey);

// Storage bucket initialization
supabase.storage.createBucket('documentation', { public: true })
    .then(() => console.log("[Storage] 'documentation' bucket ensured"))
    .catch((err) => console.warn("[Storage] Bucket warning:", err.message));
```

---

## 🔔 Beta Configuration

```typescript
const BETA_MODE = true;
const BETA_PROJECT_LIMIT = 2;
const BETA_VERSION_LIMIT = 4;
const BETA_LABEL = "Private Beta";
```

### Beta Usage Tracking

```typescript
async function trackBetaUsage(userId, action) {
    if (!BETA_MODE || !userId) return;
    await supabase.rpc('increment_beta_usage', { 
        u_id: userId, 
        field: action  // 'project' | 'version' | 'diagram' | 'docs'
    });
}
```

---

## 📁 Related Notes

- [[API Reference]]
- [[System Architecture]]
- [[Database Schema Overview]]

---

#backend #services #architecture

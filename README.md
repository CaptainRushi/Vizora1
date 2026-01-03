# Vizora

**Schema Intelligence Platform for Modern Developers**

Vizora transforms your database schemas into beautiful diagrams, AI-powered documentation, and living architectural insights. Built for developers who value clarity, collaboration, and speed.

---

## 🎯 What is Vizora?

Vizora is not just another diagram tool. It's a **schema intelligence platform** that:

- 📊 **Visualizes** your database schema as interactive ER diagrams
- 🤖 **Explains** your schema with AI-powered insights (DB, table, and relationship levels)
- 📝 **Documents** your architecture automatically (Markdown + PDF exports)
- 🔄 **Tracks** schema changes and version history
- 👥 **Enables** team collaboration with workspace-based access
- 🎨 **Designs** schemas visually with an intuitive canvas

### Why Vizora?

**Time Saved**: 10+ hours per project on documentation
**ROI**: Operational efficiency, not just design tooling
**Positioning**: Schema intelligence, not generic diagramming

---

## ✨ Features

### Core Features
- ✅ **Multi-Schema Support**: SQL, Prisma, Drizzle
- ✅ **ER Diagram Generation**: Auto-generate from schema
- ✅ **AI Explanations**: Powered by OpenAI (DB, table, relationship levels)
- ✅ **Auto Documentation**: Markdown + PDF exports
- ✅ **Version History**: Track schema evolution
- ✅ **Change Tracking**: Diff between versions
- ✅ **Schema Designer**: Visual schema editor
- ✅ **Team Collaboration**: Workspace-based access control

### Premium Features
- 🔥 **Unlimited Versions** (Teams/Business)
- 🔥 **High-Resolution Exports** (Pro+)
- 🔥 **White-Label Exports** (Business)
- 🔥 **Priority Rendering** (Teams+)
- 🔥 **Schema Comments** (Teams+)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier works)
- OpenAI API key (for AI features)
- Razorpay account (for payments, optional)

### 1. Clone the Repository
```bash
git clone https://github.com/CaptainRushi/Vizora1.git
cd Vizora1
```

### 2. Install Dependencies
```bash
# Frontend
npm install

# Backend
cd server
npm install
cd ..
```

### 3. Set Up Environment Variables

**Frontend** (`.env`):
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Backend** (`server/.env`):
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
RAZORPAY_KEY_ID=your_razorpay_key_id (optional)
RAZORPAY_KEY_SECRET=your_razorpay_secret (optional)
```

### 4. Set Up Database
```bash
# Apply migrations
npx supabase migration up

# Or manually run migrations from supabase/migrations/
```

### 5. Run the Application
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd server
npm start
```

Visit `http://localhost:5173` 🎉

---

## 📚 Documentation

- **[Architecture](./ARCHITECTURE.md)** - System design and data flow
- **[OAuth Setup](./OAUTH_SETUP_GUIDE.md)** - Configure Google/GitHub auth
- **[Pricing Strategy](./PREMIUM_PRICING_STRATEGY.md)** - $10K MRR roadmap
- **[Razorpay Billing](./RAZORPAY_BILLING_GUIDE.md)** - Payment integration
- **[Quick Reference](./QUICK_REFERENCE.md)** - Common tasks

---

## 💰 Pricing

### Free (Evaluation)
- 1 project
- 2 schema versions
- ER diagram (view-only)
- DB-level AI summary
- **₹0/month**

### Pro (Solo Devs & Freelancers)
- 5 projects
- 30 schema versions per project
- Full ER diagrams
- Table-level AI explanations
- PNG/SVG/MD exports
- SQL Designer
- **₹1,499/month** (~$18)

### Teams (Startups & Agencies)
- 20 projects
- **Unlimited** schema versions
- Full AI (DB + tables + relations)
- Schema comments & notes
- High-resolution exports
- Team collaboration
- Priority rendering
- **₹4,999/month** (~$60)

### Business (Enterprise)
- **Unlimited** projects
- **Unlimited** versions
- **Unlimited** team members
- White-label exports
- Dedicated priority queue
- Early feature access
- **₹9,999/month** (~$120)

**Payment Model**: One-time payments (no subscriptions, no auto-renew)

---

## 🛠️ Tech Stack

### Frontend
- **React** + **TypeScript** + **Vite**
- **TailwindCSS** for styling
- **React Router** for navigation
- **ReactFlow** for diagram canvas
- **Lucide React** for icons

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Supabase** (PostgreSQL + Auth + Storage)
- **OpenAI** for AI explanations
- **Razorpay** for payments
- **Puppeteer** for PDF generation

### Database
- **PostgreSQL** (via Supabase)
- Row Level Security (RLS)
- Workspace-centric billing
- Expiry-based access control

---

## 🏗️ Project Structure

```
Vizora1/
├── src/                      # Frontend React app
│   ├── components/           # Reusable UI components
│   ├── pages/                # Page components
│   ├── layouts/              # Layout wrappers
│   ├── context/              # React context (Auth, etc.)
│   ├── hooks/                # Custom React hooks
│   └── lib/                  # Utilities and API client
├── server/                   # Backend Node.js API
│   ├── index.ts              # Main Express server
│   ├── billing.ts            # Billing logic
│   ├── razorpay.ts           # Payment integration
│   └── parser.ts             # Schema parsing (SQL/Prisma/Drizzle)
├── supabase/
│   └── migrations/           # Database migrations
├── public/                   # Static assets
└── docs/                     # Documentation (*.md files)
```

---

## 🔐 Authentication

Vizora uses **Supabase Auth** with support for:
- ✅ Email/Password
- ✅ Google OAuth
- ✅ GitHub OAuth (optional)

See [OAUTH_SETUP_GUIDE.md](./OAUTH_SETUP_GUIDE.md) for configuration.

---

## 💳 Payment Integration

Vizora uses **Razorpay** for one-time payments:
- No subscriptions
- No auto-renew
- Fixed 30-day validity
- Automatic fallback to Free tier on expiry

See [RAZORPAY_BILLING_GUIDE.md](./RAZORPAY_BILLING_GUIDE.md) for setup.

---

## 🧪 Testing

### Run Frontend Tests
```bash
npm run test
```

### Run Backend Tests
```bash
cd server
npm run test
```

### Test Payment Flow
Use Razorpay test keys:
- **Card**: 4111 1111 1111 1111
- **UPI**: success@razorpay

---

## 📦 Deployment

### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy dist/ folder
```

### Backend (Railway/Render/Fly.io)
```bash
cd server
npm run build
# Deploy with Node.js 18+
```

### Database (Supabase)
Already hosted! Just apply migrations:
```bash
npx supabase migration up
```

---

## 🤝 Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**.

---

## 🙏 Acknowledgments

- **Supabase** for backend infrastructure
- **OpenAI** for AI capabilities
- **Razorpay** for payment processing
- **ReactFlow** for diagram canvas
- **Tailwind** for beautiful UI

---

## 📞 Support

- **Email**: support@vizora.dev
- **GitHub Issues**: [Report a bug](https://github.com/CaptainRushi/Vizora1/issues)
- **Documentation**: [Read the docs](./ARCHITECTURE.md)

---

## 🎯 Roadmap

- [ ] Stripe integration (international payments)
- [ ] Real-time collaboration
- [ ] Schema migration generator
- [ ] API documentation generator
- [ ] GraphQL schema support
- [ ] MongoDB schema support
- [ ] VS Code extension

---

## ⭐ Star History

If Vizora helps you, consider giving it a star! ⭐

---

**Built with ❤️ by developers, for developers.**

*Vizora - Visualize, understand, and document your database in one place.*

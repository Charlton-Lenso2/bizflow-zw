
# BizFlow ZW

BizFlow ZW is a mobile-first business management application designed for small businesses in Zimbabwe. Its initial pilot focuses on the day-to-day operations of a Coca-Cola wholesale distributor.

The application brings together product and inventory management, wholesale sales, customer accounts, credit tracking, business reporting, and an AI assistant.

## Project Status

BizFlow ZW is a capstone project under active development. The current application includes its core frontend, Supabase integration, and AI assistant.

The database design document describes the broader intended system. Not every feature in that design has been implemented or migrated.

## Features

The current application includes:

- User authentication and business onboarding.
- Business profile and branding configuration.
- Dashboard and business summaries.
- Product catalogue and product variants.
- Inventory management.
- Wholesale sales workflows.
- Customer management.
- Customer credit and payment tracking.
- Business calculator.
- Light and dark theme support.
- AI business assistant powered by Gemini through a Supabase Edge Function.

The AI assistant can retrieve and explain authorised business information through backend-controlled tools. It is intended for business questions and analysis, not for independently completing sales, payments, or inventory changes.

## Technology Stack

| Area | Technology |
|---|---|
| Frontend | React 19, TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router |
| Icons | Lucide React |
| Backend Services | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| Server-side Functions | Supabase Edge Functions |
| AI Provider | Google Gemini API |
| Deployment | Vercel |

The current application does not use a separate Express API server. The frontend communicates with Supabase, while privileged AI operations are handled by a Supabase Edge Function.

## Requirements

Install the following before running the project:

- Node.js 22 LTS or a compatible version supported by the installed Vite release.
- npm, included with Node.js.
- Git.
- A Supabase project with the required database schema, authentication configuration, and access policies.

Check your installed versions:

```bash
node --version
npm --version
git --version
```

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Charlton-Lenso2/bizflow-zw.git
cd bizflow-zw
```

### 2. Install Dependencies

Navigate to the frontend directory:

```bash
cd frontend
npm ci
```

### 3. Configure Environment Variables

Create a local environment file from the example.

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env.local
```

**macOS and Linux:**

```bash
cp .env.example .env.local
```

Open `.env.local` and provide your Supabase project details:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Use the URL and publishable/anon key belonging to your Supabase project.

Only public frontend configuration belongs in variables prefixed with `VITE_`. Never put a Supabase service-role key, Gemini API key, database password, or other private credential in a frontend environment file.

### 4. Start the Development Server

Run this command from the `frontend` directory:

```bash
npm run dev
```

Vite will display the local development URL in the terminal. Open that address in your browser.

## Available Scripts

Run these commands from the `frontend` directory.

| Command | Description |
|---|---|
| `npm run dev` | Starts the development server. |
| `npm run lint` | Runs ESLint. |
| `npm run build` | Runs TypeScript checks and creates a production build. |
| `npm run preview` | Serves the production build locally. |

To create and preview a production build:

```bash
npm run build
npm run preview
```

The generated production files are placed in `frontend/dist`.

## Supabase Configuration

BizFlow ZW uses Supabase for authentication, PostgreSQL data storage, and server-side Edge Functions.

To configure a separate Supabase project:

1. Create a Supabase project.
2. Configure the database schema and required Row-Level Security policies.
3. Configure authentication for the application.
4. Set the frontend environment variables described above.
5. Deploy the AI Edge Function if AI functionality is required.

### Database Migration

The repository currently includes this migration:

`supabase/migrations/20261104_000001_set_variant_price.sql`

It adds a uniqueness constraint for active product prices and defines the `set_variant_price` PostgreSQL function.

**This migration is not a complete database setup.** It assumes that the relevant tables, columns, memberships, and security policies already exist. Review its preconditions and inspect the target database before applying it.

The broader database design is documented in `docs/database-design.md`.

### AI Edge Function

The AI assistant uses:

`supabase/functions/ai-assistant/index.ts`

The function requires server-side environment configuration, including:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

It also supports `ALLOWED_ORIGINS` for controlling permitted browser origins.

Configure the Gemini API key in the Supabase project's Edge Function secrets. Do not put it in the React application or commit it to Git.

With the Supabase CLI installed and authenticated, link the project and deploy the function:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy ai-assistant
```

Set the required Edge Function secrets through the Supabase Dashboard under the project's Edge Function secrets settings. Keep private values out of source control and public documentation.

## Deployment to Vercel

The frontend can be deployed to Vercel.

When importing the GitHub repository, use the following project settings:

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

Configure these environment variables in the Vercel project settings for the deployment environments you use:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Use the values from the Supabase project. Do not add `GEMINI_API_KEY` to Vercel. The Gemini key belongs in Supabase Edge Function secrets.

After configuration, deploy the project and verify that authentication, database access, and the AI assistant work in the deployed application.

## Business Rules and Scope

BizFlow ZW is designed around wholesale beverage operations:

- Sales are based on full crates.
- Product variants have independent inventory and prices.
- USD and ZWG balances must remain separate.
- Customer credit and partial payments must be traceable.
- Returnable bottles and crates are important to the wholesale workflow.
- AI responses should be grounded in authorised business data.
- AI must not independently create or modify financial or inventory records.
- Capstone receipts are non-fiscal.

## Current Limitations and Future Work

The following should not be treated as guaranteed production capabilities unless separately implemented and tested:

- Full offline synchronisation.
- ZIMRA FDMS fiscalisation.
- Guaranteed Bluetooth receipt-printer compatibility across devices.
- Cross-device synchronisation of AI conversation history.
- Every feature described in the broader database design.

AI functionality requires an internet connection. Conversation history currently stored by the frontend is browser-local and is not automatically synchronised between devices.

## Documentation

Additional project documentation is available in the `docs` directory:

- `docs/architecture.md` — architecture planning and design principles.
- `docs/database-design.md` — broader database design and business requirements.

Some planning documents may describe intended architecture or functionality that differs from the current implementation. Refer to the technology stack and setup instructions in this README for the current application structure.

## Security

- Do not commit `.env` or `.env.local` files.
- Do not expose Supabase service-role credentials.
- Keep AI provider keys in server-side Supabase secrets.
- Enforce appropriate authentication, business membership checks, and database access policies.
- Do not use real customer or business credentials in screenshots, demonstrations, or public documentation.

## License

No open-source license has currently been specified for this project.

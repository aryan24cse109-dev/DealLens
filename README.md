<div align="center">

# DealLens

### Analyze. Compare. Decide.

**Contract comparison and AI-assisted impact analysis for freelancers, developers, agencies, and deal-focused professionals.**
Upload an original and a revised agreement, and DealLens detects what changed, classifies each change, and explains its potential impact. It then helps you prepare a client clarification email and export a report.

<br />

![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A5%2020.19.0-339933?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![Groq](https://img.shields.io/badge/AI_Provider-Groq-F55036)
![Zod](https://img.shields.io/badge/Validation-Zod-3E67B1)
![License](https://img.shields.io/badge/License-not%20yet%20specified-lightgrey)

<br />

[Explore](#-explore-deallens) ·
[Overview](#project-overview) ·
[Features](#core-features) ·
[How it works](#how-deallens-works) ·
[Architecture](#architecture) ·
[Setup](#local-installation-and-setup) ·
[Limitations](#current-limitations)

</div>

---

## 🚀 Explore DealLens

| Service | Link |
|---|---|
| Live Frontend | https://deal-lens-ten.vercel.app |
| Backend API | https://deallens-backend-9f9c.onrender.com |
| AI Service | https://deallens-ai-service.onrender.com |
| YouTube Demo | `[https://youtu.be/XoIwsZcT97A?si=Mm9qRuLtVU5_NH7r]` |

> [!NOTE]
> The backend and AI service are hosted on Render's free tier and may take some time to wake up after a period of inactivity. If the first request is slow or fails, wait a moment and try again.

> [!IMPORTANT]
> DealLens is built for software demonstration and development workflows. It is an assessment aid and **does not provide legal advice**. AI-generated output should be reviewed by a qualified person before anyone relies on it.

---

## Table of contents

1. [Explore DealLens](#-explore-deallens)
2. [Project overview](#project-overview)
3. [The problem](#the-problem)
4. [Our solution](#our-solution)
5. [Core features](#core-features)
6. [How DealLens works](#how-deallens-works)
7. [Architecture](#architecture)
8. [Technology stack](#technology-stack)
9. [Sample documents](#sample-documents)
10. [Local installation and setup](#local-installation-and-setup)
11. [Environment variables](#environment-variables)
12. [AI provider and Groq rate limits](#ai-provider-and-groq-api-rate-limits)
13. [Project structure](#project-structure)
14. [API and service documentation](#api-and-service-documentation)
15. [Security and data handling](#security-and-data-handling)
16. [Current limitations](#current-limitations)
17. [Roadmap](#roadmap)
18. [Contributing](#contributing)
19. [License](#license)
20. [Acknowledgements and contact](#acknowledgements-and-contact)

---

## Project overview

DealLens is a full-stack platform that compares versions of a contract, identifies what changed, and helps the reader understand what those changes may mean. A user creates a **deal**, uploads the original and revised PDF documents, and runs a comparison. DealLens detects added, removed, and modified content, classifies each change using rules, and can then request a structured impact assessment for every change from an AI model. From the saved analysis, the user can export a report and prepare a client clarification email.

**Intended users**

- Freelancers and independent developers who receive revised agreements from clients.
- Agencies and small teams that handle several deals and revisions at once.
- Professionals who need to understand how a revised document differs from the one they already reviewed.

**The problem in one sentence:** revised agreements rarely say exactly what changed, and finding every change by hand is slow and easy to get wrong.

---

## The problem

**Manual comparison is slow and error-prone.** A revised agreement usually arrives as a complete new document. Wording changes can be small and scattered across many pages. A reader has to compare two long documents side by side, and it is easy to miss a single altered word, a removed clause, or a changed number.

**Overlooked changes carry real risk.** A change in payment terms, scope, liability, ownership, or duration may look minor on the page but can alter the obligations of one party. If a change is missed, it may be accepted without anyone realising it was there.

**Clarifying changes with the client takes effort.** Once a concerning change is found, the user still has to explain it clearly and professionally. That means identifying which changes matter, describing them accurately, and writing a message to the other party that is specific without being confrontational. Doing this for every revision is repetitive work.

---

## Our solution

DealLens turns that process into a single workflow:

1. **Detect.** Extract text from the uploaded PDFs and compare them to find added, removed, and modified content.
2. **Classify.** Give each detected change a category and a severity using rule-based classification.
3. **Assess.** Send the changes, in bounded batches, to a separate AI service that returns one structured impact assessment per change. Every response is parsed and validated before it is accepted.
4. **Persist.** Save the assessment set with the analysis, but only after the backend confirms that it covers exactly the changes that were sent.
5. **Communicate and report.** Generate an editable client clarification email draft and export a report as PDF, plain text, or JSON.

The design priority is **trustworthy output**: AI responses are never silently repaired or partially saved. If any batch fails, the previously saved complete result is left intact.

---

## Core features

| Area | What DealLens does |
|---|---|
| **Authentication and user data** | Users sign in with Google. The backend manages the OAuth flow and session cookies, and application resources are scoped to the authenticated owner. |
| **Deal and document management** | Create, list, update, and delete deals. Upload PDF documents to a deal, list them, and delete them. |
| **Upload and processing** | PDF uploads are handled by Multer with a configurable size limit. Text is extracted with `pdf-parse` and stored with the document record. |
| **Document comparison** | Compares extracted text and records added, removed, and modified content as individual changes in a saved analysis. |
| **Rule-based classification** | Each change receives a category and a severity before any AI is involved. |
| **AI impact assessment** | For each change, the AI service returns a validated assessment containing category, impact, explanation, suggested action, severity, and confidence. |
| **Saved AI analyses** | Assessments are stored in PostgreSQL with the analysis. A complete set is replaced atomically, only after every batch succeeds and change-ID coverage is verified. |
| **Saved reports** | Reports combine deal, document, analysis, change, severity, and AI assessment data. Report metadata is stored in the database and files are written to the configured report directory. |
| **Report export** | Download reports as **PDF**, **TEXT**, or **JSON**. |
| **Saved communication drafts** | Generate a client clarification email grounded in saved analysis findings. Subject and body are editable, and drafts can be regenerated, saved, copied, retrieved, and deleted. **DealLens does not send email.** |
| **Dashboard** | Shows deal, document, analysis, severity, status, and recent activity information. |

### What makes the implementation interesting

- **Separate AI service.** Provider credentials, prompts, and parsing live in their own process, away from the browser and the persistence API.
- **Strict output validation.** The AI service performs controlled JSON parsing and Zod validation, and rejects missing, duplicate, or unexpected change IDs. Truncated output is not accepted, and missing fields are not invented.
- **Atomic assessment replacement.** The backend uses a Prisma transaction so an incomplete AI run can never overwrite a previously complete result.
- **Token-aware sequential batching.** Large change sets are split into bounded batches so each AI request stays within a manageable size.
- **Predictable retry ownership.** Provider SDK retries are disabled. The backend owns retries, using bounded exponential backoff with jitter, and it reads `Retry-After` and reset metadata so it does not retry before the provider allows.
- **Sanitized diagnostics.** Operation, batch, retry, and failure logs avoid prompts, credentials, authorization headers, and contract content.

---

## How DealLens works

### User workflow

1. **Sign in.** Open `/login` and sign in with Google. The frontend redirects to the backend, which completes OAuth and sets the session cookie.
2. **Create a deal.** On `/upload`, create a deal to hold the related documents.
3. **Upload documents.** Upload the original and revised PDFs. Each document is sent to the backend as a separate multipart upload, and the backend extracts and stores its text.
4. **Compare.** On `/comparison`, select the documents to compare. The backend detects changes, classifies them by rule, and saves an analysis with its changes.
5. **Run AI impact analysis.** On `/analyse/:analysisId`, start the AI impact workflow. The backend batches the changes and calls the AI service one batch at a time. The page prevents duplicate submissions and shows progress and error messages while the request runs.
6. **Review results.** Read each change with its rule-based severity and its AI assessment.
7. **Prepare a client message.** On `/communication`, generate a clarification email draft from the saved findings, then edit, regenerate, save, or copy it.
8. **Export a report.** On `/report`, choose PDF, TEXT, or JSON. The backend generates the file and the frontend downloads it.

### Workflow diagram

```mermaid
flowchart TD
    A[User signs in with Google] --> B[Create a deal]
    B --> C[Upload original and revised PDFs]
    C --> D[Backend extracts PDF text]
    D --> E[Comparison identifies changes]
    E --> F[Rule-based category and severity]
    F --> G[Analysis and changes saved in PostgreSQL]
    G --> H[Backend splits changes into batches]
    H --> I[AI service validates request]
    I --> J[Groq returns structured assessments]
    J --> K[AI service parses and validates JSON]
    K --> L{Backend verifies exact<br/>change-ID coverage}
    L -->|All batches complete| M[Complete assessment set stored atomically]
    L -->|Any batch fails| N[Previous complete result kept]
    M --> O[Generate report or clarification email draft]
    O --> P[Download PDF, TEXT, or JSON report]
```

---

## Architecture

DealLens is organised as three services plus a database. Each has a narrow responsibility.

```mermaid
flowchart LR
    U([User]) --> F

    subgraph Client
        F["Frontend<br/>React + Vite<br/>port 5173"]
    end

    subgraph Server
        B["Backend API<br/>Node.js + Express 5<br/>port 5000"]
        A["AI service<br/>Node.js + Express<br/>port 5001"]
    end

    subgraph Data
        P[("PostgreSQL<br/>via Prisma")]
        D[["Upload and report<br/>directories"]]
    end

    G[["Groq API"]]

    F -- "HTTPS + session cookie<br/>/api/v1" --> B
    B --> P
    B --> D
    B -- "Bearer AI_SERVICE_API_KEY" --> A
    A -- "OpenAI-compatible API" --> G
```

### Responsibilities

| Component | Responsibilities |
|---|---|
| **Frontend** | Single-page application with routing, protected pages, and API calls through an Axios client that sends session credentials. It communicates only with the backend and holds no secrets. |
| **Backend** | Google OAuth and session cookies, owner-scoped authorization, Zod request validation, PDF upload and text extraction, comparison, rule-based severity, batching, the AI-service client with retries and timeouts, assessment persistence, report generation, and draft persistence. |
| **AI service** | Authenticates backend requests, builds prompts, calls Groq, parses structured output, and validates it against schemas. It enforces a maximum number of changes per request. |
| **Database** | PostgreSQL accessed through Prisma. Stores users and OAuth/session records, deals, documents with extracted text, analyses, changes, AI assessments, report metadata, and communication drafts. |

### How the services communicate

- **Frontend → Backend:** REST requests under the `/api/v1` prefix. Authentication uses the session cookie, so the client sends credentials with each request.
- **Backend → AI service:** internal HTTP requests authenticated with a bearer token (`AI_SERVICE_API_KEY`). The frontend never calls these routes.
- **AI service → Groq:** requests to the configured OpenAI-compatible base URL. The Groq key stays on the AI service.
- **Backend → Database:** Prisma queries, with transactions where atomic replacement is required.

---

## Technology stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, React Router, Vite, Tailwind CSS, Axios, Lucide React |
| **Backend** | Node.js, Express 5, Zod, Multer, `pdf-parse`, PDFKit, Helmet, CORS, Google OAuth with session cookies |
| **AI service** | Node.js, Express, OpenAI-compatible SDK, Zod, Helmet, CORS |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **AI provider** | Groq (OpenAI-compatible API), configured model `openai/gpt-oss-120b` |
| **Testing** | Node.js built-in test runner (backend and AI service) |
| **Development tooling** | npm workspaces, Nodemon, Concurrently |

Node.js `>=20.19.0` is required.

---

## Sample documents

The repository includes a [`sample-document/`](sample-document) directory with three folders of short, fictional contract pairs. They exist so that you can try the full comparison and analysis workflow without using real agreements.

| Folder | Scenario |
|---|---|
| [`SaaS-CRM-Platform`](sample-document/SaaS-CRM-Platform) | SaaS CRM platform agreement |
| [`Fintech-Expense-Management`](sample-document/Fintech-Expense-Management) | Fintech expense management agreement |
| [`Ecommerce-Multi-Vendor-Platform`](sample-document/Ecommerce-Multi-Vendor-Platform) | E-commerce multi-vendor platform agreement |

Each folder is intended to hold an original PDF and its matching revised PDF. For the exact files and the specific differences each pair contains, see the [Sample Documents Guide](sample-document/README.md).

> [!NOTE]
> The sample documents are for software demonstration and testing only. They are fictional, are not legal advice, and are not intended for real contractual use.

### Try them

1. Start DealLens and sign in (see [Local installation and setup](#local-installation-and-setup)).
2. On the upload page, create a new deal.
3. Upload the **original** and **revised** PDFs from the **same** sample folder. Do not mix files from different folders.
4. Run the comparison, then run the AI impact analysis.
5. Generate a clarification email draft and export a report.

### What you should observe

- The comparison lists detected changes as added, removed, or modified content, each with a rule-based category and severity.
- After AI analysis, each change shows a structured assessment with category, impact, explanation, suggested action, severity, and confidence.
- The email draft and report are based on the saved findings.

The exact changes, counts, and wording depend on the sample files and on the AI model's response, so they can vary between runs.

---

## Local installation and setup

### Prerequisites

- **Node.js** `>=20.19.0` and **npm**
- **PostgreSQL**
- **Google OAuth credentials** (client ID and client secret) for signing in locally
- A **Groq API key** for live AI requests

### 1. Clone and install

```bash
git clone https://github.com/aryan24cse109-dev/DealLens.git
cd DealLens
npm install
```

The repository uses npm workspaces, so one install at the root covers the frontend, backend, and AI service.

### 2. Create environment files

Copy each example file and fill in your own values. Never commit `.env` files.

**macOS / Linux**

```bash
cp backend/.env.example backend/.env
cp ai-service/.env.example ai-service/.env
cp frontend/.env.example frontend/.env
```

**Windows (PowerShell)**

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item ai-service\.env.example ai-service\.env
Copy-Item frontend\.env.example frontend\.env
```

See [Environment variables](#environment-variables) for what to set.

### 3. Configure PostgreSQL

Create a PostgreSQL database named `deallens` and set `DATABASE_URL` in `backend/.env`. Then generate the Prisma client and apply the migrations from the `backend/` directory:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
cd ..
```

### 4. Start the application

Run everything from the repository root:

```bash
npm run dev
```

Or run each service in its own terminal:

| Terminal | Command | Service | Default port |
|---|---|---|---|
| 1 | `npm run dev:backend` | Backend API | `5000` |
| 2 | `npm run dev:ai` | AI service | `5001` |
| 3 | `npm run dev:frontend` | Frontend | `5173` |

Open `http://localhost:5173` in your browser.

### 5. Test and build

```bash
npm test
npm run build
```

`npm test` runs the backend and AI-service test suites. The frontend has no dedicated test script, so `npm run build` is used to validate the production bundle.

---

## Environment variables

The authoritative variable names are in the `.env.example` files:
[`backend/.env.example`](backend/.env.example), [`ai-service/.env.example`](ai-service/.env.example), and [`frontend/.env.example`](frontend/.env.example).

> [!WARNING]
> The values below are placeholders. Use real values only in untracked `.env` files, and never commit credentials.

### Backend (`backend/.env`)

```dotenv
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/deallens

AI_SERVICE_URL=http://localhost:5001
AI_SERVICE_API_KEY=your_shared_service_key_here
AI_REQUEST_TIMEOUT_MS=your_timeout_in_ms
AI_MAX_SYNCHRONOUS_RETRY_WAIT_MS=your_max_wait_in_ms
AI_MAX_RETRIES=your_retry_count
AI_RETRY_BASE_DELAY_MS=your_base_delay_in_ms

MAX_FILE_SIZE_MB=your_size_limit_in_mb
UPLOAD_DIR=your_upload_directory
REPORT_DIR=your_report_directory

GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=your_google_callback_url_here
GOOGLE_SUCCESS_REDIRECT=your_frontend_redirect_url_here

SESSION_SECRET=your_long_random_session_secret_here
SESSION_COOKIE_NAME=your_cookie_name
SESSION_MAX_AGE_MS=your_session_lifetime_in_ms
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAMESITE=lax
```

### AI service (`ai-service/.env`)

```dotenv
NODE_ENV=development
PORT=5001
GROQ_API_KEY=your_groq_api_key_here
GROQ_BASE_URL=your_openai_compatible_base_url
GROQ_MODEL=openai/gpt-oss-120b
AI_SERVICE_API_KEY=your_shared_service_key_here
AI_REQUEST_TIMEOUT_MS=your_provider_timeout_in_ms
AI_MAX_SYNCHRONOUS_RETRY_WAIT_MS=your_max_wait_in_ms
AI_MAX_CHANGES=your_max_changes_per_request
```

### Frontend (`frontend/.env`)

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Do not put API keys, OAuth secrets, database URLs, or Groq configuration in frontend variables. Vite exposes them to the browser.

### Important variables

| Variable | Why it matters |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string used by Prisma. The backend cannot start without a reachable database. |
| `AI_SERVICE_API_KEY` | A shared bearer credential. It **must be identical** in `backend/.env` and `ai-service/.env`, or the AI service will reject backend requests. |
| `GROQ_API_KEY` | Server-side Groq credential. It belongs only in `ai-service/.env`. |
| `GROQ_MODEL`, `GROQ_BASE_URL` | Select the provider model and OpenAI-compatible endpoint. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth credentials. |
| `GOOGLE_CALLBACK_URL` | Must match the redirect URI registered in your Google OAuth client. The backend callback route is `GET /api/v1/auth/google/callback`. |
| `GOOGLE_SUCCESS_REDIRECT` | Frontend URL the user is sent to after signing in. |
| `FRONTEND_URL` | The frontend origin that the backend allows. |
| `SESSION_SECRET` | Secret used to sign session cookies. Use a long random value. |
| `SESSION_COOKIE_SECURE`, `SESSION_COOKIE_SAMESITE` | Cookie policy. Adjust these for your deployment, especially if the frontend and backend are on different domains. |
| `MAX_FILE_SIZE_MB`, `UPLOAD_DIR`, `REPORT_DIR` | Upload limit and the directories used for uploaded and generated files. |
| `AI_MAX_CHANGES` | Maximum number of changes the AI service accepts in one request. |
| `AI_MAX_RETRIES`, `AI_RETRY_BASE_DELAY_MS`, `AI_MAX_SYNCHRONOUS_RETRY_WAIT_MS` | Backend retry policy and the longest provider wait it will perform synchronously. |

---

## AI provider and Groq API rate limits

DealLens currently uses the **Groq** OpenAI-compatible API with the configured model `openai/gpt-oss-120b`, through the separate AI service.

AI features depend on an external provider, so their availability is governed by Groq and by the limits of your Groq account.

- **Provider limits apply.** Groq enforces its own request and token limits. DealLens does not publish or assume specific quota numbers, because they depend on your account and plan.
- **Free-tier limits can interrupt analyses.** When a limit is reached, the provider can return HTTP `429`. Depending on the situation you may see delays, retries, or an analysis attempt that fails.
- **Larger documents cost more.** More changes produce more batches, and the batches are sent sequentially. That means more requests, more tokens, and a longer run.
- **Retries have limits.** The backend retries rate-limit, transient 5xx, timeout, and network failures with bounded backoff. If the provider's reset window is longer than the configured synchronous wait, the request fails with retryable information instead of retrying too early. Retries cannot bypass a quota.
- **Success on a small document is not a guarantee.** A small analysis that completes does not mean every large analysis will fit your current limits.
- **Failures are safe.** If a run does not finish, the previously saved complete assessment set is not overwritten.

This is an external provider limitation of the current local and free-tier configuration. It does not by itself indicate a fault in the application, and DealLens does not promise unlimited AI availability or guaranteed completion. Production use calls for quota planning, monitoring, and a provider plan that matches your usage.

### Using your own API key

The Groq credential is read from `GROQ_API_KEY` in `ai-service/.env`. To use your own key, create a key in your Groq account, place it in that file, and restart the AI service. The provider endpoint and model can be changed with `GROQ_BASE_URL` and `GROQ_MODEL`. Never commit the key or expose it to the frontend.

---

## Project structure

```text
DealLens/
├── README.md              # This file
├── package.json           # npm workspaces and root scripts
├── frontend/              # React + Vite single-page application
│   ├── README.md
│   └── src/
├── backend/               # Express API, Prisma, PDF processing, reports
│   ├── README.md
│   ├── prisma/schema.prisma
│   └── src/
├── ai-service/            # Express service for Groq prompts and validation
│   ├── README.md
│   └── src/
├── sample-document/       # Fictional contract pairs for testing
│   ├── README.md
│   ├── SaaS-CRM-Platform/
│   ├── Fintech-Expense-Management/
│   └── Ecommerce-Multi-Vendor-Platform/
└── .gitignore
```

| Directory | Purpose |
|---|---|
| [`frontend/`](frontend) | User interface: login, dashboard, upload, comparison, analysis, communication, and report pages. |
| [`backend/`](backend) | Authentication, data persistence, PDF extraction, comparison, AI orchestration, and report generation. |
| [`ai-service/`](ai-service) | Provider integration, prompts, structured parsing, and AI output validation. |
| [`sample-document/`](sample-document) | Fictional documents for trying the workflow. |

Runtime uploads, generated reports, dependencies, build output, secrets, and logs are intentionally not part of the repository.

---

## API and service documentation

Each service has its own README with details beyond this overview.

| Document | Covers |
|---|---|
| [Frontend README](frontend/README.md) | Routes and pages, the API client, environment, commands, and troubleshooting. |
| [Backend README](backend/README.md) | The full `/api/v1` route table, data models, analysis workflow, retries, reports, environment, and troubleshooting. |
| [AI Service README](ai-service/README.md) | Internal routes, provider integration, schemas and validation, rate limits, and environment. |
| [Sample Documents Guide](sample-document/README.md) | The sample contract pairs and how to use them. |

### Backend route groups

All backend routes use the `/api/v1` prefix.

| Group | Examples |
|---|---|
| Authentication | `/auth/google`, `/auth/google/callback`, `/auth/me`, `/auth/logout` |
| Dashboard and health | `/dashboard`, `/health` |
| Deals and documents | `/deals`, `/deals/:dealId/documents`, `/documents/:id` |
| Comparison and analysis | `/comparisons/compare`, `/analyses/:analysisId`, `/analyses/:analysisId/ai-impact` |
| Reports | `/analyses/:analysisId/reports`, `/reports/:reportId`, `/reports/:reportId/download` |
| Communication drafts | `/analyses/:analysisId/communications`, `/communications/:draftId` |

The AI service routes (`/api/v1/ai/impact-analysis` and `/api/v1/ai/communications`) are internal to the backend and are not frontend endpoints.

---

## Security and data handling

The following measures are described in the project documentation. This list is not a security certification, and no system can be called absolutely secure.

| Area | Measure |
|---|---|
| **Authentication** | Google OAuth is handled by the backend, which owns OAuth state and session cookies. The frontend reads the current session through the backend and never handles provider secrets. |
| **Authorization** | Application routes require a DealLens session. Queries and relations are scoped to the authenticated owner, so users work with their own deals, documents, analyses, reports, and drafts. |
| **Request protection** | Helmet, CORS, and same-origin checks on the backend. Request bodies and parameters are validated with Zod where applicable. |
| **Uploads** | Upload size is limited by `MAX_FILE_SIZE_MB`, and files are expected to be valid PDFs. |
| **File paths** | Report download paths are checked to stay inside the configured report directory. |
| **Service boundary** | The AI service accepts requests only with a bearer credential shared with the backend. The browser never contacts it. |
| **Credential handling** | The Groq key, OAuth secret, session secret, and database URL stay server-side in untracked `.env` files. They are not placed in frontend variables. |
| **Logging and errors** | Structured logs and error responses avoid prompts, credentials, authorization headers, and contract content. Provider diagnostics are sanitized. |
| **AI output** | Model output is validated against strict schemas before use, and malformed assessments are not silently discarded or repaired. |

> [!CAUTION]
> Contract text is sent to an external AI provider (Groq) for analysis. Review the provider's data handling terms and avoid uploading confidential agreements unless that is acceptable for your use case.

---

## Current limitations

- **AI provider limits.** Groq free-tier quotas and rate limits can prevent large analyses from completing. See [AI provider and Groq API rate limits](#ai-provider-and-groq-api-rate-limits).
- **Large documents.** More changes mean more extraction, comparison, batching, and provider time.
- **Sequential batching.** Batches are processed one after another, which keeps requests bounded but increases total run time.
- **In-process analysis lock.** The lock that prevents duplicate runs of the same analysis works within a single backend process. It is not a distributed lock, so running several backend instances is not covered.
- **Local file storage.** Uploaded files and generated reports are written to the configured `UPLOAD_DIR` and `REPORT_DIR`. A deployment needs storage that persists across restarts.
- **Text-based extraction.** Text is extracted from PDFs with `pdf-parse`. OCR is not part of the documented pipeline.
- **Authentication method.** Google OAuth is the only sign-in method. There is no local password flow.
- **No email delivery.** Drafts can be generated, edited, saved, and copied, but DealLens does not send them.
- **No frontend test suite.** Backend and AI-service tests exist. The frontend is validated through `npm run build`.
- **Free-tier hosting.** The live deployment runs the backend and AI service on Render's free tier, which can take time to wake up after inactivity. Further deployment configuration is listed in the [Roadmap](#roadmap).
- **Not legal advice.** AI output is an assessment aid and not a legal interpretation.

---

## Roadmap

> [!NOTE]
> Everything in this section is **planned work**. None of it is implemented today.

- [ ] Deployment configuration for the frontend, backend, and AI service
- [ ] Provider quota monitoring
- [ ] Distributed job processing for long analyses
- [ ] Durable progress events for long-running analyses
- [ ] Additional sample-document content

---

## Contributing

Contributions are welcome. Please keep the following principles in mind:

- **Preserve the service boundary:** frontend → backend → AI service. The frontend must not call the AI service or Groq directly.
- **Preserve ownership checks** so users can only reach their own data.
- **Keep AI output validation strict.** Do not accept partial, truncated, or invented assessment data.
- **Handle secrets safely.** Never commit `.env` files, keys, or credentials, and keep them out of logs and responses.

Suggested workflow:

1. Fork the repository and create a feature branch.
2. Make your changes and add or update tests where relevant.
3. Run `npm test` and `npm run build` from the repository root.
4. Open a pull request that describes the change and its motivation.

---

## License

**A license has not yet been specified for this repository.** Until one is added, no open-source license applies. Add a `LICENSE` file and update this section and the badge at the top of this README.

---

## Acknowledgements and contact

DealLens is built with open-source tools and services, including [React](https://react.dev), [Vite](https://vitejs.dev), [Tailwind CSS](https://tailwindcss.com), [Express](https://expressjs.com), [Prisma](https://www.prisma.io), [PostgreSQL](https://www.postgresql.org), [Zod](https://zod.dev), and [PDFKit](https://pdfkit.org). AI inference is provided through the [Groq](https://groq.com) API.

**Author:** [aryan24cse109-dev](https://github.com/aryan24cse109-dev)
**Repository:** <https://github.com/aryan24cse109-dev/DealLens>
**Contact and support:** `[ADD CONTACT DETAILS]`

---

<div align="center">

**DealLens: Analyze. Compare. Decide.**

<sub>For software demonstration and development use. Not legal advice.</sub>

</div>

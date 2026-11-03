<div align="center">

# DealLens Backend

**The central API for authentication, deals, documents, comparison, AI orchestration, reports, and communication drafts.**

![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A5%2020.19.0-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![Zod](https://img.shields.io/badge/Validation-Zod-3E67B1)

</div>

> [!NOTE]
> Items written as `[CONFIRM: ...]` or `[ADD ...]` are not yet verified against the source code, Prisma schema, migrations, or deployment settings. Replace or remove them before publishing. See the [documentation checklist](#documentation-checklist) at the end of this file.

## Table of contents

1. [Backend overview](#backend-overview)
2. [Responsibilities and features](#responsibilities-and-features)
3. [Architecture](#architecture)
4. [Authentication and authorization](#authentication-and-authorization)
5. [API reference](#api-reference)
6. [Document processing workflow](#document-processing-workflow)
7. [Database](#database)
8. [Report generation and draft management](#report-generation-and-draft-management)
9. [AI service communication](#ai-service-communication)
10. [Installation and local development](#installation-and-local-development)
11. [Environment variables](#environment-variables)
12. [Database migration instructions](#database-migration-instructions)
13. [Deployment](#deployment)
14. [Error handling and troubleshooting](#error-handling-and-troubleshooting)
15. [Security and data handling](#security-and-data-handling)
16. [Current limitations](#current-limitations)
17. [Future improvements](#future-improvements)
18. [Documentation checklist](#documentation-checklist)

---

## Backend overview

The backend is an Express API backed by PostgreSQL and Prisma. It is the only service the frontend talks to. It owns authentication, authorization, deal and document records, PDF text extraction, comparison orchestration, communication with the separate AI service, assessment persistence, report generation, and communication draft persistence.

**Backend API URL:** `[ADD BACKEND URL]`

All routes use the `/api/v1` prefix. The default local port is `5000`.

---

## Responsibilities and features

| Responsibility | What the backend does |
|---|---|
| **Authentication** | Handles the Google OAuth flow and session cookies. |
| **Authorization** | Scopes application resources to the authenticated owner through ownership relations and owner-scoped queries. |
| **Deal management** | Create, read, update, and delete owned deals. |
| **Document handling** | Accepts PDF uploads (multipart `file`), lists and deletes documents, and extracts text with `pdf-parse`. |
| **Comparison** | Compares documents by ID, detects changes, and assigns rule-based severity. |
| **Analysis persistence** | Saves an analysis and its changes. |
| **AI orchestration** | Converts changes into the AI-service request shape, splits them into token-aware sequential batches, and calls the AI service with bounded retries. |
| **Assessment integrity** | Verifies exact assessment count and change-ID coverage, then replaces the assessment set atomically. |
| **Reports** | Builds reports from saved data, generates PDF, TEXT, or JSON files, stores report metadata, and serves downloads. |
| **Communication drafts** | Requests a client clarification email from the AI service, validates it, and supports create, list, retrieve, edit, and delete. No email is sent. |
| **Dashboard** | Provides a dashboard summary. |

---

## Architecture

`src/server.js` connects to PostgreSQL and starts Express. `src/app.js` configures security middleware, parsers, routes, and error handling.

```text
backend/
├── README.md
├── package.json
├── prisma/
│   └── schema.prisma
└── src/
    ├── app.js
    ├── server.js
    ├── config/
    ├── controllers/
    ├── middleware/
    ├── routes/
    ├── services/
    ├── utils/
    └── validators/
```

```mermaid
flowchart TD
    FE([Frontend]) -->|"/api/v1<br/>session cookie"| MW

    subgraph Backend["Backend (Express 5)"]
        MW["Middleware<br/>Helmet, CORS, same-origin,<br/>session auth, error handling"]
        RT[Routes]
        VAL["Validators<br/>Zod"]
        CT[Controllers]
        SV["Services<br/>analysis.service.js<br/>report.service.js<br/>and others"]
        UT["Utils<br/>batch.js and others"]

        MW --> RT --> VAL --> CT --> SV
        SV --> UT
    end

    SV --> PR["Prisma"]
    PR --> DB[(PostgreSQL)]
    SV --> FS[["Upload and report<br/>directories"]]
    SV -->|"Bearer AI_SERVICE_API_KEY"| AI["AI service"]
    AI --> GQ[["Groq API"]]
```

| Layer | Location | Role |
|---|---|---|
| **Routes** | `src/routes/` | Map HTTP methods and paths to controllers. |
| **Validators** | `src/validators/` | Zod schemas for request bodies and parameters. |
| **Controllers** | `src/controllers/` | Handle requests and responses and call services. |
| **Services** | `src/services/` | Business logic, including `analysis.service.js` (analysis orchestration, batching coordination) and `report.service.js` (report assembly and generation). |
| **Middleware** | `src/middleware/` | Authentication, same-origin protection, and error handling. |
| **Utilities** | `src/utils/` | Helpers, including `batch.js` for token-aware batching. |
| **Config** | `src/config/` | Environment and application configuration. |
| **Database layer** | `prisma/schema.prisma` | Data models used through Prisma. |

> [!NOTE]
> `[CONFIRM: file-level details]` Add the actual service, controller, middleware, and route file names. The documentation names only `analysis.service.js`, `report.service.js`, and `utils/batch.js`.

---

## Authentication and authorization

### Google OAuth flow

| Step | Route | Description |
|---|---|---|
| 1 | `GET /api/v1/auth/google` | The frontend's login page redirects the browser here to start Google OAuth. |
| 2 | Google | The user signs in and consents. |
| 3 | `GET /api/v1/auth/google/callback` | The backend completes OAuth and establishes the session. |
| 4 | Redirect | The user is sent to the frontend URL set by `GOOGLE_SUCCESS_REDIRECT`. |
| 5 | `GET /api/v1/auth/me` | The frontend reads the current session. |
| 6 | `POST /api/v1/auth/logout` | Ends the current session. |

The backend owns OAuth state and session cookies. The frontend never handles provider secrets.

`GOOGLE_CALLBACK_URL` must match the redirect URI registered in your Google OAuth client.

> [!NOTE]
> `[CONFIRM: OAuth library and user creation]` State which library is used (for example Passport), what is stored in the session, and how a Google profile becomes a user record on first sign-in.

### Sessions and cookies

Session behaviour is controlled by these variables (see [Environment variables](#environment-variables)):

| Variable | Effect |
|---|---|
| `SESSION_SECRET` | Secret used to sign the session cookie. |
| `SESSION_COOKIE_NAME` | Name of the session cookie. |
| `SESSION_MAX_AGE_MS` | Session lifetime. |
| `SESSION_COOKIE_SECURE` | Whether the cookie is restricted to HTTPS. |
| `SESSION_COOKIE_SAMESITE` | The cookie's SameSite policy. |

> [!NOTE]
> `[CONFIRM: session store]` State where sessions are stored (in-memory, PostgreSQL, or other) and whether `httpOnly` is set. The documentation mentions "OAuth/session records" in the schema, which suggests database-backed sessions, but this is not confirmed.

### Authorization and ownership

- Authenticated application routes require a DealLens session and same-origin protection.
- Ownership relations scope application resources to the authenticated user: `Deal` owns documents and analyses, and downstream records (changes, assessments, reports, drafts) are reached through them.
- Queries are owner-scoped, so a user works only with their own data.

> [!NOTE]
> `[CONFIRM: ownership chain and response for non-owned resources]` Describe how ownership is checked for documents, analyses, reports, and drafts, and whether a non-owned resource returns 404 or 403.

### Legacy ownerless records

> [!NOTE]
> `[CONFIRM: legacy ownerless records]` The project documentation does not describe how records without an owner are handled. Explain from the source whether such records exist, whether the schema allows a null owner, and whether they are hidden, rejected, or migrated. Do not guess.

---

## API reference

All routes use the `/api/v1` prefix. Application routes require a session cookie and same-origin protection. Request bodies and parameters are validated where applicable.

> [!NOTE]
> `[CONFIRM: response shapes]` Response bodies and request body fields are not documented here because they have not been verified. Add them from the controllers and the Zod schemas in `src/validators/`. Status codes should also be confirmed.

### Authentication

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/auth/google` | Public | Start Google OAuth |
| GET | `/auth/google/callback` | Public | Complete Google OAuth |
| GET | `/auth/me` | `[CONFIRM]` | Read the current session |
| POST | `/auth/logout` | `[CONFIRM]` | End the current session |

### Health and dashboard

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | See note | Check API and database health |
| GET | `/dashboard` | Session | Read the dashboard summary |

> [!WARNING]
> The health route reports database availability, but because of route ordering, unauthenticated access may be intercepted by authentication middleware in the current application. Do not rely on it as a public health check.

### Deals

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST, GET, PATCH, DELETE | `/deals`, `/deals/:id` | Session | Manage owned deals |

`[CONFIRM: which methods apply to /deals and which to /deals/:id]`

### Documents

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/deals/:dealId/documents` | Session | Upload a document as multipart field `file` |
| GET | `/deals/:dealId/documents` | Session | List the deal's documents |
| GET, DELETE | `/documents/:id` | Session | Read or delete a document |

### Comparisons and analyses

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/comparisons/compare` | Session | Compare document IDs |
| GET | `/analyses/:analysisId` | Session | Read an analysis |
| POST | `/analyses/:analysisId/ai-impact` | Session | Run persisted AI impact analysis |

### Reports

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST, GET | `/analyses/:analysisId/reports` | Session | Create or list reports |
| GET, DELETE | `/reports/:reportId` | Session | Read or delete a report |
| GET | `/reports/:reportId/download` | Session | Download a report file |

### Communications

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST, GET | `/analyses/:analysisId/communications` | Session | Generate or list drafts |
| GET, PATCH, DELETE | `/communications/:draftId` | Session | Read, edit, or delete a draft |

> [!NOTE]
> The AI-service routes are internal and are not frontend endpoints. They are documented in the [AI Service README](../ai-service/README.md).

---

## Document processing workflow

```mermaid
flowchart LR
    A[Create owned deal] --> B[Upload PDF]
    B --> C[Validate file]
    C --> D[Extract text<br/>pdf-parse]
    D --> E[Store document<br/>and extracted text]
    E --> F[Compare documents]
    F --> G[Save analysis<br/>and changes]
    G --> H[Batch changes]
    H --> I[Call AI service<br/>sequentially]
    I --> J{Exact count and<br/>change-ID coverage?}
    J -->|Yes, all batches| K[Replace assessments<br/>atomically]
    J -->|No or failure| L[Keep previous<br/>complete result]
```

| Stage | Description |
|---|---|
| **Upload** | `POST /deals/:dealId/documents` accepts one file per request as multipart field `file`, handled by Multer. |
| **Validation** | Uploads are limited by `MAX_FILE_SIZE_MB`, and PDF validity is checked. `[CONFIRM: file-type and MIME checks, and other rules]` |
| **Text extraction** | `pdf-parse` extracts text from the PDF. OCR is not part of the documented pipeline. |
| **Storage** | The `Document` record stores file metadata and extracted text. Files are handled using `UPLOAD_DIR`. `[CONFIRM: whether the original file is retained on disk after extraction]` |
| **Comparison** | `POST /comparisons/compare` takes document IDs, detects changes, and assigns rule-based severity. `[CONFIRM: comparison granularity (line, paragraph, or clause), and category and severity values]` |
| **Persistence** | An `Analysis` and its `Change` records are saved. |
| **AI orchestration** | Changes are converted to the AI-service request shape and split by token-aware sequential batching (`src/utils/batch.js`, coordinated by `analysis.service.js`). |
| **Verification** | The backend validates exact assessment count and change-ID coverage. |
| **Atomic replacement** | Assessments are replaced only after all batches succeed, inside a Prisma transaction. A previously complete result is not overwritten by an incomplete run. |

### Concurrency

An in-process per-analysis lock prevents overlapping duplicate runs within one backend process. It is **not** a distributed lock.

---

## Database

DealLens uses **PostgreSQL** through **Prisma**. The connection is configured with `DATABASE_URL`. The schema is in [`prisma/schema.prisma`](prisma/schema.prisma).

### Models

The schema contains users and OAuth/session records plus the application domain:

| Model | Purpose |
|---|---|
| `Deal` | Owns documents and analyses. |
| `Document` | Uploaded-file metadata and extracted text. |
| `Analysis` | Comparison status and summary. |
| `Change` | Original and revised values and rule-based severity. |
| `AiAssessment` | Validated AI impact output for a change. |
| `Report` | Report metadata and generated-file paths. |
| `CommunicationDraft` | Editable generated messages. |

### Relationships

```mermaid
erDiagram
    USER ||--o{ DEAL : owns
    DEAL ||--o{ DOCUMENT : contains
    DEAL ||--o{ ANALYSIS : has
    ANALYSIS ||--o{ CHANGE : detects
    CHANGE ||--o| AI_ASSESSMENT : "assessed by"
    ANALYSIS ||--o{ REPORT : produces
    ANALYSIS ||--o{ COMMUNICATION_DRAFT : produces
```

> [!NOTE]
> `[CONFIRM: ER diagram]` The diagram is drawn from the documented ownership chain and is not verified against `schema.prisma`. Check each relationship and its cardinality, field names, enums, indexes, and cascade rules, and correct the diagram. Also describe the user and session models.

### Migrations

`[CONFIRM: migrations folder]` State whether `prisma/migrations/` exists in the repository and how many migrations it contains. See [Database migration instructions](#database-migration-instructions).

---

## Report generation and draft management

### Reports

`report.service.js` assembles deal, document, analysis, change, rule-based severity, and AI assessment data.

| Format | Output |
|---|---|
| `PDF` | PDFKit-generated document, `application/pdf` |
| `TEXT` | Plain-text report |
| `JSON` | Structured serialized report |

- Reports are persisted in the Prisma `Report` model, which stores metadata and generated-file paths.
- Files are written inside the configured `REPORT_DIR`.
- Download paths are checked to stay inside that directory.
- Reports are created and listed per analysis, and read, downloaded, and deleted by report ID (see [API reference](#reports)).

### Communication drafts

- The backend sends validated, saved analysis context to the AI service to generate a client clarification email.
- Trusted application metadata is preserved, and generated subject and body content is validated before it is saved.
- Drafts support create, list, retrieve, edit, and delete.
- **No email is sent.**

---

## AI service communication

The backend calls the AI service with `AI_SERVICE_URL`, authenticating with a bearer credential (`AI_SERVICE_API_KEY`). The same key must be set in the AI service.

| Concern | Behaviour |
|---|---|
| **Request** | Changes are converted to the AI-service request shape and sent in bounded batches, one at a time. The AI service enforces a maximum change count per request. |
| **Response** | The AI service returns validated assessments. The backend then checks exact count and change-ID coverage. |
| **Timeout** | `AI_REQUEST_TIMEOUT_MS` sets the backend request timeout. |
| **Retry ownership** | The backend owns retries. Provider SDK retries are disabled in the AI service. |
| **Retryable failures** | Rate limits, transient 5xx errors, timeouts, and network failures use bounded exponential backoff with jitter (`AI_MAX_RETRIES`, `AI_RETRY_BASE_DELAY_MS`). |
| **Non-retryable failures** | Permanent validation and configuration failures are not retried. |
| **Reset metadata** | The client parses `Retry-After`, token-reset, and request-reset metadata. If the provider reset exceeds `AI_MAX_SYNCHRONOUS_RETRY_WAIT_MS`, the request fails with retryable information instead of retrying too early. |
| **Logging** | Structured operation, batch, retry, completion, and failure logs avoid prompts, credentials, authorization headers, and contract content. |

> [!WARNING]
> Retries cannot bypass Groq quotas. A reset window longer than the synchronous wait ends the request with a retryable error.

---

## Installation and local development

### Prerequisites

- Node.js `>=20.19.0` and npm
- PostgreSQL, with a database such as `deallens`
- Google OAuth credentials (client ID and secret)
- The AI service running and configured (see the [AI Service README](../ai-service/README.md))

### Install

From the repository root (npm workspaces):

```bash
npm install
```

### Configure

**macOS / Linux**

```bash
cp .env.example .env
```

**Windows (PowerShell)**

```powershell
Copy-Item .env.example .env
```

Run these from `backend/`, then fill in your own values. See [Environment variables](#environment-variables).

### Set up the database

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

### Run

```bash
cd backend
npm run dev     # development
npm start       # production-style start
```

From the repository root, `npm run dev:backend` starts the same service. The default port is `5000`.

### Test

```bash
cd backend
npm test
```

The tests cover authentication boundaries, comparisons, batching, AI retries and timeouts, output validation, persistence behaviour, reports, and communication drafts.

---

## Environment variables

The authoritative names are in `backend/.env.example`.

> [!WARNING]
> The values below are placeholders. Use real values only in an untracked `backend/.env`. Never commit credentials.

| Variable | Purpose |
|---|---|
| `NODE_ENV`, `PORT` | Runtime mode and API port |
| `FRONTEND_URL` | Allowed frontend origin |
| `DATABASE_URL` | PostgreSQL connection string |
| `AI_SERVICE_URL` | Internal AI-service base URL |
| `AI_SERVICE_API_KEY` | Bearer credential for the AI service. Must match the AI service's value |
| `AI_REQUEST_TIMEOUT_MS` | Backend request timeout for AI calls |
| `AI_MAX_SYNCHRONOUS_RETRY_WAIT_MS` | Maximum synchronous provider wait |
| `AI_MAX_RETRIES`, `AI_RETRY_BASE_DELAY_MS` | Bounded retry policy |
| `MAX_FILE_SIZE_MB` | Upload size limit |
| `UPLOAD_DIR`, `REPORT_DIR` | Directories for uploaded and generated files |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `GOOGLE_CALLBACK_URL` | OAuth callback; must match the Google console |
| `GOOGLE_SUCCESS_REDIRECT` | Frontend URL after sign-in |
| `SESSION_SECRET` | Secret used to sign sessions |
| `SESSION_COOKIE_NAME`, `SESSION_MAX_AGE_MS` | Cookie name and lifetime |
| `SESSION_COOKIE_SECURE`, `SESSION_COOKIE_SAMESITE` | Cookie policy |

### Local development example

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
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback
GOOGLE_SUCCESS_REDIRECT=your_frontend_redirect_url_here

SESSION_SECRET=your_long_random_session_secret_here
SESSION_COOKIE_NAME=your_cookie_name
SESSION_MAX_AGE_MS=your_session_lifetime_in_ms
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAMESITE=your_samesite_policy
```

### Production configuration

Production values differ from local ones. Set them in your host's environment settings, not in committed files.

| Variable | Local development | Production |
|---|---|---|
| `NODE_ENV` | `development` | `production` |
| `FRONTEND_URL` | `http://localhost:5173` | `[ADD FRONTEND URL]` |
| `GOOGLE_CALLBACK_URL` | `http://localhost:5000/api/v1/auth/google/callback` | `[ADD BACKEND URL]/api/v1/auth/google/callback`, registered in Google Console |
| `GOOGLE_SUCCESS_REDIRECT` | Local frontend URL | Deployed frontend URL |
| `DATABASE_URL` | Local PostgreSQL | Managed PostgreSQL connection string |
| `AI_SERVICE_URL` | `http://localhost:5001` | `[ADD AI SERVICE URL]` or its internal address |
| `SESSION_COOKIE_SECURE` | `false` over HTTP | Enable over HTTPS `[CONFIRM: accepted values]` |
| `SESSION_COOKIE_SAMESITE` | Local default | Choose to suit your domains. Cross-domain frontends need a policy that permits cross-site cookies `[CONFIRM]` |
| `SESSION_SECRET`, `AI_SERVICE_API_KEY` | Any local value | Long, random, unique values |

`[CONFIRM: default values, accepted formats, and whether any variable is required or validated at startup]`

---

## Database migration instructions

Run Prisma commands from `backend/`.

**Generate the client and apply existing migrations** (local and production):

```bash
npx prisma generate
npx prisma migrate deploy
```

`migrate deploy` applies committed migrations and does not reset data. It is the command to use in production.

**Check status:**

```bash
npx prisma migrate status
```

**Create a new migration** (local development only, after changing `schema.prisma`):

```bash
npx prisma migrate dev --name describe_your_change
```

Commit the generated migration files so that other environments can apply them with `migrate deploy`.

> [!CAUTION]
> Never run `prisma migrate reset` against a production or shared database. It drops the database and deletes all data. Never run `migrate dev` against production.

> [!NOTE]
> `[CONFIRM: migrations folder]` `migrate deploy` applies nothing if `prisma/migrations/` is empty or missing, and the tables would not be created. Confirm the folder exists and is committed. If it does not, document the alternative that the project actually uses.

---

## Deployment

**Live backend URL:** `[ADD BACKEND URL]`

> [!NOTE]
> `[CONFIRM: Render configuration]` The project documentation does not describe the backend deployment. If the backend is deployed on Render, add the verified settings: service type, root directory, build and start commands, environment variables, and the managed PostgreSQL connection. Otherwise remove this note.

### Deployment requirements

| Requirement | Details |
|---|---|
| **Database** | A reachable PostgreSQL instance and `DATABASE_URL`. Apply migrations with `npx prisma migrate deploy`. |
| **Start command** | `npm start` |
| **AI service** | `AI_SERVICE_URL` and a matching `AI_SERVICE_API_KEY`. |
| **OAuth** | The production callback registered in Google Console and matching `GOOGLE_CALLBACK_URL`. |
| **CORS and cookies** | `FRONTEND_URL` set to the exact frontend origin, and cookie settings suited to the domains. |

### Deployment limitations

- **File storage is local disk.** Uploads and generated reports are written to `UPLOAD_DIR` and `REPORT_DIR` on the backend's file system. No external object storage is documented. If the host's disk is ephemeral, files can be lost on restart or redeploy while the database still holds their paths. `[CONFIRM: whether the production host uses a persistent disk]`
- **Single-process lock.** The analysis lock is in-process, so running several backend instances is not covered.
- **Provider limits.** Large analyses depend on Groq quotas. See the root README's [AI provider section](../README.md#ai-provider-and-groq-api-rate-limits).

---

## Error handling and troubleshooting

`src/app.js` configures error handling. Error responses avoid exposing secrets or confidential contract content.

`[CONFIRM: error response format and status codes]` Add the standard error body and the status codes the API returns.

| Symptom | What to check |
|---|---|
| Startup cannot connect | PostgreSQL is running and `DATABASE_URL` is correct. |
| Tables missing | Migrations were applied (`npx prisma migrate deploy`). |
| Uploads fail | `MAX_FILE_SIZE_MB`, the PDF is valid, and `UPLOAD_DIR` exists and is writable. |
| `401` from the frontend | The user is signed in, and the session cookie and origin are correct. |
| Sign-in fails | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, and `GOOGLE_SUCCESS_REDIRECT` match Google Console and the frontend. |
| Cookies not set in production | `SESSION_COOKIE_SECURE` and `SESSION_COOKIE_SAMESITE` for your domains and HTTPS. |
| AI requests fail with `429` | Wait for the provider reset window. Retries cannot bypass Groq quota. |
| AI service rejects requests | `AI_SERVICE_API_KEY` is identical in the backend and the AI service. |
| `/health` requires authentication | Known behaviour caused by route ordering. See [API reference](#health-and-dashboard). |

---

## Security and data handling

The following measures are described in the project documentation. This is not a security certification, and no system can be called absolutely secure.

| Area | Measure |
|---|---|
| **Boundary** | Helmet, CORS, same-origin checks, and session authentication. |
| **Access control** | Owner-scoped queries scope resources to the authenticated user. |
| **Input validation** | Zod validates request bodies and parameters where applicable. |
| **Uploads** | Upload size limits and PDF validation. |
| **File paths** | Report download paths are checked to stay inside the configured report directory. |
| **AI service** | Requests carry a bearer credential. The AI provider key stays in the AI service. |
| **Logging** | Logs avoid prompts, credentials, authorization headers, and contract content. |
| **Errors** | Provider diagnostics are sanitized, and responses avoid secrets and confidential contract content. |
| **Atomicity** | Assessments are replaced in a transaction, so partial AI results are not persisted. |

> [!CAUTION]
> Contract text is sent to the AI service and on to an external provider (Groq). Review the provider's data handling terms before uploading confidential agreements.

---

## Current limitations

- **Local file storage.** Uploads and reports use local directories. Persistence depends on the host.
- **Single-instance concurrency control.** The per-analysis lock is in-process, not distributed.
- **Synchronous analysis.** AI analysis runs as a sequential, request-bound workflow. There is no background job queue.
- **Provider limits.** Groq quotas and rate limits can prevent large analyses from finishing.
- **Text-only extraction.** `pdf-parse` extracts text. OCR is not part of the documented pipeline.
- **Google sign-in only.** There is no local password flow.
- **No email delivery.** Drafts are generated and stored, never sent.
- **Health route.** `/health` may be intercepted by authentication middleware.
- **Not legal advice.** AI output is an assessment aid.

---

## Future improvements

The project's planned work includes deployment configuration, provider quota monitoring, distributed job processing, and durable progress events. These are plans and are not implemented. `[CONFIRM: add backend-specific items, such as a public health route or external file storage, only if planned]`

---

## Documentation checklist

Remove this section when every item is resolved.

- [ ] Add response shapes, request body fields, and status codes from controllers and validators.
- [ ] Confirm the authentication requirement for `/auth/me`, `/auth/logout`, and `/health`.
- [ ] Confirm which methods apply to `/deals` and to `/deals/:id`.
- [ ] Describe the OAuth library, the session contents, the session store, and cookie flags.
- [ ] Document ownership checks and the behaviour for non-owned resources.
- [ ] Document legacy ownerless records, or confirm there are none.
- [ ] Verify the models, relationships, enums, and the ER diagram against `schema.prisma`.
- [ ] Confirm `prisma/migrations/` exists and is committed.
- [ ] Confirm comparison granularity and the category and severity values.
- [ ] Confirm whether original uploaded files are kept on disk.
- [ ] Add default values and validation rules for environment variables.
- [ ] Add the verified deployment settings (Render or other), or remove the note.
- [ ] Replace `[ADD BACKEND URL]`, `[ADD FRONTEND URL]`, and `[ADD AI SERVICE URL]`.

---

Back to the [root README](../README.md) · [Frontend README](../frontend/README.md) · [AI Service README](../ai-service/README.md)s

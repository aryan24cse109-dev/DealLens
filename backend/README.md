# DealLens Backend

## Overview

The backend is an Express API backed by PostgreSQL and Prisma. It owns authentication, authorization, deal and document records, PDF extraction, comparison orchestration, AI-service communication, assessment persistence, report generation, and communication draft persistence.

**Backend API URL:** Coming Soon — [Add Backend URL Here]

## Technology and structure

- Node.js and Express 5
- Prisma and PostgreSQL
- Zod validation
- Multer for uploads
- `pdf-parse` for PDF text extraction
- PDFKit for PDF reports
- Google OAuth and session cookies

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

`src/server.js` connects to PostgreSQL and starts Express. `src/app.js` configures security middleware, parsers, routes, and error handling.

## API routes

All backend routes use the `/api/v1` prefix. Authenticated application routes require the DealLens session and same-origin protection. Request bodies and parameters are validated where applicable.

| Method | Path | Purpose |
|---|---|---|
| GET | `/auth/google` | Start Google OAuth |
| GET | `/auth/google/callback` | Complete Google OAuth |
| GET | `/auth/me` | Read current session |
| POST | `/auth/logout` | End the current session |
| GET | `/health` | Check API/database health |
| GET | `/dashboard` | Read dashboard summary |
| POST/GET/PATCH/DELETE | `/deals`, `/deals/:id` | Manage owned deals |
| POST | `/deals/:dealId/documents` | Upload a document as multipart `file` |
| GET | `/deals/:dealId/documents` | List deal documents |
| GET/DELETE | `/documents/:id` | Read or delete a document |
| POST | `/comparisons/compare` | Compare document IDs |
| GET | `/analyses/:analysisId` | Read an analysis |
| POST | `/analyses/:analysisId/ai-impact` | Run persisted AI impact analysis |
| POST/GET | `/analyses/:analysisId/reports` | Create or list reports |
| GET/DELETE | `/reports/:reportId` | Read or delete a report |
| GET | `/reports/:reportId/download` | Download a report file |
| POST/GET | `/analyses/:analysisId/communications` | Generate or list drafts |
| GET/PATCH/DELETE | `/communications/:draftId` | Read, edit, or delete a draft |

The AI-service routes are internal and are not frontend endpoints.

## Database and models

Prisma connects to PostgreSQL using `DATABASE_URL`. The schema contains users and OAuth/session records plus the application domain:

- `Deal` owns documents and analyses.
- `Document` stores uploaded-file metadata and extracted text.
- `Analysis` stores comparison status and summary.
- `Change` stores original/revised values and rule-based severity.
- `AiAssessment` stores validated AI impact output for a change.
- `Report` stores report metadata and generated-file paths.
- `CommunicationDraft` stores editable generated messages.

Ownership relations scope application resources to the authenticated user. The backend uses Prisma transactions when replacing a complete assessment set, so incomplete AI runs do not overwrite a previously complete result.

## Document and analysis workflow

1. Create an owned deal.
2. Upload original and revised PDF files.
3. Extract text and compare documents.
4. Save an analysis and detected changes.
5. Convert changes to the AI-service request shape.
6. Split requests using token-aware sequential batching.
7. Validate exact assessment count and change-ID coverage.
8. Replace assessments atomically only after all batches succeed.

Batching is implemented in `src/utils/batch.js` and coordinated by `analysis.service.js`. An in-process per-analysis lock prevents overlapping duplicate runs in one backend process; this is not a distributed lock.

## AI-service communication and reliability

The backend calls the AI service using `AI_SERVICE_API_KEY`. The backend is the retry owner; provider SDK retries are disabled in the AI service. Retryable rate-limit, transient 5xx, timeout, and network failures use bounded exponential backoff with jitter. Permanent validation and configuration failures are not retried.

The client parses `Retry-After`, token-reset, and request-reset metadata. If the provider reset exceeds the configured synchronous wait, the request fails with retryable information rather than retrying too early. Structured operation, batch, retry, completion, and failure logs avoid prompts, credentials, authorization headers, and contract content.

## Communication drafts

The backend sends validated saved analysis context to the AI service for a client clarification email. Trusted application metadata is preserved, while generated subject/body content is validated before persistence. Drafts support create, list, retrieve, edit, and delete operations. No email is sent by this workflow.

## Reports and exports

`report.service.js` assembles deal, document, analysis, change, rule-based severity, and AI assessment data. Reports are persisted in the Prisma `Report` model and written inside the configured report directory. Supported formats are:

- `PDF` — PDFKit-generated document, `application/pdf`
- `TEXT` — plain-text report
- `JSON` — structured serialized report

Download paths are checked to remain inside the configured report directory.

## Environment variables

The authoritative names are in `backend/.env.example`:

| Variable | Purpose |
|---|---|
| `NODE_ENV`, `PORT` | Runtime mode and API port |
| `FRONTEND_URL` | Allowed frontend origin |
| `DATABASE_URL` | PostgreSQL connection |
| `AI_SERVICE_URL` | Internal AI-service base URL |
| `AI_REQUEST_TIMEOUT_MS` | Backend request timeout |
| `AI_MAX_SYNCHRONOUS_RETRY_WAIT_MS` | Maximum synchronous provider wait |
| `AI_MAX_RETRIES`, `AI_RETRY_BASE_DELAY_MS` | Bounded retry policy |
| `MAX_FILE_SIZE_MB`, `UPLOAD_DIR`, `REPORT_DIR` | File handling |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google OAuth |
| `GOOGLE_SUCCESS_REDIRECT` | Post-login frontend redirect |
| `SESSION_SECRET`, `SESSION_COOKIE_NAME`, `SESSION_MAX_AGE_MS` | Session configuration |
| `SESSION_COOKIE_SECURE`, `SESSION_COOKIE_SAMESITE` | Cookie policy |

Use real values only in an untracked `backend/.env`. Never commit credentials.

## Setup and commands

```powershell
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Production-style start:

```powershell
npm start
```

From the repository root, `npm run dev:backend` starts the same service.

## Testing

```powershell
cd backend
npm test
```

The tests cover authentication boundaries, comparisons, batching, AI retries and timeouts, output validation, persistence behavior, reports, and communication drafts.

## Error handling and security

Helmet, CORS, same-origin checks, session authentication, owner-scoped queries, Zod validation, upload limits, safe report paths, and sanitized provider diagnostics are part of the backend boundary. Error responses avoid exposing secrets or confidential contract content.

## Troubleshooting

- If startup cannot connect, check PostgreSQL and `DATABASE_URL`.
- If uploads fail, check `MAX_FILE_SIZE_MB`, PDF validity, and the upload directory.
- If AI requests fail with 429, wait for the provider reset window; retries cannot bypass Groq quota.
- If the frontend receives 401, sign in and confirm the session cookie and origin.
- The health route reports database availability, but route ordering means unauthenticated access may be intercepted by authentication middleware in the current application.

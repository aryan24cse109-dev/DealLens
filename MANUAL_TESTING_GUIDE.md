# DealLens Manual Testing Guide

This guide covers the current DealLens monorepo and the authenticated end-to-end workflow. It is based on the service scripts, environment examples, Prisma schema, routes, and frontend implementation in this repository.

## A. Prerequisites

### Software

- Node.js `>=20.19.0` (declared in the root `package.json`).
- npm with workspace support.
- PostgreSQL 16, either installed locally or started with Docker Compose.
- A browser with cookies enabled.
- A Google account permitted by the configured Google OAuth application.

### Install dependencies

From the repository root:

```bash
cd "C:/Users/aryan/OneDrive/Desktop/DEV Aryan/Deallens"
npm install
```

### PostgreSQL

The repository includes `docker-compose.yml` with:

- Host: `localhost`
- Port: `5432`
- Database: `deallens`
- User: `deallens`
- Development password: the placeholder configured in `docker-compose.yml`

Start PostgreSQL from the repository root:

```bash
cd "C:/Users/aryan/OneDrive/Desktop/DEV Aryan/Deallens"
docker compose up -d postgres
```

Verify readiness:

```bash
cd "C:/Users/aryan/OneDrive/Desktop/DEV Aryan/Deallens"
docker compose ps
docker compose logs postgres
```

The container health check uses `pg_isready`.

### Environment files

Copy the safe examples and replace placeholders locally. Never commit the resulting `.env` files.

Backend:

```bash
cd "C:/Users/aryan/OneDrive/Desktop/DEV Aryan/Deallens/backend"
cp .env.example .env
```

Required backend variables:

- `NODE_ENV`
- `PORT` (normally `5000`)
- `FRONTEND_URL` (normally `http://localhost:5173`)
- `DATABASE_URL`
- `AI_SERVICE_URL` (normally `http://localhost:5001`)
- `AI_SERVICE_API_KEY`
- `MAX_FILE_SIZE_MB`
- `UPLOAD_DIR`
- `REPORT_DIR`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `GOOGLE_SUCCESS_REDIRECT`
- `SESSION_SECRET`
- `SESSION_COOKIE_NAME`
- `SESSION_MAX_AGE_MS`
- `SESSION_COOKIE_SECURE`
- `SESSION_COOKIE_SAMESITE`

Google OAuth callback configuration must include:

```text
http://localhost:5000/api/v1/auth/google/callback
```

The Google OAuth client must allow the frontend success URL configured by `GOOGLE_SUCCESS_REDIRECT`, normally:

```text
http://localhost:5173
```

AI service:

```bash
cd "C:/Users/aryan/OneDrive/Desktop/DEV Aryan/Deallens/ai-service"
cp .env.example .env
```

Required AI-service variables:

- `NODE_ENV`
- `PORT` (normally `5001`)
- `GROQ_API_KEY`
- `GROQ_BASE_URL` (normally `https://api.groq.com/openai/v1/`)
- `GROQ_MODEL` (normally `openai/gpt-oss-120b`)
- `AI_SERVICE_API_KEY`
- `AI_REQUEST_TIMEOUT_MS`
- `AI_MAX_CHANGES`

The backend and AI service must use the same non-empty `AI_SERVICE_API_KEY`.

Frontend:

```bash
cd "C:/Users/aryan/OneDrive/Desktop/DEV Aryan/Deallens/frontend"
cp .env.example .env
```

Frontend variable:

- `VITE_API_BASE_URL=http://localhost:5000/api/v1`

The browser must not receive the backend session secret, Google client secret, Groq key, or AI service API key.

### Apply Prisma migrations

From the repository root, after PostgreSQL and backend `.env` are configured:

```bash
cd "C:/Users/aryan/OneDrive/Desktop/DEV Aryan/Deallens"
npx prisma migrate deploy --schema backend/prisma/schema.prisma
npx prisma generate --schema backend/prisma/schema.prisma
```

The migrations are additive. The ownership migration keeps `Deal.ownerId` nullable and does not backfill existing deals. Existing ownerless deals must remain inaccessible to normal users.

Verify migration status:

```bash
cd "C:/Users/aryan/OneDrive/Desktop/DEV Aryan/Deallens"
npx prisma migrate status --schema backend/prisma/schema.prisma
```

There is no Prisma seed script in the root or backend package scripts.

## B. Starting all services

Use one Git Bash terminal per service.

### Terminal 1: PostgreSQL

Working directory:

```bash
cd "C:/Users/aryan/OneDrive/Desktop/DEV Aryan/Deallens"
```

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Expected result: the `deallens-postgres` container becomes healthy on port `5432`.

### Terminal 2: Backend

Working directory:

```bash
cd "C:/Users/aryan/OneDrive/Desktop/DEV Aryan/Deallens/backend"
```

Development mode:

```bash
npm run dev
```

Production-style local start:

```bash
npm start
```

Expected startup output includes:

```text
Database connected successfully.
DealLens API running at http://localhost:5000
Health check: http://localhost:5000/api/v1/health
```

Backend health check:

```bash
curl http://localhost:5000/api/v1/health
```

Expected healthy response includes:

```json
{
  "success": true,
  "services": {
    "api": "healthy",
    "database": "connected"
  }
}
```

### Terminal 3: AI service

Working directory:

```bash
cd "C:/Users/aryan/OneDrive/Desktop/DEV Aryan/Deallens/ai-service"
```

Development mode:

```bash
npm run dev
```

Production-style local start:

```bash
npm start
```

Expected startup output:

```text
DealLens AI service listening on port 5001
```

AI service health check:

```bash
curl http://localhost:5001/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "deallens-ai-service"
}
```

The AI routes require backend service authentication. Do not call them directly from the browser.

### Terminal 4: Frontend

Working directory:

```bash
cd "C:/Users/aryan/OneDrive/Desktop/DEV Aryan/Deallens/frontend"
```

Start Vite:

```bash
npm run dev
```

Expected local URL:

```text
http://localhost:5173
```

### Root workspace shortcut

The repository root also provides:

```bash
cd "C:/Users/aryan/OneDrive/Desktop/DEV Aryan/Deallens"
npm run dev
```

This starts backend, AI service, and frontend concurrently. PostgreSQL is not started by this command and must already be running.

## C. Stopping and restarting services

### Stop individual Node services

In the terminal running the service, press:

```text
Ctrl+C
```

Restart it with the same `npm run dev` command from its service directory.

### Stop PostgreSQL

From the repository root:

```bash
cd "C:/Users/aryan/OneDrive/Desktop/DEV Aryan/Deallens"
docker compose stop postgres
```

Restart:

```bash
cd "C:/Users/aryan/OneDrive/Desktop/DEV Aryan/Deallens"
docker compose start postgres
```

Do not use `docker compose down -v` during testing because it removes the PostgreSQL volume and can destroy test data.

### Port conflicts

Expected ports:

- PostgreSQL: `5432`
- Backend: `5000`
- AI service: `5001`
- Frontend: `5173`

On Windows PowerShell, inspect a port:

```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen
```

Stop only a specifically identified process if necessary:

```powershell
Stop-Process -Id <PID>
```

Do not kill processes by broad process name.

## D. Complete manual end-to-end testing

### 1. Open DealLens

**Action:** Open `http://localhost:5173`.

**Expected:** The DealLens login page appears.

**Verify:** No browser console error prevents rendering.

**Common failures:** Vite is not running, incorrect `VITE_API_BASE_URL`, or a stale browser tab.

### 2. Google login

**Action:** Select “Continue with Google” and complete the configured Google OAuth flow.

**Expected:** The browser returns to the configured frontend success URL and the backend session cookie is set.

**Verify:** The browser navigates to `/dashboard`; no token is stored in localStorage or sessionStorage.

**Common failures:** Incorrect callback URL, invalid Google client configuration, missing backend OAuth variables, or cookie/CORS mismatch.

### 3. Authenticated dashboard

**Action:** Wait for the dashboard to load.

**Expected:** Dashboard metrics and recent activity load from `GET /api/v1/dashboard`.

**Verify:** Counts and lists reflect only the authenticated user’s owned records.

**Common failures:** Backend `401`, database unavailable, or missing session cookie.

### 4. Create a deal

**Action:** Open “New deal”, enter a valid name and optional description, and submit.

**Expected:** A new deal is created with the authenticated server-side owner.

**Verify:** The deal appears in the deal selector. No owner ID is submitted by the browser.

**Common failures:** Validation error for a short name, backend unavailable, or expired session.

### 5. Open deal details

**Action:** Select the created deal in the deal-management panel.

**Expected:** `GET /api/v1/deals/:id` loads its details, documents, and analyses.

**Verify:** The selected deal name, description, status, and document list appear.

**Common failures:** `404` for an inaccessible deal or a stale selected ID.

### 6. Upload the original document

**Action:** Select `Original`, choose a PDF under the configured 15 MB limit, and upload it.

**Expected:** The backend accepts multipart fields `file` and `type`.

**Verify:** The document appears with type `ORIGINAL`.

**Common failures:** Non-PDF file, file too large, missing multipart boundary, missing extracted text, or backend upload directory permissions.

### 7. Upload the revised document

**Action:** Select `Revised`, choose the revised PDF, and upload it.

**Expected:** The revised document is saved and extracted.

**Verify:** Both original and revised documents are listed under the deal.

**Common failures:** Wrong document type, PDF extraction failure, or expired session.

### 8. Verify uploaded documents

**Action:** Refresh the deal details or switch away and back to the deal.

**Expected:** Documents remain listed from backend data.

**Verify:** Names, types, and sizes are correct.

**Common failures:** Database query failure or upload transaction failure.

### 9. Run comparison

**Action:** Open “Compare”, select the deal’s original and revised documents, and submit.

**Expected:** The frontend calls:

```text
POST /api/v1/comparisons/compare
```

**Verify:** Detected changes are displayed.

**Common failures:** Documents belong to different deals, wrong document types, missing extracted text, or request size limits.

### 10. Verify the analysis ID

**Action:** Inspect the comparison result.

**Expected:** The response displays the returned `analysisId`.

**Verify:** The ID is used by subsequent AI, report, and communication requests.

**Common failures:** Comparison failed before an analysis was persisted.

### 11. Generate AI impact assessments

**Action:** Select “Run AI impact”.

**Expected:** The frontend calls:

```text
POST /api/v1/analyses/:analysisId/ai-impact
```

**Verify:** Each change receives an impact, explanation, suggested action, and confidence.

**Common failures:** AI service is stopped, API keys differ, Groq rejects the request, or the analysis has no changes.

### 12. Verify persisted assessments

**Action:** Review the assessment cards and repeat the page workflow if needed.

**Expected:** Assessments correspond to the saved change IDs.

**Verify:** No assessment is shown for a different analysis or user.

**Common failures:** Invalid AI response or incomplete assessment set.

### 13. Generate a report

**Action:** Select “Generate report” from the comparison result.

**Expected:** The browser navigates to:

```text
/report?analysisId=<analysisId>
```

**Verify:** The analysis ID field is populated and report creation succeeds for PDF or JSON.

**Common failures:** AI assessment not completed where required by report context, invalid analysis ID, or report directory permissions.

### 14. View and download the report

**Action:** Review the report list, open a report row, and select download.

**Expected:** The frontend loads report metadata and downloads an authenticated PDF or JSON blob.

**Verify:** The downloaded file opens and belongs to the selected analysis.

**Common failures:** Missing generated file, expired session, or browser download blocking.

### 15. Generate a communication draft

**Action:** Select “Draft communication” from the comparison result.

**Expected:** The browser navigates to:

```text
/communication?analysisId=<analysisId>
```

**Verify:** The analysis ID is populated and draft generation succeeds.

**Common failures:** AI impact assessments have not been completed, AI service unavailable, or invalid communication parameters.

### 16. View and edit communication

**Action:** Select a generated draft, change its subject or content, and save.

**Expected:** The frontend retrieves the draft details and calls:

```text
PATCH /api/v1/communications/:draftId
```

**Verify:** The updated content remains after reselecting the draft.

**Common failures:** Empty content, content longer than validator limits, or expired session.

### 17. Delete a communication draft

**Action:** Select the delete control for a draft.

**Expected:** The draft disappears after:

```text
DELETE /api/v1/communications/:draftId
```

**Verify:** Refreshing the communication page does not restore it.

**Common failures:** Draft not found or ownership rejection.

### 18. Refresh Reports

**Action:** Refresh `/report?analysisId=<analysisId>`.

**Expected:** The query parameter survives the refresh and the frontend calls:

```text
GET /api/v1/analyses/:analysisId/reports
```

**Verify:** Existing reports remain visible.

**Common failures:** The query parameter was removed, the analysis is inaccessible, or the backend is unavailable.

### 19. Refresh Communication

**Action:** Refresh `/communication?analysisId=<analysisId>`.

**Expected:** Existing drafts reload from the backend.

**Verify:** The draft list remains available and selecting a draft retrieves its details.

**Common failures:** Invalid analysis ID, expired session, or unavailable backend.

### 20. Direct query-parameter navigation

**Action:** Open each of these directly with a valid owned analysis ID:

```text
http://localhost:5173/report?analysisId=<analysisId>
http://localhost:5173/communication?analysisId=<analysisId>
```

**Expected:** The corresponding reports or drafts load without first visiting Comparison.

**Verify:** Backend ownership checks still apply; an analysis owned by another user returns an error.

### 21. Logout

**Action:** Select the logout control.

**Expected:** The backend session is revoked and the frontend returns to `/login`.

**Verify:** Opening `/dashboard` again redirects to login.

**Common failures:** Backend unavailable or cookie not sent.

### 22. Expired-session handling

**Action:** Expire or revoke the session in a controlled test environment, then trigger a protected API request.

**Expected:** A `401` causes the shared auth context to clear the user and protected routing redirects to `/login`.

**Verify:** No infinite redirects and no authenticated shell remains.

**Common failures:** Browser blocks cookies, backend returns a non-401 error, or the initial `/auth/me` request is confused with a later request.

### 23. Logout failure handling

**Action:** Stop the backend immediately before selecting logout, or simulate a network failure in browser developer tools.

**Expected:** The logout button prevents duplicate submissions and an error is displayed. A backend `401` still clears frontend authentication.

**Verify:** No unhandled promise rejection appears in the browser console.

**Common failures:** Browser console reports an unhandled rejection or the button remains indefinitely disabled.

### 24. Multi-user isolation

**Action:** Use two separate Google accounts or browser profiles. Create a deal and analysis with User A, then log in as User B.

**Expected:** User B cannot list, view, update, delete, download, or generate communications for User A’s records.

**Verify:** User B’s dashboard excludes User A’s data and direct IDs return authorization-safe not-found responses.

**Common failures:** An unscoped backend query, stale browser session, or testing both users in the same cookie context.

## E. Troubleshooting

### Backend does not start

- Confirm `backend/.env` exists and `DATABASE_URL` is set.
- Confirm PostgreSQL is healthy on port `5432`.
- Run `npx prisma migrate status --schema backend/prisma/schema.prisma`.
- Check whether port `5000` is already in use.

### Frontend does not start

- Confirm dependencies were installed from the repository root.
- Confirm `frontend/.env` contains `VITE_API_BASE_URL`.
- Check for a port conflict on `5173`.
- Restart Vite after changing environment variables.

### AI service does not start

- Confirm `ai-service/.env` contains a valid `GROQ_API_KEY`.
- Confirm `AI_SERVICE_API_KEY` matches the backend value.
- Confirm port `5001` is available.
- Check `curl http://localhost:5001/health`.

### PostgreSQL connection failures

- Run `docker compose ps`.
- Inspect `docker compose logs postgres`.
- Confirm the database name, user, password, host, and port in `DATABASE_URL`.
- Do not run `prisma migrate reset` during this testing workflow.

### Missing environment variables

- Compare local files against:
  - `backend/.env.example`
  - `frontend/.env.example`
  - `ai-service/.env.example`
- Never copy real credentials into an example file.

### Invalid API keys

- Google credentials are used by the backend OAuth flow.
- `GROQ_API_KEY` is used only by the AI service.
- `AI_SERVICE_API_KEY` authenticates backend-to-AI-service calls.
- Restart the affected service after changing keys.

### CORS or cookie authentication problems

- Confirm frontend origin is `http://localhost:5173`.
- Confirm backend `FRONTEND_URL` matches that origin.
- Confirm Axios uses `withCredentials: true`.
- Confirm `SESSION_COOKIE_SECURE=false` for local HTTP testing.
- Confirm the browser is not blocking third-party or cross-site cookies.

### Multer or document upload failures

- Upload a real PDF under the configured size limit.
- Confirm the multipart request includes `file` and `type`.
- Do not manually set the multipart boundary.
- Check backend upload-directory permissions.

### AI-service communication failures

- Confirm both services are running.
- Confirm `AI_SERVICE_URL=http://localhost:5001`.
- Confirm backend and AI service share the same service API key.
- Inspect backend logs for timeout, authentication, or invalid-response errors.

### Report generation failures

- Confirm `REPORT_DIR=generated-reports`.
- Confirm the backend can create and write that directory.
- Confirm the analysis belongs to the authenticated user.
- Confirm the requested format is `PDF` or `JSON`.

### Port conflicts

Inspect listeners with PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 5000 -State Listen
Get-NetTCPConnection -LocalPort 5001 -State Listen
Get-NetTCPConnection -LocalPort 5173 -State Listen
Get-NetTCPConnection -LocalPort 5432 -State Listen
```

Stop only a specifically identified process by PID:

```powershell
Stop-Process -Id <PID>
```

## F. Architecture and service dependencies

```text
Browser frontend
    │
    │ HTTP requests with session cookie
    ▼
Backend Express API ───────► PostgreSQL through Prisma
    │
    │ authenticated server-to-server bearer request
    ▼
AI service Express API ────► Groq OpenAI-compatible API
```

### Frontend

Responsible for:

- Google login initiation.
- Cookie-based authenticated UI.
- Deal and document forms.
- Comparison presentation.
- AI assessment presentation.
- Report and communication workflows.

The frontend must not call Groq or the AI service directly.

### Backend

Responsible for:

- Google OAuth callback and ID-token validation.
- Session creation, validation, and logout.
- Ownership enforcement using authenticated `req.user.id`.
- Deal, document, comparison, analysis, report, and communication APIs.
- PDF extraction and deterministic comparison.
- Persisting analyses, changes, AI assessments, reports, and drafts.
- Calling the AI service with `AI_SERVICE_API_KEY`.

### PostgreSQL

Responsible for:

- Users, OAuth accounts, sessions, and OAuth transactions.
- Nullable deal ownership preserving legacy records.
- Documents and extracted text.
- Analyses, changes, AI assessments, reports, and communication drafts.

### AI service

Responsible for:

- Validating backend service authentication.
- Receiving verified change and communication context from the backend.
- Calling Groq using its private API key.
- Validating structured AI responses before returning them.

### Ownership and legacy records

Existing records with `Deal.ownerId = NULL` are preserved but excluded from normal authenticated-user queries. New deals receive ownership from the backend session, never from browser request fields.

# DealLens AI Service

## Overview

The AI service is a separate Express process that isolates provider integration from the backend. It authenticates internal backend requests, constructs prompts, calls the Groq OpenAI-compatible API, parses structured output, and validates assessment or communication schemas.

**AI Service URL:** Coming Soon — [Add AI Service URL Here]

The backend calls this service. The frontend never calls it directly.

## Why it is separate

Separating provider work keeps Groq credentials and provider-specific behavior out of the browser and the primary persistence API. It also gives the AI workflows their own prompts, schemas, provider timeout, diagnostics, and service-authentication boundary.

## Technology and structure

- Node.js and Express
- OpenAI-compatible SDK
- Groq API
- Zod
- Helmet and CORS

```text
ai-service/
├── README.md
├── package.json
└── src/
    ├── app.js
    ├── server.js
    ├── config/
    ├── controllers/
    ├── middleware/
    ├── prompts/
    ├── routes/
    ├── schemas/
    ├── services/
    └── utils/
```

`src/server.js` listens on the configured port. `src/app.js` exposes health, internal AI routes, and sanitized error handling.

## Routes

| Method | Path | Authentication | Purpose |
|---|---|---|---|
| GET | `/health` | None | Service health response |
| POST | `/api/v1/ai/impact-analysis` | `Authorization: Bearer <AI_SERVICE_API_KEY>` | Generate validated impact assessments |
| POST | `/api/v1/ai/communications` | `Authorization: Bearer <AI_SERVICE_API_KEY>` | Generate validated communication content |

These are backend-to-AI-service routes, not public frontend routes.

## Provider integration

The service sends provider requests to the configured `GROQ_BASE_URL` using `GROQ_MODEL`. The current model is `openai/gpt-oss-120b`. The API key remains server-side. Impact analysis disables provider JSON mode and performs strict local parsing and validation; communication generation uses the configured structured response workflow.

Provider errors are converted into sanitized service diagnostics containing status/type/code/message, retry metadata, model, and endpoint. API keys, authorization headers, prompts, and contract content are not logged.

## Impact analysis workflow

1. Authenticate the backend request.
2. Validate the request and its bounded change list.
3. Build the impact-analysis prompt.
4. Request one assessment per supplied change.
5. Parse complete JSON, including safely recoverable fenced or surrounded JSON.
6. Validate required fields, enums, types, and confidence.
7. Reject missing, duplicate, or unexpected change IDs.
8. Return the validated assessment collection to the backend.

Batch splitting is coordinated by the backend so each AI-service request is bounded. The AI service itself enforces a maximum request change count.

## Communication generation

The communication workflow receives trusted analysis context and optional instructions from the backend. The model generates client clarification email subject/body content. Application-supplied communication metadata remains authoritative, and generated content is validated before it is returned for persistence.

## Schemas and validation

`src/schemas/impact.schema.js` validates verified changes and assessment output. `src/schemas/communication.schema.js` validates communication requests and generated content. `src/utils/validate-output.js` performs controlled JSON parsing without fabricating missing fields or accepting truncated output.

Assessment validation requires exact application fields such as `changeId`, category, impact, explanation, suggested action, severity, and confidence. The service does not silently discard malformed assessments.

## Retry, rate limits, and timeouts

Provider SDK retries are disabled so retry ownership remains predictable at the backend boundary. The service applies its configured provider timeout and exposes sanitized retry/reset metadata to the backend. Groq rate limits may return 429; a reset window can exceed the maximum synchronous wait. Bounded retries cannot bypass token-per-minute, token-per-day, or request quotas.

Large documents create more changes, which produce more sequential provider batches and longer processing times. A small successful request does not guarantee that a large analysis will fit current provider quotas.

## Environment variables

The authoritative names are in `ai-service/.env.example`:

| Variable | Purpose |
|---|---|
| `NODE_ENV`, `PORT` | Runtime mode and service port |
| `GROQ_API_KEY` | Server-side Groq credential |
| `GROQ_BASE_URL` | OpenAI-compatible provider base URL |
| `GROQ_MODEL` | Provider model name |
| `AI_SERVICE_API_KEY` | Backend-to-service bearer credential |
| `AI_REQUEST_TIMEOUT_MS` | Provider request timeout |
| `AI_MAX_SYNCHRONOUS_RETRY_WAIT_MS` | Maximum synchronous reset wait |
| `AI_MAX_CHANGES` | Maximum changes accepted per request |

Use `GROQ_API_KEY=your_groq_api_key_here` as a documentation placeholder. Never commit the real key.

## Run locally

From the repository root:

```powershell
npm install
npm run dev:ai
```

Or from this directory:

```powershell
npm run dev
npm start
```

The default local port is `5001`.

## Testing and troubleshooting

```powershell
cd ai-service
npm test
```

Tests cover service authentication, communication metadata, valid and fenced JSON, invalid/truncated JSON, schema incompatibility, and exact change-ID validation.

If requests fail:

- Confirm `GROQ_API_KEY`, `GROQ_BASE_URL`, and `GROQ_MODEL` are configured in the untracked environment file.
- Confirm the backend uses the same `AI_SERVICE_API_KEY`.
- Check the service log for sanitized provider status and reset information.
- For HTTP 429, stop repeated requests and wait for the provider reset window.
- Do not treat generated assessments as legal advice or guaranteed legal interpretation.

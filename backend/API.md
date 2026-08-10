# Deadreckoner API

Deadreckoner exposes a REST API automatically over its database, plus a small
set of server-side functions. Everything is scoped to the caller's workspace
by row-level security — a token can only ever read or write its own workspace's
data, regardless of what it asks for.

**Base URL** `https://<your-project>.supabase.co`

## Authentication

All requests need two headers:

    apikey: <your anon key>
    Authorization: Bearer <user access token>

Obtain a token by signing in. Tokens are short-lived and refresh automatically
in the browser SDK. There is no long-lived API key for workspace data — this is
deliberate, so a leaked key cannot expose a tenant indefinitely.

## Reading data

    GET /rest/v1/requests?select=*&order=updated_at.desc
    GET /rest/v1/asset_submissions?select=*&status=eq.approved
    GET /rest/v1/scrape_candidates?select=*&review_status=eq.pending

Filtering, ordering and pagination follow PostgREST conventions:

    ?status=eq.open              equals
    ?confidence=gte.0.9          greater than or equal
    ?order=created_at.desc       sort
    ?limit=20&offset=40          page

## Writing data

    POST /rest/v1/requests
    Content-Type: application/json

    {
      "workspace_id": "<your workspace id>",
      "title": "Landscape crop of the hero image",
      "type": "adaptation",
      "priority": "normal",
      "description": "Needed at 3:2 for print."
    }

`type` is one of `new-asset`, `exception`, `adaptation`.
`priority` is one of `low`, `normal`, `high`.
Writes are refused if your role is `viewer`.

## Functions

| Function | Purpose |
| --- | --- |
| `POST /functions/v1/create-workspace` | Create a workspace and become its founding admin. Body: `{ company_name, company_url }` |
| `POST /functions/v1/onboarding-scrape` | Scan a website and queue AI-classified brand candidates. Body: `{ company_url }` |
| `POST /functions/v1/ai-consultant` | Ask the brand consultant. Body: `{ message, conversation_history }` |
| `POST /functions/v1/drive-dump-processor` | Classify and rename new files in the connected Drive folder |

## Data rights

| RPC | Purpose |
| --- | --- |
| `POST /rest/v1/rpc/export_my_data` | Returns everything held about the caller as JSON |
| `POST /rest/v1/rpc/erase_my_data` | Anonymises the caller's data and removes them from the workspace |

## Rate limits

| Endpoint | Limit |
| --- | --- |
| `onboarding-scrape` | 15 per hour per user |
| `ai-consultant` | 30 per hour per user |
| `create-workspace` | 3 per day per user |

Exceeding a limit returns `429` with a `Retry-After` header.

## Errors

Standard HTTP status codes. Bodies are `{ "error": "message" }`.

| Code | Meaning |
| --- | --- |
| 400 | Malformed request or invalid input |
| 401 | Missing or expired token |
| 403 | Your role does not permit this action |
| 409 | Conflict — e.g. you already belong to a workspace |
| 429 | Rate limited |

## Webhooks

Not yet available. Until then, poll `events` for workspace activity:

    GET /rest/v1/events?select=*&order=created_at.desc&limit=50

Each row carries `event_type`, `entity_type`, `entity_id`, `metadata` and
`created_at`. Event types follow a `noun.verb` convention, for example
`request.submitted`, `asset_submission.created`, `asset.downloaded`.

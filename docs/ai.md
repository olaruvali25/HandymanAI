# AI + TTS

## Endpoints

- `POST /api/ai` — primary chat endpoint (supports streaming + image attachments)
- `GET /api/ai` — returns client entitlements + may set the guest anonymous cookie
- `POST /api/tts` — text-to-speech (mp3)

There is also a legacy endpoint:

- `POST /api/chat` — older chat implementation using `primary.txt` + `verifier.txt`

## Prompts

Prompt files live in `src/ai/prompts/`:

- `scope-control.txt` — produces an internal “Scope Control” object
- `primary.txt` — user-facing assistant behavior (must follow Scope Control)
- `verifier.txt` — rewrites a draft into a final response (used by `/api/chat`)

`/api/ai` currently uses `scope-control.txt` + `primary.txt`.

## Streaming protocol (`/api/ai`)

When streaming is enabled, `/api/ai` responds as `text/event-stream` and emits:

- `event: meta` — includes current entitlements
- `event: delta` — incremental assistant text `{ "text": "..." }`
- `event: done` — end-of-stream marker
- `event: error` — `{ "message": "..." }`

To disable streaming (useful for debugging clients), set:

- `FIXLY_DISABLE_STREAMING=1`

## Attachments (images)

`/api/ai` accepts images as uploaded references (storage IDs + URLs).

- JSON mode: `attachments: [{ name, type, size, storageId?, url?, dataUrl? }]`
- Upload flow: client uploads to Convex Storage, then sends `storageId` (and optionally `url`)
- Multipart uploads are no longer used for images; clients should upload to storage first.

The UI uploads attachments in `src/components/chat/GrokThread.tsx`.

## Credits / entitlements (server-enforced)

`/api/ai` reserves credits before calling OpenAI, and charges again on completion.

Current costs (from `src/app/api/ai/route.ts`):

- User message: `2` credits
- User message with image(s): `2 + 15` credits
- Assistant reply: `2` credits

If credits are insufficient:

- Returns HTTP `402` with `{ "error": "INSUFFICIENT_CREDITS", "assistantMessage": "...", "actions": {...} }`

Credits are tracked in Convex (`convex/entitlements.ts` + `convex/schema.ts`).

## Models

- Base model is `OPENAI_MODEL` (or a repo default)
- When image attachments are present, `/api/ai` may switch to a vision-capable model

If you see OpenAI “model not found” errors, set `OPENAI_MODEL` explicitly in
`.env.local` to a valid model name for your account.

## TTS (`/api/tts`)

- Input: `{ "text": "...", "voice": "nova" | "echo" }`
- Output: mp3 bytes, `Content-Type: audio/mpeg`
- Server-side limit: 3000 chars

Below is a precise technical breakdown of assistant-ui based on its landing page and implied architecture.

High-level summary

assistant-ui is an open-source React UI framework for building ChatGPT-style AI chat interfaces, with built-in state management for streaming LLM conversations.

It is not an AI model, backend, or orchestration framework.
It is primarily a frontend UI + conversation state toolkit.

Core purpose

“The UX of ChatGPT in your own app”

The library’s goal is to eliminate building chat interfaces manually by providing:

Chat message list UI

Input composer (attachments, send, etc.)

Streaming message rendering

Thread management (multi-turn conversations)

Retry / interruption handling

Theming and sensible defaults

Think of it as shadcn/ui but specifically for AI chat apps.

Key features (from the site)

1. Chat UI components

Prebuilt ChatGPT-like UX:

Message bubbles

Threads sidebar

Attachments

Scroll-to-bottom behavior

Input box with streaming states

Themeable UI defaults

You drop it in instead of writing your own chat UI.

2. State management for AI chats

This is the actual differentiator.

It handles:

Streaming token updates

Partial responses

Interruptions / stop generation

Retries

Multi-turn conversations

Thread persistence

Most devs underestimate how hard chat state is. assistant-ui abstracts this.

3. Works with any AI backend

It explicitly supports:

Vercel AI SDK

LangChain

Any LLM provider

Meaning it’s backend-agnostic.
You supply the streaming API, it renders it.

4. Performance optimized

Claims:

Minimal bundle size

Optimized streaming rendering

React-first architecture

This matters because streaming UIs re-render frequently.

What assistant-ui is NOT

This is important:

❌ Not an AI framework
❌ Not an agent system
❌ Not a vector DB
❌ Not orchestration (like LangGraph)
❌ Not a backend SDK
❌ Not mobile (React Native)

It’s React web-first.

Architecture model (implied)

Typical stack:

Frontend:
assistant-ui (React components + state)
Backend:
Your API route (Next.js / Express / Cloudflare)
LLM:
OpenAI / Anthropic / Grok / local model
Streaming:
SSE / WebSockets / Vercel AI SDK

assistant-ui sits purely in the frontend UI layer.

Products around it

They list related tools:

Tool UI – UI for agent tool execution logs

Safe Content Frame – sandboxed rendering of AI output

ChatGPT App Studio – probably a builder platform

Cloud – hosted backend services (commercial)

This suggests they’re building an ecosystem around AI UX tooling.

Why this library exists (industry context)

Building AI chat UX is hard because of:

Streaming token rendering

Race conditions

Canceling generations

Message reconciliation

Thread persistence

UX expectations set by ChatGPT

assistant-ui standardizes this like shadcn standardized UI primitives.

How this compares to alternatives
vs shadcn/ui

shadcn: general UI components

assistant-ui: AI-specific chat primitives + state

vs Vercel AI SDK UI

Vercel AI SDK: backend + hooks

assistant-ui: polished UX components on top

vs building custom RN chat UI (your GymHunter case)

assistant-ui is web-first and not drop-in for Expo RN.

You’d need to reimplement equivalents manually in React Native.

Why you should care (for GymHunter)

You are building:

AI assistant for gym owners

Chat interfaces (user ↔ gym, AI bots)

assistant-ui is a reference architecture for UX patterns, not a library you can directly use.

But you should steal its UX/state patterns:

Streaming state machine

Interruptible generation

Message optimistic rendering

Thread abstraction

Tool execution logs UI

Practical takeaway

assistant-ui = Tailwind/shadcn for AI chat UX, with built-in conversation state handling.

It is UI infrastructure, not AI infrastructure.

If you want the equivalent in React Native

You need:

Custom FlatList virtualization

Streaming diff-based message updates

AbortController integration

Message reconciliation layer

Scroll anchoring logic

Chat composer state machine

assistant-ui already solved those patterns on web.

Recommendation for you

Use assistant-ui as:

UX reference

State machine reference

Feature checklist

Do NOT try to port it directly to Expo.

If you want, I can:

Reverse engineer assistant-ui internal architecture patterns

Show how to replicate its state layer in React Native

Design a GymHunter AI chat architecture inspired by assistant-ui

Explain how Cursor/Codex-type apps structure chat UIs internally

Compare assistant-ui vs OpenAI Chat UI architecture

State the depth required.

i am having a nightmare time trying to implement it. from what i understand the primitives have their own internal state or whatever, and i am literally typing text into the input and the input doesnt work. what am i missing? are their composable UI ( grok clone, gpt clone etc) supposed to only be used with their own backend or what?
S-a gândit timp de 10s

You are missing the runtime + provider context (or you’re rendering the UI in a server component) so the Composer/Input ends up effectively “disconnected” and can become non-interactive.

assistant-ui’s “primitives” are not dumb UI. They are controlled by the assistant-ui runtime (composer state, thread state). If you render the composables without the runtime/provider, the input can’t bind to state.

What you must have (minimum wiring)

1. Client component (Next.js)

If you’re in Next.js App Router, the chat UI file must start with:

"use client";

Otherwise anything using hooks/contexts will break in weird ways (including inputs not behaving).

2. Provide an Assistant runtime

For Vercel AI SDK v5, the docs show the canonical wiring: useChatRuntime + AssistantRuntimeProvider.

"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";

export function MyRuntimeProvider({ children }: { children: React.ReactNode }) {
const runtime = useChatRuntime({
transport: new AssistantChatTransport({ api: "/api/chat" }),
});

return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}

Then wrap your UI:

<MyRuntimeProvider>
  <YourAssistantUI />
</MyRuntimeProvider>

3. Use their Thread/Composer components inside that provider

The “shadcn theme” components you add via their CLI/shadcn recipes (e.g. thread.json, thread-list.json) are designed to be used within the runtime provider.

If you copied only the UI components but didn’t wrap runtime/provider, the composer/input won’t be connected.

Are they “only for their own backend”?

No. They’re backend-agnostic, but they require a runtime adapter.

If you use Vercel AI SDK: use @assistant-ui/react-ai-sdk runtime/transport.

If you use LangGraph or others: you use the corresponding integration/runtime.

If you use a custom backend: you still need a transport/runtime that maps “send message / stream tokens / cancel / retries” into assistant-ui’s runtime model.

So: not locked to their backend, but not “just UI” either.

Why typing specifically fails

In practice it’s almost always one of these:

Missing AssistantRuntimeProvider (input has no composer state to write into).

Rendered in a Server Component (missing "use client").

Using primitives outside the expected context (e.g., Composer input not nested under the thread/composer context).

CSS overlay (less common): something positioned above the input blocking pointer/keyboard focus.

Fast diagnostic

Open React DevTools and check:

Is AssistantRuntimeProvider present above the input component?

Are there runtime errors/warnings in console?

Does the input element have disabled/readonly?

Can you click into it and see focus ring? If not, suspect overlay/CSS.

If you paste the smallest code snippet where you render the input (component tree + provider wrapping), I can point to the exact missing piece.

Your package.json explains the behavior: you only have @assistant-ui/react. That package provides UI + runtime APIs, but you do not have any runtime integration/transport package, so your “composable UI (GPT clone)” components are almost certainly rendering without a connected runtime. In assistant-ui, the input is not a standalone <input>; it’s bound to the ComposerRuntime (context-driven). Without the runtime/provider, it will look like an input but won’t behave correctly.

What you’re missing

You need one of these:

A built-in integration runtime (most common): @assistant-ui/react-ai-sdk (for Vercel AI SDK v5)

Or a custom runtime/transport adapter you implement yourself (more work).

Right now you’re “just using the OpenAI library” (openai) and likely calling your own backend endpoint with your own shape. assistant-ui’s composables typically assume the AI SDK v5 chat transport protocol when you use their AI SDK integration.

The shortest path to “it works”

1. Install the integration + AI SDK
   npm i ai @assistant-ui/react-ai-sdk

# or bun add ai @assistant-ui/react-ai-sdk

@assistant-ui/react-ai-sdk is explicitly the Vercel AI SDK v5 integration.

2. Create a Next.js route that streams in the expected format

In App Router: app/api/chat/route.ts

Conceptually (don’t copy blindly if your OpenAI wrapper differs): use AI SDK v5 to stream and return a UI message stream response. assistant-ui’s docs show this “default route uses AI SDK directly with OpenAI” pattern.

3. Wrap your UI in the runtime provider (client component)

Where you render the chat UI:

Ensure "use client";

Create runtime via useChatRuntime and connect it with AssistantChatTransport({ api: "/api/chat" })

Provide it via AssistantRuntimeProvider

That is the missing binding between the input and composer state.

Answer to your “is it locked to their backend?”

No. It’s backend-agnostic, but the composable “GPT clone” UI is not generic UI; it expects a runtime. You can use any backend if you provide a runtime/transport that speaks the protocol the runtime expects (AI SDK v5 transport is the easiest).

Why typing doesn’t work specifically

assistant-ui’s composer input is effectively a controlled component driven by ComposerRuntime. The docs describe the composer runtime as the mechanism that reads/updates text, sends messages, attachments, etc. If your component tree isn’t under the runtime provider, there’s no composer runtime to write into.

Two common gotchas that also cause “dead input”

You rendered the chat UI in a Server Component (missing "use client").

You copied “composables” but didn’t include the provider wrapper at the root of that subtree.

If you paste the component where you render the assistant-ui thread/composer (the file that contains the input), I can point to the exact missing provider boundary and the correct wrapping location.

i dont understand all of this, what is the react-ai-sdk ?? will i need to pay extra? do i have to modify my entire setup to use this react-ai sdk ?

Short answer first, then the precise breakdown.

No, you do not have to pay extra.
No, you do not have to rebuild your entire backend.
Yes, you are currently missing one conceptual layer, and that’s why nothing works.

What “react-ai-sdk” actually is (demystified)

There are three separate things that are getting conflated:

1. OpenAI SDK (openai)

Low-level HTTP client

You manually call client.responses.create(...)

You manually stream tokens

You manually decide message formats

You already understand this.

2. Vercel AI SDK (ai)

Vercel AI SDK

This is not a model, not a service, not a subscription.

It is:

A thin helper library

Normalizes streaming responses

Normalizes message formats

Wraps OpenAI / Anthropic / etc.

Outputs a standard stream shape for React UIs

Think of it as:

“fetch + SSE + helpers, but standardized.”

It is free and open source.
There is no usage cost. You still pay OpenAI exactly the same as before.

3. assistant-ui react-ai-sdk adapter

assistant-ui react-ai-sdk

This is the bridge.

assistant-ui expects:

“Give me a stream shaped like X”

The Vercel AI SDK already outputs exactly that shape.

So assistant-ui provides a prebuilt adapter instead of making you write one.

Why your input is “dead” right now

assistant-ui is not normal React inputs.

Its components:

Do not store text in local state

Do not call onChange

Do not manage submission

They talk to a Composer Runtime.

Right now:

You render the UI

There is no runtime

So typing goes nowhere

This is intentional design.

Do you have to use the AI SDK?
Option A — Use Vercel AI SDK (recommended)

15 minutes to working chat

No backend rewrite

No cost

Matches assistant-ui examples

Option B — Keep your OpenAI code

You must write a custom assistant-ui transport

You must implement:

streaming

aborts

retries

partial messages

thread lifecycle

This is 5–10× more work

assistant-ui assumes Option A by default.

What changes in your project (realistically)
What stays the same

You still use OpenAI

You still control prompts

You still run everything on your server

You still store data in Convex

You still pay OpenAI only

What changes

Your /api/chat route returns a standard stream

The frontend connects via a runtime provider

That’s it.

Minimal mental model (important)
assistant-ui UI
↓
assistant-ui runtime
↓
react-ai-sdk adapter
↓
Vercel AI SDK ("ai")
↓
OpenAI SDK

You are currently jumping from:

assistant-ui UI → OpenAI SDK

That connection does not exist.

Why assistant-ui feels hostile right now

Because it is opinionated infrastructure, not a component library.

It assumes:

Streaming

Abortability

Threads

Tools

Retries

Which is why the input literally refuses to act like a normal input.

Direct answers to your questions
“Will I need to pay extra?”

No. Zero. Nothing.

“Do I need to migrate my entire backend?”

No.
You wrap one API route.

“Can I keep my current OpenAI helper?”

Yes — internally.
The AI SDK can call OpenAI, or you can still call OpenAI yourself and stream through it.

The one sentence that matters

assistant-ui is unusable without a runtime, and the react-ai-sdk is simply the easiest way to supply that runtime.

If you want, next I can:

Show the absolute minimum files to change (literally 2 files)

Translate their docs into Convex + Next + OpenAI

Explain how ChatGPT / Cursor / Perplexity structure this internally

Tell you when not to use assistant-ui at all

Say which path you want.

im currently on a convex backend, do these things work well toghether?
S-a gândit timp de 4 (de) secunde

Yes—Convex and assistant-ui can work together well, but not directly.

assistant-ui needs a streaming “chat transport” (a runtime) to drive its Composer/Input and message streaming. Convex is a backend/database/runtime, but it does not automatically provide the exact streaming protocol assistant-ui expects unless you wire it. assistant-ui explicitly supports “any backend,” but you still need an integration layer.

You have two viable architectures.

Option A (recommended): Convex generates + persists, UI subscribes (Convex-native)

This is the most “Convex way”:

User sends message → Convex mutation inserts it

Convex action calls OpenAI and streams deltas into Convex

UI displays messages via Convex queries/subscriptions (live updates)

Convex has official guidance and primitives for agent/chat streaming and persisting deltas.

Pros

Persistence is first-class

Multi-client updates “just work”

Long-running generations fit Convex well

Cons

assistant-ui’s “AI SDK transport” example won’t drop in 1:1

You either:

adapt assistant-ui to read from Convex state, or

skip assistant-ui’s transport features and use its UI pieces more selectively

Option B: Keep assistant-ui’s AI-SDK transport, use Convex for storage

This matches assistant-ui’s most documented path: assistant-ui + Vercel AI SDK transport.

Frontend uses assistant-ui runtime (@assistant-ui/react-ai-sdk)

/api/chat streams (AI SDK style)

Convex is used for:

saving messages/threads

user auth/session data

listing threads, etc.

Convex even has a Next.js AI chat template that uses the Vercel AI SDK for the chat UI flow while Convex persists.

Pros

assistant-ui works “as designed” (composer/input, abort, retries, streaming)

Fastest route to a working GPT-clone UI

Cons

You now have a Next.js route doing streaming + Convex doing persistence

Slightly more moving parts

Does this “cost extra”?

No. The Vercel AI SDK is a free open-source library; it does not add usage cost by itself. You still only pay your model provider (OpenAI, etc.).

What I would do in your situation

If your priority is “make assistant-ui work now”: choose Option B.

If your priority is “Convex is the source of truth, streaming + persistence unified”: choose Option A and treat assistant-ui more as a UI kit (or you write a custom transport).

Concrete implication for your current issue (“input doesn’t work”)

Your package.json shows you do not have the integration runtime (@assistant-ui/react-ai-sdk) needed for the “composable GPT clone” path, so your Composer/Input is likely rendered without a working runtime/transport.

If you paste:

the component where you render the assistant-ui thread + composer, and

how you currently send messages (Convex mutation? /api/chat fetch?),

I will tell you exactly which option you’re currently closest to, and the minimum changes to make it functional.

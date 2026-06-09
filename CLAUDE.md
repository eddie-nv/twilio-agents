# CLAUDE.md — twilio-agents

## Project Overview

`twilio-agents` is a Bun/TypeScript HTTP server that validates Twilio SMS webhooks, routes inbound messages to pluggable AI agents via `BindingRouter`, manages per-caller conversation history with a JSONL file-backed `SessionStore`, and returns TwiML `<Response>` XML. The reference agent (`EchoAgent`) calls the Anthropic Claude API to produce conversational replies. Adding a new agent requires only a single new file extending `BaseAgent` and a one-line entry in `bindings.config.ts`.

---

## Common Commands

```bash
# Run all tests
bun test

# Start the development server
bun run src/server.ts

# Type-check without emitting JavaScript
bun run typecheck
```

---

## Architecture: Key Files

| File | What it does |
|------|-------------|
| `src/server.ts` | Entry point. Validates the Twilio request signature, resolves the agent via `BindingRouter`, loads/saves the session, calls `agent.handle()`, and returns TwiML XML. |
| `src/agents/BaseAgent.ts` | Single abstract method: `handle(session, message): Promise<string>`. All agents implement this contract. |
| `src/agents/EchoAgent.ts` | Concrete agent. Appends the inbound message to history, calls `callClaude`, appends the reply, saves the session, and returns the reply string. |
| `src/llm/claude.ts` | Thin Anthropic SDK wrapper. Maps `Message[]` to the SDK format, enforces a `max_tokens` cap, and throws typed `LLMError` on failure. |
| `src/router/BindingRouter.ts` | Pure `route(event, bindings)` function. Iterates bindings, matches on `keyword` (case-insensitive) or falls through to `default`. Throws `ConfigError` if no default is present. |
| `src/router/bindings.config.ts` | Array of `Binding` objects. Edit this file to add keyword routes or reassign the default agent. |
| `src/session/SessionStore.ts` | Reads/writes JSONL files in `SESSION_DIR`. Each line is a full serialised `Session`. `get()` returns the last line; `save()` appends a new line. |
| `src/session/session.utils.ts` | Pure, immutable helpers: `appendMessage` returns a new array, `pruneHistory` slices to the last N messages, `buildSessionKey` namespaces phone numbers. |
| `src/twiml/response.ts` | Builds `<?xml …><Response><Message>…` strings. Segments long replies at 1 600 characters and XML-escapes all content. |
| `src/types.ts` | Shared interfaces: `Message`, `Session`, `Binding`, `InboundEvent`. |

---

## How to Add a New Agent

1. Create `src/agents/MyAgent.ts` extending `BaseAgent` and implementing `handle(session, message)`.
2. Register it in the `agentMap` in `src/server.ts`.
3. Add a `Binding` entry in `src/router/bindings.config.ts` with the matching `agentId`.

The `BaseAgent` contract and session/LLM utilities are designed to be composed, not subclassed further — keep agents thin.

---

## Testing Patterns

- Test files live in `tests/` and mirror `src/` (e.g. `src/agents/EchoAgent.ts` → `tests/agents/EchoAgent.test.ts`).
- The Anthropic SDK is mocked via `bun:test` module mocking in unit and integration tests — no live API calls.
- Integration tests in `tests/integration/sms-webhook.test.ts` spin up the full request pipeline using `Bun.serve` with a real port, set `process.env` variables to safe test stubs, and clean up temp session directories after each test.
- Tests follow the **Arrange–Act–Assert** pattern with descriptive names that state the expected behaviour.
- Coverage target is **80 %** across all test types.

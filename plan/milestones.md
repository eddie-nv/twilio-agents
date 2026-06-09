# Twilio Agent Fleet — Milestone Plan

> Stack: TypeScript (ESM) · Bun · Twilio SDK · Anthropic SDK  
> Methodology: Red-Green TDD (bun:test)  
> Git flow: `git checkout -b milestone/<name>` → implement → commit → push → PR

---

## Overview

| # | Milestone | Branch | Deliverable |
|---|-----------|--------|-------------|
| 0 | Project Bootstrap | `milestone/bootstrap` | Repo skeleton, deps, tsconfig, bunfig |
| 1 | LLM Wrapper | `milestone/llm-wrapper` | `llm/claude.ts` + tests |
| 2 | Session Utils | `milestone/session-utils` | `session/session.utils.ts` + tests |
| 3 | Session Store | `milestone/session-store` | `session/SessionStore.ts` + tests |
| 4 | Binding Router | `milestone/binding-router` | `router/BindingRouter.ts` + tests |
| 5 | Echo Agent | `milestone/echo-agent` | `agents/EchoAgent.ts` + tests |
| 6 | TwiML Builder | `milestone/twiml-builder` | `twiml/response.ts` + tests |
| 7 | Server + Integration | `milestone/server-integration` | `server.ts` + integration tests |

---

## Milestone 0 — Project Bootstrap

**Branch:** `milestone/bootstrap`  
**Goal:** Empty repo becomes a runnable Bun TypeScript project with all deps installed and configs in place.

### Deliverables
- `package.json` with `@anthropic-ai/sdk`, `twilio`, `@types/bun`, `typescript`
- `tsconfig.json` (ESNext, bundler moduleResolution, strict)
- `bunfig.toml` (test root `./tests`, empty preload)
- `.env.example` with all required env vars
- `src/types.ts` — `Message`, `Session`, `Binding`, `InboundEvent` interfaces
- `data/sessions/.gitkeep`
- `.gitignore` (node_modules, data/sessions/*.jsonl, .env)

### Configs to run
| Config | When |
|--------|------|
| `/plan` command | Before creating any files — verify structure matches scope |
| `skills/bun-runtime/SKILL.md` | Reference for `bunfig.toml`, `bun install`, lockfile |
| `skills/coding-standards/SKILL.md` | Reference for naming, immutability baseline |
| `rules/typescript/coding-style.md` | Set the TS conventions from line 1 |

### Acceptance criteria
- `bun install` exits 0
- `bun run tsc --noEmit` exits 0 on `src/types.ts`
- `bun test` runs (0 tests, 0 failures)

### Commit message
```
feat: project bootstrap — types, deps, tsconfig, bunfig
```

---

## Milestone 1 — LLM Wrapper

**Branch:** `milestone/llm-wrapper`  
**Goal:** Thin, tested Anthropic SDK wrapper. Everything upstream depends on this.

### Deliverables
- `src/llm/claude.ts` — `callClaude(messages, systemPrompt, maxTokens?) → Promise<string>`
- `tests/llm/claude.test.ts` — 4 tests (correct shape, text extraction, LLMError on failure, maxTokens passthrough)

### Test plan (Red → Green)
| # | Test | Red asserts | Green impl |
|---|------|-------------|------------|
| 1 | calls SDK with correct shape | mock `@anthropic-ai/sdk`, assert model/messages/system/max_tokens | create Anthropic client, call `messages.create` |
| 2 | returns text content | returns `string` from `content[0].text` | extract `.text` from first content block |
| 3 | throws LLMError on API failure | throws with status code attached | wrap SDK call in try/catch, re-throw as `LLMError` |
| 4 | respects maxTokens param | `max_tokens` passed through | add optional param, default to 1024 |

### Configs to run
| Config | When |
|--------|------|
| `agents/tdd-guide` | Invoke before writing any code — enforce RED first |
| `skills/cost-aware-llm-pipeline/SKILL.md` | Model selection constants, error retry classification |
| `skills/error-handling/SKILL.md` | `LLMError` shape, transient vs permanent retry logic |
| `rules/typescript/coding-style.md` | No `any`, explicit return types, `unknown` for error narrowing |
| `rules/common/testing.md` | AAA pattern, mock external SDK, 80%+ coverage |
| `agents/code-reviewer` | Run after GREEN — check for floating promises, unhandled rejections |

### Acceptance criteria
- All 4 tests pass (`bun test tests/llm/`)
- `tsc --noEmit` exits 0
- No `any` types
- `LLMError` is a typed class, not a plain `throw new Error()`

### Commit message
```
feat(llm): claude wrapper with typed LLMError and maxTokens support
```

---

## Milestone 2 — Session Utils

**Branch:** `milestone/session-utils`  
**Goal:** Pure utility functions for session manipulation — no I/O, easy to test.

### Deliverables
- `src/session/session.utils.ts` — `buildSessionKey`, `pruneHistory`, `appendMessage`
- `tests/session/session.utils.test.ts` — 3 tests

### Test plan (Red → Green)
| # | Test | Red asserts | Green impl |
|---|------|-------------|------------|
| 1 | buildSessionKey formats correctly | returns `"phone:+14155550100"` | template literal |
| 2 | pruneHistory trims to N messages | `history.length === N` after prune (keeps last N) | `history.slice(-n)` |
| 3 | appendMessage adds to history | new message at end, correct role+content+timestamp | push new `Message` with `new Date().toISOString()` |

### Configs to run
| Config | When |
|--------|------|
| `agents/tdd-guide` | Enforce RED phase — write tests before utils |
| `rules/common/coding-style.md` | Immutability: `appendMessage` returns new array, does not mutate |
| `rules/typescript/coding-style.md` | `interface` for params, no `any` |

### Acceptance criteria
- All 3 tests pass
- `pruneHistory` and `appendMessage` are pure (return new objects, no mutation)
- `tsc --noEmit` exits 0

### Commit message
```
feat(session): buildSessionKey, pruneHistory, appendMessage utilities
```

---

## Milestone 3 — Session Store

**Branch:** `milestone/session-store`  
**Goal:** JSONL-backed persistence layer — `get(key)` creates or loads, `save(session)` writes.

### Deliverables
- `src/session/SessionStore.ts` — `get(key: string): Promise<Session>`, `save(session: Session): Promise<void>`
- `tests/session/SessionStore.test.ts` — 4 tests

### Test plan (Red → Green)
| # | Test | Red asserts | Green impl |
|---|------|-------------|------------|
| 1 | creates new session when key not found | returns `Session` with `history: []`, correct id | check file existence, create + write if missing |
| 2 | loads existing session from JSONL | returns persisted history array | read file, parse JSON lines, return last entry |
| 3 | persists session after save | file on disk contains updated message | write serialized session as JSONL line |
| 4 | handles corrupted JSONL gracefully | returns fresh session, does not throw | try/catch around parse, recreate file on error |

### Configs to run
| Config | When |
|--------|------|
| `agents/tdd-guide` | RED phase enforcement |
| `skills/bun-runtime/SKILL.md` | `Bun.file().text()`, `Bun.write()` for JSONL I/O |
| `skills/backend-patterns/SKILL.md` | Repository pattern interface (`get`/`save` follow repository shape) |
| `skills/error-handling/SKILL.md` | Corrupted file recovery, never throw to caller |
| `rules/typescript/security.md` | `SESSION_DIR` from env var, no hardcoded paths |
| `agents/code-reviewer` | Post-GREEN — check for async edge cases, missing `await` |

### Acceptance criteria
- All 4 tests pass (use a temp dir, clean up after each test)
- Store path driven by `process.env.SESSION_DIR`
- `tsc --noEmit` exits 0
- Corrupted file test covers both unreadable JSON and missing keys

### Commit message
```
feat(session): JSONL SessionStore with get/save and corruption recovery
```

---

## Milestone 4 — Binding Router

**Branch:** `milestone/binding-router`  
**Goal:** Declarative first-match-wins router. Default binding required; throws `ConfigError` if absent.

### Deliverables
- `src/router/bindings.config.ts` — default-only binding: `[{ agentId: 'echoAgent', default: true }]`
- `src/router/BindingRouter.ts` — `route(event: InboundEvent, bindings: Binding[]): string`
- `tests/router/BindingRouter.test.ts` — 3 tests

### Test plan (Red → Green)
| # | Test | Red asserts | Green impl |
|---|------|-------------|------------|
| 1 | falls through to default agent | returns `"echoAgent"` for any message | find binding where `default === true` |
| 2 | first match wins | keyword binding before default returns first match | iterate in order, return on first match |
| 3 | throws if no default binding | throws `ConfigError` | validate on init, throw typed error |

### Configs to run
| Config | When |
|--------|------|
| `agents/tdd-guide` | RED phase |
| `agents/architect` | Invoke before writing — validate first-match-wins + `ConfigError` design against `Binding` interface |
| `rules/common/patterns.md` | Declarative config pattern, no magic strings |
| `rules/typescript/coding-style.md` | String literal union for `channel`, no `enum` |

### Acceptance criteria
- All 3 tests pass
- `ConfigError` is a named class (not raw `Error`)
- Router is a pure function — no side effects, injectable bindings
- `tsc --noEmit` exits 0

### Commit message
```
feat(router): BindingRouter with first-match-wins and ConfigError validation
```

---

## Milestone 5 — Echo Agent

**Branch:** `milestone/echo-agent`  
**Goal:** Concrete agent that calls the LLM, manages history, and handles errors gracefully.

### Deliverables
- `src/agents/BaseAgent.ts` — `abstract class BaseAgent { abstract handle(session, message): Promise<string> }`
- `src/agents/EchoAgent.ts` — implements `handle()`: append → prune → call LLM → append reply → persist → return
- `tests/agents/EchoAgent.test.ts` — 4 tests

### Test plan (Red → Green)
| # | Test | Red asserts | Green impl |
|---|------|-------------|------------|
| 1 | calls LLM with system prompt | `callClaude` called with correct `systemPrompt` | mock `llm/claude`, assert call args |
| 2 | appends user message before LLM call | messages array includes user turn | call `appendMessage` before `callClaude` |
| 3 | appends assistant reply to history | `session.history` has assistant turn after call | `appendMessage` after LLM returns |
| 4 | returns fallback on LLM error | returns fallback string, does not throw | try/catch around `callClaude`, return `'Agent unreachable...'` |

### Configs to run
| Config | When |
|--------|------|
| `agents/tdd-guide` | RED phase — mock LLM before implementing |
| `skills/agentic-engineering/SKILL.md` | Agent handle() contract, eval-first thinking |
| `skills/error-handling/SKILL.md` | Fallback string pattern, LLMError catch |
| `rules/common/testing.md` | Mock `llm/claude` module, assert call shape |
| `agents/code-reviewer` | Post-GREEN — verify session mutation is isolated |
| `agents/typescript-reviewer` | Check for floating promises in handle() |

### Acceptance criteria
- All 4 tests pass with mocked LLM (no real API calls)
- `handle()` always returns a string (never throws)
- Session history is immutably updated via `appendMessage`
- `tsc --noEmit` exits 0

### Commit message
```
feat(agents): BaseAgent + EchoAgent with LLM call, history, fallback
```

---

## Milestone 6 — TwiML Builder

**Branch:** `milestone/twiml-builder`  
**Goal:** Pure XML builder — split long replies, escape special characters.

### Deliverables
- `src/twiml/response.ts` — `buildTwimlResponse(text: string): string`
- `tests/twiml/response.test.ts` — 3 tests

### Test plan (Red → Green)
| # | Test | Red asserts | Green impl |
|---|------|-------------|------------|
| 1 | returns valid TwiML XML | output contains `<Response><Message>` | build XML string with `<?xml` declaration |
| 2 | splits long messages into segments | output has multiple `<Message>` nodes for >1600 char input | `Math.ceil(text.length / 1600)` segments |
| 3 | escapes special characters | `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;` in output | XML escape util applied to each segment |

### Configs to run
| Config | When |
|--------|------|
| `agents/tdd-guide` | RED phase |
| `skills/api-design/SKILL.md` | Webhook response format, Content-Type expectations |
| `rules/common/coding-style.md` | Pure function, no side effects, named constant for `MAX_SMS_LENGTH = 1600` |

### Acceptance criteria
- All 3 tests pass
- Output is valid XML parseable by a standard parser (test with `new DOMParser()` or string assertions)
- `MAX_SMS_LENGTH` is a named constant, not a magic number
- `tsc --noEmit` exits 0

### Commit message
```
feat(twiml): buildTwimlResponse with segmentation and XML escaping
```

---

## Milestone 7 — Server + Integration

**Branch:** `milestone/server-integration`  
**Goal:** Wire all modules into `Bun.serve`, validate Twilio signature, prove end-to-end SMS → reply works.

### Deliverables
- `src/server.ts` — `POST /sms` handler wiring SessionStore → BindingRouter → Agent → TwiML
- `tests/integration/sms-webhook.test.ts` — 5 integration tests

### Test plan (Red → Green)
| # | Test | Red asserts | Green impl |
|---|------|-------------|------------|
| 1 | POST /sms returns 200 with TwiML | `status === 200`, `Content-Type: application/xml` | wire handler, return `buildTwimlResponse` |
| 2 | new number creates a session file | JSONL file exists in `data/sessions/` | SessionStore.get() called, file written |
| 3 | any message gets a reply | response body is non-empty TwiML | EchoAgent.handle() wired end-to-end |
| 4 | invalid Twilio signature returns 403 | `status === 403` | `twilio.validateRequest()` before handler |
| 5 | history persists across two requests | second call's LLM messages include prior turn | SessionStore load wired, assert callClaude args |

### Configs to run
| Config | When |
|--------|------|
| `agents/planner` | Before writing server.ts — generate wiring plan, approve before coding |
| `agents/architect` | Validate middleware order: signature check → session → router → agent → twiml |
| `agents/tdd-guide` | Integration test RED phase |
| `skills/backend-patterns/SKILL.md` | Middleware HOF for Twilio signature validation |
| `rules/common/security.md` | Signature validation is CRITICAL — must run before any business logic |
| `rules/typescript/security.md` | All secrets from env, validate at startup |
| `agents/security-reviewer` | Run before PR — webhook auth is a mandatory security surface |
| `agents/typescript-reviewer` | Floating promises in Bun.serve fetch handler |
| `/code-review` command | Run on full diff before opening PR |
| `/test-coverage` command | Confirm 80%+ across all modules |
| `/security-scan` command | Final gate — hardcoded secrets, broad permissions |

### Acceptance criteria
- All 5 integration tests pass
- All prior unit tests still pass (`bun test`)
- Twilio signature validation blocks invalid requests (403)
- `SESSION_DIR`, `ANTHROPIC_API_KEY`, `TWILIO_AUTH_TOKEN` loaded from env, validated at startup
- `tsc --noEmit` exits 0
- `/security-scan` reports no CRITICAL findings

### Commit message
```
feat(server): Bun.serve POST /sms with signature validation and full wiring
```

---

## Coverage Gate

Run after Milestone 7 before final PR merge:

```bash
bun test --coverage
```

Target: **80%+ branches, functions, lines, statements** across all `src/` files.  
Use `/test-coverage` command if any file is below threshold.

---

## PR Checklist (all milestones)

- [ ] Branch name matches `milestone/<name>`
- [ ] All tests green (`bun test`)
- [ ] `tsc --noEmit` exits 0
- [ ] No `console.log` in `src/`
- [ ] No hardcoded secrets
- [ ] `agents/code-reviewer` invoked, no CRITICAL/HIGH open
- [ ] PR description includes test plan section

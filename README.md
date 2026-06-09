# twilio-agents

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A Bun/TypeScript server for handling Twilio SMS webhooks with pluggable AI agents.

Receive an SMS, route it to the right AI agent, and reply — all in a single POST to `/sms`. Agents are plain TypeScript classes you extend from `BaseAgent`, so adding a new behaviour is a one-file change.

---

## Features

- **Webhook server** — Bun HTTP server validates Twilio request signatures before processing
- **Pluggable agent architecture** — extend `BaseAgent` to add any behaviour without touching core routing logic
- **Claude (Anthropic) LLM integration** — built-in `callClaude` helper with typed errors and configurable token limits
- **BindingRouter** — maps inbound phone numbers or keywords to agents via a declarative config array
- **Session management** — file-based JSONL session store preserves per-caller conversation history across messages
- **Auto-segmentation** — long replies are split into multiple `<Message>` TwiML elements (1 600-char limit per segment)
- **Full test suite** — unit + integration tests using `bun test`, targeting 80 %+ coverage

---

## Architecture Overview

```
Twilio SMS → POST /sms
               │
               ├─ Signature validation (Twilio SDK)
               ├─ BindingRouter  ─── bindings.config.ts (keyword / default rules)
               │        └──▶ agent lookup by agentId
               ├─ SessionStore   ─── JSONL files in data/sessions/
               │        └──▶ per-caller conversation history
               ├─ Agent.handle() ─── callClaude (Anthropic SDK)
               └─ buildTwimlResponse() → <?xml …><Response><Message>…
```

Key source files:

| Path | Purpose |
|------|---------|
| `src/server.ts` | Bun HTTP server entry point, request validation |
| `src/agents/BaseAgent.ts` | Abstract base class all agents must extend |
| `src/agents/EchoAgent.ts` | Reference agent — Claude-powered SMS assistant |
| `src/llm/claude.ts` | Anthropic SDK wrapper (`callClaude`) |
| `src/router/BindingRouter.ts` | Routes inbound events to agent IDs |
| `src/router/bindings.config.ts` | Declarative binding rules |
| `src/session/SessionStore.ts` | JSONL-backed session persistence |
| `src/session/session.utils.ts` | Pure helpers: `appendMessage`, `pruneHistory` |
| `src/twiml/response.ts` | TwiML `<Response>` builder with XML escaping |
| `src/types.ts` | Shared TypeScript interfaces |

---

## Prerequisites

- [Bun](https://bun.sh) v1.0 or later
- A [Twilio account](https://www.twilio.com/) with an SMS-capable phone number
- An [Anthropic API key](https://console.anthropic.com/)
- A public HTTPS URL for your webhook (e.g. via [ngrok](https://ngrok.com/) during local development)

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/eddie-nv/twilio-agents.git
cd twilio-agents

# 2. Install dependencies
bun install

# 3. Configure environment
cp .env.example .env
# Edit .env and fill in your keys (see Configuration below)

# 4. Start the server
bun run src/server.ts
```

The server starts on the port defined in `PORT` (default `3000`).

Point your Twilio phone number's "A Message Comes In" webhook to:

```
https://<your-host>/sms  (HTTP POST)
```

Send an SMS to your Twilio number — the EchoAgent will reply via Claude.

---

## Configuration

All configuration is via environment variables. Copy `.env.example` to `.env` and populate:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | — | Anthropic API key from [console.anthropic.com](https://console.anthropic.com/) |
| `TWILIO_AUTH_TOKEN` | Yes | — | Twilio Auth Token from the [Twilio Console](https://console.twilio.com/) |
| `SESSION_DIR` | No | `data/sessions` | Directory for JSONL session files (relative to project root) |
| `PORT` | No | `3000` | Port the Bun HTTP server listens on |

The server exits with an error on startup if `ANTHROPIC_API_KEY` or `TWILIO_AUTH_TOKEN` are missing.

---

## Adding a Custom Agent

1. Create a new file, e.g. `src/agents/MyAgent.ts`:

```typescript
import { BaseAgent } from './BaseAgent'
import { callClaude } from '../llm/claude'
import { appendMessage, pruneHistory } from '../session/session.utils'
import type { SessionStore } from '../session/SessionStore'
import type { Session } from '../types'

const SYSTEM_PROMPT = 'You are a specialised assistant for...'
const MAX_HISTORY = 10

export class MyAgent extends BaseAgent {
  constructor(private readonly store: Pick<SessionStore, 'save'>) {
    super()
  }

  async handle(session: Session, message: string): Promise<string> {
    const withUser = appendMessage(session.history, 'user', message)
    const pruned = pruneHistory(withUser, MAX_HISTORY)

    const reply = await callClaude(pruned, SYSTEM_PROMPT)
    const withReply = appendMessage(pruned, 'assistant', reply)
    await this.store.save({ ...session, history: withReply })
    return reply
  }
}
```

2. Register the agent in `src/server.ts`:

```typescript
import { MyAgent } from './agents/MyAgent'

const agentMap = {
  echoAgent: new EchoAgent(store),
  myAgent:   new MyAgent(store),   // add this
}
```

3. Add a binding rule in `src/router/bindings.config.ts`:

```typescript
export const bindings: Binding[] = [
  { agentId: 'myAgent',  keyword: 'help' },  // matches messages containing "help"
  { agentId: 'echoAgent', default: true },   // all other messages
]
```

Keyword matching is case-insensitive. The first matching rule wins. A `default: true` binding is required.

---

## Running Tests

```bash
# Run all tests
bun test

# Type-check without emitting
bun run typecheck
```

Tests live in `tests/` and mirror the `src/` directory structure. The integration test in `tests/integration/sms-webhook.test.ts` mocks the Anthropic SDK so no live API calls are made.

---

## Project Structure

```
twilio-agents/
├── src/
│   ├── agents/
│   │   ├── BaseAgent.ts          # Abstract base class
│   │   └── EchoAgent.ts          # Claude-powered reference agent
│   ├── llm/
│   │   └── claude.ts             # Anthropic SDK wrapper
│   ├── router/
│   │   ├── BindingRouter.ts      # Route logic (keyword + default rules)
│   │   └── bindings.config.ts    # Binding rule declarations
│   ├── session/
│   │   ├── SessionStore.ts       # JSONL file-based session persistence
│   │   └── session.utils.ts      # Pure helpers (append, prune)
│   ├── twiml/
│   │   └── response.ts           # TwiML <Response> builder
│   ├── types.ts                  # Shared interfaces
│   └── server.ts                 # Entry point
├── tests/                        # Unit + integration tests (mirrors src/)
├── data/sessions/                # Session JSONL files (git-ignored)
├── .env.example                  # Environment variable template
├── bunfig.toml                   # Bun test config
├── package.json
├── tsconfig.json
└── setup.sh                      # One-command bootstrap
```

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for coding standards, the TDD workflow, and the pull request process.

---

## License

MIT — see [LICENSE](LICENSE) for details.

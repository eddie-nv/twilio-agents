# Contributing to twilio-agents

Thank you for your interest in contributing. This document covers how to set up the project locally, coding expectations, test requirements, and the pull request process.

---

## Table of Contents

1. [Fork and local setup](#fork-and-local-setup)
2. [Coding standards](#coding-standards)
3. [Test requirements](#test-requirements)
4. [Pull request process](#pull-request-process)
5. [Reporting issues](#reporting-issues)

---

## Fork and local setup

```bash
# 1. Fork the repo on GitHub, then clone your fork
git clone https://github.com/<your-username>/twilio-agents.git
cd twilio-agents

# 2. Run the bootstrap script (installs Bun if needed, copies .env.example)
bash setup.sh

# 3. Fill in your keys in .env
#    ANTHROPIC_API_KEY and TWILIO_AUTH_TOKEN are required to start the server.
#    Tests mock the Anthropic SDK, so they run without a live API key.

# 4. Verify the test suite passes before making changes
bun test
```

---

## Coding standards

### Language and runtime

- TypeScript with strict mode enabled (`"strict": true` in `tsconfig.json`).
- Bun as the runtime, package manager, bundler, and test runner.
- ESNext module format (`"type": "module"` in `package.json`).

### Immutability

Never mutate existing objects. Always return new copies:

```typescript
// Wrong
session.history.push(message)

// Correct
const updated = { ...session, history: [...session.history, message] }
```

### File and function size

- Functions: prefer under 50 lines.
- Files: aim for 200–400 lines; hard limit 800 lines.
- Extract utilities rather than letting files grow.

### Naming

| Kind | Convention | Example |
|------|------------|---------|
| Variables, functions | `camelCase` | `buildSessionKey` |
| Booleans | `is` / `has` / `should` prefix | `isDefault` |
| Types, interfaces, classes | `PascalCase` | `SessionStore` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_HISTORY` |

### Error handling

- Handle errors explicitly at every boundary — never silently swallow them.
- Use typed error subclasses (`LLMError`, `ConfigError`) so callers can distinguish failure modes.
- Never expose raw stack traces or internal error details to end-users.

### No secrets in source

- All credentials via environment variables — never hardcode API keys, tokens, or passwords.
- If you accidentally commit a secret, rotate it immediately and open an issue.

---

## Test requirements

### Minimum coverage: 80 %

Every pull request must maintain or improve test coverage. New functionality requires new tests.

### Test-driven development workflow

1. Write the test first (RED — it should fail).
2. Write the minimal implementation to pass (GREEN).
3. Refactor for clarity (IMPROVE).
4. Confirm coverage has not dropped.

### Test structure

Tests live in `tests/` and mirror the `src/` layout:

```
src/agents/EchoAgent.ts  →  tests/agents/EchoAgent.test.ts
```

Follow the **Arrange–Act–Assert** pattern:

```typescript
test('returns fallback message when LLM throws', async () => {
  // Arrange
  mock.module('../llm/claude', () => ({ callClaude: () => { throw new Error() } }))

  // Act
  const reply = await agent.handle(session, 'hello')

  // Assert
  expect(reply).toBe(FALLBACK)
})
```

### Running tests

```bash
bun test
```

The Anthropic SDK is mocked in all tests — no live API key is needed to run the test suite.

---

## Pull request process

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. Make your changes following the standards above.

3. Ensure all checks pass locally:
   ```bash
   bun test
   bun run typecheck
   ```

4. Commit using [Conventional Commits](https://www.conventionalcommits.org/) format:
   ```
   feat: add SupportAgent with escalation keywords
   fix: handle empty Body field in webhook params
   docs: add example for multi-agent bindings config
   ```

5. Push your branch and open a pull request against `main`.

6. Fill in the PR template, linking any related issues.

7. A maintainer will review your PR. Address feedback, then request re-review.

### PR checklist

- [ ] Tests pass (`bun test`)
- [ ] Type check passes (`bun run typecheck`)
- [ ] New functionality is covered by tests
- [ ] No hardcoded secrets or credentials
- [ ] No console.log or debug statements left in source files
- [ ] Code is readable, functions are focused, files are cohesive

---

## Reporting issues

Use the GitHub issue templates:

- **Bug report** — for unexpected behaviour or errors.
- **Feature request** — for new agent types, routing capabilities, or server improvements.

Please search existing issues before opening a new one.

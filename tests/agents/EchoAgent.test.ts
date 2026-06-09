import { beforeEach, expect, mock, test } from 'bun:test'
import type { Session } from '../../src/types'

const mockCallClaude = mock()

mock.module('../../src/llm/claude', () => ({
  callClaude: mockCallClaude,
  LLMError: class LLMError extends Error {
    constructor(msg: string, public readonly statusCode?: number) {
      super(msg)
      this.name = 'LLMError'
    }
  },
}))

const { EchoAgent, SYSTEM_PROMPT } = await import('../../src/agents/EchoAgent')

const mockSave = mock()
const mockStore = { save: mockSave }

const baseSession = (): Session => ({ id: 'phone:+14155550100', binding: 'echoAgent', history: [] })

beforeEach(() => {
  mockCallClaude.mockReset()
  mockSave.mockReset()
  mockSave.mockResolvedValue(undefined)
})

test('calls LLM with system prompt', async () => {
  // Arrange
  mockCallClaude.mockResolvedValueOnce('reply')
  const agent = new EchoAgent(mockStore as never)

  // Act
  await agent.handle(baseSession(), 'hello')

  // Assert
  expect(mockCallClaude).toHaveBeenCalledWith(
    expect.any(Array),
    SYSTEM_PROMPT,
  )
})

test('appends user message before calling LLM', async () => {
  // Arrange
  mockCallClaude.mockResolvedValueOnce('reply')
  const agent = new EchoAgent(mockStore as never)

  // Act
  await agent.handle(baseSession(), 'hello world')

  // Assert — first arg to callClaude should include the user turn
  const [messages] = mockCallClaude.mock.calls[0] as [Array<{ role: string; content: string }>]
  expect(messages.some(m => m.role === 'user' && m.content === 'hello world')).toBe(true)
})

test('appends assistant reply to session history before saving', async () => {
  // Arrange
  mockCallClaude.mockResolvedValueOnce('assistant reply')
  const agent = new EchoAgent(mockStore as never)

  // Act
  await agent.handle(baseSession(), 'hi')

  // Assert — saved session must contain assistant turn
  const [saved] = mockSave.mock.calls[0] as [Session]
  expect(saved.history.some(m => m.role === 'assistant' && m.content === 'assistant reply')).toBe(true)
})

test('returns fallback string and does not throw on LLM error', async () => {
  // Arrange
  mockCallClaude.mockRejectedValueOnce(new Error('API down'))
  const agent = new EchoAgent(mockStore as never)

  // Act
  let result: string | undefined
  let threw = false
  try {
    result = await agent.handle(baseSession(), 'hi')
  } catch {
    threw = true
  }

  // Assert
  expect(threw).toBe(false)
  expect(result).toBeString()
  expect(result!.length).toBeGreaterThan(0)
})

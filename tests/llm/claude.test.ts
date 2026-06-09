import { beforeEach, expect, mock, test } from 'bun:test'
import type { Message } from '../../src/types'

const mockCreate = mock()

mock.module('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate }
  },
}))

const { callClaude, LLMError } = await import('../../src/llm/claude')

beforeEach(() => {
  mockCreate.mockReset()
})

test('calls SDK with correct shape', async () => {
  // Arrange
  const messages: Message[] = [
    { role: 'user', content: 'hello', timestamp: '2024-01-01T00:00:00.000Z' },
  ]
  mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: 'hi' }] })

  // Act
  await callClaude(messages, 'system prompt')

  // Assert
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      model: 'claude-sonnet-4-6',
      system: 'system prompt',
      messages: [{ role: 'user', content: 'hello' }],
      max_tokens: 1024,
    }),
  )
})

test('returns text content from first content block', async () => {
  // Arrange
  mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: 'response text' }] })

  // Act
  const result = await callClaude([], 'system')

  // Assert
  expect(result).toBe('response text')
})

test('throws LLMError with status code on API failure', async () => {
  // Arrange
  const apiError = Object.assign(new Error('Service unavailable'), { status: 503 })
  mockCreate.mockRejectedValueOnce(apiError)

  // Act
  let caught: unknown
  try {
    await callClaude([], 'system')
  } catch (err) {
    caught = err
  }

  // Assert
  expect(caught).toBeInstanceOf(LLMError)
  expect((caught as InstanceType<typeof LLMError>).statusCode).toBe(503)
})

test('passes maxTokens to SDK when provided', async () => {
  // Arrange
  mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: 'ok' }] })

  // Act
  await callClaude([], 'system', 2048)

  // Assert
  expect(mockCreate).toHaveBeenCalledWith(
    expect.objectContaining({ max_tokens: 2048 }),
  )
})

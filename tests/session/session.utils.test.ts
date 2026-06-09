import { expect, test } from 'bun:test'
import type { Message } from '../../src/types'
import { appendMessage, buildSessionKey, pruneHistory } from '../../src/session/session.utils'

test('buildSessionKey formats phone number with prefix', () => {
  // Arrange & Act
  const key = buildSessionKey('+14155550100')

  // Assert
  expect(key).toBe('phone:+14155550100')
})

test('pruneHistory keeps only the last N messages', () => {
  // Arrange
  const history: Message[] = [
    { role: 'user', content: 'a', timestamp: '2024-01-01T00:00:00.000Z' },
    { role: 'assistant', content: 'b', timestamp: '2024-01-01T00:00:01.000Z' },
    { role: 'user', content: 'c', timestamp: '2024-01-01T00:00:02.000Z' },
    { role: 'assistant', content: 'd', timestamp: '2024-01-01T00:00:03.000Z' },
  ]

  // Act
  const pruned = pruneHistory(history, 2)

  // Assert
  expect(pruned.length).toBe(2)
  expect(pruned[0].content).toBe('c')
  expect(pruned[1].content).toBe('d')
  expect(history.length).toBe(4) // original not mutated
})

test('appendMessage adds new message to end without mutating original', () => {
  // Arrange
  const history: Message[] = [
    { role: 'user', content: 'hello', timestamp: '2024-01-01T00:00:00.000Z' },
  ]

  // Act
  const updated = appendMessage(history, 'assistant', 'hi there')

  // Assert
  expect(updated.length).toBe(2)
  expect(updated[1].role).toBe('assistant')
  expect(updated[1].content).toBe('hi there')
  expect(typeof updated[1].timestamp).toBe('string')
  expect(history.length).toBe(1) // original not mutated
})

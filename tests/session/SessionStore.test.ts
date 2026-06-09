import { afterEach, beforeEach, expect, test } from 'bun:test'
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Session } from '../../src/types'
import { SessionStore } from '../../src/session/SessionStore'

let testDir: string
let store: SessionStore

beforeEach(() => {
  testDir = join(tmpdir(), `session-store-test-${Date.now()}`)
  mkdirSync(testDir, { recursive: true })
  store = new SessionStore(testDir)
})

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true })
})

test('creates new session when key not found', async () => {
  // Act
  const session = await store.get('phone:+14155550100')

  // Assert
  expect(session.id).toBe('phone:+14155550100')
  expect(session.history).toEqual([])
  expect(typeof session.binding).toBe('string')
})

test('loads existing session from JSONL file', async () => {
  // Arrange
  const existing: Session = {
    id: 'phone:+14155550101',
    binding: 'echoAgent',
    history: [{ role: 'user', content: 'hi', timestamp: '2024-01-01T00:00:00.000Z' }],
  }
  await store.save(existing)

  // Act
  const loaded = await store.get('phone:+14155550101')

  // Assert
  expect(loaded.id).toBe('phone:+14155550101')
  expect(loaded.history.length).toBe(1)
  expect(loaded.history[0].content).toBe('hi')
})

test('persists session to disk after save', async () => {
  // Arrange
  const session: Session = {
    id: 'phone:+14155550102',
    binding: 'echoAgent',
    history: [{ role: 'assistant', content: 'saved', timestamp: '2024-01-01T00:00:00.000Z' }],
  }

  // Act
  await store.save(session)

  // Assert — load via a fresh store instance to confirm disk write
  const fresh = new SessionStore(testDir)
  const loaded = await fresh.get('phone:+14155550102')
  expect(loaded.history[0].content).toBe('saved')
})

test('returns fresh session and does not throw on corrupted JSONL', async () => {
  // Arrange — write invalid JSON to the session file
  const key = 'phone:+14155550103'
  const filePath = join(testDir, `${encodeURIComponent(key)}.jsonl`)
  await Bun.write(filePath, 'this is not valid json\n')

  // Act
  let session: Session | undefined
  let threw = false
  try {
    session = await store.get(key)
  } catch {
    threw = true
  }

  // Assert
  expect(threw).toBe(false)
  expect(session?.id).toBe(key)
  expect(session?.history).toEqual([])
})

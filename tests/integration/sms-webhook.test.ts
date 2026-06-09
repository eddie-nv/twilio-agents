import { afterAll, beforeEach, expect, mock, test } from 'bun:test'
import crypto from 'node:crypto'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const TEST_AUTH_TOKEN = 'test-auth-token-for-integration-tests'

const mockCreate = mock()
mock.module('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate }
  },
}))

const testSessionDir = join(tmpdir(), `sms-integration-${Date.now()}`)
mkdirSync(testSessionDir, { recursive: true })

process.env.ANTHROPIC_API_KEY = 'test-key'
process.env.TWILIO_AUTH_TOKEN = TEST_AUTH_TOKEN
process.env.SESSION_DIR = testSessionDir
process.env.PORT = '0'

const { server } = await import('../../src/server')
const BASE_URL = `http://localhost:${server.port}`

function sign(url: string, params: Record<string, string>): string {
  const payload = url + Object.keys(params).sort().reduce((acc, k) => acc + k + params[k], '')
  return crypto.createHmac('sha1', TEST_AUTH_TOKEN).update(payload).digest('base64')
}

function post(params: Record<string, string>, sig?: string): Promise<Response> {
  const url = `${BASE_URL}/sms`
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Twilio-Signature': sig ?? sign(url, params),
    },
    body: new URLSearchParams(params).toString(),
  })
}

function postViaProxy(params: Record<string, string>, forwardedProto: string): Promise<Response> {
  const localUrl = `${BASE_URL}/sms`
  const publicUrl = localUrl.replace(/^https?:\/\//, `${forwardedProto}://`)
  const sig = sign(publicUrl, params)
  return fetch(localUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Twilio-Signature': sig,
      'X-Forwarded-Proto': forwardedProto,
    },
    body: new URLSearchParams(params).toString(),
  })
}

beforeEach(() => {
  mockCreate.mockReset()
  mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'Mock reply' }] })
})

afterAll(() => {
  server.stop()
  rmSync(testSessionDir, { recursive: true, force: true })
})

test('POST /sms returns 200 with TwiML Content-Type', async () => {
  const res = await post({ From: '+14155550100', Body: 'hello' })

  expect(res.status).toBe(200)
  expect(res.headers.get('Content-Type')).toContain('application/xml')
})

test('new phone number creates a session file on disk', async () => {
  await post({ From: '+14155550101', Body: 'first message' })

  const files = readdirSync(testSessionDir)
  expect(files.some(f => f.includes('14155550101'))).toBe(true)
})

test('any message returns non-empty TwiML with Response and Message tags', async () => {
  const res = await post({ From: '+14155550102', Body: 'test' })
  const body = await res.text()

  expect(body.length).toBeGreaterThan(0)
  expect(body).toContain('<Response>')
  expect(body).toContain('<Message>')
})

test('invalid Twilio signature returns 403', async () => {
  const res = await post({ From: '+14155550103', Body: 'hi' }, 'invalid-signature')

  expect(res.status).toBe(403)
})

test('X-Forwarded-Proto: https — signature validated against https URL (ngrok SSL termination)', async () => {
  const res = await postViaProxy({ From: '+14155550110', Body: 'hello via proxy' }, 'https')

  expect(res.status).toBe(200)
})

test('X-Forwarded-Proto: https — wrong signature (signed with http) returns 403', async () => {
  const localUrl = `${BASE_URL}/sms`
  const sig = sign(localUrl, { From: '+14155550111', Body: 'bad sig' })
  const res = await fetch(localUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Twilio-Signature': sig,
      'X-Forwarded-Proto': 'https',
    },
    body: new URLSearchParams({ From: '+14155550111', Body: 'bad sig' }).toString(),
  })

  expect(res.status).toBe(403)
})

test('history persists — second request includes prior turn in LLM messages', async () => {
  const from = '+14155550104'

  await post({ From: from, Body: 'first message' })
  await post({ From: from, Body: 'second message' })

  expect(mockCreate.mock.calls.length).toBe(2)
  const secondMessages = (mockCreate.mock.calls[1][0] as { messages: Array<{ role: string; content: string }> }).messages
  expect(secondMessages.some(m => m.role === 'user' && m.content === 'first message')).toBe(true)
})

import { expect, test } from 'bun:test'
import type { Message, Session, Binding, InboundEvent } from '../src/types'

test('Message interface is importable', () => {
  const msg: Message = { role: 'user', content: 'hello', timestamp: new Date().toISOString() }
  expect(msg.role).toBe('user')
})

test('Session interface is importable', () => {
  const session: Session = { id: 'test', binding: 'echoAgent', history: [] }
  expect(session.history).toEqual([])
})

test('Binding interface is importable', () => {
  const binding: Binding = { agentId: 'echoAgent', default: true }
  expect(binding.default).toBe(true)
})

test('InboundEvent interface is importable', () => {
  const event: InboundEvent = { from: '+14155550100', body: 'hi', channel: 'sms' }
  expect(event.channel).toBe('sms')
})

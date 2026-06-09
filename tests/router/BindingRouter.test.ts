import { expect, test } from 'bun:test'
import type { Binding, InboundEvent } from '../../src/types'
import { ConfigError, route } from '../../src/router/BindingRouter'

const smsEvent: InboundEvent = { from: '+14155550100', body: 'hello', channel: 'sms' }

test('falls through to default agent for any message', () => {
  // Arrange
  const bindings: Binding[] = [{ agentId: 'echoAgent', default: true }]

  // Act
  const agentId = route(smsEvent, bindings)

  // Assert
  expect(agentId).toBe('echoAgent')
})

test('first matching keyword binding wins over default', () => {
  // Arrange
  const bindings: Binding[] = [
    { agentId: 'supportAgent', keyword: 'help' },
    { agentId: 'echoAgent', default: true },
  ]
  const event: InboundEvent = { from: '+14155550100', body: 'help me please', channel: 'sms' }

  // Act
  const agentId = route(event, bindings)

  // Assert
  expect(agentId).toBe('supportAgent')
})

test('throws ConfigError when no default binding is present', () => {
  // Arrange
  const bindings: Binding[] = [{ agentId: 'supportAgent', keyword: 'help' }]

  // Act
  let caught: unknown
  try {
    route(smsEvent, bindings)
  } catch (err) {
    caught = err
  }

  // Assert
  expect(caught).toBeInstanceOf(ConfigError)
})
